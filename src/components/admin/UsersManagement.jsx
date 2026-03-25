import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import AdminLayout from './AdminLayout';
import LoadingState from '../common/LoadingState';
import StatusBadge from '../common/StatusBadge';
import { auth, db } from '../../lib/firebase';
import { LockIcon, MailIcon, UnlockIcon, UserIcon, UsersIcon, XCircleIcon } from '../common/LineIcons';

const formatDate = (value) => {
  if (!value) return '-';
  if (typeof value?.toDate === 'function') return value.toDate().toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

function UsersManagement() {
  const isDbConfigured = Boolean(db);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isUsersLoading, setIsUsersLoading] = useState(true);

  const deleteAccountEndpoints = useMemo(() => {
    const configured = String(import.meta.env.VITE_DELETE_USER_ACCOUNT_URL || '').trim();
    const projectId = String(import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim();
    const fallback = projectId
      ? `https://asia-southeast1-${projectId}.cloudfunctions.net/deleteUserAccountNow`
      : '';

    const isLocalConfiguredEndpoint = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(configured);
    const isRunningLocally =
      typeof window !== 'undefined'
      && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

    if (!configured || (isLocalConfiguredEndpoint && !isRunningLocally)) {
      return fallback ? [fallback] : [];
    }

    const endpoints = [configured];
    if (fallback && fallback !== configured) endpoints.push(fallback);
    return endpoints;
  }, []);

  useEffect(() => {
    if (!db) return undefined;

    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const records = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        setUsers(records);
        setIsUsersLoading(false);
      },
      () => {
        setError('Unable to load users right now.');
        setIsUsersLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const displayError = isDbConfigured ? error : 'Firestore is not configured.';

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
      const nextNotifyEnabled = row.notifyEmail !== 'Enabled';
      await updateDoc(doc(db, 'users', row.id), {
        notifyEmail: nextNotifyEnabled,
        updatedAt: serverTimestamp(),
      });
      setSuccess(
        `Reminder preference ${nextNotifyEnabled ? 'enabled' : 'disabled'} for ${row.email}. No email is sent immediately.`
      );
    } catch {
      setError('Unable to update reminder setting right now.');
    }
  };

  const normalizeRoomStatus = (status, occupiedBeds, capacity) => {
    if (String(status || '') === 'Maintenance') return 'Maintenance';
    if (occupiedBeds <= 0) return 'Available';
    if (occupiedBeds >= capacity && capacity > 0) return 'Occupied';
    return 'Available';
  };

  const deleteAccountViaFirestoreFallback = async (row) => {
    const duesQuery = query(collection(db, 'dues'), where('tenantUid', '==', row.id));
    const duesSnapshot = await getDocs(duesQuery);
    for (const dueDoc of duesSnapshot.docs) {
      await deleteDoc(doc(db, 'dues', dueDoc.id));
    }

    const paymentsQuery = query(collection(db, 'payments'), where('tenantUid', '==', row.id));
    const paymentsSnapshot = await getDocs(paymentsQuery);
    for (const paymentDoc of paymentsSnapshot.docs) {
      await deleteDoc(doc(db, 'payments', paymentDoc.id));
    }

    const maintenanceQuery = query(collection(db, 'maintenanceRequests'), where('tenantUid', '==', row.id));
    const maintenanceSnapshot = await getDocs(maintenanceQuery);
    for (const requestDoc of maintenanceSnapshot.docs) {
      await deleteDoc(doc(db, 'maintenanceRequests', requestDoc.id));
    }

    if (row.roomNo && row.roomNo !== '-') {
      const roomsQuery = query(collection(db, 'rooms'), where('roomNo', '==', row.roomNo));
      const roomsSnapshot = await getDocs(roomsQuery);
      for (const roomDoc of roomsSnapshot.docs) {
        const roomData = roomDoc.data() || {};
        const capacity = Number(roomData.capacity || 0);
        const occupiedBeds = Math.max(0, Number(roomData.occupiedBeds || 0) - 1);

        await updateDoc(doc(db, 'rooms', roomDoc.id), {
          occupiedBeds,
          status: normalizeRoomStatus(roomData.status, occupiedBeds, capacity),
          updatedAt: serverTimestamp(),
        });
      }
    }

    await deleteDoc(doc(db, 'users', row.id));
  };

  const handleDeleteAccount = async (row) => {
    if (!db) return;

    if (row.id === auth.currentUser?.uid) {
      setError('You cannot delete your own admin account from this page.');
      return;
    }

    const shouldDelete = window.confirm(
      `Permanently delete account ${row.email}? This action cannot be undone.`
    );
    if (!shouldDelete) return;

    setError('');
    setSuccess('');

    try {
      const useFunctionDelete = String(import.meta.env.VITE_USE_FUNCTION_DELETE || '').toLowerCase() === 'true';

      if (!useFunctionDelete) {
        await deleteAccountViaFirestoreFallback(row);
        setSuccess(`Deleted ${row.email} using Firestore fallback (auth account may remain until function delete is enabled).`);
        return;
      }

      if (!deleteAccountEndpoints.length) {
        setError('Delete endpoint is not configured. Deploy functions and set VITE_DELETE_USER_ACCOUNT_URL if needed.');
        return;
      }

      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError('Your session expired. Please sign in again.');
        return;
      }

      let response = null;
      let payload = {};
      let lastError = null;

      for (const endpoint of deleteAccountEndpoints) {
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ targetUid: row.id }),
          });

          payload = await response.json().catch(() => ({}));
          if (response.ok) break;

          if (response.status >= 400 && response.status < 500) {
            throw new Error(payload?.message || `Delete request failed (${response.status}).`);
          }

          lastError = new Error(payload?.message || `Delete request failed (${response.status}).`);
        } catch (requestError) {
          lastError = requestError;
        }
      }

      if (!response || !response.ok) {
        const lastErrorMessage = String(lastError?.message || '').toLowerCase();
        if (lastErrorMessage.includes('failed to fetch') || lastErrorMessage.includes('cors')) {
          await deleteAccountViaFirestoreFallback(row);
          setSuccess(`Deleted ${row.email} using Firestore fallback (auth account may remain if Cloud Function is unavailable).`);
          return;
        }
        throw lastError || new Error('Delete request failed.');
      }

      setSuccess(`Permanently deleted account ${row.email}.`);
    } catch (deleteError) {
      const message = typeof deleteError?.message === 'string' ? deleteError.message : '';
      setError(message ? `Unable to delete account right now: ${message}` : 'Unable to delete account right now.');
    }
  };

  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'fullName', label: 'Name' },
    { key: 'role', label: 'Role' },
    { key: 'roomNo', label: 'Room' },
    { key: 'notifyEmail', label: 'Reminder Email' },
    { key: 'mustChangePassword', label: 'Must Change Password' },
    { key: 'createdAt', label: 'Created At' },
  ];

  const totals = useMemo(() => {
    const admins = userRows.filter((row) => row.role === 'admin').length;
    const tenants = userRows.filter((row) => row.role === 'tenant').length;
    const needsReset = userRows.filter((row) => row.mustChangePassword === 'Yes').length;

    return {
      users: userRows.length,
      admins,
      tenants,
      needsReset,
    };
  }, [userRows]);

  return (
    <AdminLayout>
      <div className="users-page">
        <div className="page-header">
          <h1>Users Management</h1>
          <p className="page-subtitle">Manage account access, reminders, and password reset states in one place.</p>
        </div>

        <section className="users-stat-grid">
          <article className="dashboard-surface users-stat-card">
            <span className="users-stat-icon"><UsersIcon className="ui-icon" size={18} /></span>
            <p className="users-stat-label">Total Users</p>
            <h3>{totals.users}</h3>
          </article>
          <article className="dashboard-surface users-stat-card">
            <span className="users-stat-icon"><UserIcon className="ui-icon" size={18} /></span>
            <p className="users-stat-label">Admins</p>
            <h3>{totals.admins}</h3>
          </article>
          <article className="dashboard-surface users-stat-card">
            <span className="users-stat-icon"><UsersIcon className="ui-icon" size={18} /></span>
            <p className="users-stat-label">Tenants</p>
            <h3>{totals.tenants}</h3>
          </article>
          <article className="dashboard-surface users-stat-card">
            <span className="users-stat-icon"><LockIcon className="ui-icon" size={18} /></span>
            <p className="users-stat-label">Needs Reset</p>
            <h3>{totals.needsReset}</h3>
          </article>
        </section>

        <section className="dashboard-surface users-toolbar">
          <div className="users-toolbar-group">
            <label htmlFor="users-search">Search Users</label>
            <input
              id="users-search"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Email, name, or room"
            />
          </div>

          <div className="users-toolbar-group users-toolbar-select">
            <label htmlFor="users-role">Role</label>
            <select id="users-role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="tenant">Tenant</option>
            </select>
          </div>

          <button className="btn-secondary users-clear-btn" onClick={() => { setSearch(''); setRoleFilter(''); }}>
            Clear Filters
          </button>
        </section>

        {displayError && <p className="admin-feedback is-error">{displayError}</p>}
        {success && <p className="admin-feedback is-success">{success}</p>}

        {isUsersLoading && (
          <LoadingState
            title="Loading Users"
            message="Fetching account records and access settings..."
            skeletonRows={4}
          />
        )}

        <section className="dashboard-surface users-table-card">
          <div className="widget-header">
            <h2>User Accounts ({filteredRows.length})</h2>
          </div>
          <div className="table-container">
            <table className="data-table striped users-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="users-identity-cell">
                        <span className="users-avatar">{(row.fullName || row.email || '?').slice(0, 1).toUpperCase()}</span>
                        <span>{row.email}</span>
                      </div>
                    </td>
                    <td>{row.fullName}</td>
                    <td><StatusBadge status={row.role} type={String(row.role).toLowerCase()} /></td>
                    <td>{row.roomNo}</td>
                    <td>{row.notifyEmail}</td>
                    <td>{row.mustChangePassword}</td>
                    <td>{row.createdAt}</td>
                    <td>
                      <div className="users-action-list">
                        <button
                          className="users-action-btn is-primary"
                          onClick={() => setRequirePasswordChange(row, true)}
                          title="Require reset"
                        >
                          <LockIcon className="ui-icon" size={14} />
                        </button>
                        <button
                          className="users-action-btn"
                          onClick={() => setRequirePasswordChange(row, false)}
                          title="Clear reset"
                        >
                          <UnlockIcon className="ui-icon" size={14} />
                        </button>
                        <button
                          className="users-action-btn is-accent"
                          onClick={() => toggleNotifyEmail(row)}
                          title="Toggle reminder"
                        >
                          <MailIcon className="ui-icon" size={14} />
                        </button>
                        <button
                          className="users-action-btn is-danger"
                          onClick={() => handleDeleteAccount(row)}
                          title="Delete account"
                        >
                          <XCircleIcon className="ui-icon" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length === 0 && <p className="table-empty">No users found for this filter.</p>}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default UsersManagement;

