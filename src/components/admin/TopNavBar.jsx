import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';

const parseDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

function TopNavBar({ onMenuToggle }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState(0);
  const [payments, setPayments] = useState([]);
  const [dues, setDues] = useState([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const { user, logout } = useAuth();

  const storageKey = useMemo(
    () => `admin_notifications_last_seen_${user?.uid || 'anon'}`,
    [user?.uid]
  );

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(storageKey) || 0);
    setLastSeenAt(Number.isNaN(saved) ? 0 : saved);
  }, [storageKey]);

  useEffect(() => {
    if (!db) return undefined;

    const unsubPayments = onSnapshot(
      collection(db, 'payments'),
      (snapshot) => {
        setPayments(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      () => {
        setPayments([]);
      }
    );

    const unsubDues = onSnapshot(
      collection(db, 'dues'),
      (snapshot) => {
        setDues(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      () => {
        setDues([]);
      }
    );

    const unsubMaintenance = onSnapshot(
      collection(db, 'maintenanceRequests'),
      (snapshot) => {
        setMaintenanceRequests(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      () => {
        setMaintenanceRequests([]);
      }
    );

    return () => {
      unsubPayments();
      unsubDues();
      unsubMaintenance();
    };
  }, []);

  const notificationItems = useMemo(() => {
    const now = Date.now();

    const paymentItems = payments
      .filter((payment) => String(payment.status || '').toLowerCase() === 'pending')
      .map((payment) => ({
        id: `payment-${payment.id}`,
        icon: '💳',
        title: 'Payment review needed',
        detail: `${payment.tenantEmail || 'Tenant'} | ${payment.billingMonth || '-'}`,
        status: 'Pending',
        link: '/admin/payments',
        sortAt: payment.submittedAt?.toDate?.()?.getTime?.() || 0,
      }));

    const dueItems = dues
      .filter((due) => {
        const status = String(due.status || '').toLowerCase();
        if (status === 'paid') return false;

        const dueDate = parseDate(due.dueDate);
        if (!dueDate) return status === 'pending' || status === 'overdue';
        return dueDate.getTime() <= now || status === 'overdue';
      })
      .map((due) => ({
        id: `due-${due.id}`,
        icon: '🧾',
        title: 'Due requires action',
        detail: `${due.tenantEmail || 'Tenant'} | ${due.billingMonth || '-'} | ${due.roomNo || '-'}`,
        status: String(due.status || 'Pending'),
        link: '/admin/tenants/overview',
        sortAt: parseDate(due.dueDate)?.getTime() || due.updatedAt?.toDate?.()?.getTime?.() || 0,
      }));

    const maintenanceItems = maintenanceRequests
      .filter((request) => {
        const status = String(request.status || '').toLowerCase();
        return status === 'pending' || status === 'in progress';
      })
      .map((request) => ({
        id: `maintenance-${request.id}`,
        icon: '🔧',
        title: 'Maintenance request',
        detail: `${request.tenantEmail || 'Tenant'} | ${request.issue || request.description || 'No issue detail'}`,
        status: String(request.status || 'Pending'),
        link: '/admin/maintenance',
        sortAt: request.createdAt?.toDate?.()?.getTime?.() || 0,
      }));

    return [...paymentItems, ...dueItems, ...maintenanceItems]
      .sort((a, b) => b.sortAt - a.sortAt)
      .slice(0, 12);
  }, [dues, maintenanceRequests, payments]);

  const unreadNotifications = useMemo(
    () => notificationItems.filter((item) => (item.sortAt || 0) > lastSeenAt).length,
    [notificationItems, lastSeenAt]
  );

  return (
    <div className="top-navbar">
      <div className="navbar-left">
        <button className="menu-toggle" onClick={onMenuToggle}>
          ☰
        </button>
        <div className="search-box">
          <input type="text" placeholder="Search rooms, tenants, payments..." />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      <div className="navbar-right">
        <div className="profile-menu">
          <button
            className="notification-btn"
            onClick={() => {
              const nextOpen = !showNotifications;
              setShowNotifications(nextOpen);
              setShowProfile(false);

              if (nextOpen) {
                const seenTime = Date.now();
                setLastSeenAt(seenTime);
                window.localStorage.setItem(storageKey, String(seenTime));
              }
            }}
          >
            🔔
            {unreadNotifications > 0 && <span className="badge">{unreadNotifications}</span>}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <strong>Notifications</strong>
                <span>{notificationItems.length}</span>
              </div>
              {notificationItems.length === 0 ? (
                <p className="notification-empty">No new notifications</p>
              ) : (
                <div className="notification-list">
                  {notificationItems.map((item) => (
                    <Link
                      key={item.id}
                      to={item.link}
                      className="notification-item"
                      onClick={() => setShowNotifications(false)}
                    >
                      <div className="notification-icon">{item.icon}</div>
                      <div className="notification-text">
                        <p className="notification-title">{item.title}</p>
                        <p className="notification-detail">{item.detail}</p>
                      </div>
                      <span className="notification-status">{item.status}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="profile-menu">
          <button
            className="profile-btn"
            onClick={() => {
              setShowProfile((prev) => !prev);
              setShowNotifications(false);
            }}
          >
            👤
            <span className="user-name">{user?.email || 'Admin User'}</span>
          </button>

          {showProfile && (
            <div className="profile-dropdown">
              <a href="#profile">Profile</a>
              <a href="#settings">Settings</a>
              <a href="#help">Help</a>
              <hr />
              <button className="profile-logout-btn" onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TopNavBar;
