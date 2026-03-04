import React from 'react';

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
                    >
                      {action.icon || action.label}
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
