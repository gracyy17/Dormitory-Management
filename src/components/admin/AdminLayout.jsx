import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavBar from './TopNavBar';
import LoadingState from '../common/LoadingState';
import '../../styles/AdminDashboard.css';
import { useAuth } from '../../context/AuthContext';

const getAdminLoadingConfig = (pathname) => {
  const path = String(pathname || '').toLowerCase();

  if (path === '/admin' || path === '/admin/') {
    return {
      title: 'Loading Dashboard',
      message: 'Collecting rooms, dues, tenants, and payment metrics...',
      skeletonRows: 4,
    };
  }

  if (path.includes('/admin/rooms')) {
    return {
      title: 'Loading Rooms',
      message: 'Preparing room occupancy and bed slot details...',
      skeletonRows: 5,
    };
  }

  if (path.includes('/admin/tenants')) {
    return {
      title: 'Loading Tenants',
      message: 'Fetching tenant records and dues snapshots...',
      skeletonRows: 6,
    };
  }

  if (path.includes('/admin/payments')) {
    return {
      title: 'Loading Payments',
      message: 'Preparing payment queue and receipt verification data...',
      skeletonRows: 6,
    };
  }

  if (path.includes('/admin/maintenance')) {
    return {
      title: 'Loading Maintenance',
      message: 'Checking active maintenance requests and statuses...',
      skeletonRows: 5,
    };
  }

  if (path.includes('/admin/reports')) {
    return {
      title: 'Loading Reports',
      message: 'Generating occupancy and financial report views...',
      skeletonRows: 5,
    };
  }

  if (path.includes('/admin/users')) {
    return {
      title: 'Loading Users',
      message: 'Preparing account access and role information...',
      skeletonRows: 5,
    };
  }

  if (path.includes('/admin/settings')) {
    return {
      title: 'Loading Settings',
      message: 'Loading account preferences and system defaults...',
      skeletonRows: 4,
    };
  }

  return {
    title: 'Loading Admin Page',
    message: 'Preparing admin workspace...',
    skeletonRows: 5,
  };
};

function RouteLoadingGate({ children, pathname }) {
  const [isReady, setIsReady] = useState(false);
  const loadingConfig = getAdminLoadingConfig(pathname);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsReady(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  if (!isReady) {
    return (
      <LoadingState
        title={loadingConfig.title}
        message={loadingConfig.message}
        skeletonRows={loadingConfig.skeletonRows}
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
          <RouteLoadingGate key={location.pathname} pathname={location.pathname}>{children}</RouteLoadingGate>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
