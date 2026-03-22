import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import {
  BellIcon,
  CardIcon,
  LogoutIcon,
  MenuIcon,
  MoonIcon,
  ReceiptIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
  SunIcon,
  UserIcon,
  WrenchIcon,
} from '../common/LineIcons';

const parseDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

function TopNavBar({ onMenuToggle, isDarkMode, onToggleTheme }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState(0);
  const [payments, setPayments] = useState([]);
  const [dues, setDues] = useState([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [profileName, setProfileName] = useState('');
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

  useEffect(() => {
    if (!db || !user?.uid) {
      setProfileName('');
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() || {} : {};
        setProfileName(String(data.fullName || '').trim());
      },
      () => {
        setProfileName('');
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  const notificationItems = useMemo(() => {
    const now = Date.now();

    const paymentItems = payments
      .filter((payment) => String(payment.status || '').toLowerCase() === 'pending')
      .map((payment) => ({
        id: `payment-${payment.id}`,
        icon: <CardIcon className="ui-icon" size={16} />,
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
        icon: <ReceiptIcon className="ui-icon" size={16} />,
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
        icon: <WrenchIcon className="ui-icon" size={16} />,
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

  const identityLabel = useMemo(() => {
    if (profileName) return profileName;
    const displayName = String(user?.displayName || '').trim();
    if (displayName) return displayName;
    const emailPrefix = String(user?.email || '').split('@')[0];
    return emailPrefix || 'Admin';
  }, [profileName, user?.displayName, user?.email]);

  return (
    <div className="top-navbar">
      <div className="navbar-left">
        <button className="menu-toggle" onClick={onMenuToggle}>
          <MenuIcon className="ui-icon" size={18} />
        </button>
        <div className="search-box">
          <input type="text" placeholder="Search rooms, tenants, payments..." />
          <span className="search-icon"><SearchIcon className="ui-icon" size={16} /></span>
        </div>
      </div>

      <div className="navbar-right">
        <button
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? <SunIcon className="ui-icon" size={16} /> : <MoonIcon className="ui-icon" size={16} />}
        </button>

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
            <BellIcon className="ui-icon" size={17} />
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
            <ShieldIcon className="ui-icon" size={16} />
            <span className="user-name">{identityLabel}</span>
          </button>

          {showProfile && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <span className="profile-avatar-badge"><ShieldIcon className="ui-icon" size={14} /></span>
                <div>
                  <p className="profile-meta-name">{identityLabel}</p>
                  <p className="profile-meta-role">Administrator</p>
                </div>
              </div>
              <Link to="/admin/settings#account-settings" onClick={() => setShowProfile(false)}>
                <UserIcon className="ui-icon" size={14} />
                <span>Edit Account</span>
              </Link>
              <Link to="/admin/settings" onClick={() => setShowProfile(false)}>
                <SettingsIcon className="ui-icon" size={14} />
                <span>Settings</span>
              </Link>
              <Link to="/admin/users" onClick={() => setShowProfile(false)}>
                <UserIcon className="ui-icon" size={14} />
                <span>Users</span>
              </Link>
              <hr />
              <button className="profile-logout-btn" onClick={logout}>
                <LogoutIcon className="ui-icon" size={14} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TopNavBar;
