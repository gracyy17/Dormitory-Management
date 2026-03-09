import React from 'react';
import Dashboard from '../components/admin/Dashboard';
import RoomsManagement from '../components/admin/RoomsManagement';
import TenantsManagement from '../components/admin/TenantsManagement';
import PaymentsManagement from '../components/admin/PaymentsManagement';
import { Routes, Route, Navigate } from 'react-router-dom';

function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="rooms" element={<RoomsManagement />} />
      <Route path="tenants" element={<TenantsManagement />} />
      <Route path="payments" element={<PaymentsManagement />} />
      <Route path="maintenance" element={<Dashboard />} />
      <Route path="reports" element={<Dashboard />} />
      <Route path="users" element={<Dashboard />} />
      <Route path="settings" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export default AdminRoutes;
