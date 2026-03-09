import React, { useEffect, useState } from 'react';
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import DataTable from '../common/DataTable';
import StatusBadge from '../common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../lib/firebase';
import { verifyPaymentReference } from '../../lib/paymentVerification';

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
  const [tenantProfileImageUrl, setTenantProfileImageUrl] = useState('');
  const paymongoCheckoutUrl = import.meta.env.VITE_PAYMONGO_CHECKOUT_URL;
  const gcashQrImageUrl = import.meta.env.VITE_GCASH_QR_IMAGE_URL;

  const dues = [
    { month: 'January 2026', amount: '₱5,000', dueDate: '2026-01-05', status: 'Paid' },
    { month: 'February 2026', amount: '₱5,000', dueDate: '2026-02-05', status: 'Paid' },
    { month: 'March 2026', amount: '₱5,000', dueDate: '2026-03-05', status: 'Pending' },
    { month: 'April 2026', amount: '₱5,000', dueDate: '2026-04-05', status: 'Pending' },
  ];

  const paymentMethods = [
    { value: 'GCash', details: 'Pay via PayMongo e-wallet checkout' },
    { value: 'Maya', details: 'Pay via PayMongo e-wallet checkout' },
    { value: 'Card / Bank', details: 'Pay via PayMongo secure page' },
  ];

  const currentDue = dues.find((due) => due.status === 'Pending');

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
    const loadTenantProfilePhoto = async () => {
      if (!db || !user?.uid) {
        setTenantProfileImageUrl('');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setTenantProfileImageUrl(userDoc.data()?.profileImageDataUrl || userDoc.data()?.profileImageUrl || '');
        }
      } catch {
        setTenantProfileImageUrl('');
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
        amount: currentDue.amount,
        dueDate: currentDue.dueDate,
        billingMonth: currentDue.month,
        tenantUid: user.uid,
        tenantEmail: user.email,
      });

      await addDoc(collection(db, 'payments'), {
        tenantUid: user.uid,
        tenantEmail: user.email,
        tenantProfileImageUrl,
        billingMonth: currentDue.month,
        dueDate: currentDue.dueDate,
        amount: currentDue.amount,
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
    { key: 'month', label: 'Billing Month' },
    { key: 'amount', label: 'Amount' },
    { key: 'dueDate', label: 'Due Date' },
    {
      key: 'status',
      label: 'Status',
      render: (status) => <StatusBadge status={status} type={status.toLowerCase()} />,
    },
  ];

  const paymentHistoryColumns = [
    { key: 'submittedAt', label: 'Date Submitted' },
    { key: 'billingMonth', label: 'Billing Month' },
    { key: 'amount', label: 'Amount' },
    { key: 'method', label: 'Method' },
    { key: 'referenceNumber', label: 'Reference No.' },
    {
      key: 'status',
      label: 'Status',
      render: (status) => <StatusBadge status={status} type={String(status).toLowerCase().replace(' ', '-')} />,
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

      <section className="tenant-payment-card">
        <div className="tenant-payment-header">
          <h3>Payment Method</h3>
          <p>Choose a channel and continue payment in PayMongo checkout.</p>
        </div>

        <div className="tenant-payment-methods" role="radiogroup" aria-label="Payment methods">
          {paymentMethods.map((method) => (
            <button
              key={method.value}
              type="button"
              className={paymentMethod === method.value ? 'tenant-method-btn active' : 'tenant-method-btn'}
              onClick={() => setPaymentMethod(method.value)}
            >
              <span>{method.value}</span>
              <small>{method.details}</small>
            </button>
          ))}
        </div>

        <div className="tenant-payment-actions">
          {paymentMethod !== 'GCash' && (
            <button type="button" className="tenant-pay-btn" onClick={handlePayNow}>
              Pay Now
            </button>
          )}
          {paymentStatus && <p className="tenant-payment-status">{paymentStatus}</p>}
        </div>

        {paymentMethod === 'GCash' && (
          <section className="tenant-gcash-section">
            <h4>Scan Admin GCash QR</h4>

            {gcashQrImageUrl ? (
              <img className="tenant-gcash-qr" src={gcashQrImageUrl} alt="Admin GCash QR" />
            ) : (
              <p className="tenant-gcash-help">
                GCash QR is not configured yet. Add VITE_GCASH_QR_IMAGE_URL in your .env file.
              </p>
            )}

            <form className="tenant-receipt-form" onSubmit={handleSubmitReceipt}>
              <label htmlFor="reference-number">Reference Number</label>
              <input
                id="reference-number"
                type="text"
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                placeholder="Enter GCash reference number"
                required
              />

              <label htmlFor="receipt-file">Upload Receipt</label>
              <input
                id="receipt-file"
                type="file"
                accept="image/*"
                onChange={(event) => setReceiptFile(event.target.files?.[0] || null)}
              />

              <label htmlFor="receipt-link">or Receipt Image Link</label>
              <input
                id="receipt-link"
                type="url"
                value={receiptLink}
                onChange={(event) => setReceiptLink(event.target.value)}
                placeholder="https://..."
              />

              <button type="submit" className="tenant-pay-btn" disabled={isSubmittingReceipt}>
                {isSubmittingReceipt ? 'Submitting...' : 'Submit Receipt'}
              </button>
            </form>
          </section>
        )}
      </section>

      <div className="tenant-table-wrap">
        <DataTable columns={columns} data={dues} />
      </div>

      <section className="tenant-table-wrap">
        <header className="tenant-page-header" style={{ marginBottom: 8 }}>
          <h1 style={{ fontSize: '1.1rem' }}>Payment History</h1>
          <p>Track your submitted payments and verification status.</p>
        </header>

        {isHistoryLoading ? (
          <p>Loading payment history...</p>
        ) : (
          <DataTable columns={paymentHistoryColumns} data={paymentHistory} />
        )}
      </section>
    </section>
  );
}

export default TenantDues;
