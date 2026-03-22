import React from 'react';
import { EditIcon, EyeIcon, TrashIcon } from './LineIcons';

function resolveActionIcon(action) {
  if (action?.icon) {
    return action.icon;
  }

  const variant = String(action?.variant || '').toLowerCase();
  const label = String(action?.label || '').toLowerCase();

  if (variant === 'view' || label.includes('view')) {
    return <EyeIcon className="ui-icon" size={15} />;
  }

  if (variant === 'edit' || label.includes('edit') || label.includes('approve')) {
    return <EditIcon className="ui-icon" size={15} />;
  }

  if (variant === 'delete' || label.includes('delete') || label.includes('reject')) {
    return <TrashIcon className="ui-icon" size={15} />;
  }

  return action?.label;
}

function DataTable({ columns, data, actions, striped = true }) {
  return (
    <div className="table-container">
      <table className={`data-table ${striped ? 'striped' : ''}`}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row[col.key], row) : row[col.key]}</td>
              ))}
              {actions && (
                <td className="actions-cell">
                  {actions.map((action) => (
                    <button
                      key={action.label}
                      className={`action-btn ${action.variant}`}
                      onClick={() => action.onClick(row)}
                      title={action.label}
                      aria-label={action.label}
                    >
                      {resolveActionIcon(action)}
                    </button>
                  ))}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <p className="table-empty">No data available</p>
      )}
    </div>
  );
}

export default DataTable;
