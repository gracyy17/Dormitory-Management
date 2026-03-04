import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from '../components/public/HomePage';

function PublicRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/client/login" element={<Navigate to="/admin/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default PublicRoutes;
