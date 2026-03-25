import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from '../components/public/HomePage';
import LoadingState from '../components/common/LoadingState';

function RouteLoadingGate({ children }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsReady(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  if (!isReady) {
    return (
      <div className="app-auth-loading">
        <LoadingState
          title="Loading Public Page"
          message="Building the public website view..."
          skeletonRows={5}
        />
      </div>
    );
  }

  return children;
}

function PublicRoutes() {
  const location = useLocation();

  return (
    <RouteLoadingGate key={location.pathname}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </RouteLoadingGate>
  );
}

export default PublicRoutes;
