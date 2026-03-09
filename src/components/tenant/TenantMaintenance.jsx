import React, { useState } from 'react';
import DataTable from '../common/DataTable';
import StatusBadge from '../common/StatusBadge';

function TenantMaintenance() {
  const [issueText, setIssueText] = useState('');
  const [submitStatus, setSubmitStatus] = useState('');
  const [requests, setRequests] = useState([
    { issue: 'Leaking faucet', createdAt: '2026-02-20', priority: 'Normal', status: 'Pending' },
    { issue: 'Broken light bulb', createdAt: '2026-02-12', priority: 'Low', status: 'Paid' },
    { issue: 'Aircon cleaning', createdAt: '2026-01-28', priority: 'Normal', status: 'Overdue' },
  ]);

  const handleSubmitIssue = (event) => {
    event.preventDefault();

    const trimmedIssue = issueText.trim();
    if (!trimmedIssue) {
      setSubmitStatus('Please describe your room maintenance concern.');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    setRequests((prev) => [
      {
        issue: trimmedIssue,
        createdAt: today,
        priority: 'Normal',
        status: 'Pending',
      },
      ...prev,
    ]);

    setIssueText('');
    setSubmitStatus('Maintenance request submitted. Admin will review it soon.');
  };

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

      <form className="tenant-maintenance-form" onSubmit={handleSubmitIssue}>
        <label htmlFor="maintenance-issue">Describe the maintenance needed in your room</label>
        <textarea
          id="maintenance-issue"
          value={issueText}
          onChange={(event) => setIssueText(event.target.value)}
          rows={4}
          placeholder="Example: The sink in Room 201 is leaking and water is dripping continuously."
        />

        <button type="submit" className="tenant-pay-btn">Submit Maintenance Request</button>

        {submitStatus && <p className="tenant-payment-status">{submitStatus}</p>}
      </form>

      <div className="tenant-table-wrap">
        <DataTable columns={columns} data={requests} />
      </div>
    </section>
  );
}

export default TenantMaintenance;
