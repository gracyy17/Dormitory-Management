import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import AdminLayout from './AdminLayout';
import SummaryCard from '../common/SummaryCard';
import DataTable from '../common/DataTable';
import StatusBadge from '../common/StatusBadge';
import { db } from '../../lib/firebase';
import { CardIcon, HomeIcon, PulseIcon, UsersIcon } from '../common/LineIcons';

const formatPeso = (value) => `P${Number(value || 0).toLocaleString('en-PH')}`;

const formatMonth = (value) => {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString().slice(0, 7);
  return String(value);
};

function ReportsManagement() {
<<<<<<< Updated upstream
=======
  const isDbConfigured = Boolean(db);
>>>>>>> Stashed changes
  const [rooms, setRooms] = useState([]);
  const [dues, setDues] = useState([]);
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
<<<<<<< Updated upstream
    if (!db) {
      setError('Firestore is not configured.');
      return undefined;
    }
=======
    if (!db) return undefined;
>>>>>>> Stashed changes

    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snap) => setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubDues = onSnapshot(collection(db, 'dues'), (snap) => setDues(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubPayments = onSnapshot(collection(db, 'payments'), (snap) => setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));

    return () => {
      unsubRooms();
      unsubDues();
      unsubPayments();
      unsubUsers();
    };
  }, []);

<<<<<<< Updated upstream
=======
  const displayError = isDbConfigured ? error : 'Firestore is not configured.';

>>>>>>> Stashed changes
  const reportCards = useMemo(() => {
    const totalBeds = rooms.reduce((sum, room) => sum + Number(room.capacity || 0), 0);
    const tenants = users.filter((user) => user.role === 'tenant').length;
    const pendingDuesAmount = dues
      .filter((due) => String(due.status || '').toLowerCase() !== 'paid')
      .reduce((sum, due) => sum + Number(due.amount || 0), 0);
    const approvedPayments = payments
      .filter((payment) => String(payment.status || '').toLowerCase() === 'approved')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return [
      {
        icon: <HomeIcon className="ui-icon" size={24} />,
        title: 'Total Bed Capacity',
        value: String(totalBeds),
        subtitle: `${rooms.length} rooms`,
        color: 'blue',
      },
      {
        icon: <UsersIcon className="ui-icon" size={24} />,
        title: 'Total Tenants',
        value: String(tenants),
        subtitle: 'Active tenant accounts',
        color: 'cyan',
      },
      {
        icon: <CardIcon className="ui-icon" size={24} />,
        title: 'Outstanding Dues',
        value: formatPeso(pendingDuesAmount),
        subtitle: 'Pending and overdue dues',
        color: 'orange',
      },
      {
        icon: <PulseIcon className="ui-icon" size={24} />,
        title: 'Approved Collections',
        value: formatPeso(approvedPayments),
        subtitle: 'Based on approved payment uploads',
        color: 'green',
      },
    ];
  }, [dues, payments, rooms, users]);

  const duesColumns = [
    { key: 'billingMonth', label: 'Billing Month' },
    { key: 'tenantEmail', label: 'Tenant' },
    { key: 'roomNo', label: 'Room' },
    { key: 'amount', label: 'Amount' },
    {
      key: 'status',
      label: 'Status',
      render: (status) => <StatusBadge status={status} type={String(status).toLowerCase().replace(' ', '-')} />,
    },
  ];

  const duesRows = useMemo(() => {
    return dues.map((due) => ({
      id: due.id,
      billingMonth: formatMonth(due.billingMonth),
      tenantEmail: due.tenantEmail || '-',
      roomNo: due.roomNo || '-',
      amount: formatPeso(due.amount || 0),
      status: due.status || 'Pending',
    }));
  }, [dues]);

  const occupancyColumns = [
    { key: 'roomNo', label: 'Room No' },
    { key: 'building', label: 'Building' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'occupied', label: 'Occupied' },
    { key: 'available', label: 'Available' },
    {
      key: 'status',
      label: 'Status',
      render: (status) => <StatusBadge status={status} type={String(status).toLowerCase()} />,
    },
  ];

  const occupancyRows = useMemo(() => {
    const tenantByRoom = users
      .filter((user) => user.role === 'tenant')
      .reduce((acc, tenant) => {
        const roomNo = String(tenant.roomNo || '').trim();
        if (!roomNo) return acc;
        acc[roomNo] = (acc[roomNo] || 0) + 1;
        return acc;
      }, {});

    return rooms.map((room) => {
      const capacity = Number(room.capacity || 0);
      const occupied = Math.min(tenantByRoom[String(room.roomNo || '').trim()] || 0, capacity);
      const available = Math.max(capacity - occupied, 0);

      return {
        id: room.id,
        roomNo: room.roomNo || '-',
        building: room.building || '-',
        capacity,
        occupied,
        available,
        status: available === 0 ? 'Occupied' : room.status || 'Available',
      };
    });
  }, [rooms, users]);

  return (
    <AdminLayout>
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Reports</h1>
          <p className="page-subtitle">Financial and occupancy reports generated from live records.</p>
        </div>

<<<<<<< Updated upstream
        {error && <p className="admin-feedback is-error">{error}</p>}
=======
        {displayError && <p className="admin-feedback is-error">{displayError}</p>}
>>>>>>> Stashed changes

        <section className="summary-section">
          <div className="cards-grid">
            {reportCards.map((card, index) => (
              <SummaryCard key={index} {...card} />
            ))}
          </div>
        </section>

        <section className="dashboard-widget">
          <div className="widget-header">
            <h2>Dues Status Report ({duesRows.length})</h2>
          </div>
          <DataTable columns={duesColumns} data={duesRows} />
        </section>

        <section className="dashboard-widget">
          <div className="widget-header">
            <h2>Room Occupancy Report ({occupancyRows.length})</h2>
          </div>
          <DataTable columns={occupancyColumns} data={occupancyRows} />
        </section>
      </div>
    </AdminLayout>
  );
}

export default ReportsManagement;
