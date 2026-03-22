import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { CheckCircleIcon, UploadIcon } from '../common/LineIcons';

const toDateLabel = (value) => {
  if (!value) return '-';
  if (typeof value?.toDate === 'function') {
    return value.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const optimizeImageToDataUrl = (file, maxDimension = 640, quality = 0.84) => new Promise((resolve, reject) => {
  const reader = new FileReader();

  reader.onload = () => {
    const image = new Image();

    image.onload = () => {
      const largestSide = Math.max(image.width, image.height) || 1;
      const scale = Math.min(1, maxDimension / largestSide);
      const targetWidth = Math.max(1, Math.round(image.width * scale));
      const targetHeight = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Image processing is unavailable.'));
        return;
      }

      context.drawImage(image, 0, 0, targetWidth, targetHeight);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    image.onerror = () => reject(new Error('Image read failed.'));
    image.src = String(reader.result || '');
  };

  reader.onerror = () => reject(new Error('Image read failed.'));
  reader.readAsDataURL(file);
});

function TenantProfile() {
  const { user, mustChangePassword, changeMyPassword } = useAuth();
  const [photoUrl, setPhotoUrl] = useState('');
  const [profile, setProfile] = useState({});
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoMessage, setPhotoMessage] = useState('');
  const [photoMessageType, setPhotoMessageType] = useState('info');
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [detailsForm, setDetailsForm] = useState({
    fullName: '',
    phone: '',
    emergencyContact: '',
    homeAddress: '',
  });
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState('');
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
    const loadProfile = async () => {
      if (!db || !user?.uid) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() || {};
          setProfile(data);
          setPhotoUrl(data.profileImageDataUrl || data.profileImageUrl || '');
          setDetailsForm({
            fullName: String(data.fullName || ''),
            phone: String(data.phone || ''),
            emergencyContact: String(data.emergencyContact || ''),
            homeAddress: String(data.homeAddress || ''),
          });
        }
      } catch {
        setProfile({});
        setPhotoUrl('');
      }
    };

    loadProfile();
  }, [user?.uid]);

  const handlePhotoSave = async (event) => {
    event.preventDefault();
    setPhotoMessage('');
    setPhotoMessageType('info');

    if (!db || !user?.uid) {
      setPhotoMessage('Profile service is unavailable right now.');
      setPhotoMessageType('error');
      return;
    }

    if (!selectedPhotoFile) {
      setPhotoMessage('Please choose an image file first.');
      setPhotoMessageType('error');
      return;
    }

    if (!selectedPhotoFile.type.startsWith('image/')) {
      setPhotoMessage('Only image files are allowed.');
      setPhotoMessageType('error');
      return;
    }

    if (selectedPhotoFile.size > 300 * 1024) {
      setPhotoMessage('Image is too large. Please use a file under 300KB.');
      setPhotoMessageType('error');
      return;
    }

    setPhotoSaving(true);

    try {
      const imageDataUrl = await optimizeImageToDataUrl(selectedPhotoFile);

      if (!imageDataUrl || imageDataUrl.length > 900000) {
        setPhotoMessage('Image could not be optimized safely. Try a smaller image.');
        setPhotoMessageType('error');
        setPhotoSaving(false);
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        setPhotoMessage('Your tenant profile is not initialized yet. Please contact admin.');
        setPhotoMessageType('error');
        setPhotoSaving(false);
        return;
      }

      await updateDoc(
        userRef,
        {
          profileImageDataUrl: imageDataUrl,
          profileImageUrl: '',
        }
      );

      setPhotoUrl(imageDataUrl);
      setSelectedPhotoFile(null);
      setPhotoPreviewUrl('');
      setPhotoMessage('Profile picture updated successfully.');
      setPhotoMessageType('success');
    } catch (saveError) {
      if (saveError?.code === 'permission-denied') {
        setPhotoMessage('Profile update is blocked by permissions. Please contact admin.');
      } else {
        setPhotoMessage('Unable to update profile picture right now.');
      }
      setPhotoMessageType('error');
    } finally {
      setPhotoSaving(false);
    }
  };

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0] || null;
    setPhotoMessage('');
    setPhotoMessageType('info');
    setSelectedPhotoFile(file);

    if (!file) {
      setPhotoPreviewUrl('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSelectedPhotoFile(null);
      setPhotoPreviewUrl('');
      setPhotoMessage('Only image files are allowed.');
      setPhotoMessageType('error');
      return;
    }

    if (file.size > 300 * 1024) {
      setSelectedPhotoFile(null);
      setPhotoPreviewUrl('');
      setPhotoMessage('Image is too large. Please use a file under 300KB.');
      setPhotoMessageType('error');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPhotoPreviewUrl(objectUrl);
  };

  useEffect(() => {
    if (!photoPreviewUrl) return undefined;
    return () => URL.revokeObjectURL(photoPreviewUrl);
  }, [photoPreviewUrl]);

  const handleDetailInputChange = (event) => {
    const { name, value } = event.target;
    setDetailsForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDetailsSave = async (event) => {
    event.preventDefault();
    setDetailsMessage('');

    if (!db || !user?.uid) {
      setDetailsMessage('Personal details service is unavailable right now.');
      return;
    }

    setDetailsSaving(true);

    try {
      const payload = {
        fullName: detailsForm.fullName.trim(),
        phone: detailsForm.phone.trim(),
        emergencyContact: detailsForm.emergencyContact.trim(),
        homeAddress: detailsForm.homeAddress.trim(),
      };

      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        setDetailsMessage('Your tenant profile is not initialized yet. Please contact admin.');
        setDetailsSaving(false);
        return;
      }

      await updateDoc(userRef, payload);
      setProfile((prev) => ({ ...prev, ...payload }));
      setDetailsMessage('Personal details updated successfully.');
    } catch {
      setDetailsMessage('Unable to save personal details right now.');
    } finally {
      setDetailsSaving(false);
    }
  };

  return (
    <section className="tenant-page tenant-profile-page">
      <header className="tenant-page-header">
        <h1>My Profile</h1>
        <p>View your account details and update your password.</p>
      </header>

      {mustChangePassword && (
        <div className="tenant-callout tenant-callout-warning">
          <strong>Security update required:</strong> Please change your temporary password before using other tenant features.
        </div>
      )}

      <div className="tenant-profile-grid tenant-profile-showcase-grid">
        <article className="tenant-profile-card tenant-profile-card-main">
          <h3>User Profile</h3>

          <form className="tenant-avatar-edit-form" onSubmit={handlePhotoSave}>
            <div className="tenant-profile-avatar-wrap">
              {(photoPreviewUrl || photoUrl) ? (
                <img className="tenant-avatar large" src={photoPreviewUrl || photoUrl} alt="Tenant profile" />
              ) : (
                <div className="tenant-avatar tenant-avatar-fallback large">
                  {(user?.email || '?').slice(0, 1).toUpperCase()}
                </div>
              )}
              <label htmlFor="profile-photo-upload" className="tenant-photo-edit-dot" title="Update profile photo">
                <UploadIcon className="ui-icon" size={13} />
              </label>
              <input
                id="profile-photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
              />
            </div>

            {selectedPhotoFile && <p className="tenant-file-name">{selectedPhotoFile.name}</p>}
            <p className="tenant-photo-hint">Accepted formats: JPG, PNG, WEBP. Max size: 300KB.</p>
            {photoMessage && (
              <p className={`tenant-profile-status ${photoMessageType === 'error' ? 'is-error' : 'is-success'}`}>
                {photoMessage}
              </p>
            )}

            {selectedPhotoFile && (
              <button type="submit" className="tenant-pay-btn tenant-photo-save-btn" disabled={photoSaving}>
                {photoSaving ? 'Saving...' : 'Save Photo'}
              </button>
            )}
          </form>

          <div className="tenant-profile-meta">
            <div>
              <label>Email Address:</label>
              <p>{user?.email || '-'}</p>
            </div>
            <div>
              <label>Account ID (UID):</label>
              <p>{user?.uid || '-'}</p>
            </div>
            <div>
              <label>Email Status:</label>
              <p className="tenant-verified-row">
                <CheckCircleIcon className="ui-icon" size={15} />
                {user?.emailVerified ? 'Verified' : 'Not Verified'}
              </p>
            </div>
          </div>
        </article>

        <form className="tenant-password-form tenant-profile-card" onSubmit={handlePasswordChange}>
          <h3>Account Security</h3>

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

        <article className="tenant-profile-card tenant-profile-card-contact">
          <h3>Personal Contact</h3>
          <div className="tenant-profile-meta">
            <div>
              <label>Phone Number:</label>
              <p>{profile.phone || '-'}</p>
            </div>
            <div>
              <label>Emergency Contact:</label>
              <p>{profile.emergencyContact || '-'}</p>
            </div>
            <div>
              <label>Home Address:</label>
              <p>{profile.homeAddress || '-'}</p>
            </div>
          </div>
        </article>

        <article className="tenant-profile-card tenant-profile-card-details">
          <h3>Personal Details</h3>
          <form className="tenant-profile-edit-form" onSubmit={handleDetailsSave}>
            <div className="tenant-form-group">
              <label htmlFor="tenant-full-name">Full Name</label>
              <input
                id="tenant-full-name"
                name="fullName"
                type="text"
                value={detailsForm.fullName}
                onChange={handleDetailInputChange}
                placeholder="Enter your full name"
              />
            </div>

            <div className="tenant-form-group">
              <label htmlFor="tenant-phone">Phone Number</label>
              <input
                id="tenant-phone"
                name="phone"
                type="text"
                value={detailsForm.phone}
                onChange={handleDetailInputChange}
                placeholder="e.g. +63 917 123 4567"
              />
            </div>

            <div className="tenant-form-group">
              <label htmlFor="tenant-emergency">Emergency Contact</label>
              <input
                id="tenant-emergency"
                name="emergencyContact"
                type="text"
                value={detailsForm.emergencyContact}
                onChange={handleDetailInputChange}
                placeholder="Name (Relation) - Contact Number"
              />
            </div>

            <div className="tenant-form-group">
              <label htmlFor="tenant-address">Home Address</label>
              <textarea
                id="tenant-address"
                name="homeAddress"
                rows={3}
                value={detailsForm.homeAddress}
                onChange={handleDetailInputChange}
                placeholder="Enter your home address"
              />
            </div>

            {detailsMessage && <p className="tenant-payment-status">{detailsMessage}</p>}

            <button type="submit" className="tenant-pay-btn" disabled={detailsSaving}>
              {detailsSaving ? 'Saving...' : 'Save Personal Details'}
            </button>
          </form>
        </article>

        <article className="tenant-profile-card tenant-profile-card-room">
          <h3>Room Assignment</h3>
          <div className="tenant-profile-meta">
            <div>
              <label>Current Room:</label>
              <p>{profile.roomNo || '-'}</p>
            </div>
            <div>
              <label>Bed Assignment:</label>
              <p>{profile.roomBed ? `Bed ${profile.roomBed}` : '-'}</p>
            </div>
            <div>
              <label>Lease Start:</label>
              <p>{toDateLabel(profile.leaseStart)}</p>
            </div>
            <div>
              <label>Lease End:</label>
              <p>{toDateLabel(profile.leaseEnd)}</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default TenantProfile;
