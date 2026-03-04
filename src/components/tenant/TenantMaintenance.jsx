import React from 'react';
import DataTable from '../common/DataTable';
import StatusBadge from '../common/StatusBadge';

function TenantMaintenance() {
  const requests = [
    { issue: 'Leaking faucet', createdAt: '2026-02-20', priority: 'Normal', status: 'Pending' },
    { issue: 'Broken light bulb', createdAt: '2026-02-12', priority: 'Low', status: 'Paid' },
    { issue: 'Aircon cleaning', createdAt: '2026-01-28', priority: 'Normal', status: 'Overdue' },
  ];

  const columns = [
    { key: 'issue', label: 'Issue' },
    { key: 'createdAt', label: 'Date Filed' },
    { key: 'priority', label: 'Priority' },
    {
      key: 'status',
      label: 'Status',
      render: (status) => <StatusBadge status={status} type={status.toLowerCase()} />,
    },
  ];

  return (
    <section className="tenant-page">
      <header className="tenant-page-header">
        <h1>Maintenance Requests</h1>
        <p>Monitor room concerns and request history.</p>
      </header>

      <div className="tenant-callout">
        For new requests, contact admin via front desk while we connect this form to Firestore.
      </div>

      <div className="tenant-table-wrap">
        <DataTable columns={columns} data={requests} />
      </div>
    </section>
  );
}

export default TenantMaintenance;
