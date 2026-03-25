import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import AdminLayout from './AdminLayout';
import { db } from '../../lib/firebase';
import {
  CardIcon,
  CheckCircleIcon,
  HomeIcon,
  PulseIcon,
  UserIcon,
  UsersIcon,
  XCircleIcon,
} from '../common/LineIcons';

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

const statusTone = (value) => {
  const status = String(value || '').toLowerCase();
  if (status.includes('active') || status.includes('approved') || status.includes('available')) return 'is-positive';
  if (status.includes('pending') || status.includes('review')) return 'is-warning';
  if (status.includes('rejected') || status.includes('overdue')) return 'is-negative';
  return 'is-neutral';
};

function Dashboard() {
<<<<<<< Updated upstream
=======
  const isDbConfigured = Boolean(db);
>>>>>>> Stashed changes
  const [rooms, setRooms] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dues, setDues] = useState([]);
  const [tenants, setTenants] = useState([]);
<<<<<<< Updated upstream
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!db) {
      setError('Firestore is not configured. Add VITE_FIREBASE_* values first.');
      setIsLoading(false);
      return undefined;
    }
=======
  const [isLoading, setIsLoading] = useState(Boolean(db));
  const [runtimeError, setRuntimeError] = useState('');

  useEffect(() => {
    if (!db) return undefined;
>>>>>>> Stashed changes

    const unsubRooms = onSnapshot(
      collection(db, 'rooms'),
      (snapshot) => {
        setRooms(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      () => {
<<<<<<< Updated upstream
        setError('Unable to load room metrics right now.');
=======
        setRuntimeError('Unable to load room metrics right now.');
>>>>>>> Stashed changes
      }
    );

    const unsubPayments = onSnapshot(
      collection(db, 'payments'),
      (snapshot) => {
        setPayments(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      () => {
<<<<<<< Updated upstream
        setError('Unable to load payment metrics right now.');
=======
        setRuntimeError('Unable to load payment metrics right now.');
>>>>>>> Stashed changes
      }
    );

    const unsubDues = onSnapshot(
      collection(db, 'dues'),
      (snapshot) => {
        setDues(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      () => {
<<<<<<< Updated upstream
        setError('Unable to load due metrics right now.');
=======
        setRuntimeError('Unable to load due metrics right now.');
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
        setError('Unable to load tenant metrics right now.');
=======
        setRuntimeError('Unable to load tenant metrics right now.');
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
=======
  const error = isDbConfigured
    ? runtimeError
    : 'Firestore is not configured. Add VITE_FIREBASE_* values first.';

>>>>>>> Stashed changes
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

    const pendingPaymentRecords = payments.filter((payment) => {
      const status = String(payment.status || '').toLowerCase();
      return status === 'pending' || status === 'pending-review' || status === 'needs-review';
    });

    const pendingDueRecords = dues.filter((due) => {
      const status = String(due.status || '').toLowerCase();
      return status === 'pending' || status === 'overdue';
    });

    const pendingAmount = [...pendingPaymentRecords, ...pendingDueRecords]
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const approved = payments.filter((payment) => {
      if (payment.status !== 'Approved' || typeof payment.reviewedAt?.toDate !== 'function') return false;
      const reviewedDate = payment.reviewedAt.toDate();
      return reviewedDate.getMonth() === month && reviewedDate.getFullYear() === year;
    });

    const approvedAmount = approved.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return {
      pendingPayments: pendingPaymentRecords.length + pendingDueRecords.length,
      pendingPaymentAmount: pendingAmount,
      approvedThisMonth: approvedAmount,
    };
  }, [dues, payments]);

  const summaryCards = [
    {
      icon: <HomeIcon className="ui-icon" size={24} />,
      title: 'Total Rooms',
      value: String(totalRooms),
      subtitle: `${totalBeds} total beds`,
      color: 'blue',
      trend: 'Live Firestore data',
    },
    {
      icon: <CheckCircleIcon className="ui-icon" size={24} />,
      title: 'Available Beds',
      value: String(availableBeds),
      subtitle: `${occupancyRate}% occupancy`,
      color: 'green',
      trend: `${availableBeds} beds currently open`,
    },
    {
      icon: <UsersIcon className="ui-icon" size={24} />,
      title: 'Occupied Beds',
      value: String(occupiedBeds),
      subtitle: `${tenants.length} tenant accounts`,
      color: 'cyan',
      trend: `${occupancyRate}% occupied`,
    },
    {
      icon: <CardIcon className="ui-icon" size={24} />,
      title: 'Pending Payments',
      value: formatPeso(pendingPaymentAmount),
      subtitle: `${pendingPayments} submissions waiting`,
      color: 'orange',
      trend: pendingPayments > 0 ? 'Needs review' : 'Queue is clear',
    },
    {
      icon: <PulseIcon className="ui-icon" size={24} />,
      title: 'Monthly Revenue',
      value: formatPeso(approvedThisMonth),
      subtitle: 'Approved payments this month',
      color: 'purple',
      trend: 'Auto-calculated from reviews',
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
        profileImageUrl: tenant.profileImageDataUrl || tenant.profileImageUrl || '',
        room: tenant.roomNo || '-',
        checkIn: formatDate(tenant.createdAt),
        status: 'Active',
      }));
  }, [tenants]);

  const renderTenantIdentity = (row) => (
    <div className="payment-tenant-cell">
      {row.profileImageUrl ? (
        <img
          src={row.profileImageUrl}
          alt={row.name || 'Tenant'}
          className="payment-tenant-avatar"
        />
      ) : (
        <div className="payment-tenant-avatar payment-tenant-avatar-fallback">
          {String(row.name || '?').slice(0, 1).toUpperCase()}
        </div>
      )}
      <span>{row.name}</span>
    </div>
  );

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
        icon: payment.status === 'Approved'
          ? <CheckCircleIcon className="ui-icon" size={16} />
          : payment.status === 'Rejected'
            ? <XCircleIcon className="ui-icon" size={16} />
            : <CardIcon className="ui-icon" size={16} />,
        message: `${payment.tenantEmail || 'Tenant'} payment ${String(payment.status || 'submitted').toLowerCase()}`,
        time: timeAgo(payment.reviewedAt || payment.submittedAt),
        status: payment.status || 'Pending',
        ts: (payment.reviewedAt || payment.submittedAt)?.toDate?.()?.getTime?.() || 0,
      }));

    const tenantActivities = tenants
      .map((tenant) => ({
        key: `tenant-${tenant.id}`,
        icon: <UserIcon className="ui-icon" size={16} />,
        message: `New tenant account: ${tenant.fullName || tenant.email || tenant.id}`,
        time: timeAgo(tenant.createdAt),
        status: 'Active',
        ts: tenant.createdAt?.toDate?.()?.getTime?.() || 0,
      }));

    const roomActivities = rooms
      .filter((room) => room.updatedAt || room.createdAt)
      .map((room) => ({
        key: `room-${room.id}`,
        icon: <HomeIcon className="ui-icon" size={16} />,
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
    { key: 'status', label: 'Status' }
  ];

  const dueColumns = [
    { key: 'tenant', label: 'Tenant' },
    { key: 'room', label: 'Room' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' }
  ];

  const topMetricCards = summaryCards.slice(0, 4);
  const monthlyRevenueCard = summaryCards[4];
  const quickActivityFeed = recentActivities.slice(0, 4);

  const performanceBars = useMemo(() => {
    const labels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const counts = Array(7).fill(0);

    recentActivities.forEach((item) => {
      if (!item.ts) return;
      const dayIndex = (new Date(item.ts).getDay() + 6) % 7;
      counts[dayIndex] += 1;
    });

    const maxCount = Math.max(...counts, 1);
    return labels.map((label, index) => {
      const ratio = counts[index] / maxCount;
      return {
        label,
        count: counts[index],
        height: Math.max(Math.round(ratio * 100), 10),
      };
    });
  }, [recentActivities]);

  const recentTenantActivityRows = latestTenants.slice(0, 4);
  const latestTenantRows = latestTenants.slice(0, 3);
  const dueDateRows = upcomingDueDates.slice(0, 3);

  return (
    <AdminLayout>
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's your dormitory overview.</p>
        </div>

        {isLoading && <p>Loading dashboard...</p>}
        {error && <p style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</p>}

        <section className="dashboard-kpi-grid">
          {topMetricCards.map((card) => (
            <article key={card.title} className="dashboard-surface dashboard-kpi-card">
              <div className={`dashboard-kpi-icon ${card.color}`}>{card.icon}</div>
              <div className="dashboard-kpi-content">
                <h3>{card.title}</h3>
                <p className="dashboard-kpi-value">{card.value}</p>
                <p className="dashboard-kpi-subtitle">{card.subtitle}</p>
                {card.trend && <p className="dashboard-kpi-trend">{card.trend}</p>}
              </div>
            </article>
          ))}
        </section>

        <section className="dashboard-middle-grid">
          <article className="dashboard-surface dashboard-revenue-card">
            <div className={`dashboard-kpi-icon ${monthlyRevenueCard.color}`}>{monthlyRevenueCard.icon}</div>
            <div>
              <h3>{monthlyRevenueCard.title}</h3>
              <p className="dashboard-kpi-value">{monthlyRevenueCard.value}</p>
              <p className="dashboard-kpi-subtitle">{monthlyRevenueCard.subtitle}</p>
              {monthlyRevenueCard.trend && <p className="dashboard-kpi-trend">{monthlyRevenueCard.trend}</p>}
            </div>
          </article>

          <article className="dashboard-surface dashboard-performance">
            <div className="widget-header compact">
              <h2>Performance Overview</h2>
              <div className="dashboard-segmented-pill">
                <button type="button" className="active">Weekly</button>
                <button type="button">Monthly</button>
              </div>
            </div>
            <div className="dashboard-chart-area">
              {performanceBars.map((bar) => (
                <div key={bar.label} className="dashboard-bar-item">
                  <span className="dashboard-bar-value">{bar.count > 0 ? `${bar.count}` : ''}</span>
                  <div className="dashboard-bar-track">
                    <div className="dashboard-bar-fill" style={{ height: `${bar.height}%` }} />
                  </div>
                  <span className="dashboard-bar-label">{bar.label}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-surface dashboard-quick-activity">
            <div className="widget-header compact">
              <h2>Recent Activity</h2>
            </div>
            <div className="dashboard-activity-list">
              {quickActivityFeed.length === 0 && <p className="table-empty">No recent activity yet</p>}
              {quickActivityFeed.map((item) => (
                <div key={item.key} className="dashboard-activity-item">
                  <span className="dashboard-activity-icon">{item.icon}</span>
                  <div className="dashboard-activity-text">
                    <p>{item.message}</p>
                    <small>{item.time}</small>
                  </div>
                  <span className={`dashboard-pill ${statusTone(item.status)}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="dashboard-table-stack">
          <article className="dashboard-surface dashboard-table-card">
            <div className="widget-header compact">
              <h2>Recent Activity</h2>
            </div>
            <div className="table-container">
              <table className="data-table striped dashboard-table">
                <thead>
                  <tr>
                    {tenantColumns.map((col) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentTenantActivityRows.map((row) => (
                    <tr key={row.id}>
                      <td>{renderTenantIdentity(row)}</td>
                      <td>{row.id}</td>
                      <td>{row.room}</td>
                      <td>{row.checkIn}</td>
                      <td><span className={`dashboard-pill ${statusTone(row.status)}`}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recentTenantActivityRows.length === 0 && <p className="table-empty">No data available</p>}
            </div>
          </article>

          <article className="dashboard-surface dashboard-table-card">
            <div className="widget-header compact">
              <h2>Latest Tenants</h2>
            </div>
            <div className="table-container">
              <table className="data-table striped dashboard-table">
                <thead>
                  <tr>
                    {tenantColumns.map((col) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {latestTenantRows.map((row) => (
                    <tr key={row.id}>
                      <td>{renderTenantIdentity(row)}</td>
                      <td>{row.id}</td>
                      <td>{row.room}</td>
                      <td>{row.checkIn}</td>
                      <td><span className={`dashboard-pill ${statusTone(row.status)}`}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {latestTenantRows.length === 0 && <p className="table-empty">No data available</p>}
            </div>
          </article>

          <article className="dashboard-surface dashboard-table-card">
            <div className="widget-header compact">
              <h2>Upcoming Due Dates</h2>
            </div>
            <div className="table-container">
              <table className="data-table striped dashboard-table">
                <thead>
                  <tr>
                    {dueColumns.map((col) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dueDateRows.map((row, index) => (
                    <tr key={`${row.tenant}-${row.dueDate}-${index}`}>
                      <td>{row.tenant}</td>
                      <td>{row.room}</td>
                      <td>{row.dueDate}</td>
                      <td>{row.amount}</td>
                      <td><span className={`dashboard-pill ${statusTone(row.status)}`}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {dueDateRows.length === 0 && <p className="table-empty">No data available</p>}
            </div>
          </article>
        </section>
      </div>
    </AdminLayout>
  );
}

export default Dashboard;
