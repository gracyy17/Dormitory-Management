import React from 'react';

function StatusBadge({ status, type }) {
  const statusClass = type || status.toLowerCase().replace(' ', '-');
  return <span className={`status-badge ${statusClass}`}>{status}</span>;
}

export default StatusBadge;
