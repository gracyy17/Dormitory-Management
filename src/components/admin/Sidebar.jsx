import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BrandIcon,
  CardIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DashboardIcon,
  HomeIcon,
  LogoutIcon,
  ReportIcon,
  UserIcon,
  UsersIcon,
  WrenchIcon,
} from '../common/LineIcons';

function Sidebar({ isOpen, onToggle, onLogout }) {
  const location = useLocation();

  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: <DashboardIcon className="ui-icon" /> },
    { path: '/admin/rooms', label: 'Rooms', icon: <HomeIcon className="ui-icon" /> },
    { path: '/admin/tenants/overview', label: 'Tenant Management', icon: <UsersIcon className="ui-icon" /> },
    { path: '/admin/payments', label: 'Payments', icon: <CardIcon className="ui-icon" /> },
    { path: '/admin/maintenance', label: 'Maintenance', icon: <WrenchIcon className="ui-icon" /> },
    { path: '/admin/reports', label: 'Reports', icon: <ReportIcon className="ui-icon" /> },
    { path: '/admin/users', label: 'Users', icon: <UserIcon className="ui-icon" /> },
  ];

  const isActivePath = (itemPath) => {
    if (itemPath === '/admin') return location.pathname === '/admin';
    if (itemPath.startsWith('/admin/tenants')) return location.pathname.startsWith('/admin/tenants');
    return location.pathname === itemPath;
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon"><BrandIcon className="ui-icon" size={22} /></span>
          {isOpen && <span className="logo-text">MZ Dormitory</span>}
        </div>
        <button className="toggle-btn" onClick={onToggle}>
          {isOpen ? <ChevronLeftIcon className="ui-icon" size={16} /> : <ChevronRightIcon className="ui-icon" size={16} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${isActivePath(item.path) ? 'active' : ''}`}
            title={!isOpen ? item.label : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {isOpen && <span className="nav-label">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogout} title="Logout">
          <LogoutIcon className="ui-icon" />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
