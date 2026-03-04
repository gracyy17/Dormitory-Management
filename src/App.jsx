import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PublicRoutes from './pages/PublicRoutes';
import AdminRoutes from './pages/AdminRoutes';
import TenantRoutes from './pages/TenantRoutes';
import AdminLogin from './components/admin/AdminLogin';
import TenantLogin from './components/public/TenantLogin';
import { AuthProvider, useAuth } from './context/AuthContext';

function RequireRole({ role: expectedRole, children, redirectTo }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="App" style={{ padding: '2rem' }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (expectedRole && role !== expectedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/tenant/login" element={<TenantLogin />} />
            <Route
              path="/admin/*"
              element={(
                <RequireRole role="admin" redirectTo="/admin/login">
                  <AdminRoutes />
                </RequireRole>
              )}
            />
            <Route
              path="/tenant/*"
              element={(
                <RequireRole role="tenant" redirectTo="/tenant/login">
                  <TenantRoutes />
                </RequireRole>
              )}
            />
            <Route path="/*" element={<PublicRoutes />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;