import React from 'react';

function LoadingState({
  title = 'Loading',
  message = 'Please wait while we fetch your data.',
  compact = false,
  skeletonRows = 3,
}) {
  const safeRows = Math.max(0, Number(skeletonRows) || 0);

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
        {safeRows > 0 && (
          <div className="app-loading-skeleton" aria-hidden="true">
            {Array.from({ length: safeRows }).map((_, index) => (
              <span
                key={`loading-skeleton-${index}`}
                className={`app-loading-skeleton-line ${index === 0 ? 'is-long' : ''}`}
                style={{ animationDelay: `${index * 0.08}s` }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="app-loading-shimmer" aria-hidden="true" />
    </div>
  );
}

export default LoadingState;
