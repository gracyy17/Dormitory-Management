import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { deleteApp, initializeApp } from 'firebase/app';
import { addDoc, collection, doc, getDoc, getDocs, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, firebaseConfig, isFirebaseConfigured } from '../lib/firebase';

const AuthContext = createContext(null);

const getUserProfile = async (uid) => {
  if (!db) return null;

  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) return null;

  return userDoc.data() || null;
};

const mapAuthError = (error) => {
  if (error?.code === 'auth/email-already-in-use') {
    return 'Email is already in use. Please use another tenant email.';
  }
  if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/wrong-password') {
    return 'Current password is incorrect.';
  }
  if (error?.code === 'auth/weak-password') {
    return 'Password must be at least 6 characters.';
  }
  if (error?.code === 'permission-denied') {
    return 'Missing or insufficient permissions. Make sure Firestore rules are deployed and that users/{uid} exists for this account with a valid role.';
  }
  return error?.message || 'Authentication failed.';
};

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          setRole(profile?.role || null);
          setMustChangePassword(Boolean(profile?.mustChangePassword));
        } catch {
          setRole(null);
          setMustChangePassword(false);
        }
      } else {
        setRole(null);
        setMustChangePassword(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithRole = async ({ email, password, expectedRole }) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase is not configured. Add VITE_FIREBASE_* values in your .env file.');
    }

    let credential;
    let profile;

    try {
      credential = await signInWithEmailAndPassword(auth, email, password);
      profile = await getUserProfile(credential.user.uid);
    } catch (error) {
      throw new Error(mapAuthError(error));
    }

    const userRole = profile?.role || null;

    if (!userRole) {
      await signOut(auth);
      throw new Error('No user role found. Create users/{uid} document with a role field.');
    }

    if (expectedRole && userRole !== expectedRole) {
      await signOut(auth);
      throw new Error(`Access denied: this account is not a ${expectedRole}.`);
    }

    setUser(credential.user);
    setRole(userRole);
    setMustChangePassword(Boolean(profile?.mustChangePassword));

    return { user: credential.user, role: userRole, mustChangePassword: Boolean(profile?.mustChangePassword) };
  };

  const createTenantAccount = async ({
    email,
    password,
    fullName = '',
    selectedRoomId = '',
    roomNo = '',
    roomBed = null,
    billingMonth = '',
    dueDate = '',
    amount = 0,
    phone = '',
    profileImageUrl = '',
    profileImageDataUrl = '',
    notifyEmail = true,
  }) => {
    if (!isFirebaseConfigured || !auth || !db) {
      throw new Error('Firebase is not configured. Add VITE_FIREBASE_* values in your .env file.');
    }

    if (role !== 'admin') {
      throw new Error('Only admin accounts can create tenant accounts.');
    }

    if (!fullName.trim()) {
      throw new Error('Tenant full name is required.');
    }
    if (!selectedRoomId || !roomNo.trim()) {
      throw new Error('Assign an available room before creating tenant account.');
    }
    if (!billingMonth.trim() || !dueDate || Number(amount) <= 0 || Number.isNaN(Number(amount))) {
      throw new Error('Billing details are required and amount must be greater than 0.');
    }

    const dueDateValue = new Date(dueDate);
    if (Number.isNaN(dueDateValue.getTime())) {
      throw new Error('Invalid due date.');
    }

    const duesSnapshot = await getDocs(collection(db, 'dues'));
    const hasDuplicate = duesSnapshot.docs.some((dueDoc) => {
      const data = dueDoc.data() || {};
      return String(data.tenantEmail || '').toLowerCase() === String(email || '').toLowerCase()
        && String(data.billingMonth || '').toLowerCase() === String(billingMonth || '').toLowerCase();
    });

    if (hasDuplicate) {
      throw new Error('A due record for this tenant email and billing month already exists.');
    }

    const secondaryApp = initializeApp(firebaseConfig, `tenant-provision-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      await setDoc(doc(db, 'users', credential.user.uid), {
        role: 'tenant',
        email,
        fullName,
        roomNo,
        roomBed,
        phone,
        profileImageUrl: profileImageDataUrl ? '' : profileImageUrl,
        profileImageDataUrl,
        notifyEmail,
        mustChangePassword: true,
        createdBy: user?.uid || null,
        createdAt: serverTimestamp(),
      });

      if (selectedRoomId) {
        await runTransaction(db, async (transaction) => {
          const roomRef = doc(db, 'rooms', selectedRoomId);
          const roomSnap = await transaction.get(roomRef);

          if (!roomSnap.exists()) {
            throw new Error('Selected room no longer exists. Please refresh and try again.');
          }

          const roomData = roomSnap.data() || {};
          const capacity = Number(roomData.capacity || 0);
          const occupiedBeds = Number(roomData.occupiedBeds || 0);

          if (occupiedBeds >= capacity) {
            throw new Error('Selected room is already full. Please choose another room.');
          }

          const nextOccupiedBeds = occupiedBeds + 1;
          transaction.update(roomRef, {
            occupiedBeds: nextOccupiedBeds,
            status: nextOccupiedBeds >= capacity ? 'Occupied' : 'Occupied',
            updatedAt: serverTimestamp(),
          });
        });
      }

      if (billingMonth && dueDate && Number(amount) > 0) {
        await addDoc(collection(db, 'dues'), {
          tenantUid: credential.user.uid,
          tenantEmail: email,
          roomNo,
          billingMonth,
          dueDate,
          amount: Number(amount),
          status: 'Pending',
          createdAt: serverTimestamp(),
          createdBy: user?.uid || null,
        });
      }

      await signOut(secondaryAuth);

      return { uid: credential.user.uid, email };
    } catch (error) {
      throw new Error(mapAuthError(error));
    } finally {
      await deleteApp(secondaryApp);
    }
  };

  const changeMyPassword = async ({ currentPassword, newPassword }) => {
    if (!auth?.currentUser || !auth.currentUser.email) {
      throw new Error('No authenticated user found.');
    }

    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);

      if (db) {
        await setDoc(
          doc(db, 'users', auth.currentUser.uid),
          {
            mustChangePassword: false,
            passwordUpdatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      setMustChangePassword(false);
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
    setUser(null);
    setRole(null);
    setMustChangePassword(false);
  };

  const value = useMemo(
    () => ({
      user,
      role,
      mustChangePassword,
      loading,
      loginWithRole,
      createTenantAccount,
      changeMyPassword,
      logout,
      isFirebaseConfigured,
    }),
    [user, role, mustChangePassword, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export { AuthProvider, useAuth };
