import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import TenantLayout from '../components/tenant/TenantLayout';
import TenantDues from '../components/tenant/TenantDues';
import TenantMaintenance from '../components/tenant/TenantMaintenance';
import TenantProfile from '../components/tenant/TenantProfile';

function TenantRoutes() {
  return (
    <TenantLayout>
      <Routes>
        <Route index element={<Navigate to="/tenant/dues" replace />} />
        <Route path="dues" element={<TenantDues />} />
        <Route path="maintenance" element={<TenantMaintenance />} />
        <Route path="profile" element={<TenantProfile />} />
        <Route path="*" element={<Navigate to="/tenant/dues" replace />} />
      </Routes>
    </TenantLayout>
  );
}

export default TenantRoutes;
