import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavBar from './TopNavBar';
import LoadingState from '../common/LoadingState';
import '../../styles/AdminDashboard.css';
import { useAuth } from '../../context/AuthContext';

function RouteLoadingGate({ children }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsReady(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  if (!isReady) {
    return (
      <LoadingState
        title="Loading Admin Page"
        message="Preparing dashboard data and widgets..."
        skeletonRows={6}
      />
    );
  }

  return children;
}

function AdminLayout({ children }) {
  const location = useLocation();
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
          <RouteLoadingGate key={location.pathname}>{children}</RouteLoadingGate>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
