import React from 'react';
import Dashboard from '../components/admin/Dashboard';
import RoomsManagement from '../components/admin/RoomsManagement';
import TenantsManagement from '../components/admin/TenantsManagement';
import PaymentsManagement from '../components/admin/PaymentsManagement';
import MaintenanceManagement from '../components/admin/MaintenanceManagement';
import ReportsManagement from '../components/admin/ReportsManagement';
import UsersManagement from '../components/admin/UsersManagement';
import SettingsManagement from '../components/admin/SettingsManagement';
import { Routes, Route, Navigate } from 'react-router-dom';

function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="rooms" element={<RoomsManagement />} />
      <Route path="tenants" element={<Navigate to="/admin/tenants/create" replace />} />
      <Route path="tenants/create" element={<TenantsManagement section="create" />} />
      <Route path="tenants/overview" element={<TenantsManagement section="overview" />} />
      <Route path="payments" element={<PaymentsManagement />} />
      <Route path="maintenance" element={<MaintenanceManagement />} />
      <Route path="reports" element={<ReportsManagement />} />
      <Route path="users" element={<UsersManagement />} />
      <Route path="settings" element={<SettingsManagement />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export default AdminRoutes;
