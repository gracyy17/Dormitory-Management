import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import AdminLayout from './AdminLayout';
import DataTable from '../common/DataTable';
import StatusBadge from '../common/StatusBadge';
import { db } from '../../lib/firebase';

const formatDate = (value) => {
  if (!value) return '-';
  if (typeof value?.toDate === 'function') return value.toDate().toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!db) {
      setError('Firestore is not configured.');
      return undefined;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const records = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        setUsers(records);
      },
      () => {
        setError('Unable to load users right now.');
      }
    );

    return unsubscribe;
  }, []);

  const userRows = useMemo(() => {
    return users.map((user) => ({
      id: user.id,
      email: user.email || '-',
      fullName: user.fullName || '-',
      role: user.role || '-',
      roomNo: user.roomNo || '-',
      mustChangePassword: user.mustChangePassword ? 'Yes' : 'No',
      createdAt: formatDate(user.createdAt),
      notifyEmail: user.notifyEmail ? 'Enabled' : 'Disabled',
    }));
  }, [users]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return userRows.filter((row) => {
      const matchesSearch = !keyword
        || row.email.toLowerCase().includes(keyword)
        || row.fullName.toLowerCase().includes(keyword)
        || row.roomNo.toLowerCase().includes(keyword);

      const matchesRole = !roleFilter || row.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [userRows, search, roleFilter]);

  const setRequirePasswordChange = async (row, required) => {
    if (!db) return;

    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'users', row.id), {
        mustChangePassword: required,
        updatedAt: serverTimestamp(),
      });
      setSuccess(`Updated password reset flag for ${row.email}.`);
    } catch {
      setError('Unable to update user settings right now.');
    }
  };

  const toggleNotifyEmail = async (row) => {
    if (!db) return;

    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'users', row.id), {
        notifyEmail: row.notifyEmail !== 'Enabled',
        updatedAt: serverTimestamp(),
      });
      setSuccess(`Updated email reminder setting for ${row.email}.`);
    } catch {
      setError('Unable to update reminder setting right now.');
    }
  };

  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'fullName', label: 'Name' },
    {
      key: 'role',
      label: 'Role',
      render: (role) => <StatusBadge status={role} type={String(role).toLowerCase()} />,
    },
    { key: 'roomNo', label: 'Room' },
    { key: 'notifyEmail', label: 'Reminder Email' },
    { key: 'mustChangePassword', label: 'Must Change Password' },
    { key: 'createdAt', label: 'Created At' },
  ];

  const actions = [
    {
      icon: '🔐',
      label: 'Require Reset',
      variant: 'edit',
      onClick: (row) => setRequirePasswordChange(row, true),
    },
    {
      icon: '🔓',
      label: 'Clear Reset',
      variant: 'view',
      onClick: (row) => setRequirePasswordChange(row, false),
    },
    {
      icon: '✉️',
      label: 'Toggle Reminder',
      variant: 'edit',
      onClick: toggleNotifyEmail,
    },
  ];

  return (
    <AdminLayout>
      <div className="rooms-management-page">
        <div className="page-header">
          <h1>Users Management</h1>
          <p className="page-subtitle">Manage admin and tenant account settings.</p>
        </div>

        <section className="filters-section">
          <div className="filters-grid">
            <div className="filter-group">
              <label>Search Users</label>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Email, name, or room"
              />
            </div>

            <div className="filter-group">
              <label>Role</label>
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="tenant">Tenant</option>
              </select>
            </div>
          </div>
        </section>

        {error && <p style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</p>}
        {success && <p style={{ color: '#166534', marginBottom: 12 }}>{success}</p>}

        <section className="dashboard-widget">
          <div className="widget-header">
            <h2>User Accounts ({filteredRows.length})</h2>
          </div>
          <DataTable columns={columns} data={filteredRows} actions={actions} />
        </section>
      </div>
    </AdminLayout>
  );
}

export default UsersManagement;
