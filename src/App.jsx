import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PublicRoutes from './pages/PublicRoutes';
import AdminRoutes from './pages/AdminRoutes';
import AdminLogin from './components/admin/AdminLogin';
import TenantRoutes from './pages/TenantRoutes';
import TenantLogin from './components/public/TenantLogin';
import LoadingState from './components/common/LoadingState';
import { AuthProvider, useAuth } from './context/AuthContext';

function RequireRole({ role: expectedRole, children, redirectTo }) {
  const { user, role, loading } = useAuth();
  const isDarkModeEnabled =
    typeof window !== 'undefined'
    && (
      window.localStorage.getItem('admin_dark_mode') === 'true'
      || window.localStorage.getItem('tenantPortalTheme') === 'dark'
    );

  if (loading) {
    return (
      <div className={`app-auth-loading${isDarkModeEnabled ? ' is-dark' : ''}`}>
        <LoadingState simple />
      </div>
    );
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
            <Route
              path="/admin/*"
              element={(
                <RequireRole role="admin" redirectTo="/admin/login">
                  <AdminRoutes />
                </RequireRole>
              )}
            />
            <Route path="/tenant/login" element={<TenantLogin />} />
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
