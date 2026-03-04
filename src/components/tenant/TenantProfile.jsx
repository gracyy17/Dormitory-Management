import React from 'react';
import { useAuth } from '../../context/AuthContext';

function TenantProfile() {
  const { user } = useAuth();

  return (
    <section className="tenant-page">
      <header className="tenant-page-header">
        <h1>My Profile</h1>
        <p>View your account details.</p>
      </header>

      <div className="tenant-profile-card">
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
    </section>
  );
}

export default TenantProfile;
