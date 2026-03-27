import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import AdminLayout from './AdminLayout';
import DataTable from '../common/DataTable';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../lib/firebase';
import {
  buildCalendarMatrix,
  buildMonthYearOptions,
  formatDateYmd,
  getNextBillingMonthLabel,
  parseDateValue,
  toDisplayPaymentStatus,
} from '../../lib/paymentCalendar';

const formatDateTime = (value) => {
  const date = parseDateValue(value);
  if (!date) return '-';
  return `${date.toISOString().slice(0, 10)} ${date.toTimeString().slice(0, 5)}`;
};

const formatPeso = (value) => `P${Number(value || 0).toLocaleString('en-PH')}`;

function PaymentsManagement() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [dues, setDues] = useState([]);
  const [users, setUsers] = useState([]);
  const [reviewItems, setReviewItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [receiptPreview, setReceiptPreview] = useState({
    isOpen: false,
    url: '',
    tenantEmail: '',
    billingMonth: '',
  });

  const reminderEndpoint = useMemo(() => {
    const configuredEndpoint = String(import.meta.env.VITE_SEND_DUE_REMINDERS_URL || '').trim();

    const isLocalConfiguredEndpoint = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(configuredEndpoint);
    const isRunningLocally =
      typeof window !== 'undefined'
      && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

    // Require explicit endpoint configuration to avoid unreachable fallback URLs.
    if (!configuredEndpoint) {
      return '';
    }

    if (isLocalConfiguredEndpoint && !isRunningLocally) {
      return '';
    }

    return configuredEndpoint;
  }, []);

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

    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        setUsers(snapshot.docs.map((userDoc) => ({ id: userDoc.id, ...userDoc.data() })));
      },
      () => {
        setUsers([]);
      }
    );

    return () => {
      unsubscribePayments();
      unsubscribeDues();
      unsubscribeUsers();
    };
  }, []);

  const tenantProfileByUid = useMemo(() => {
    const map = new Map();
    users.forEach((tenant) => {
      if (String(tenant.role || '').toLowerCase() !== 'tenant') return;
      map.set(tenant.id, tenant.profileImageDataUrl || tenant.profileImageUrl || '');
    });
    return map;
  }, [users]);

  const tenantNameByUid = useMemo(() => {
    const map = new Map();
    users.forEach((tenant) => {
      if (String(tenant.role || '').toLowerCase() !== 'tenant') return;
      map.set(tenant.id, tenant.fullName || tenant.email || tenant.id || 'Unknown Tenant');
    });
    return map;
  }, [users]);

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

  const reviewQueueItems = useMemo(() => {
    return reviewItems.filter((item) => {
      const status = String(item.status || '').toLowerCase();
      if (item.sourceType === 'due') return status === 'pending' || status === 'overdue';
      return ['pending', 'pending review', 'pending-review', 'needs-review', 'not paid'].includes(status);
    });
  }, [reviewItems]);

  const approvedHistoryItems = useMemo(() => {
    return reviewItems
      .filter((item) => {
        if (item.sourceType !== 'payment') return false;
        const status = String(item.status || '').toLowerCase();
        return status === 'approved' || status === 'paid';
      })
      .sort((a, b) => {
        const aTime = parseDateValue(a.reviewedAt)?.getTime() || parseDateValue(a.submittedAt)?.getTime() || 0;
        const bTime = parseDateValue(b.reviewedAt)?.getTime() || parseDateValue(b.submittedAt)?.getTime() || 0;
        return bTime - aTime;
      });
  }, [reviewItems]);

  const monthlyDueRows = useMemo(() => {
    return dues
      .map((due) => {
        const dueDateRaw = parseDateValue(due.dueDate);
        const monthYear = dueDateRaw
          ? {
              year: dueDateRaw.getFullYear(),
              month: dueDateRaw.getMonth(),
              label: dueDateRaw.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            }
          : null;

        if (!monthYear) return null;

        return {
          id: due.id,
          tenantUid: due.tenantUid || '',
          tenantName: tenantNameByUid.get(due.tenantUid) || due.tenantEmail || 'Unknown Tenant',
          tenantEmail: due.tenantEmail || '-',
          roomNo: due.roomNo || '-',
          billingMonth: due.billingMonth || monthYear.label,
          dueDateRaw,
          dueDate: formatDateYmd(dueDateRaw),
          amountValue: Number(due.amount || due.monthlyRate || 0),
          amount: formatPeso(due.amount || due.monthlyRate || 0),
          status: toDisplayPaymentStatus(due.status, dueDateRaw),
          year: monthYear.year,
          month: monthYear.month,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const left = a.dueDateRaw ? a.dueDateRaw.getTime() : 0;
        const right = b.dueDateRaw ? b.dueDateRaw.getTime() : 0;
        return left - right;
      });
  }, [dues, tenantNameByUid]);

  const nextDueForCalendar = useMemo(() => {
    const nextDue = monthlyDueRows.find((row) => row.status === 'Not Paid' || row.status === 'Overdue');
    return nextDue || monthlyDueRows[0] || null;
  }, [monthlyDueRows]);

  const nextDueCalendarYear = nextDueForCalendar?.year;
  const nextDueCalendarMonth = nextDueForCalendar?.month;

  const monthYearOptions = useMemo(() => buildMonthYearOptions(monthlyDueRows), [monthlyDueRows]);

  const yearOptions = useMemo(() => {
    const years = new Set(monthYearOptions.map((item) => item.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [monthYearOptions]);

  const monthOptions = useMemo(() => {
    if (!selectedYear) return [];
    return monthYearOptions
      .filter((item) => String(item.year) === selectedYear)
      .sort((a, b) => a.month - b.month);
  }, [monthYearOptions, selectedYear]);

  useEffect(() => {
    if (!monthYearOptions.length) {
      setSelectedYear('');
      setSelectedMonth('');
      return;
    }

    const hasValidSelection = monthYearOptions.some(
      (item) => String(item.year) === selectedYear && String(item.month) === selectedMonth
    );

    if (!hasValidSelection) {
      setSelectedYear(String(monthYearOptions[0].year));
      setSelectedMonth(String(monthYearOptions[0].month));
    }
  }, [monthYearOptions, selectedMonth, selectedYear]);

  useEffect(() => {
    if (!selectedYear || !monthOptions.length) return;

    const hasMonth = monthOptions.some((item) => String(item.month) === selectedMonth);
    if (!hasMonth) {
      setSelectedMonth(String(monthOptions[0].month));
    }
  }, [monthOptions, selectedMonth, selectedYear]);

  useEffect(() => {
    if (!Number.isInteger(nextDueCalendarYear) || !Number.isInteger(nextDueCalendarMonth)) return;
    setSelectedYear(String(nextDueCalendarYear));
    setSelectedMonth(String(nextDueCalendarMonth));
  }, [nextDueCalendarMonth, nextDueCalendarYear]);

  const monthlyRows = useMemo(() => {
    return monthlyDueRows
      .filter((row) => String(row.year) === selectedYear && String(row.month) === selectedMonth)
      .sort((a, b) => a.tenantName.localeCompare(b.tenantName));
  }, [monthlyDueRows, selectedMonth, selectedYear]);

  const selectedYearNumber = Number(selectedYear);
  const selectedMonthNumber = Number(selectedMonth);

  const calendarWeeks = useMemo(() => {
    if (!Number.isInteger(selectedYearNumber) || !Number.isInteger(selectedMonthNumber)) {
      return [];
    }
    return buildCalendarMatrix(selectedYearNumber, selectedMonthNumber);
  }, [selectedMonthNumber, selectedYearNumber]);

  const calendarEntriesByDay = useMemo(() => {
    const map = new Map();

    monthlyRows.forEach((row) => {
      if (!row.dueDateRaw) return;
      if (row.dueDateRaw.getFullYear() !== selectedYearNumber || row.dueDateRaw.getMonth() !== selectedMonthNumber) {
        return;
      }

      const day = row.dueDateRaw.getDate();
      if (!map.has(day)) {
        map.set(day, []);
      }

      map.get(day).push({
        id: row.id,
        tenantName: row.tenantName,
        status: row.status,
      });
    });

    return map;
  }, [monthlyRows, selectedMonthNumber, selectedYearNumber]);

  const monthlyCounts = useMemo(() => {
    return monthlyRows.reduce(
      (acc, row) => {
        if (row.status === 'Paid') acc.paid += 1;
        else if (row.status === 'Overdue') acc.overdue += 1;
        else acc.notPaid += 1;
        return acc;
      },
      { paid: 0, notPaid: 0, overdue: 0 }
    );
  }, [monthlyRows]);

  const selectedLabel = useMemo(() => {
    const option = monthYearOptions.find(
      (item) => String(item.year) === selectedYear && String(item.month) === selectedMonth
    );
    return option?.label || 'No month selected';
  }, [monthYearOptions, selectedMonth, selectedYear]);

  const handleReview = async (item, nextStatus) => {
    if (!db || !user?.uid) return;

    try {
      if (item.sourceType === 'payment') {
        await updateDoc(doc(db, 'payments', item.id), {
          status: nextStatus,
          reviewedBy: user.uid,
          reviewedAt: serverTimestamp(),
        });

        if (nextStatus === 'Approved') {
          const currentDueQuery = query(
            collection(db, 'dues'),
            where('tenantUid', '==', item.tenantUid || ''),
            where('billingMonth', '==', item.billingMonth || '')
          );
          const currentDueSnapshot = await getDocs(currentDueQuery);
          const currentDueDoc = currentDueSnapshot.docs[0] || null;
          const currentDueData = currentDueDoc?.data?.() || {};

          if (currentDueDoc) {
            await updateDoc(doc(db, 'dues', currentDueDoc.id), {
              status: 'Paid',
              updatedBy: user.uid,
              updatedByEmail: user.email || null,
              updatedAt: serverTimestamp(),
            });
          }

          const nextBillingMonth = getNextBillingMonthLabel(item.billingMonth || currentDueData.billingMonth || '');
          if (nextBillingMonth) {
            const nextDueQuery = query(
              collection(db, 'dues'),
              where('tenantUid', '==', item.tenantUid || ''),
              where('billingMonth', '==', nextBillingMonth)
            );
            const nextDueSnapshot = await getDocs(nextDueQuery);

            if (nextDueSnapshot.empty) {
              const monthlyRate = Number(currentDueData.monthlyRate || item.monthlyRate || item.amount || 0);
              const baseDueDate = parseDateValue(currentDueData.dueDate || item.dueDate);
              const nextDueDate = baseDueDate
                ? new Date(baseDueDate.getFullYear(), baseDueDate.getMonth() + 1, baseDueDate.getDate())
                : new Date();

              await addDoc(collection(db, 'dues'), {
                tenantUid: item.tenantUid,
                tenantEmail: item.tenantEmail,
                roomNo: currentDueData.roomNo || item.tenantRoomNo || item.roomNo || '',
                billingMonth: nextBillingMonth,
                dueDate: nextDueDate.toISOString().slice(0, 10),
                monthlyRate,
                electricBill: 0,
                amount: monthlyRate,
                status: 'Pending',
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
                updatedByEmail: user.email || null,
              });
            }
          }
        }
      } else {
        await updateDoc(doc(db, 'dues', item.id), {
          status: nextStatus === 'Approved' ? 'Paid' : 'Overdue',
          updatedBy: user.uid,
          updatedByEmail: user.email || null,
          updatedAt: serverTimestamp(),
        });

        if (nextStatus === 'Approved') {
          const monthlyRate = Number(item.monthlyRate || item.amount || 0);
          const electricBill = Number(item.electricBill || 0);
          const totalAmount = Number(item.amount || monthlyRate + electricBill);

          const paymentHistoryQuery = query(
            collection(db, 'payments'),
            where('tenantUid', '==', item.tenantUid || ''),
            where('billingMonth', '==', item.billingMonth || '')
          );
          const paymentHistorySnapshot = await getDocs(paymentHistoryQuery);
          const hasBillingHistory = paymentHistorySnapshot.docs.some((paymentDoc) => {
            const data = paymentDoc.data() || {};
            return String(data.method || '').toLowerCase() === 'billing';
          });

          if (!hasBillingHistory) {
            await addDoc(collection(db, 'payments'), {
              tenantUid: item.tenantUid,
              tenantEmail: item.tenantEmail,
              tenantRoomNo: item.roomNo,
              tenantProfileImageUrl: tenantProfileByUid.get(item.tenantUid) || item.tenantProfileImageUrl || '',
              billingMonth: item.billingMonth || '',
              dueDate: item.dueDate || '',
              monthlyRate,
              electricBill,
              amount: totalAmount,
              method: 'Billing',
              referenceNumber: 'AUTO-PAID',
              status: 'Approved',
              verificationReason: 'Marked paid from payments review queue',
              submittedAt: serverTimestamp(),
              reviewedAt: serverTimestamp(),
              reviewedBy: user.uid,
            });
          }

          const nextBillingMonth = getNextBillingMonthLabel(item.billingMonth || '');
          if (nextBillingMonth) {
            const nextDueQuery = query(
              collection(db, 'dues'),
              where('tenantUid', '==', item.tenantUid || ''),
              where('billingMonth', '==', nextBillingMonth)
            );
            const nextDueSnapshot = await getDocs(nextDueQuery);

            if (nextDueSnapshot.empty) {
              const baseDueDate = parseDateValue(item.dueDate);
              const nextDueDate = baseDueDate
                ? new Date(baseDueDate.getFullYear(), baseDueDate.getMonth() + 1, baseDueDate.getDate())
                : new Date();

              await addDoc(collection(db, 'dues'), {
                tenantUid: item.tenantUid,
                tenantEmail: item.tenantEmail,
                roomNo: item.roomNo,
                billingMonth: nextBillingMonth,
                dueDate: nextDueDate.toISOString().slice(0, 10),
                monthlyRate,
                electricBill: 0,
                amount: monthlyRate,
                status: 'Pending',
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
                updatedByEmail: user.email || null,
              });
            }
          }
        }
      }
    } catch {
      setError('Unable to update payment status.');
    }
  };

  const isImageReceiptUrl = (url) => {
    const normalized = String(url || '').toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(normalized)
      || normalized.includes('res.cloudinary.com')
      || normalized.includes('/image/upload/');
  };

  const openReceiptPreview = (url, row) => {
    setReceiptPreview({
      isOpen: true,
      url,
      tenantEmail: row?.tenantEmail || '-',
      billingMonth: row?.billingMonth || '-',
    });
  };

  const closeReceiptPreview = () => {
    setReceiptPreview({
      isOpen: false,
      url: '',
      tenantEmail: '',
      billingMonth: '',
    });
  };

  const handleSendRemindersNow = async () => {
    setReminderMessage('');

    if (!auth?.currentUser) {
      setReminderMessage('No authenticated admin session found. Please log in again.');
      return;
    }

    if (!reminderEndpoint) {
      setReminderMessage('Reminder endpoint is not configured for production. Set VITE_SEND_DUE_REMINDERS_URL to a publicly reachable URL (localhost will not work on deployed hosting).');
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
          {(tenantProfileByUid.get(row.tenantUid) || row.tenantProfileImageUrl) ? (
            <img
              src={tenantProfileByUid.get(row.tenantUid) || row.tenantProfileImageUrl}
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
    { key: 'dueDate', label: 'Due Date' },
    { key: 'amount', label: 'Amount' },
    {
      key: 'electricBill',
      label: 'Electric Bill',
      render: (value) => formatPeso(value || 0),
    },
    { key: 'method', label: 'Method' },
    { key: 'referenceNumber', label: 'Reference No.' },
    {
      key: 'receiptUrl',
      label: 'Receipt',
      render: (url, row) => (
        url ? (
          <button
            className="btn-text"
            onClick={() => openReceiptPreview(url, row)}
            style={{ cursor: 'pointer', color: '#0066cc', textDecoration: 'underline', border: 'none', background: 'none', padding: 0 }}
          >
            View Receipt
          </button>
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

  const approvedHistoryColumns = [
    columns[0],
    { key: 'billingMonth', label: 'Billing Month' },
    { key: 'amount', label: 'Amount' },
    { key: 'method', label: 'Method' },
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
    {
      key: 'submittedAt',
      label: 'Submitted At',
      render: (value) => formatDateTime(value),
    },
    {
      key: 'reviewedAt',
      label: 'Approved At',
      render: (value) => formatDateTime(value),
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
            <h2>Review Queue ({reviewQueueItems.length})</h2>
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
          {!isLoading && <DataTable columns={columns} data={reviewQueueItems} actions={actions} />}
        </section>

        <section className="dashboard-widget">
          <div className="widget-header">
            <h2>Monthly Payment Status - {selectedLabel}</h2>
          </div>

          <div className="payment-month-filter">
            <label htmlFor="payment-year-select">Year</label>
            <select
              id="payment-year-select"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
            >
              {yearOptions.map((year) => (
                <option key={year} value={String(year)}>{year}</option>
              ))}
            </select>

            <label htmlFor="payment-month-select">Month</label>
            <select
              id="payment-month-select"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            >
              {monthOptions.map((monthOption) => (
                <option key={monthOption.key} value={String(monthOption.month)}>
                  {monthOption.monthLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="payment-month-summary">
            <span className="summary-pill paid">Paid: {monthlyCounts.paid}</span>
            <span className="summary-pill not-paid">Not Paid: {monthlyCounts.notPaid}</span>
            <span className="summary-pill overdue">Overdue: {monthlyCounts.overdue}</span>
          </div>

          {!monthlyRows.length ? (
            <p className="admin-feedback">No dues found for this month and year.</p>
          ) : (
            <div className="payment-month-table-wrap">
              <table className="payment-month-table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Room</th>
                    <th>Billing Month</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows.map((row) => (
                    <tr key={`month-row-${row.id}`}>
                      <td>{row.tenantName}</td>
                      <td>{row.roomNo}</td>
                      <td>{row.billingMonth}</td>
                      <td>{row.dueDate}</td>
                      <td>{row.amount}</td>
                      <td><StatusBadge status={row.status} type={row.status.toLowerCase().replace(' ', '-')} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="dashboard-widget">
          <div className="widget-header">
            <h2>Payment Calendar - {selectedLabel}</h2>
          </div>

          {calendarWeeks.length === 0 ? (
            <p className="admin-feedback">No calendar data available.</p>
          ) : (
            <>
              <div className="payment-calendar-head">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
                  <span key={dayName}>{dayName}</span>
                ))}
              </div>

              <div className="payment-calendar-grid">
                {calendarWeeks.flatMap((week, weekIndex) =>
                  week.map((day, dayIndex) => {
                    const dayEntries = day ? (calendarEntriesByDay.get(day) || []) : [];

                    return (
                      <div
                        key={`calendar-cell-${weekIndex}-${dayIndex}`}
                        className={day ? 'payment-calendar-cell' : 'payment-calendar-cell is-empty'}
                      >
                        {day ? (
                          <>
                            <div className="payment-calendar-day">{day}</div>
                            <div className="payment-calendar-entries">
                              {dayEntries.length === 0 ? (
                                <p className="calendar-empty-note">No dues</p>
                              ) : (
                                dayEntries.map((entry) => (
                                  <div key={`entry-${entry.id}`} className="calendar-entry">
                                    <span className="calendar-entry-name">{entry.tenantName}</span>
                                    <StatusBadge
                                      status={entry.status}
                                      type={entry.status.toLowerCase().replace(' ', '-')}
                                    />
                                  </div>
                                ))
                              )}
                            </div>
                          </>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>

        <section className="dashboard-widget">
          <div className="widget-header">
            <h2>Approved Payments History ({approvedHistoryItems.length})</h2>
          </div>
          {!isLoading && <DataTable columns={approvedHistoryColumns} data={approvedHistoryItems} />}
        </section>

        <Modal
          isOpen={receiptPreview.isOpen}
          title={`Receipt - ${receiptPreview.tenantEmail}`}
          onClose={closeReceiptPreview}
          size="medium"
        >
          <div style={{ padding: '1rem' }}>
            {receiptPreview.billingMonth && (
              <p style={{ marginBottom: '1rem' }}>
                <strong>Billing Month:</strong> {receiptPreview.billingMonth}
              </p>
            )}
            {isImageReceiptUrl(receiptPreview.url) ? (
              <img
                src={receiptPreview.url}
                alt="Receipt"
                style={{
                  maxWidth: '100%',
                  maxHeight: '500px',
                  borderRadius: '4px',
                  border: '1px solid #e0e0e0',
                }}
              />
            ) : (
              <a href={receiptPreview.url} target="_blank" rel="noreferrer">
                Open Receipt (external link)
              </a>
            )}
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}

export default PaymentsManagement;
