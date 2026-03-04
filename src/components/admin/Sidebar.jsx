import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Sidebar({ isOpen, onToggle, onLogout }) {
  const location = useLocation();

  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/rooms', label: 'Rooms', icon: '🏠' },
    { path: '/admin/tenants', label: 'Tenants', icon: '👥' },
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
