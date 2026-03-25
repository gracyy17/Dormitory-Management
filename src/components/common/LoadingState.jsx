import React from 'react';

function LoadingState({
  title = 'Loading',
  message = 'Please wait while we fetch your data.',
  compact = false,
}) {
  return (
    <div
      className={`app-loading-state${compact ? ' compact' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="app-loading-spinner" aria-hidden="true" />
      <div className="app-loading-content">
        <p className="app-loading-title">{title}</p>
        <p className="app-loading-message">{message}</p>
      </div>
      <div className="app-loading-shimmer" aria-hidden="true" />
    </div>
  );
}

export default LoadingState;
