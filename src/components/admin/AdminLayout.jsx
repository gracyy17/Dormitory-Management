import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopNavBar from './TopNavBar';
import '../../styles/AdminDashboard.css';
import { useAuth } from '../../context/AuthContext';

function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = window.localStorage.getItem('admin_dark_mode');
    return saved === 'true';
  });
  const { logout } = useAuth();

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      window.localStorage.setItem('admin_dark_mode', String(next));
      return next;
    });
  };

  return (
    <div className={`admin-layout ${darkMode ? 'dark-mode' : ''}`}>
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} onLogout={logout} />
      <div className="admin-main-content">
        <TopNavBar
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isDarkMode={darkMode}
          onToggleTheme={toggleDarkMode}
        />
        <div className="admin-page-content">
          {children}
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
