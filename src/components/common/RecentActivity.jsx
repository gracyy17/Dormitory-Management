import React from 'react';
import StatusBadge from './StatusBadge';

function RecentActivity({ activities, limit = 6 }) {
  return (
    <div className="activity-list">
      {activities.slice(0, limit).map((activity, idx) => (
        <div key={idx} className="activity-item">
          <div className="activity-icon">{activity.icon}</div>
          <div className="activity-details">
            <p className="activity-text">{activity.message}</p>
            <p className="activity-time">{activity.time}</p>
          </div>
          {activity.status && <StatusBadge status={activity.status} />}
        </div>
      ))}
    </div>
  );
}

export default RecentActivity;
