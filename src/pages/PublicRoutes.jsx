import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from '../components/public/HomePage';
import LoadingState from '../components/common/LoadingState';

const getPublicLoadingConfig = (pathname) => {
  const path = String(pathname || '').toLowerCase();

  if (path === '/' || path === '') {
    return {
      title: 'Loading Home Page',
      message: 'Preparing amenities, room inclusions, and contact details...',
      skeletonRows: 4,
    };
  }

  return {
    title: 'Loading Public Page',
    message: 'Building the public website view...',
    skeletonRows: 4,
  };
};

function RouteLoadingGate({ children, pathname }) {
  const [isReady, setIsReady] = useState(false);
  const loadingConfig = getPublicLoadingConfig(pathname);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsReady(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  if (!isReady) {
    return (
      <div className="app-auth-loading">
        <LoadingState
          title={loadingConfig.title}
          message={loadingConfig.message}
          skeletonRows={loadingConfig.skeletonRows}
        />
      </div>
    );
  }

  return children;
}

function PublicRoutes() {
  const location = useLocation();

  return (
    <RouteLoadingGate key={location.pathname} pathname={location.pathname}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </RouteLoadingGate>
  );
}

export default PublicRoutes;
