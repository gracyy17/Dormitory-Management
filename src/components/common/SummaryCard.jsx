import React from 'react';

function SummaryCard({ icon, title, value, subtitle, color, trend }) {
  return (
    <div className={`summary-card ${color}`}>
      <div className="card-icon">{icon}</div>
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <p className="card-value">{value}</p>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
        {trend && <p className={`card-trend ${trend.type}`}>{trend.text}</p>}
      </div>
    </div>
  );
}

export default SummaryCard;
