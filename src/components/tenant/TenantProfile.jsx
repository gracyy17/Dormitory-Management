import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';

function TenantProfile() {
  const { user, mustChangePassword, changeMyPassword } = useAuth();
  const [photoUrl, setPhotoUrl] = useState('');
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoMessage, setPhotoMessage] = useState('');
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    if (form.newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      await changeMyPassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess('Password updated successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (changeError) {
      setError(changeError.message || 'Unable to change password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const loadProfilePhoto = async () => {
      if (!db || !user?.uid) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setPhotoUrl(userDoc.data()?.profileImageDataUrl || userDoc.data()?.profileImageUrl || '');
        }
      } catch {
        setPhotoUrl('');
      }
    };

    loadProfilePhoto();
  }, [user?.uid]);

  const handlePhotoSave = async (event) => {
    event.preventDefault();
    setPhotoMessage('');

    if (!db || !user?.uid) {
      setPhotoMessage('Profile service is unavailable right now.');
      return;
    }

    if (!selectedPhotoFile) {
      setPhotoMessage('Please choose an image file first.');
      return;
    }

    if (!selectedPhotoFile.type.startsWith('image/')) {
      setPhotoMessage('Only image files are allowed.');
      return;
    }

    if (selectedPhotoFile.size > 300 * 1024) {
      setPhotoMessage('Image is too large. Please use an image under 300KB.');
      return;
    }

    setPhotoSaving(true);

    try {
      const imageDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Image read failed'));
        reader.readAsDataURL(selectedPhotoFile);
      });

      await setDoc(
        doc(db, 'users', user.uid),
        {
          profileImageDataUrl: imageDataUrl,
          profileImageUrl: '',
        },
        { merge: true }
      );
      setPhotoUrl(imageDataUrl);
      setSelectedPhotoFile(null);
      setPhotoMessage('Profile picture updated successfully.');
    } catch {
      setPhotoMessage('Unable to update profile picture.');
    } finally {
      setPhotoSaving(false);
    }
  };

  return (
    <section className="tenant-page">
      <header className="tenant-page-header">
        <h1>My Profile</h1>
        <p>View your account details and update your password.</p>
      </header>

      {mustChangePassword && (
        <div className="tenant-callout tenant-callout-warning">
          <strong>Security update required:</strong> Please change your temporary password before using other tenant features.
        </div>
      )}

      <div className="tenant-profile-card">
        <div>
          <label>Profile Picture</label>
          <div className="tenant-avatar-wrap">
            {photoUrl ? (
              <img className="tenant-avatar" src={photoUrl} alt="Tenant profile" />
            ) : (
              <div className="tenant-avatar tenant-avatar-fallback">
                {(user?.email || '?').slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div>
          <label>Email</label>
          <p>{user?.email || '-'}</p>
        </div>
        <div>
          <label>UID</label>
          <p>{user?.uid || '-'}</p>
        </div>
        <div>
          <label>Email Verified</label>
          <p>{user?.emailVerified ? 'Yes' : 'No'}</p>
        </div>
      </div>

      <form className="tenant-password-form" onSubmit={handlePhotoSave}>
        <h3>Edit Profile Picture</h3>
        <div className="tenant-form-group">
          <label htmlFor="profile-photo-upload">Upload Profile Image</label>
          <input
            id="profile-photo-upload"
            type="file"
            accept="image/*"
            onChange={(event) => setSelectedPhotoFile(event.target.files?.[0] || null)}
          />
        </div>

        {photoMessage && <p className="tenant-payment-status">{photoMessage}</p>}

        <button type="submit" className="tenant-pay-btn" disabled={photoSaving}>
          {photoSaving ? 'Saving...' : 'Save Profile Picture'}
        </button>
      </form>

      <form className="tenant-password-form" onSubmit={handlePasswordChange}>
        <h3>Change Password</h3>

        <div className="tenant-form-group">
          <label htmlFor="current-password">Current Password</label>
          <input
            id="current-password"
            type="password"
            name="currentPassword"
            value={form.currentPassword}
            onChange={handleChange}
            required
          />
        </div>

        <div className="tenant-form-group">
          <label htmlFor="new-password">New Password</label>
          <input
            id="new-password"
            type="password"
            name="newPassword"
            value={form.newPassword}
            onChange={handleChange}
            minLength={6}
            required
          />
        </div>

        <div className="tenant-form-group">
          <label htmlFor="confirm-password">Confirm New Password</label>
          <input
            id="confirm-password"
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            minLength={6}
            required
          />
        </div>

        {error && <p className="tenant-form-error">{error}</p>}
        {success && <p className="tenant-form-success">{success}</p>}

        <button type="submit" className="tenant-pay-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </section>
  );
}

export default TenantProfile;
