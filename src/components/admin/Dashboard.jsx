import React, { useMemo, useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import AdminLayout from './AdminLayout';
import SummaryCard from '../common/SummaryCard';
import DataTable from '../common/DataTable';
import RecentActivity from '../common/RecentActivity';
import StatusBadge from '../common/StatusBadge';
import { db } from '../../lib/firebase';

const formatPeso = (value) => `P${Number(value || 0).toLocaleString('en-PH')}`;

const formatDate = (value) => {
  if (!value) return '-';
  if (typeof value?.toDate === 'function') return value.toDate().toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

const timeAgo = (value) => {
  if (!value || typeof value?.toDate !== 'function') return 'Recently';

  const now = Date.now();
  const created = value.toDate().getTime();
  const diffMs = Math.max(now - created, 0);
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dues, setDues] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!db) {
      setError('Firestore is not configured. Add VITE_FIREBASE_* values first.');
      setIsLoading(false);
      return undefined;
    }

    const unsubRooms = onSnapshot(
      collection(db, 'rooms'),
      (snapshot) => {
        setRooms(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      () => {
        setError('Unable to load room metrics right now.');
      }
    );

    const unsubPayments = onSnapshot(
      collection(db, 'payments'),
      (snapshot) => {
        setPayments(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      () => {
        setError('Unable to load payment metrics right now.');
      }
    );

    const unsubDues = onSnapshot(
      collection(db, 'dues'),
      (snapshot) => {
        setDues(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      () => {
        setError('Unable to load due metrics right now.');
      }
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const tenantUsers = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((user) => user.role === 'tenant');
        setTenants(tenantUsers);
        setIsLoading(false);
      },
      () => {
        setError('Unable to load tenant metrics right now.');
        setIsLoading(false);
      }
    );

    return () => {
      unsubRooms();
      unsubPayments();
      unsubDues();
      unsubUsers();
    };
  }, []);

  const { totalRooms, totalBeds, occupiedBeds, availableBeds, occupancyRate } = useMemo(() => {
    const roomCount = rooms.length;
    const beds = rooms.reduce((sum, room) => sum + Number(room.capacity || 0), 0);

    const tenantCountByRoom = tenants.reduce((acc, tenant) => {
      const roomNo = String(tenant.roomNo || '').trim();
      if (!roomNo) return acc;
      acc[roomNo] = (acc[roomNo] || 0) + 1;
      return acc;
    }, {});

    const occupied = rooms.reduce((sum, room) => {
      const roomNo = String(room.roomNo || '').trim();
      const assignedTenants = tenantCountByRoom[roomNo] || 0;
      const capacity = Number(room.capacity || 0);
      return sum + Math.min(assignedTenants, capacity);
    }, 0);

    const available = Math.max(beds - occupied, 0);
    const rate = beds > 0 ? Math.round((occupied / beds) * 100) : 0;

    return {
      totalRooms: roomCount,
      totalBeds: beds,
      occupiedBeds: occupied,
      availableBeds: available,
      occupancyRate: rate,
    };
  }, [rooms, tenants]);

  const { pendingPayments, pendingPaymentAmount, approvedThisMonth } = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const pending = payments.filter((payment) => payment.status === 'Pending');
    const pendingAmount = pending.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const approved = payments.filter((payment) => {
      if (payment.status !== 'Approved' || typeof payment.reviewedAt?.toDate !== 'function') return false;
      const reviewedDate = payment.reviewedAt.toDate();
      return reviewedDate.getMonth() === month && reviewedDate.getFullYear() === year;
    });

    const approvedAmount = approved.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return {
      pendingPayments: pending.length,
      pendingPaymentAmount: pendingAmount,
      approvedThisMonth: approvedAmount,
    };
  }, [payments]);

  const summaryCards = [
    {
      icon: '🏠',
      title: 'Total Rooms',
      value: String(totalRooms),
      subtitle: `${totalBeds} total beds`,
      color: 'blue',
      trend: { type: 'neutral', text: 'Live Firestore data' },
    },
    {
      icon: '✅',
      title: 'Available Beds',
      value: String(availableBeds),
      subtitle: `${occupancyRate}% occupancy`,
      color: 'green',
      trend: { type: 'positive', text: `${availableBeds} beds currently open` },
    },
    {
      icon: '👥',
      title: 'Occupied Beds',
      value: String(occupiedBeds),
      subtitle: `${tenants.length} tenant accounts`,
      color: 'cyan',
      trend: { type: 'neutral', text: `${occupancyRate}% occupied` },
    },
    {
      icon: '💳',
      title: 'Pending Payments',
      value: formatPeso(pendingPaymentAmount),
      subtitle: `${pendingPayments} submissions waiting`,
      color: 'orange',
      trend: { type: pendingPayments > 0 ? 'negative' : 'positive', text: pendingPayments > 0 ? 'Needs review' : 'Queue is clear' },
    },
    {
      icon: '📈',
      title: 'Monthly Revenue',
      value: formatPeso(approvedThisMonth),
      subtitle: 'Approved payments this month',
      color: 'purple',
      trend: { type: 'positive', text: 'Auto-calculated from reviews' },
    },
  ];

  const latestTenants = useMemo(() => {
    return [...tenants]
      .sort((a, b) => {
        const aTime = typeof a.createdAt?.toDate === 'function' ? a.createdAt.toDate().getTime() : 0;
        const bTime = typeof b.createdAt?.toDate === 'function' ? b.createdAt.toDate().getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 6)
      .map((tenant) => ({
        id: tenant.id,
        name: tenant.fullName || tenant.email || '-',
        room: tenant.roomNo || '-',
        checkIn: formatDate(tenant.createdAt),
        status: 'Active',
      }));
  }, [tenants]);

  const upcomingDueDates = useMemo(() => {
    const toSortableDate = (value) => {
      if (!value) return Number.MAX_SAFE_INTEGER;
      if (typeof value?.toDate === 'function') return value.toDate().getTime();
      const parsed = new Date(value).getTime();
      return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
    };

    const dueRows = dues
      .filter((due) => String(due.status || '').toLowerCase() !== 'paid')
      .sort((a, b) => toSortableDate(a.dueDate) - toSortableDate(b.dueDate))
      .slice(0, 8)
      .map((due) => {
        const dueDateValue = due.dueDate;
        const dueDateText = typeof dueDateValue?.toDate === 'function'
          ? dueDateValue.toDate().toISOString().slice(0, 10)
          : (dueDateValue || '-');

        return {
          tenant: due.tenantEmail || '-',
          room: due.roomNo || '-',
          dueDate: dueDateText,
          amount: formatPeso(due.amount || 0),
          status: due.status || 'Pending',
        };
      });

    if (dueRows.length > 0) return dueRows;

    return payments
      .filter((payment) => payment.status === 'Pending')
      .sort((a, b) => {
        const aDate = new Date(a.billingMonth || '').getTime() || Number.MAX_SAFE_INTEGER;
        const bDate = new Date(b.billingMonth || '').getTime() || Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      })
      .slice(0, 8)
      .map((payment) => ({
        tenant: payment.tenantEmail || '-',
        room: payment.tenantRoomNo || '-',
        dueDate: payment.billingMonth || '-',
        amount: formatPeso(payment.amount || 0),
        status: payment.status || 'Pending',
      }));
  }, [dues, payments]);

  const recentActivities = useMemo(() => {
    const paymentActivities = payments
      .map((payment) => ({
        key: `payment-${payment.id}`,
        icon: payment.status === 'Approved' ? '✅' : payment.status === 'Rejected' ? '❌' : '💳',
        message: `${payment.tenantEmail || 'Tenant'} payment ${String(payment.status || 'submitted').toLowerCase()}`,
        time: timeAgo(payment.reviewedAt || payment.submittedAt),
        status: payment.status || 'Pending',
        ts: (payment.reviewedAt || payment.submittedAt)?.toDate?.()?.getTime?.() || 0,
      }));

    const tenantActivities = tenants
      .map((tenant) => ({
        key: `tenant-${tenant.id}`,
        icon: '👤',
        message: `New tenant account: ${tenant.fullName || tenant.email || tenant.id}`,
        time: timeAgo(tenant.createdAt),
        status: 'Active',
        ts: tenant.createdAt?.toDate?.()?.getTime?.() || 0,
      }));

    const roomActivities = rooms
      .filter((room) => room.updatedAt || room.createdAt)
      .map((room) => ({
        key: `room-${room.id}`,
        icon: '🏠',
        message: `Room ${room.roomNo || room.id} updated`,
        time: timeAgo(room.updatedAt || room.createdAt),
        status: room.status || 'Updated',
        ts: (room.updatedAt || room.createdAt)?.toDate?.()?.getTime?.() || 0,
      }));

    return [...paymentActivities, ...tenantActivities, ...roomActivities]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 10);
  }, [payments, rooms, tenants]);

  const tenantColumns = [
    { key: 'name', label: 'Tenant Name' },
    { key: 'id', label: 'ID' },
    { key: 'room', label: 'Room' },
    { key: 'checkIn', label: 'Check-in Date' },
    {
      key: 'status',
      label: 'Status',
      render: (status) => <StatusBadge status={status} type={status.toLowerCase()} />
    }
  ];

  const dueColumns = [
    { key: 'tenant', label: 'Tenant' },
    { key: 'room', label: 'Room' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'amount', label: 'Amount' },
    {
      key: 'status',
      label: 'Status',
      render: (status) => <StatusBadge status={status} type={status.toLowerCase().replace(' ', '-')} />
    }
  ];

  return (
    <AdminLayout>
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's your dormitory overview.</p>
        </div>

        {isLoading && <p>Loading dashboard...</p>}
        {error && <p style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</p>}

        {/* Summary Cards */}
        <section className="summary-section">
          <div className="cards-grid">
            {summaryCards.map((card, idx) => (
              <SummaryCard key={idx} {...card} />
            ))}
          </div>
        </section>

        {/* Main Content */}
        <section className="dashboard-content">
          {/* Recent Activity */}
          <div className="dashboard-widget">
            <div className="widget-header">
              <h2>Recent Activity</h2>
            </div>
            <RecentActivity activities={recentActivities} limit={6} />
          </div>

          {/* Latest Tenants */}
          <div className="dashboard-widget">
            <div className="widget-header">
              <h2>Latest Tenants</h2>
            </div>
            <DataTable columns={tenantColumns} data={latestTenants} />
          </div>

          {/* Upcoming Due Dates */}
          <div className="dashboard-widget">
            <div className="widget-header">
              <h2>Upcoming Due Dates</h2>
            </div>
            <DataTable columns={dueColumns} data={upcomingDueDates} />
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default Dashboard;
