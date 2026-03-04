import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/TenantPortal.css';

function TenantLayout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const items = [
    { to: '/tenant/dues', label: 'Dues' },
    { to: '/tenant/maintenance', label: 'Maintenance' },
    { to: '/tenant/profile', label: 'Profile' },
  ];

  return (
    <div className="tenant-layout">
      <aside className="tenant-sidebar">
        <h2>Tenant Portal</h2>
        <p className="tenant-email">{user?.email}</p>

        <nav className="tenant-nav">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={location.pathname === item.to ? 'tenant-nav-link active' : 'tenant-nav-link'}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button className="tenant-logout" onClick={logout}>Logout</button>
      </aside>

      <main className="tenant-content">{children}</main>
    </div>
  );
}

export default TenantLayout;
