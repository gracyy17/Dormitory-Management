import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/TenantPortal.css';
import { CardIcon, PowerIcon, ShieldIcon, UserIcon, WrenchIcon } from '../common/LineIcons';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

function TenantLayout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [tenantName, setTenantName] = useState('Tenant');
  const [tenantPhotoUrl, setTenantPhotoUrl] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('tenantPortalTheme') === 'dark';
  });

  useEffect(() => {
    const loadTenantName = async () => {
      if (!user?.uid || !db) {
        setTenantName('Tenant');
        setTenantPhotoUrl('');
        return;
      }

      try {
        const tenantDoc = await getDoc(doc(db, 'users', user.uid));
        const profile = tenantDoc.exists() ? tenantDoc.data() || {} : {};
        const resolvedName = profile.fullName || profile.name || user.displayName || '';
        const resolvedPhoto = profile.profileImageDataUrl || profile.profileImageUrl || '';
        setTenantPhotoUrl(String(resolvedPhoto || ''));

        if (resolvedName.trim()) {
          setTenantName(resolvedName.trim());
          return;
        }

        const emailFallback = String(user.email || '').split('@')[0] || 'Tenant';
        setTenantName(emailFallback);
      } catch {
        const emailFallback = String(user?.email || '').split('@')[0] || 'Tenant';
        setTenantName(emailFallback);
        setTenantPhotoUrl('');
      }
    };

    loadTenantName();
  }, [user?.uid, user?.email, user?.displayName]);

  const tenantRoleLabel = useMemo(() => 'Tenant', []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('tenantPortalTheme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const items = [
    { to: '/tenant/dues', label: 'Dues', icon: <CardIcon className="ui-icon" size={17} /> },
    { to: '/tenant/maintenance', label: 'Maintenance', icon: <WrenchIcon className="ui-icon" size={17} /> },
    { to: '/tenant/profile', label: 'Profile', icon: <UserIcon className="ui-icon" size={17} /> },
  ];

  return (
    <div className={`tenant-layout${isDarkMode ? ' is-dark' : ''}`}>
      <aside className="tenant-sidebar">
        <div className="tenant-sidebar-brand">
          <div className="tenant-brand-mark" aria-hidden="true">
            <span className="brand-t">T</span>
            <span className="brand-p">P</span>
          </div>
          <h2>MZ Dormitory</h2>
        </div>

        <div className="tenant-sidebar-header">
          <div className="tenant-user-avatar">
            {tenantPhotoUrl ? (
              <img src={tenantPhotoUrl} alt={`${tenantName} profile`} />
            ) : (
              <span className="tenant-user-avatar-fallback" aria-hidden="true">
                {(tenantName || '?').slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="tenant-user-name">{tenantName}</p>
            <p className="tenant-role-badge">
              <ShieldIcon className="ui-icon" size={13} />
              <span>{tenantRoleLabel}</span>
            </p>
          </div>
        </div>

        <nav className="tenant-nav">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={location.pathname === item.to ? 'tenant-nav-link active' : 'tenant-nav-link'}
            >
              <span className="tenant-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="tenant-theme-toggle"
          onClick={() => setIsDarkMode((prev) => !prev)}
        >
          {isDarkMode ? 'Light Mode' : 'Dark Mode'}
        </button>

        <button className="tenant-logout" onClick={logout}>
          <PowerIcon className="ui-icon" size={18} />
        </button>
      </aside>

      <main className="tenant-content">{children}</main>
    </div>
  );
}

export default TenantLayout;
