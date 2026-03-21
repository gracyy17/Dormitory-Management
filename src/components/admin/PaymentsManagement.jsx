import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
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
  const [dues, setDues] = useState([]);
  const [reviewItems, setReviewItems] = useState([]);
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

    const unsubscribePayments = onSnapshot(
      collection(db, 'payments'),
      (snapshot) => {
        const records = snapshot.docs.map((paymentDoc) => ({
          id: paymentDoc.id,
          sourceType: 'payment',
          ...paymentDoc.data(),
        }));
        setPayments(records);
      },
      () => {
        setError('Unable to load payments right now.');
        setIsLoading(false);
      }
    );

    const unsubscribeDues = onSnapshot(
      collection(db, 'dues'),
      (snapshot) => {
        const records = snapshot.docs.map((dueDoc) => ({
          id: dueDoc.id,
          sourceType: 'due',
          ...dueDoc.data(),
        }));
        setDues(records);
        setIsLoading(false);
      },
      () => {
        setError('Unable to load dues right now.');
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribePayments();
      unsubscribeDues();
    };
  }, []);

  useEffect(() => {
    const paymentItems = payments.map((item) => ({
      ...item,
      sortAt: item.submittedAt?.toDate?.()?.getTime?.() || 0,
    }));

    const dueItems = dues.map((item) => ({
      ...item,
      method: item.method || 'Billing',
      referenceNumber: item.referenceNumber || '-',
      receiptUrl: item.receiptUrl || '',
      verificationReason: item.verificationReason || 'Billing record',
      sortAt: item.updatedAt?.toDate?.()?.getTime?.() || item.createdAt?.toDate?.()?.getTime?.() || 0,
    }));

    const merged = [...paymentItems, ...dueItems].sort((a, b) => b.sortAt - a.sortAt);
    setReviewItems(merged);
  }, [payments, dues]);

  const handleReview = async (item, nextStatus) => {
    if (!db || !user?.uid) return;

    try {
      if (item.sourceType === 'payment') {
        await updateDoc(doc(db, 'payments', item.id), {
          status: nextStatus,
          reviewedBy: user.uid,
          reviewedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, 'dues', item.id), {
          status: nextStatus === 'Approved' ? 'Paid' : 'Overdue',
          updatedBy: user.uid,
          updatedByEmail: user.email || null,
          updatedAt: serverTimestamp(),
        });
      }
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
        body: JSON.stringify({ forceSend: true }),
      });

      const rawText = await response.text();
      let result = {};

      try {
        result = rawText ? JSON.parse(rawText) : {};
      } catch {
        result = { message: rawText || '' };
      }

      if (!response.ok) {
        const backendMessage = result?.message || `Request failed with status ${response.status}.`;
        setReminderMessage(`Unable to send reminder emails right now. ${backendMessage}`);
        return;
      }

      setReminderMessage(
        `Reminder run complete: ${result.emailSent || 0} emails sent from ${result.checked || 0} dues checked (eligible: ${result.eligible || 0}, skipped: ${result.skipped || 0}, manual force send: ${result.forceSend ? 'yes' : 'no'}).`
      );
    } catch (error) {
      const rawMessage = String(error?.message || '').trim();
      const isFailedToFetch = rawMessage.toLowerCase().includes('failed to fetch');

      if (isFailedToFetch) {
        setReminderMessage(
          `Unable to send reminder emails right now. Failed to fetch. This usually means the reminder function URL is missing/unreachable or blocked by CORS. Endpoint: ${reminderEndpoint}`
        );
        return;
      }

      const details = rawMessage ? ` ${rawMessage}` : '';
      setReminderMessage(`Unable to send reminder emails right now.${details}`);
    } finally {
      setIsSendingReminder(false);
    }
  };

  const columns = [
    {
      key: 'tenantEmail',
      label: 'Tenant',
      render: (email, row) => (
        <div className="payment-tenant-cell">
          {row.tenantProfileImageUrl ? (
            <img
              src={row.tenantProfileImageUrl}
              alt={email || 'Tenant'}
              className="payment-tenant-avatar"
            />
          ) : (
            <div className="payment-tenant-avatar payment-tenant-avatar-fallback">
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

  const loadingRows = Array.from({ length: 6 });

  return (
    <AdminLayout>
      <div className="rooms-management-page">
        <div className="page-header">
          <h1>Payments Review Queue</h1>
          <p className="page-subtitle">Review tenant receipt uploads and update payment status.</p>
        </div>

        <section className="dashboard-widget">
          <div className="widget-header">
            <h2>Review Queue ({reviewItems.length})</h2>
            <button className="btn-primary" onClick={handleSendRemindersNow} disabled={isSendingReminder}>
              {isSendingReminder ? (
                <span className="loading-inline">
                  <span className="loading-spinner" aria-hidden="true" />
                  Sending reminders...
                </span>
              ) : 'Send Reminder Emails Now'}
            </button>
          </div>

          {reminderMessage && <p className="admin-feedback">{reminderMessage}</p>}

          {isLoading && (
            <div className="payments-loading-shell" role="status" aria-live="polite">
              <div className="payments-loading-head">
                <span className="loading-spinner" aria-hidden="true" />
                <div>
                  <p className="payments-loading-title">Preparing payment review queue</p>
                  <p className="payments-loading-subtitle">Fetching receipts, dues, and verification status...</p>
                </div>
              </div>
              <div className="payments-loading-skeleton">
                {loadingRows.map((_, index) => (
                  <div
                    key={`loading-row-${index}`}
                    className="payments-loading-row"
                    style={{ animationDelay: `${index * 0.07}s` }}
                  >
                    <span className="skeleton-avatar" />
                    <span className="skeleton-bar long" />
                    <span className="skeleton-bar" />
                    <span className="skeleton-pill" />
                    <span className="skeleton-pill" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {error && <p className="admin-feedback is-error">{error}</p>}
          {!isLoading && <DataTable columns={columns} data={reviewItems} actions={actions} />}
        </section>
      </div>
    </AdminLayout>
  );
}

export default PaymentsManagement;
