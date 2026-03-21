import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

function Sidebar({ isOpen, onToggle, onLogout }) {
  const location = useLocation();
  const [tenantMenuOpen, setTenantMenuOpen] = useState(location.pathname.startsWith('/admin/tenants'));

  useEffect(() => {
    if (location.pathname.startsWith('/admin/tenants')) {
      setTenantMenuOpen(true);
    }
  }, [location.pathname]);

  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/rooms', label: 'Rooms', icon: '🏠' },
    { path: '/admin/payments', label: 'Payments', icon: '💳' },
    { path: '/admin/maintenance', label: 'Maintenance', icon: '🔧' },
    { path: '/admin/reports', label: 'Reports', icon: '📑' },
    { path: '/admin/users', label: 'Users', icon: '👤' },
    { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">🏢</span>
          {isOpen && <span className="logo-text">DormC</span>}
        </div>
        <button className="toggle-btn" onClick={onToggle}>
          {isOpen ? '←' : '→'}
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className={`nav-group ${location.pathname.startsWith('/admin/tenants') ? 'active-group' : ''}`}>
          <button
            type="button"
            className={`nav-item nav-group-toggle ${location.pathname.startsWith('/admin/tenants') ? 'active' : ''}`}
            onClick={() => {
              if (!isOpen) return;
              setTenantMenuOpen((prev) => !prev);
            }}
            title={!isOpen ? 'Tenants' : ''}
          >
            <span className="nav-icon">👥</span>
            {isOpen && <span className="nav-label">Tenants</span>}
            {isOpen && <span className="nav-caret">{tenantMenuOpen ? '▾' : '▸'}</span>}
          </button>

          {isOpen && tenantMenuOpen && (
            <div className="nav-submenu">
              <Link
                to="/admin/tenants/create"
                className={`nav-sub-item ${location.pathname === '/admin/tenants/create' ? 'active' : ''}`}
              >
                Create Tenant Account
              </Link>
              <Link
                to="/admin/tenants/overview"
                className={`nav-sub-item ${location.pathname === '/admin/tenants/overview' ? 'active' : ''}`}
              >
                Tenant Payment Overview
              </Link>
            </div>
          )}

          {!isOpen && (
            <Link to="/admin/tenants/create" className="nav-item" title="Tenants">
              <span className="nav-icon">👥</span>
            </Link>
          )}
        </div>

        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            title={!isOpen ? item.label : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {isOpen && <span className="nav-label">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogout} title="Logout">
          {isOpen ? '🚪 Logout' : '🚪'}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
