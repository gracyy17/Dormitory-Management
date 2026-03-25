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

function MaintenanceManagement() {
  const isDbConfigured = Boolean(db);
  const [requests, setRequests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(db));
  const [runtimeError, setRuntimeError] = useState('');

  useEffect(() => {
    if (!db) return undefined;

    const unsubRequests = onSnapshot(
      collection(db, 'maintenanceRequests'),
      (snapshot) => {
        setRequests(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        setIsLoading(false);
      },
      () => {
        setRequests([]);
        setIsLoading(false);
      }
    );

    const unsubRooms = onSnapshot(
      collection(db, 'rooms'),
      (snapshot) => {
        setRooms(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      () => {
        setRooms([]);
      }
    );

    return () => {
      unsubRequests();
      unsubRooms();
    };
  }, []);

  const error = isDbConfigured ? runtimeError : 'Firestore is not configured.';

  const maintenanceRooms = useMemo(() => {
    return rooms
      .filter((room) => String(room.status || '').toLowerCase() === 'maintenance')
      .map((room) => ({
        id: room.id,
        roomNo: room.roomNo || '-',
        building: room.building || '-',
        floor: room.floor || '-',
        type: room.type || '-',
        status: room.status || 'Maintenance',
      }));
  }, [rooms]);

  const requestRows = useMemo(() => {
    return requests
      .map((request) => ({
        id: request.id,
        tenantEmail: request.tenantEmail || '-',
        roomNo: request.roomNo || '-',
        issue: request.issue || request.description || '-',
        priority: request.priority || 'Normal',
        status: request.status || 'Pending',
        createdAt: formatDate(request.createdAt),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [requests]);

  const updateRequestStatus = async (request, nextStatus) => {
    if (!db) return;

    try {
      await updateDoc(doc(db, 'maintenanceRequests', request.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch {
      setRuntimeError('Unable to update maintenance request status.');
    }
  };

  const setRoomAvailable = async (room) => {
    if (!db) return;

    try {
      await updateDoc(doc(db, 'rooms', room.id), {
        status: 'Available',
        updatedAt: serverTimestamp(),
      });
    } catch {
      setRuntimeError('Unable to update room maintenance status.');
    }
  };

  const requestColumns = [
    { key: 'tenantEmail', label: 'Tenant' },
    { key: 'roomNo', label: 'Room' },
    { key: 'issue', label: 'Issue' },
    { key: 'priority', label: 'Priority' },
    { key: 'createdAt', label: 'Date Filed' },
    {
      key: 'status',
      label: 'Status',
      render: (status) => <StatusBadge status={status} type={String(status).toLowerCase().replace(' ', '-')} />,
    },
  ];

  const requestActions = [
    {
      icon: '🛠️',
      label: 'In Progress',
      variant: 'edit',
      onClick: (request) => updateRequestStatus(request, 'In Progress'),
    },
    {
      icon: '✅',
      label: 'Resolved',
      variant: 'view',
      onClick: (request) => updateRequestStatus(request, 'Resolved'),
    },
  ];

  const roomColumns = [
    { key: 'roomNo', label: 'Room No' },
    { key: 'building', label: 'Building' },
    { key: 'floor', label: 'Floor' },
    { key: 'type', label: 'Type' },
    {
      key: 'status',
      label: 'Status',
      render: (status) => <StatusBadge status={status} type={String(status).toLowerCase()} />,
    },
  ];

  const roomActions = [
    {
      icon: '🔧',
      label: 'Mark Available',
      variant: 'edit',
      onClick: setRoomAvailable,
    },
  ];

  return (
    <AdminLayout>
      <div className="rooms-management-page">
        <div className="page-header">
          <h1>Maintenance Management</h1>
          <p className="page-subtitle">Track tenant requests and room maintenance status.</p>
        </div>

        {isLoading && <p>Loading maintenance data...</p>}
        {error && <p className="admin-feedback is-error">{error}</p>}

        <section className="dashboard-widget">
          <div className="widget-header">
            <h2>Tenant Maintenance Requests ({requestRows.length})</h2>
          </div>
          {!isLoading && <DataTable columns={requestColumns} data={requestRows} actions={requestActions} />}
        </section>

        <section className="dashboard-widget">
          <div className="widget-header">
            <h2>Rooms Under Maintenance ({maintenanceRooms.length})</h2>
          </div>
          {!isLoading && <DataTable columns={roomColumns} data={maintenanceRooms} actions={roomActions} />}
        </section>
      </div>
    </AdminLayout>
  );
}

export default MaintenanceManagement;

