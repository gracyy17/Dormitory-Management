import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import { useAuth } from '../../context/AuthContext';

function TenantsManagement() {
  const { createTenantAccount, isFirebaseConfigured } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    roomNo: '',
    phone: '',
    profileImageUrl: '',
    email: '',
    password: '',
    confirmPassword: '',
    notifyEmail: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await createTenantAccount({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        roomNo: form.roomNo.trim(),
        phone: form.phone.trim(),
        profileImageUrl: form.profileImageUrl.trim(),
        notifyEmail: form.notifyEmail,
      });

      setSuccess(`Tenant account created: ${created.email}. Share the temporary password and ask tenant to change it after login.`);
      setForm({
        fullName: '',
        roomNo: '',
        phone: '',
        profileImageUrl: '',
        email: '',
        password: '',
        confirmPassword: '',
        notifyEmail: true,
      });
    } catch (creationError) {
      setError(creationError.message || 'Unable to create tenant account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="rooms-management-page">
        <div className="page-header">
          <h1>Tenants Management</h1>
          <p className="page-subtitle">Create tenant login credentials from the admin portal.</p>
        </div>

        <section className="dashboard-widget">
          <div className="widget-header">
            <h2>Create Tenant Account</h2>
          </div>

          <form className="add-room-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Tenant Name</label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="e.g., Juan Dela Cruz"
                required
              />
            </div>

            <div className="form-group">
              <label>Room Number</label>
              <input
                type="text"
                name="roomNo"
                value={form.roomNo}
                onChange={handleChange}
                placeholder="e.g., 201"
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="e.g., 09171234567"
              />
            </div>

            <div className="form-group">
              <label>Profile Picture URL</label>
              <input
                type="url"
                name="profileImageUrl"
                value={form.profileImageUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
              {form.profileImageUrl && (
                <img
                  src={form.profileImageUrl}
                  alt="Tenant preview"
                  style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', marginTop: 8 }}
                />
              )}
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="tenant@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Temporary Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="notifyEmail"
                  checked={form.notifyEmail}
                  onChange={handleChange}
                  style={{ marginRight: 8 }}
                />
                Enable email due reminders
              </label>
            </div>

            {error && <p style={{ color: '#b91c1c', marginTop: 4 }}>{error}</p>}
            {success && <p style={{ color: '#166534', marginTop: 4 }}>{success}</p>}

            <div className="modal-actions" style={{ marginTop: 8 }}>
              <button type="submit" className="btn-primary" disabled={isSubmitting || !isFirebaseConfigured}>
                {isSubmitting ? 'Creating...' : 'Create Tenant Account'}
              </button>
            </div>
          </form>

          {!isFirebaseConfigured && (
            <p className="page-subtitle" style={{ marginTop: 12 }}>
              Firebase env values are missing. Add VITE_FIREBASE_* variables first.
            </p>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

export default TenantsManagement;
