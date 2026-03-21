import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import StatusBadge from '../common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../lib/firebase';
import { verifyPaymentReference } from '../../lib/paymentVerification';
import { CalendarIcon, CardIcon, UploadIcon } from '../common/LineIcons';

const formatPeso = (value) => `P${Number(value || 0).toLocaleString('en-PH')}`;

const parseDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value) => {
  const parsed = parseDate(value);
  if (!parsed) return '-';
  return parsed.toISOString().slice(0, 10);
};

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
  const paymongoCheckoutUrl = import.meta.env.VITE_PAYMONGO_CHECKOUT_URL;
  const gcashQrImageUrl = import.meta.env.VITE_GCASH_QR_IMAGE_URL;

  const paymentMethods = [
    { value: 'Maya', details: 'PayMongo e-wallet checkout' },
    { value: 'GCash', details: 'PayMongo e-wallet checkout' },
    { value: 'Card / Bank', details: 'PayMongo secure page' },
  ];

  const dueRows = useMemo(() => {
    const now = Date.now();

    return dues
      .map((due) => {
        const dueDate = parseDate(due.dueDate);
        const normalizedStatus = String(due.status || 'Pending').toLowerCase();
        const status = normalizedStatus === 'paid'
          ? 'Paid'
          : dueDate && dueDate.getTime() < now
            ? 'Overdue'
            : 'Pending';

        return {
          id: due.id,
          billingMonth: due.billingMonth || '-',
          amountValue: Number(due.amount || 0),
          amount: formatPeso(due.amount || 0),
          dueDateRaw: dueDate,
          dueDate: formatDate(due.dueDate),
          status,
        };
      })
      .sort((a, b) => {
        const left = a.dueDateRaw ? a.dueDateRaw.getTime() : Number.MAX_SAFE_INTEGER;
        const right = b.dueDateRaw ? b.dueDateRaw.getTime() : Number.MAX_SAFE_INTEGER;
        return left - right;
      });
  }, [dues]);

  const currentDue = useMemo(
    () => dueRows.find((due) => due.status === 'Pending' || due.status === 'Overdue'),
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
  }, [user?.uid]);

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
  }, [user?.uid]);

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
        }
      } catch {
        setTenantProfileImageUrl('');
        setTenantRoomNo('');
      }
    };

    loadTenantProfilePhoto();
  }, [user?.uid]);

  const handlePayNow = () => {
    if (!currentDue) {
      setPaymentStatus('No pending dues right now.');
      return;
    }

    if (!paymongoCheckoutUrl) {
      setPaymentStatus('PayMongo is not configured yet. Set VITE_PAYMONGO_CHECKOUT_URL in your .env file.');
      return;
    }

    setPaymentStatus(`Redirecting to PayMongo (${paymentMethod}) for ${currentDue.month}...`);
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

      if (receiptFile) {
        if (storage) {
          try {
            const timestamp = Date.now();
            const safeFileName = receiptFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            receiptPath = `payment-receipts/${user.uid}/${timestamp}-${safeFileName}`;
            const receiptRef = ref(storage, receiptPath);

            await uploadBytes(receiptRef, receiptFile);
            receiptUrl = await getDownloadURL(receiptRef);
          } catch {
            uploadNote = 'Receipt upload failed. Using manual review evidence if provided.';
          }
        } else {
          uploadNote = 'Storage upload unavailable on current Firebase plan.';
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

                    <button type="submit" className="tenant-pay-btn" disabled={isSubmittingReceipt}>
                      {isSubmittingReceipt ? 'Submitting...' : 'Submit Dues Receipt'}
                    </button>
                  </div>

                  <input
                    id="receipt-link"
                    type="url"
                    value={receiptLink}
                    onChange={(event) => setReceiptLink(event.target.value)}
                    placeholder="(Optional) Receipt link"
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
          <h2>Monthly Dues Ledger</h2>
          <p>Review your current billing schedule and due states.</p>
        </div>
        {isDuesLoading ? (
          <p>Loading dues...</p>
        ) : (
          <table className="tenant-simple-table">
            <thead>
              <tr>
                {columns.map((column) => <th key={column.key}>{column.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {dueRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.billingMonth}</td>
                  <td>{row.amount}</td>
                  <td>{row.dueDate}</td>
                  <td><StatusBadge status={row.status} type={row.status.toLowerCase()} /></td>
                </tr>
              ))}
            </tbody>
          </table>
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
