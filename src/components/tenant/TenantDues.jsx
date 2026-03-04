import React from 'react';
import DataTable from '../common/DataTable';
import StatusBadge from '../common/StatusBadge';

function TenantDues() {
  const dues = [
    { month: 'January 2026', amount: '₱5,000', dueDate: '2026-01-05', status: 'Paid' },
    { month: 'February 2026', amount: '₱5,000', dueDate: '2026-02-05', status: 'Paid' },
    { month: 'March 2026', amount: '₱5,000', dueDate: '2026-03-05', status: 'Pending' },
    { month: 'April 2026', amount: '₱5,000', dueDate: '2026-04-05', status: 'Pending' },
  ];

  const columns = [
    { key: 'month', label: 'Billing Month' },
    { key: 'amount', label: 'Amount' },
    { key: 'dueDate', label: 'Due Date' },
    {
      key: 'status',
      label: 'Status',
      render: (status) => <StatusBadge status={status} type={status.toLowerCase()} />,
    },
  ];

  return (
    <section className="tenant-page">
      <header className="tenant-page-header">
        <h1>My Dues</h1>
        <p>Track your monthly payments and due dates.</p>
      </header>

      <div className="tenant-summary-grid">
        <article className="tenant-summary-card">
          <h3>Current Balance</h3>
          <p>₱5,000</p>
        </article>
        <article className="tenant-summary-card">
          <h3>Next Due Date</h3>
          <p>March 05, 2026</p>
        </article>
        <article className="tenant-summary-card">
          <h3>Payment Status</h3>
          <p>Pending</p>
        </article>
      </div>

      <div className="tenant-table-wrap">
        <DataTable columns={columns} data={dues} />
      </div>
    </section>
  );
}

export default TenantDues;
