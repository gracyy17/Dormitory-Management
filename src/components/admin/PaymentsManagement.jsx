import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import AdminLayout from './AdminLayout';
import DataTable from '../common/DataTable';
import StatusBadge from '../common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../lib/firebase';

function PaymentsManagement() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');

  const reminderEndpoint = import.meta.env.VITE_SEND_DUE_REMINDERS_URL
    || (import.meta.env.VITE_FIREBASE_PROJECT_ID
      ? `https://asia-southeast1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/sendDueRemindersNow`
      : '');

  useEffect(() => {
    if (!db) {
      setError('Firestore is not configured.');
      setIsLoading(false);
      return undefined;
    }

    const paymentsQuery = query(collection(db, 'payments'), orderBy('submittedAt', 'desc'));

    const unsubscribe = onSnapshot(
      paymentsQuery,
      (snapshot) => {
        const records = snapshot.docs.map((paymentDoc) => ({
          id: paymentDoc.id,
          ...paymentDoc.data(),
        }));
        setPayments(records);
        setIsLoading(false);
      },
      () => {
        setError('Unable to load payments right now.');
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const handleReview = async (payment, nextStatus) => {
    if (!db || !user?.uid) return;

    try {
      await updateDoc(doc(db, 'payments', payment.id), {
        status: nextStatus,
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
      });
    } catch {
      setError('Unable to update payment status.');
    }
  };

  const handleSendRemindersNow = async () => {
    setReminderMessage('');

    if (!auth?.currentUser) {
      setReminderMessage('No authenticated admin session found. Please log in again.');
      return;
    }

    if (!reminderEndpoint) {
      setReminderMessage('Reminder endpoint is not configured. Set VITE_SEND_DUE_REMINDERS_URL.');
      return;
    }

    setIsSendingReminder(true);

    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(reminderEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        setReminderMessage(result?.message || 'Unable to send reminder emails right now.');
        return;
      }

      setReminderMessage(`Reminder run complete: ${result.emailSent || 0} emails sent from ${result.checked || 0} dues checked.`);
    } catch {
      setReminderMessage('Unable to send reminder emails right now.');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const columns = [
    {
      key: 'tenantEmail',
      label: 'Tenant',
      render: (email, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {row.tenantProfileImageUrl ? (
            <img
              src={row.tenantProfileImageUrl}
              alt={email || 'Tenant'}
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: '#374151',
              }}
            >
              {(email || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
          <span>{email}</span>
        </div>
      ),
    },
    { key: 'billingMonth', label: 'Billing Month' },
    { key: 'amount', label: 'Amount' },
    { key: 'method', label: 'Method' },
    { key: 'referenceNumber', label: 'Reference No.' },
    {
      key: 'receiptUrl',
      label: 'Receipt',
      render: (url) => (
        url ? (
          <a href={url} target="_blank" rel="noreferrer">
            View Receipt
          </a>
        ) : (
          <span>-</span>
        )
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (status) => (
        <StatusBadge
          status={status}
          type={String(status || '').toLowerCase().replace(' ', '-')}
        />
      ),
    },
    { key: 'verificationReason', label: 'Verification Note' },
  ];

  const actions = [
    {
      label: 'Approve',
      icon: '✅',
      variant: 'edit',
      onClick: (payment) => handleReview(payment, 'Approved'),
    },
    {
      label: 'Reject',
      icon: '❌',
      variant: 'delete',
      onClick: (payment) => handleReview(payment, 'Rejected'),
    },
  ];

  return (
    <AdminLayout>
      <div className="rooms-management-page">
        <div className="page-header">
          <h1>Payments Review Queue</h1>
          <p className="page-subtitle">Review tenant receipt uploads and update payment status.</p>
        </div>

        <section className="dashboard-widget">
          <div className="widget-header">
            <h2>Submitted Payments ({payments.length})</h2>
            <button className="btn-primary" onClick={handleSendRemindersNow} disabled={isSendingReminder}>
              {isSendingReminder ? 'Sending...' : 'Send Reminder Emails Now'}
            </button>
          </div>

          {reminderMessage && <p style={{ marginBottom: 12 }}>{reminderMessage}</p>}

          {isLoading && <p>Loading payments...</p>}
          {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
          {!isLoading && <DataTable columns={columns} data={payments} actions={actions} />}
        </section>
      </div>
    </AdminLayout>
  );
}

export default PaymentsManagement;
