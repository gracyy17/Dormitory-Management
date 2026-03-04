import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopNavBar from './TopNavBar';
import '../../styles/AdminDashboard.css';
import { useAuth } from '../../context/AuthContext';

function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { logout } = useAuth();

  return (
    <div className="admin-layout">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} onLogout={logout} />
      <div className="admin-main-content">
        <TopNavBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="admin-page-content">
          {children}
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
