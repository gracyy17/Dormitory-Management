import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import DataTable from '../common/DataTable';
import StatusBadge from '../common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';

function TenantMaintenance() {
  const { user } = useAuth();
  const [issueText, setIssueText] = useState('');
  const [submitStatus, setSubmitStatus] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!db || !user?.uid) {
      setRequests([]);
      return undefined;
    }

    const requestsQuery = query(collection(db, 'maintenanceRequests'), where('tenantUid', '==', user.uid));

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const rows = snapshot.docs
          .map((item) => {
            const data = item.data() || {};
            const created = data.createdAt?.toDate ? data.createdAt.toDate().toISOString().slice(0, 10) : '-';

            return {
              id: item.id,
              issue: data.issue || '-',
              createdAt: created,
              priority: data.priority || 'Normal',
              status: data.status || 'Pending',
            };
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        setRequests(rows);
      },
      () => {
        setRequests([]);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  const handleSubmitIssue = async (event) => {
    event.preventDefault();

    const trimmedIssue = issueText.trim();
    if (!trimmedIssue) {
      setSubmitStatus('Please describe your room maintenance concern.');
      return;
    }

    if (!db || !user?.uid) {
      setSubmitStatus('Unable to submit maintenance request right now.');
      return;
    }

    try {
      await addDoc(collection(db, 'maintenanceRequests'), {
        tenantUid: user.uid,
        tenantEmail: user.email || '',
        issue: trimmedIssue,
        priority,
        status: 'Pending',
        createdAt: serverTimestamp(),
      });
    } catch {
      setSubmitStatus('Unable to submit maintenance request right now.');
      return;
    }

    setIssueText('');
    setPriority('Normal');
    setSubmitStatus('Maintenance request submitted. Admin will review it soon.');
  };

  const requestRows = useMemo(() => requests, [requests]);

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

        <label htmlFor="maintenance-priority">Priority</label>
        <select
          id="maintenance-priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
        >
          <option value="Low">Low</option>
          <option value="Normal">Normal</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>

        <button type="submit" className="tenant-pay-btn">Submit Maintenance Request</button>

        {submitStatus && <p className="tenant-payment-status">{submitStatus}</p>}
      </form>

      <div className="tenant-table-wrap">
        <DataTable columns={columns} data={requestRows} />
      </div>
    </section>
  );
}

export default TenantMaintenance;
