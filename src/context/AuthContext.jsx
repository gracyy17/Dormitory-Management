import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';

const AuthContext = createContext(null);

const getUserRole = async (uid) => {
  if (!db) return null;

  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) return null;

  return userDoc.data()?.role || null;
};

const mapAuthError = (error) => {
  if (error?.code === 'permission-denied') {
    return 'Missing or insufficient permissions. Update Firestore rules to allow users/{uid} read for the signed-in user.';
  }
  return error?.message || 'Authentication failed.';
};

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
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
          const userRole = await getUserRole(firebaseUser.uid);
          setRole(userRole);
        } catch {
          setRole(null);
        }
      } else {
        setRole(null);
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
    let userRole;

    try {
      credential = await signInWithEmailAndPassword(auth, email, password);
      userRole = await getUserRole(credential.user.uid);
    } catch (error) {
      throw new Error(mapAuthError(error));
    }

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

    return { user: credential.user, role: userRole };
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
    setUser(null);
    setRole(null);
  };

  const value = useMemo(
    () => ({
      user,
      role,
      loading,
      loginWithRole,
      logout,
      isFirebaseConfigured,
    }),
    [user, role, loading]
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
