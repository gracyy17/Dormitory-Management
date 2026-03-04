import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

function TopNavBar({ onMenuToggle }) {
  const [showProfile, setShowProfile] = useState(false);
  const [notifications] = useState(3);
  const { user, logout } = useAuth();

  return (
    <div className="top-navbar">
      <div className="navbar-left">
        <button className="menu-toggle" onClick={onMenuToggle}>
          ☰
        </button>
        <div className="search-box">
          <input type="text" placeholder="Search rooms, tenants, payments..." />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      <div className="navbar-right">
        <button className="notification-btn">
          🔔
          {notifications > 0 && <span className="badge">{notifications}</span>}
        </button>

        <div className="profile-menu">
          <button className="profile-btn" onClick={() => setShowProfile(!showProfile)}>
            👤
            <span className="user-name">{user?.email || 'Admin User'}</span>
          </button>

          {showProfile && (
            <div className="profile-dropdown">
              <a href="#profile">Profile</a>
              <a href="#settings">Settings</a>
              <a href="#help">Help</a>
              <hr />
              <button className="profile-logout-btn" onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TopNavBar;
