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
import { Link } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import DataTable from '../common/DataTable';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import {
  CalendarIcon,
  CardIcon,
  CheckCircleIcon,
  PulseIcon,
  ReportIcon,
  UsersIcon,
  XCircleIcon,
} from '../common/LineIcons';

const parseDateValue = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const formatDate = (value) => {
  const date = parseDateValue(value);
  if (!date) return '';
  return date.toISOString().slice(0, 10);
};

const formatDateDisplay = (value) => {
  const date = parseDateValue(value);
  if (!date) return 'Not Set';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (value) => {
  const date = parseDateValue(value);
  if (!date) return '-';
  return `${date.toISOString().slice(0, 10)} ${date.toTimeString().slice(0, 5)}`;
};

const formatAmount = (value) => {
  const amount = Number(value || 0);
  if (Number.isNaN(amount)) return String(value || '-');
  return `P${amount.toLocaleString('en-PH')}`;
};

const computeTenantPaymentStatus = (payment) => {
  if (!payment) return 'Not Paid';

  const normalized = String(payment.status || '').toLowerCase();
  if (normalized === 'approved' || normalized === 'paid') return 'Paid';

  const dueDate = parseDateValue(payment.dueDate);
  if (dueDate && dueDate.getTime() < Date.now()) return 'Overdue';

  return 'Not Paid';
};

const parseBillingMonthLabel = (value) => {
  const normalized = String(value || '').trim();
  const match = normalized.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;

  const date = new Date(`${match[1]} 1, ${match[2]}`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const getNextBillingMonthLabel = (value) => {
  const parsed = parseBillingMonthLabel(value);
  if (!parsed) return '';

  const next = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 1);
  return next.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const splitRoomElectricBill = (roomElectricTotal, occupantCount) => {
  const total = Number(roomElectricTotal || 0);
  const count = Math.max(1, Number(occupantCount || 1));
  if (Number.isNaN(total) || total <= 0) return 0;
  return Number((total / count).toFixed(2));
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const resolveTenantUid = (tenantUid, tenantEmail, tenantIds, tenantIdByEmail) => {
  if (tenantUid && tenantIds.has(tenantUid)) return tenantUid;
  const byEmail = tenantIdByEmail.get(normalizeEmail(tenantEmail));
  return byEmail || '';
};

function TenantsManagement({ section = 'all' }) {
  const { user, createTenantAccount, isFirebaseConfigured } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    selectedRoomId: '',
    roomNo: '',
    selectedBed: '',
    billingMonth: '',
    dueDate: '',
    monthlyRate: '',
    electricBill: '',
    advanceDeposit: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    notifyEmail: true,
  });
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [pendingSearchTerm, setPendingSearchTerm] = useState('');
  const [pendingStatusFilter, setPendingStatusFilter] = useState('');
  const [pendingRoomFilter, setPendingRoomFilter] = useState('');
  const [updatingDueId, setUpdatingDueId] = useState('');
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [selectedTenantRow, setSelectedTenantRow] = useState(null);
  const [billingForm, setBillingForm] = useState({
    billingMonth: '',
    dueDate: '',
    monthlyRate: '',
    electricBill: '',
  });
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dues, setDues] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isTenantListLoading, setIsTenantListLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setIsTenantListLoading(false);
      return undefined;
    }

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const tenantUsers = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((item) => item.role === 'tenant');
        setTenants(tenantUsers);
        setIsTenantListLoading(false);
      },
      () => {
        setTenants([]);
        setIsTenantListLoading(false);
      }
    );

    const unsubPayments = onSnapshot(
      collection(db, 'payments'),
      (snapshot) => {
        const allPayments = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        setPayments(allPayments);
      },
      () => {
        setPayments([]);
      }
    );

    const unsubDues = onSnapshot(
      collection(db, 'dues'),
      (snapshot) => {
        const allDues = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        setDues(allDues);
      },
      () => {
        setDues([]);
      }
    );

    const unsubRooms = onSnapshot(
      collection(db, 'rooms'),
      (snapshot) => {
        const allRooms = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        setRooms(allRooms);
      },
      () => {
        setRooms([]);
      }
    );

    return () => {
      unsubUsers();
      unsubPayments();
      unsubDues();
      unsubRooms();
    };
  }, []);

  const availableRooms = useMemo(() => {
    return rooms
      .map((room) => {
        const capacity = Number(room.capacity || 0);
        const occupiedBeds = Number(room.occupiedBeds || 0);
        const freeBeds = Math.max(capacity - occupiedBeds, 0);
        return {
          ...room,
          capacity,
          occupiedBeds,
          freeBeds,
        };
      })
      .filter((room) => room.freeBeds > 0 && String(room.status || '').toLowerCase() !== 'maintenance')
      .sort((a, b) => String(a.roomNo || '').localeCompare(String(b.roomNo || ''), undefined, { numeric: true }));
  }, [rooms]);

  const selectedRoom = useMemo(
    () => availableRooms.find((room) => room.id === form.selectedRoomId) || null,
    [availableRooms, form.selectedRoomId]
  );

  const availableBedNumbers = useMemo(() => {
    if (!selectedRoom) return [];
    const start = selectedRoom.occupiedBeds + 1;
    const end = selectedRoom.capacity;
    if (start > end) return [];
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [selectedRoom]);

  useEffect(() => {
    if (!selectedRoom) {
      setForm((prev) => ({ ...prev, roomNo: '', selectedBed: '' }));
      return;
    }

    setForm((prev) => {
      const defaultBed = availableBedNumbers[0] ? String(availableBedNumbers[0]) : '';
      return {
        ...prev,
        roomNo: String(selectedRoom.roomNo || ''),
        selectedBed: prev.selectedBed && availableBedNumbers.includes(Number(prev.selectedBed)) ? prev.selectedBed : defaultBed,
      };
    });
  }, [selectedRoom, availableBedNumbers]);

  const tenantIds = useMemo(() => new Set(tenants.map((tenant) => tenant.id)), [tenants]);

  const tenantIdByEmail = useMemo(() => {
    const map = new Map();
    tenants.forEach((tenant) => {
      const email = normalizeEmail(tenant.email);
      if (!email) return;
      map.set(email, tenant.id);
    });
    return map;
  }, [tenants]);

  const paymentByTenant = useMemo(() => {
    const map = new Map();

    payments.forEach((payment) => {
      const tenantUid = resolveTenantUid(payment.tenantUid, payment.tenantEmail, tenantIds, tenantIdByEmail);
      if (!tenantUid) return;

      const current = map.get(tenantUid);
      const currentDate = parseDateValue(current?.dueDate) || parseDateValue(current?.submittedAt) || new Date(0);
      const incomingDate = parseDateValue(payment.dueDate) || parseDateValue(payment.submittedAt) || new Date(0);

      if (!current || incomingDate.getTime() >= currentDate.getTime()) {
        map.set(tenantUid, payment);
      }
    });

    return map;
  }, [payments, tenantIds, tenantIdByEmail]);

  const dueByTenant = useMemo(() => {
    const map = new Map();

    dues.forEach((due) => {
      const tenantUid = resolveTenantUid(due.tenantUid, due.tenantEmail, tenantIds, tenantIdByEmail);
      if (!tenantUid) return;

      const current = map.get(tenantUid);
      const currentDate = parseDateValue(current?.dueDate) || parseDateValue(current?.createdAt) || new Date(0);
      const incomingDate = parseDateValue(due.dueDate) || parseDateValue(due.createdAt) || new Date(0);

      if (!current || incomingDate.getTime() >= currentDate.getTime()) {
        map.set(tenantUid, due);
      }
    });

    return map;
  }, [dues, tenantIds, tenantIdByEmail]);

  const tenantRows = useMemo(() => {
    return tenants
      .map((tenant) => {
        const latestPayment = paymentByTenant.get(tenant.id);
        const latestDue = dueByTenant.get(tenant.id);

        let displayStatus = latestDue?.status || computeTenantPaymentStatus(latestPayment);
        const normalizedDueStatus = String(displayStatus).toLowerCase();

        if (normalizedDueStatus !== 'paid') {
          if (latestPayment && String(latestPayment.status || '').toLowerCase() === 'approved') {
            displayStatus = 'Paid';
          } else {
            const dueDate = parseDateValue(latestDue?.dueDate || latestPayment?.dueDate);
            if (dueDate && dueDate.getTime() < Date.now()) {
              displayStatus = 'Overdue';
            } else {
              displayStatus = 'Not Paid';
            }
          }
        }

        return {
          id: tenant.id,
          tenantUid: tenant.id,
          dueId: latestDue?.id || '',
          tenantName: tenant.fullName || tenant.email || tenant.id,
          tenantProfileImageUrl: tenant.profileImageDataUrl || tenant.profileImageUrl || '',
          email: tenant.email || '-',
          roomNo: tenant.roomNo || '-',
          dueDate: formatDateDisplay(latestDue?.dueDate || latestPayment?.dueDate),
          dueDateRaw: formatDate(latestDue?.dueDate || latestPayment?.dueDate),
          billingMonth: latestDue?.billingMonth || latestPayment?.billingMonth || '',
          monthlyRateValue: Number(latestDue?.monthlyRate || latestDue?.amount || 0),
          electricBillValue: Number(latestDue?.electricBill || 0),
          amount: latestDue ? formatAmount(latestDue.amount) : latestPayment ? formatAmount(latestPayment.amount) : 'Not Set',
          paymentStatus: displayStatus,
          updatedBy: latestDue?.updatedBy || latestDue?.updatedByEmail ? 'Admin' : '-',
          updatedAt: formatDateTime(latestDue?.updatedAt),
        };
      })
      .sort((a, b) => a.tenantName.localeCompare(b.tenantName));
  }, [tenants, paymentByTenant, dueByTenant]);

  const filteredTenantRows = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    return tenantRows.filter((row) => {
      const matchesSearch = !needle
        || row.tenantName.toLowerCase().includes(needle)
        || row.email.toLowerCase().includes(needle)
        || String(row.roomNo).toLowerCase().includes(needle);

      const matchesStatus = !statusFilter || row.paymentStatus === statusFilter;
      const matchesRoom = !roomFilter || row.roomNo === roomFilter;

      return matchesSearch && matchesStatus && matchesRoom;
    });
  }, [tenantRows, searchTerm, statusFilter, roomFilter]);

  const uniqueAssignedRooms = useMemo(
    () => Array.from(new Set(tenantRows.map((row) => row.roomNo).filter((roomNo) => roomNo && roomNo !== '-')))
      .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })),
    [tenantRows]
  );

  const tenantOverviewStats = useMemo(() => {
    const paidCount = tenantRows.filter((row) => String(row.paymentStatus || '').toLowerCase() === 'paid').length;
    const pendingCount = tenantRows.filter((row) => String(row.paymentStatus || '').toLowerCase() !== 'paid').length;

    const now = new Date();
    const currentMonthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const monthlyRevenue = tenantRows
      .filter((row) => String(row.billingMonth || '').toLowerCase() === currentMonthLabel.toLowerCase())
      .reduce((sum, row) => {
        const amount = Number(String(row.amount || '0').replace(/[^0-9.]/g, ''));
        return sum + (Number.isNaN(amount) ? 0 : amount);
      }, 0);

    return {
      total: tenantRows.length,
      paidCount,
      pendingCount,
      paidPercentage: tenantRows.length > 0 ? Math.round((paidCount / tenantRows.length) * 100) : 0,
      currentMonthLabel,
      monthlyRevenue,
    };
  }, [tenantRows]);

  const applyOverviewFilters = () => {
    setSearchTerm(pendingSearchTerm);
    setStatusFilter(pendingStatusFilter);
    setRoomFilter(pendingRoomFilter);
  };

  const resetOverviewFilters = () => {
    setPendingSearchTerm('');
    setPendingStatusFilter('');
    setPendingRoomFilter('');
    setSearchTerm('');
    setStatusFilter('');
    setRoomFilter('');
  };

  const handlePostPaidFlow = async (row) => {
    const currentDue = dues.find((item) => item.id === row.dueId);
    if (!currentDue) return;

    const monthlyRate = Number(currentDue.monthlyRate || currentDue.amount || 0);
    const electricBill = Number(currentDue.electricBill || 0);
    const totalAmount = Number(currentDue.amount || monthlyRate + electricBill);

    const paymentHistoryQuery = query(
      collection(db, 'payments'),
      where('tenantUid', '==', row.tenantUid),
      where('billingMonth', '==', currentDue.billingMonth || '')
    );
    const paymentHistorySnapshot = await getDocs(paymentHistoryQuery);
    const hasBillingHistory = paymentHistorySnapshot.docs.some((item) => {
      const data = item.data() || {};
      return String(data.method || '').toLowerCase() === 'billing';
    });

    if (!hasBillingHistory) {
      await addDoc(collection(db, 'payments'), {
        tenantUid: row.tenantUid,
        tenantEmail: row.email,
        tenantRoomNo: row.roomNo,
        billingMonth: currentDue.billingMonth || '',
        dueDate: currentDue.dueDate || '',
        monthlyRate,
        electricBill,
        amount: totalAmount,
        method: 'Billing',
        referenceNumber: 'AUTO-PAID',
        status: 'Approved',
        verificationReason: 'Marked paid from admin billing flow',
        submittedAt: serverTimestamp(),
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid || null,
      });
    }

    const nextBillingMonth = getNextBillingMonthLabel(currentDue.billingMonth || '');
    if (!nextBillingMonth) return;

    const hasNextDue = dues.some(
      (item) => item.tenantUid === row.tenantUid
        && String(item.billingMonth || '').toLowerCase() === nextBillingMonth.toLowerCase()
    );
    if (hasNextDue) return;

    const baseDueDate = parseDateValue(currentDue.dueDate);
    const nextDueDate = baseDueDate
      ? new Date(baseDueDate.getFullYear(), baseDueDate.getMonth() + 1, baseDueDate.getDate())
      : new Date();

    await addDoc(collection(db, 'dues'), {
      tenantUid: row.tenantUid,
      tenantEmail: row.email,
      roomNo: row.roomNo,
      billingMonth: nextBillingMonth,
      dueDate: nextDueDate.toISOString().slice(0, 10),
      monthlyRate,
      electricBill: 0,
      amount: monthlyRate,
      status: 'Pending',
      createdAt: serverTimestamp(),
      createdBy: user?.uid || null,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || null,
      updatedByEmail: user?.email || null,
    });
  };

  const handleUpdateDueStatus = async (row, nextStatus) => {
    if (!db) {
      setError('Firestore is not configured.');
      return;
    }

    if (!row.dueId) {
      setError('No due record found for this tenant yet.');
      return;
    }

    setError('');
    setSuccess('');
    setUpdatingDueId(row.dueId);

    try {
      await updateDoc(doc(db, 'dues', row.dueId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
        updatedByEmail: user?.email || null,
      });

      if (nextStatus === 'Paid') {
        await handlePostPaidFlow(row);
      }

      setSuccess(`Updated ${row.tenantName} status to ${nextStatus}.`);
    } catch {
      setError('Unable to update due status right now.');
    } finally {
      setUpdatingDueId('');
    }
  };

  const handleOpenBillingModal = (row) => {
    const roomOccupants = tenants.filter((tenant) => String(tenant.roomNo || '') === String(row.roomNo || '')).length || 1;
    const roomElectricTotal = Number(row.electricBillValue || 0) * roomOccupants;

    setSelectedTenantRow(row);
    setBillingForm({
      billingMonth: row.billingMonth && row.billingMonth !== '-' ? row.billingMonth : '',
      dueDate: row.dueDateRaw && row.dueDateRaw !== '-' ? row.dueDateRaw : '',
      monthlyRate: row.monthlyRateValue ? String(row.monthlyRateValue) : '',
      electricBill: roomElectricTotal ? String(roomElectricTotal) : '',
    });
    setShowBillingModal(true);
  };

  const handleSaveBilling = async (event) => {
    event.preventDefault();

    if (!db || !selectedTenantRow) {
      setError('Billing update is not available right now.');
      return;
    }

    const billingMonth = billingForm.billingMonth.trim();
    if (!billingMonth || !/^[A-Za-z]+\s+\d{4}$/.test(billingMonth)) {
      setError('Billing month must follow format like March 2026.');
      return;
    }

    const dueDate = parseDateValue(billingForm.dueDate);
    if (!dueDate) {
      setError('Due date is invalid.');
      return;
    }

    const monthlyRate = Number(billingForm.monthlyRate);
    const roomElectricTotal = Number(billingForm.electricBill || 0);

    if (Number.isNaN(monthlyRate) || monthlyRate <= 0 || monthlyRate > 1000000) {
      setError('Monthly rate must be greater than 0 and less than or equal to 1,000,000.');
      return;
    }

    if (Number.isNaN(roomElectricTotal) || roomElectricTotal < 0 || roomElectricTotal > 1000000) {
      setError('Electric bill must be between 0 and 1,000,000.');
      return;
    }

    const roomTenants = tenants.filter((tenant) => String(tenant.roomNo || '') === String(selectedTenantRow.roomNo || ''));
    const occupantCount = roomTenants.length || 1;
    const electricBillPerTenant = splitRoomElectricBill(roomElectricTotal, occupantCount);
    const amount = monthlyRate + electricBillPerTenant;

    if (amount > 1000000) {
      setError('Total amount is too large. Please review monthly rate and electric bill.');
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const targetRoomNo = String(selectedTenantRow.roomNo || '');
      const targetRoomTenants = tenants.filter((tenant) => String(tenant.roomNo || '') === targetRoomNo);

      for (const tenant of targetRoomTenants) {
        const existingDue = dues.find(
          (due) => due.tenantUid === tenant.id
            && String(due.billingMonth || '').toLowerCase() === billingMonth.toLowerCase()
        );

        const existingDueDate = formatDate(existingDue?.dueDate || '');
        const dueDateChanged = existingDueDate && existingDueDate !== billingForm.dueDate;
        const billingMonthChanged = existingDue
          ? String(existingDue.billingMonth || '').toLowerCase() !== billingMonth.toLowerCase()
          : false;

        const normalizedExistingStatus = String(existingDue?.status || '').toLowerCase();
        let nextStatus = dueDate.getTime() < Date.now() ? 'Overdue' : 'Pending';

        if (normalizedExistingStatus === 'paid' && !dueDateChanged && !billingMonthChanged) {
          nextStatus = 'Paid';
        }

        const payload = {
          tenantUid: tenant.id,
          tenantEmail: tenant.email || '',
          roomNo: tenant.roomNo || targetRoomNo,
          billingMonth,
          dueDate: billingForm.dueDate,
          monthlyRate,
          electricBill: electricBillPerTenant,
          amount,
          status: nextStatus,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || null,
          updatedByEmail: user?.email || null,
        };

        if (existingDue?.id) {
          await updateDoc(doc(db, 'dues', existingDue.id), payload);
        } else {
          await addDoc(collection(db, 'dues'), {
            ...payload,
            status: 'Pending',
            createdAt: serverTimestamp(),
            createdBy: user?.uid || null,
          });
        }
      }

      setSuccess(`Billing saved. Room ${targetRoomNo} electric bill was split to ${occupantCount} tenant(s).`);
      setShowBillingModal(false);
      setSelectedTenantRow(null);
    } catch {
      setError('Unable to save billing details right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tenantColumns = [
    {
      key: 'tenantName',
      label: 'Tenant',
      render: (value, row) => (
        <div className="tenants-identity-cell">
          {row.tenantProfileImageUrl ? (
            <img
              src={row.tenantProfileImageUrl}
              alt={value || 'Tenant'}
              className="tenants-avatar-image"
            />
          ) : (
            <span className="tenants-avatar">{String(value || '?').slice(0, 1).toUpperCase()}</span>
          )}
          <div className="tenants-identity-text">
            <strong>{value}</strong>
          </div>
        </div>
      ),
    },
    { key: 'email', label: 'Email' },
    { key: 'roomNo', label: 'Assigned Room' },
    {
      key: 'billingMonth',
      label: 'Billing Month',
      render: (value, row) => (
        <button
          type="button"
          className="action-btn edit"
          onClick={() => handleOpenBillingModal(row)}
          title="Edit billing"
          aria-label="Edit billing month"
          style={{ minWidth: 120 }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CalendarIcon className="ui-icon" size={14} />
            <span>{value || 'Edit'}</span>
          </span>
        </button>
      ),
    },
    { key: 'dueDate', label: 'Due Date' },
  ];

  const tenantActions = [
    {
      icon: <CardIcon className="ui-icon" size={15} />,
      label: 'Edit Billing',
      variant: 'edit',
      onClick: (row) => handleOpenBillingModal(row),
    },
    {
      icon: <XCircleIcon className="ui-icon" size={15} />,
      label: 'Mark Overdue',
      variant: 'delete',
      onClick: (row) => handleUpdateDueStatus(row, 'Overdue'),
    },
  ];

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }

    if (!form.selectedRoomId || !form.roomNo) {
      setError('Please assign an available room.');
      return;
    }

    if (!form.selectedBed) {
      setError('Please select an available bed slot.');
      return;
    }

    if (!form.billingMonth.trim() || !form.dueDate || !form.monthlyRate) {
      setError('Please fill in billing month, due date, and monthly rate.');
      return;
    }

    if (!/^[A-Za-z]+\s+\d{4}$/.test(form.billingMonth.trim())) {
      setError('Billing month must follow format like March 2026.');
      return;
    }

    const dueDateObject = parseDateValue(form.dueDate);
    if (!dueDateObject) {
      setError('Due date is invalid.');
      return;
    }

    const monthlyRate = Number(form.monthlyRate);
    const roomElectricTotal = Number(form.electricBill || 0);
    const advanceDeposit = Number(form.advanceDeposit || 0);
    const occupantCount = (selectedRoom?.occupiedBeds || 0) + 1;
    const electricBill = splitRoomElectricBill(roomElectricTotal, occupantCount);
    const totalAmount = monthlyRate + electricBill;

    if (monthlyRate <= 0 || Number.isNaN(monthlyRate)) {
      setError('Monthly rate must be a valid value greater than 0.');
      return;
    }

    if (Number.isNaN(roomElectricTotal) || roomElectricTotal < 0) {
      setError('Electric bill must be 0 or greater.');
      return;
    }

    if (Number.isNaN(advanceDeposit) || advanceDeposit < 0) {
      setError('Early deposit must be 0 or greater.');
      return;
    }

    if (totalAmount > 1000000) {
      setError('Total amount is too large. Please review monthly rate and electric bill.');
      return;
    }

    const duplicateDueExists = dues.some(
      (due) => String(due.tenantEmail || '').toLowerCase() === form.email.trim().toLowerCase()
        && String(due.billingMonth || '').toLowerCase() === form.billingMonth.trim().toLowerCase()
    );

    if (duplicateDueExists) {
      setError('A billing record already exists for this tenant email and billing month.');
      return;
    }

    if (selectedPhotoFile && !selectedPhotoFile.type.startsWith('image/')) {
      setError('Only image files are allowed for profile picture.');
      return;
    }

    if (selectedPhotoFile && selectedPhotoFile.size > 300 * 1024) {
      setError('Image is too large. Please use an image under 300KB.');
      return;
    }

    setIsSubmitting(true);

    try {
      const profileImageDataUrl = selectedPhotoFile
        ? await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Image read failed'));
          reader.readAsDataURL(selectedPhotoFile);
        })
        : '';

      const created = await createTenantAccount({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        selectedRoomId: form.selectedRoomId,
        roomNo: form.roomNo.trim(),
        roomBed: Number(form.selectedBed),
        billingMonth: form.billingMonth.trim(),
        dueDate: form.dueDate,
        amount: totalAmount,
        monthlyRate,
        electricBill,
        advanceDeposit: Number(form.advanceDeposit || 0),
        phone: form.phone.trim(),
        profileImageDataUrl,
        notifyEmail: form.notifyEmail,
      });

      setSuccess(`Tenant account created: ${created.email}. Share the temporary password and ask tenant to change it after login.`);
      setForm({
        fullName: '',
        selectedRoomId: '',
        roomNo: '',
        selectedBed: '',
        billingMonth: '',
        dueDate: '',
        monthlyRate: '',
        electricBill: '',
        advanceDeposit: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
        notifyEmail: true,
      });
      setSelectedPhotoFile(null);
      setPhotoPreviewUrl('');
    } catch (creationError) {
      setError(creationError.message || 'Unable to create tenant account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="rooms-management-page">
        <div className="page-header">
          <h1>Tenants Management</h1>
          <p className="page-subtitle">Create tenant login credentials from the admin portal.</p>
        </div>

        {section !== 'overview' && (
        <section className="dashboard-widget">
          <div className="widget-header">
            <h2>Create Tenant Account</h2>
          </div>

          <form className="add-room-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Tenant Name</label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="e.g., Juan Dela Cruz"
                required
              />
            </div>

            <div className="form-group">
              <label>Assign Room (Available Beds Only)</label>
              <select
                name="selectedRoomId"
                value={form.selectedRoomId}
                onChange={handleChange}
                required
              >
                <option value="">Select Available Room</option>
                {availableRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    Room {room.roomNo} ({room.freeBeds} bed{room.freeBeds > 1 ? 's' : ''} available)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Assign Bed Slot</label>
              <select
                name="selectedBed"
                value={form.selectedBed}
                onChange={handleChange}
                required
                disabled={!selectedRoom}
              >
                <option value="">Select Bed</option>
                {availableBedNumbers.map((bedNumber) => (
                  <option key={bedNumber} value={String(bedNumber)}>
                    Bed {bedNumber}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Billing Month</label>
              <input
                type="text"
                name="billingMonth"
                value={form.billingMonth}
                onChange={handleChange}
                placeholder="e.g., March 2026"
                required
              />
            </div>

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Monthly Rate</label>
              <input
                type="number"
                min="1"
                step="0.01"
                name="monthlyRate"
                value={form.monthlyRate}
                onChange={handleChange}
                placeholder="e.g., 5000"
                required
              />
            </div>

            <div className="form-group">
              <label>Room Electric Bill (Auto-split)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="electricBill"
                value={form.electricBill}
                onChange={handleChange}
                placeholder="e.g., 1500"
              />
            </div>

            <div className="form-group">
              <label>Total Amount</label>
              <input
                type="text"
                value={formatAmount(
                  Number(form.monthlyRate || 0)
                  + splitRoomElectricBill(Number(form.electricBill || 0), (selectedRoom?.occupiedBeds || 0) + 1)
                )}
                readOnly
              />
            </div>

            <div className="form-group">
              <label>Early Deposit (Optional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                name="advanceDeposit"
                value={form.advanceDeposit}
                onChange={handleChange}
                placeholder="e.g., 2000"
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="e.g., 09171234567"
              />
            </div>

            <div className="form-group">
              <label>Profile Picture</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setSelectedPhotoFile(file);

                  if (!file) {
                    setPhotoPreviewUrl('');
                    return;
                  }

                  const reader = new FileReader();
                  reader.onload = () => setPhotoPreviewUrl(String(reader.result || ''));
                  reader.onerror = () => setPhotoPreviewUrl('');
                  reader.readAsDataURL(file);
                }}
              />
              {photoPreviewUrl && (
                <img
                  src={photoPreviewUrl}
                  alt="Tenant preview"
                  style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', marginTop: 8 }}
                />
              )}
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="tenant@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Temporary Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="notifyEmail"
                  checked={form.notifyEmail}
                  onChange={handleChange}
                  style={{ marginRight: 8 }}
                />
                Enable email due reminders
              </label>
            </div>

            {error && <p style={{ color: '#b91c1c', marginTop: 4 }}>{error}</p>}
            {success && <p style={{ color: '#166534', marginTop: 4 }}>{success}</p>}

            <div className="modal-actions" style={{ marginTop: 8 }}>
              <button type="submit" className="btn-primary" disabled={isSubmitting || !isFirebaseConfigured}>
                {isSubmitting ? 'Creating...' : 'Create Tenant Account'}
              </button>
            </div>
          </form>

          {!isFirebaseConfigured && (
            <p className="page-subtitle" style={{ marginTop: 12 }}>
              Firebase env values are missing. Add VITE_FIREBASE_* variables first.
            </p>
          )}
        </section>
        )}

        {section !== 'create' && (
        <div className="tenants-overview-shell">
        <div className="modal-actions" style={{ marginBottom: 12, justifyContent: 'flex-end' }}>
          <Link to="/admin/tenants/create" className="btn-primary">Create Tenant Account</Link>
        </div>

        <section className="users-stat-grid tenants-overview-stats">
          <article className="dashboard-surface users-stat-card">
            <span className="users-stat-icon"><UsersIcon className="ui-icon" size={18} /></span>
            <p className="users-stat-label">Total Tenants:</p>
            <h3>{tenantOverviewStats.total}</h3>
          </article>
          <article className="dashboard-surface users-stat-card">
            <span className="users-stat-icon"><CheckCircleIcon className="ui-icon" size={18} /></span>
            <p className="users-stat-label">Payments Paid:</p>
            <h3>{tenantOverviewStats.paidCount} ({tenantOverviewStats.paidPercentage}%)</h3>
          </article>
          <article className="dashboard-surface users-stat-card">
            <span className="users-stat-icon"><PulseIcon className="ui-icon" size={18} /></span>
            <p className="users-stat-label">Payments Pending:</p>
            <h3>{tenantOverviewStats.pendingCount}</h3>
          </article>
          <article className="dashboard-surface users-stat-card">
            <span className="users-stat-icon"><ReportIcon className="ui-icon" size={18} /></span>
            <p className="users-stat-label">Monthly Revenue ({tenantOverviewStats.currentMonthLabel.split(' ')[0]}):</p>
            <h3>{formatAmount(tenantOverviewStats.monthlyRevenue)}</h3>
          </article>
        </section>

        <section className="dashboard-widget tenants-overview-widget">
          <div className="widget-header">
            <h2>Tenant Payment Overview ({tenantRows.length})</h2>
          </div>

          <div className="users-toolbar tenants-overview-toolbar">
            <div className="users-toolbar-group">
              <label>Search</label>
              <input
                type="text"
                value={pendingSearchTerm}
                onChange={(event) => setPendingSearchTerm(event.target.value)}
                placeholder="Search tenant, email, or room"
              />
            </div>

            <div className="users-toolbar-group users-toolbar-select">
              <label>Status</label>
              <select value={pendingStatusFilter} onChange={(event) => setPendingStatusFilter(event.target.value)}>
                <option value="">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Not Paid">Not Paid</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>

            <div className="users-toolbar-group users-toolbar-select">
              <label>Room</label>
              <select value={pendingRoomFilter} onChange={(event) => setPendingRoomFilter(event.target.value)}>
                <option value="">All Rooms</option>
                {uniqueAssignedRooms.map((roomNo) => (
                  <option key={roomNo} value={roomNo}>{roomNo}</option>
                ))}
              </select>
            </div>

            <div className="tenants-overview-toolbar-actions">
              <button type="button" className="btn-primary" onClick={applyOverviewFilters}>Apply</button>
              <button type="button" className="btn-secondary" onClick={resetOverviewFilters}>Reset</button>
            </div>
          </div>

          {updatingDueId && <p>Updating due status...</p>}

          {isTenantListLoading ? (
            <p>Loading tenants...</p>
          ) : (
            <DataTable columns={tenantColumns} data={filteredTenantRows} actions={tenantActions} />
          )}
        </section>
        </div>
        )}

        <Modal
          isOpen={showBillingModal}
          title={selectedTenantRow ? `Edit Billing - ${selectedTenantRow.tenantName}` : 'Edit Billing'}
          onClose={() => {
            setShowBillingModal(false);
            setSelectedTenantRow(null);
          }}
          size="medium"
        >
          <form className="add-room-form" onSubmit={handleSaveBilling}>
            <div className="form-group">
              <label>Billing Month</label>
              <input
                type="text"
                value={billingForm.billingMonth}
                onChange={(event) => setBillingForm((prev) => ({ ...prev, billingMonth: event.target.value }))}
                placeholder="e.g., March 2026"
                required
              />
            </div>

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={billingForm.dueDate}
                onChange={(event) => setBillingForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label>Monthly Rate</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={billingForm.monthlyRate}
                onChange={(event) => setBillingForm((prev) => ({ ...prev, monthlyRate: event.target.value }))}
                placeholder="e.g., 5000"
                required
              />
            </div>

            <div className="form-group">
              <label>Room Electric Bill (Auto-split)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={billingForm.electricBill}
                onChange={(event) => setBillingForm((prev) => ({ ...prev, electricBill: event.target.value }))}
                placeholder="e.g., 1500"
              />
            </div>

            <div className="form-group">
              <label>Total Amount</label>
              <input
                type="text"
                value={formatAmount(
                  Number(billingForm.monthlyRate || 0)
                  + splitRoomElectricBill(
                    Number(billingForm.electricBill || 0),
                    tenants.filter((tenant) => String(tenant.roomNo || '') === String(selectedTenantRow?.roomNo || '')).length || 1
                  )
                )}
                readOnly
              />
            </div>

            <div className="modal-actions">
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Billing'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowBillingModal(false);
                  setSelectedTenantRow(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}

export default TenantsManagement;
