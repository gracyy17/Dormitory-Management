import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import StatusBadge from '../common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../lib/firebase';
import { verifyPaymentReference } from '../../lib/paymentVerification';
import { CalendarIcon, CardIcon, UploadIcon } from '../common/LineIcons';
import {
  buildCalendarMatrix,
  buildMonthYearOptions,
  formatDateYmd,
  getNextBillingMonthLabel,
  getMonthYearFromRecord,
  parseDateValue,
  toDisplayPaymentStatus,
} from '../../lib/paymentCalendar';

const formatPeso = (value) => `P${Number(value || 0).toLocaleString('en-PH')}`;

function TenantDues() {
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptLink, setReceiptLink] = useState('');
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [dues, setDues] = useState([]);
  const [isDuesLoading, setIsDuesLoading] = useState(true);
  const [tenantProfileImageUrl, setTenantProfileImageUrl] = useState('');
  const [tenantRoomNo, setTenantRoomNo] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const paymongoCheckoutUrl = import.meta.env.VITE_PAYMONGO_CHECKOUT_URL;
  const gcashQrImageUrl = import.meta.env.VITE_GCASH_QR_IMAGE_URL;
  const isStorageUploadEnabled = import.meta.env.VITE_ENABLE_STORAGE_UPLOAD === 'true';
  const cloudinaryCloudName = String(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim();
  const cloudinaryUploadPreset = String(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim();
  const isCloudinaryUploadEnabled = Boolean(cloudinaryCloudName && cloudinaryUploadPreset);

  const paymentMethods = [
    { value: 'Maya', details: 'PayMongo e-wallet checkout' },
    { value: 'GCash', details: 'PayMongo e-wallet checkout' },
    { value: 'Card / Bank', details: 'PayMongo secure page' },
  ];

  const dueRows = useMemo(() => {
    return dues
      .map((due) => {
        const dueDate = parseDateValue(due.dueDate);
        const status = toDisplayPaymentStatus(due.status, dueDate);
        const monthYear = getMonthYearFromRecord({
          billingMonth: due.billingMonth,
          dueDate,
        });

        if (!monthYear) return null;

        return {
          id: due.id,
          billingMonth: due.billingMonth || '-',
          monthlyRate: formatPeso(due.monthlyRate || due.amount || 0),
          electricBill: formatPeso(due.electricBill || 0),
          amountValue: Number(due.amount || 0),
          amount: formatPeso(due.amount || 0),
          dueDateRaw: dueDate,
          dueDate: formatDateYmd(dueDate),
          status,
          year: monthYear.year,
          month: monthYear.month,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const left = a.dueDateRaw ? a.dueDateRaw.getTime() : Number.MAX_SAFE_INTEGER;
        const right = b.dueDateRaw ? b.dueDateRaw.getTime() : Number.MAX_SAFE_INTEGER;
        return left - right;
      });
  }, [dues]);

  const currentDue = useMemo(
    () => dueRows.find((due) => due.status === 'Not Paid' || due.status === 'Overdue'),
    [dueRows]
  );

  const summary = useMemo(() => {
    const outstanding = dueRows
      .filter((due) => due.status !== 'Paid')
      .reduce((sum, due) => sum + due.amountValue, 0);

    return {
      currentBalance: formatPeso(outstanding),
      nextDueDate: currentDue?.dueDate || 'No pending dues',
      paymentStatus: currentDue?.status || 'Paid',
    };
  }, [dueRows, currentDue]);

  const monthYearOptions = useMemo(() => buildMonthYearOptions(dueRows), [dueRows]);

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

  const monthlyDueRows = useMemo(() => {
    return dueRows.filter((row) => String(row.year) === selectedYear && String(row.month) === selectedMonth);
  }, [dueRows, selectedMonth, selectedYear]);

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

    monthlyDueRows.forEach((row) => {
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
        tenantName: tenantName || user?.email || 'Tenant',
        status: row.status,
      });
    });

    return map;
  }, [monthlyDueRows, selectedMonthNumber, selectedYearNumber, tenantName, user?.email]);

  const monthlyCounts = useMemo(() => {
    return monthlyDueRows.reduce(
      (acc, row) => {
        if (row.status === 'Paid') acc.paid += 1;
        else if (row.status === 'Overdue') acc.overdue += 1;
        else acc.notPaid += 1;
        return acc;
      },
      { paid: 0, notPaid: 0, overdue: 0 }
    );
  }, [monthlyDueRows]);

  const selectedLabel = useMemo(() => {
    const option = monthYearOptions.find(
      (item) => String(item.year) === selectedYear && String(item.month) === selectedMonth
    );
    return option?.label || 'No month selected';
  }, [monthYearOptions, selectedMonth, selectedYear]);

  useEffect(() => {
    if (!db || !user?.uid) {
      setPaymentHistory([]);
      setIsHistoryLoading(false);
      return undefined;
    }

    const historyQuery = query(collection(db, 'payments'), where('tenantUid', '==', user.uid));

    const unsubscribe = onSnapshot(
      historyQuery,
      (snapshot) => {
        const records = snapshot.docs
          .map((paymentDoc) => {
            const data = paymentDoc.data();
            const submittedAt = data.submittedAt?.toDate ? data.submittedAt.toDate() : null;
            return {
              id: paymentDoc.id,
              submittedAtRaw: submittedAt ? submittedAt.getTime() : 0,
              submittedAt: submittedAt ? submittedAt.toISOString().slice(0, 10) : '-',
              billingMonth: data.billingMonth || '-',
              amount: data.amount || '-',
              method: data.method || '-',
              referenceNumber: data.referenceNumber || '-',
              status: data.status || 'Pending Review',
            };
          })
          .sort((left, right) => right.submittedAtRaw - left.submittedAtRaw);

        setPaymentHistory(records);
        setIsHistoryLoading(false);
      },
      () => {
        setPaymentHistory([]);
        setIsHistoryLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.email, user?.uid]);

  useEffect(() => {
    if (!db || !user?.uid) {
      setDues([]);
      setIsDuesLoading(false);
      return undefined;
    }

    const duesQuery = query(collection(db, 'dues'), where('tenantUid', '==', user.uid));

    const unsubscribe = onSnapshot(
      duesQuery,
      (snapshot) => {
        const records = snapshot.docs.map((dueDoc) => ({
          id: dueDoc.id,
          ...dueDoc.data(),
        }));
        setDues(records);
        setIsDuesLoading(false);
      },
      () => {
        setDues([]);
        setIsDuesLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.email, user?.uid]);

  useEffect(() => {
    const loadTenantProfilePhoto = async () => {
      if (!db || !user?.uid) {
        setTenantProfileImageUrl('');
        setTenantRoomNo('');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setTenantProfileImageUrl(userDoc.data()?.profileImageDataUrl || userDoc.data()?.profileImageUrl || '');
          setTenantRoomNo(userDoc.data()?.roomNo || '');
          setTenantName(userDoc.data()?.fullName || userDoc.data()?.email || user.email || 'Tenant');
        }
      } catch {
        setTenantProfileImageUrl('');
        setTenantRoomNo('');
        setTenantName(user.email || 'Tenant');
      }
    };

    loadTenantProfilePhoto();
  }, [user?.email, user?.uid]);

  const handlePayNow = () => {
    if (!currentDue) {
      setPaymentStatus('No pending dues right now.');
      return;
    }

    if (!paymongoCheckoutUrl) {
      setPaymentStatus('PayMongo is not configured yet. Set VITE_PAYMONGO_CHECKOUT_URL in your .env file.');
      return;
    }

    setPaymentStatus(`Redirecting to PayMongo (${paymentMethod}) for ${currentDue.billingMonth}...`);
    window.location.assign(paymongoCheckoutUrl);
  };

  const handleSubmitReceipt = async (event) => {
    event.preventDefault();

    if (!user?.uid || !user?.email) {
      setPaymentStatus('You must be logged in to submit a payment receipt.');
      return;
    }

    if (!currentDue) {
      setPaymentStatus('No pending dues right now.');
      return;
    }

    if (!referenceNumber.trim()) {
      setPaymentStatus('Please enter your GCash reference number.');
      return;
    }

    if (!db) {
      setPaymentStatus('Payment services are not configured. Please contact admin.');
      return;
    }

    setIsSubmittingReceipt(true);

    try {
      let receiptUrl = '';
      let receiptPath = '';
      let uploadNote = '';

      const uploadReceiptToCloudinary = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryUploadPreset);
        formData.append('folder', 'dormitory/payment-receipts');

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error?.message || 'Cloudinary upload failed.');
        }

        return {
          url: payload?.secure_url || payload?.url || '',
          path: payload?.public_id || '',
        };
      };

      if (receiptFile) {
        if (isCloudinaryUploadEnabled) {
          try {
            const uploadedReceipt = await uploadReceiptToCloudinary(receiptFile);
            receiptUrl = uploadedReceipt.url;
            receiptPath = uploadedReceipt.path;
          } catch (error) {
            const message = typeof error?.message === 'string' ? error.message : '';
            uploadNote = message ? `Cloudinary upload failed: ${message}` : 'Cloudinary upload failed. Using fallback upload options.';
          }
        }

        if (!receiptUrl) {
          if (!isStorageUploadEnabled) {
            setPaymentStatus('Receipt image upload is disabled for this deployment. Please provide a receipt link instead.');
            setIsSubmittingReceipt(false);
            return;
          }

          if (storage) {
            try {
              const timestamp = Date.now();
              const safeFileName = receiptFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
              receiptPath = `payment-receipts/${user.uid}/${timestamp}-${safeFileName}`;
              const receiptRef = ref(storage, receiptPath);

              await uploadBytes(receiptRef, receiptFile);
              receiptUrl = await getDownloadURL(receiptRef);
            } catch (error) {
              const code = typeof error?.code === 'string' ? error.code : '';
              const isLikelyBucketConfigIssue = code.includes('storage/unknown') || code.includes('storage/unauthorized');
              uploadNote = isLikelyBucketConfigIssue
                ? 'Receipt upload failed. Firebase Storage bucket/config likely needs an update.'
                : 'Receipt upload failed. Using manual review evidence if provided.';
            }
          } else {
            uploadNote = 'Storage upload unavailable on current Firebase plan.';
          }
        }
      }

      if (!receiptUrl && receiptLink.trim()) {
        receiptUrl = receiptLink.trim();
      }

      if (!receiptUrl) {
        setPaymentStatus('Please upload a receipt image or provide a receipt link.');
        setIsSubmittingReceipt(false);
        return;
      }

      const verification = await verifyPaymentReference({
        method: 'GCash',
        referenceNumber: referenceNumber.trim(),
        amount: currentDue.amountValue,
        dueDate: currentDue.dueDate,
        billingMonth: currentDue.billingMonth,
        tenantUid: user.uid,
        tenantEmail: user.email,
      });

      await addDoc(collection(db, 'payments'), {
        tenantUid: user.uid,
        tenantEmail: user.email,
        tenantRoomNo,
        tenantProfileImageUrl,
        billingMonth: currentDue.billingMonth,
        dueDate: currentDue.dueDate,
        amount: currentDue.amountValue,
        method: 'GCash',
        referenceNumber: referenceNumber.trim(),
        receiptUrl,
        receiptPath,
        status: verification.status,
        verificationReason: uploadNote ? `${verification.reason} ${uploadNote}` : verification.reason,
        submittedAt: serverTimestamp(),
        reviewedAt: null,
        reviewedBy: null,
      });

      const normalizedVerificationStatus = String(verification.status || '').toLowerCase();
      const isAutoPaid = ['approved', 'verified', 'paid'].includes(normalizedVerificationStatus);

      if (isAutoPaid) {
        const currentDueQuery = query(
          collection(db, 'dues'),
          where('tenantUid', '==', user.uid),
          where('billingMonth', '==', currentDue.billingMonth || '')
        );
        const currentDueSnapshot = await getDocs(currentDueQuery);
        const currentDueDoc = currentDueSnapshot.docs[0] || null;
        const currentDueData = currentDueDoc?.data?.() || {};

        if (currentDueDoc) {
          await updateDoc(doc(db, 'dues', currentDueDoc.id), {
            status: 'Paid',
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
            updatedByEmail: user.email,
          });
        }

        const nextBillingMonth = getNextBillingMonthLabel(currentDue.billingMonth || currentDueData.billingMonth || '');
        if (nextBillingMonth) {
          const nextDueQuery = query(
            collection(db, 'dues'),
            where('tenantUid', '==', user.uid),
            where('billingMonth', '==', nextBillingMonth)
          );
          const nextDueSnapshot = await getDocs(nextDueQuery);

          if (nextDueSnapshot.empty) {
            const monthlyRate = Number(currentDueData.monthlyRate || currentDueData.amount || currentDue.amountValue || 0);
            const baseDueDate = parseDateValue(currentDueData.dueDate || currentDue.dueDateRaw || currentDue.dueDate);
            const nextDueDate = baseDueDate
              ? new Date(baseDueDate.getFullYear(), baseDueDate.getMonth() + 1, baseDueDate.getDate())
              : new Date();

            await addDoc(collection(db, 'dues'), {
              tenantUid: user.uid,
              tenantEmail: user.email,
              roomNo: currentDueData.roomNo || tenantRoomNo || '',
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
              updatedByEmail: user.email,
            });
          }
        }
      }

      setReceiptFile(null);
      setReceiptLink('');
      setReferenceNumber('');
      setPaymentStatus(
        verification.enabled
          ? `Receipt submitted. Auto-check result: ${verification.status}. ${verification.reason}`
          : 'Receipt submitted successfully and queued for admin review.'
      );
    } catch {
      setPaymentStatus('Unable to submit payment receipt. Please try again.');
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  const columns = [
    { key: 'billingMonth', label: 'Billing Month' },
    { key: 'monthlyRate', label: 'Monthly Rate' },
    { key: 'electricBill', label: 'Electric Bill' },
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
        <span className="tenant-page-kicker">Tenant Portal</span>
        <h1>My Dues</h1>
        <p>Track your monthly payments and due dates.</p>
      </header>

      <div className="tenant-summary-grid">
        <article className="tenant-summary-card">
          <div className="tenant-summary-icon"><CardIcon className="ui-icon" size={19} /></div>
          <div>
            <h3>Current Balance</h3>
            <p>{summary.currentBalance}</p>
          </div>
        </article>
        <article className="tenant-summary-card">
          <div className="tenant-summary-icon"><CalendarIcon className="ui-icon" size={19} /></div>
          <div>
            <h3>Next Due Date</h3>
            <p>{summary.nextDueDate}</p>
          </div>
        </article>
        <article className="tenant-summary-card">
          <div className="tenant-summary-icon"><CardIcon className="ui-icon" size={19} /></div>
          <div>
            <h3>Payment Status</h3>
            <p className="tenant-status-text">{summary.paymentStatus}</p>
          </div>
        </article>
      </div>

      <section className="tenant-payment-card">
        <div className="tenant-payment-header">
          <h3>Payment Hub</h3>
          <p>Choose a payment channel and submit proof for faster verification.</p>
        </div>

        <div className="tenant-payment-methods" role="radiogroup" aria-label="Payment methods">
          {paymentMethods.map((method) => (
            <button
              key={method.value}
              type="button"
              className={paymentMethod === method.value ? 'tenant-method-btn active' : 'tenant-method-btn'}
              onClick={() => setPaymentMethod(method.value)}
            >
              <span className="tenant-method-name">{method.value}</span>
              <small>{method.details}</small>
            </button>
          ))}
        </div>

        {paymentMethod === 'GCash' && (
          <section className="tenant-gcash-section">
            <h4>Secure GCash Submission</h4>

            <form className="tenant-receipt-form" onSubmit={handleSubmitReceipt}>
              <div className="tenant-gcash-layout">
                <div className="tenant-gcash-preview tenant-gcash-preview-pane">
                  {gcashQrImageUrl ? (
                    <img className="tenant-gcash-qr" src={gcashQrImageUrl} alt="Admin GCash QR" />
                  ) : (
                    <div className="tenant-gcash-placeholder">
                      <span>QR</span>
                    </div>
                  )}

                  <div>
                    <p className="tenant-gcash-title">Scan to pay via GCash</p>
                    <p className="tenant-gcash-help">
                      {gcashQrImageUrl
                        ? 'Use your GCash app, complete payment, then upload your receipt details.'
                        : 'Configure VITE_GCASH_QR_IMAGE_URL in .env to display your QR code.'}
                    </p>
                    <div className="tenant-gcash-due-meta">
                      <span>Billing: {currentDue?.billingMonth || 'No pending due'}</span>
                      <span>Amount: {currentDue ? currentDue.amount : 'P0'}</span>
                    </div>
                  </div>
                </div>

                <div className="tenant-gcash-form-col tenant-gcash-form-pane">
                  <input
                    id="reference-number"
                    type="text"
                    value={referenceNumber}
                    onChange={(event) => setReferenceNumber(event.target.value)}
                    placeholder="GCash Reference Number"
                    required
                  />

                  <div className="tenant-receipt-actions">
                    {isStorageUploadEnabled ? (
                      <>
                        <label htmlFor="receipt-file" className="tenant-upload-btn" title="Upload receipt image">
                          <UploadIcon className="ui-icon" size={15} />
                          <span>{receiptFile ? receiptFile.name : 'Upload Receipt'}</span>
                        </label>
                        <input
                          id="receipt-file"
                          type="file"
                          accept="image/*"
                          onChange={(event) => setReceiptFile(event.target.files?.[0] || null)}
                        />
                      </>
                    ) : (
                      <p className="tenant-gcash-help" style={{ margin: 0 }}>
                        File upload is disabled on current plan. Use a receipt link below.
                      </p>
                    )}

                    <button type="submit" className="tenant-pay-btn" disabled={isSubmittingReceipt}>
                      {isSubmittingReceipt ? 'Submitting...' : 'Submit Dues Receipt'}
                    </button>
                  </div>

                  <input
                    id="receipt-link"
                    type="url"
                    value={receiptLink}
                    onChange={(event) => setReceiptLink(event.target.value)}
                    placeholder={isStorageUploadEnabled ? '(Optional) Receipt link' : 'Required: Receipt link (Google Drive, image URL, etc.)'}
                  />
                </div>
              </div>
            </form>
          </section>
        )}

        {paymentMethod !== 'GCash' && (
          <div className="tenant-payment-actions">
            <button type="button" className="tenant-pay-btn" onClick={handlePayNow}>
              Continue to PayMongo
            </button>
          </div>
        )}

        {paymentStatus && <p className="tenant-payment-status">{paymentStatus}</p>}
      </section>

      <section className="tenant-table-wrap">
        <div className="tenant-panel-header">
          <h2>Monthly Dues Ledger - {selectedLabel}</h2>
          <p>Review your selected month and year dues status.</p>
        </div>

        <div className="tenant-filter-bar">
          <label htmlFor="tenant-year-select">Year</label>
          <select
            id="tenant-year-select"
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
          >
            {yearOptions.map((year) => (
              <option key={year} value={String(year)}>{year}</option>
            ))}
          </select>

          <label htmlFor="tenant-month-select">Month</label>
          <select
            id="tenant-month-select"
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

        <div className="tenant-month-summary">
          <span className="summary-pill paid">Paid: {monthlyCounts.paid}</span>
          <span className="summary-pill not-paid">Not Paid: {monthlyCounts.notPaid}</span>
          <span className="summary-pill overdue">Overdue: {monthlyCounts.overdue}</span>
        </div>

        {isDuesLoading ? (
          <p>Loading dues...</p>
        ) : monthlyDueRows.length === 0 ? (
          <p>No dues found for this month and year.</p>
        ) : (
          <table className="tenant-simple-table">
            <thead>
              <tr>
                {columns.map((column) => <th key={column.key}>{column.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {monthlyDueRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.billingMonth}</td>
                  <td>{row.monthlyRate}</td>
                  <td>{row.electricBill}</td>
                  <td>{row.amount}</td>
                  <td>{row.dueDate}</td>
                  <td><StatusBadge status={row.status} type={row.status.toLowerCase().replace(' ', '-')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="tenant-table-wrap">
        <div className="tenant-panel-header">
          <h2>Calendar View - {selectedLabel}</h2>
          <p>Per-day due list with your payment status.</p>
        </div>

        {calendarWeeks.length === 0 ? (
          <p>No calendar data available.</p>
        ) : (
          <>
            <div className="tenant-calendar-head">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
                <span key={dayName}>{dayName}</span>
              ))}
            </div>

            <div className="tenant-calendar-grid">
              {calendarWeeks.flatMap((week, weekIndex) =>
                week.map((day, dayIndex) => {
                  const dayEntries = day ? (calendarEntriesByDay.get(day) || []) : [];

                  return (
                    <div
                      key={`tenant-calendar-cell-${weekIndex}-${dayIndex}`}
                      className={day ? 'tenant-calendar-cell' : 'tenant-calendar-cell is-empty'}
                    >
                      {day ? (
                        <>
                          <div className="tenant-calendar-day">{day}</div>
                          <div className="tenant-calendar-entries">
                            {dayEntries.length === 0 ? (
                              <p className="calendar-empty-note">No dues</p>
                            ) : (
                              dayEntries.map((entry) => (
                                <div key={`tenant-entry-${entry.id}`} className="calendar-entry">
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

      <section className="tenant-table-wrap">
        <div className="tenant-panel-header">
          <h2>Payment History</h2>
          <p>All receipt submissions and current review status.</p>
        </div>

        {isHistoryLoading ? (
          <p>Loading payment history...</p>
        ) : paymentHistory.length === 0 ? (
          <div className="tenant-history-empty">
            <p>No previous payments found.</p>
            <small>Your secure history will appear here.</small>
          </div>
        ) : (
          <table className="tenant-simple-table history-table">
            <thead>
              <tr>
                <th>Date Submitted</th>
                <th>Billing Month</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference No.</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.map((row) => (
                <tr key={row.id}>
                  <td>{row.submittedAt}</td>
                  <td>{row.billingMonth}</td>
                  <td>{formatPeso(row.amount)}</td>
                  <td>{row.method}</td>
                  <td>{row.referenceNumber}</td>
                  <td><StatusBadge status={row.status} type={String(row.status).toLowerCase().replace(' ', '-')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}

export default TenantDues;
