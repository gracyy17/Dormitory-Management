import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import AdminLayout from './AdminLayout';
import Modal from '../common/Modal';
import DataTable from '../common/DataTable';
import StatusBadge from '../common/StatusBadge';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

const defaultRoomForm = {
  roomNo: '',
  building: '',
  floor: '',
  capacity: '2',
  occupiedBeds: '0',
  monthlyRate: '',
  status: 'Available',
};

const floorOrder = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4 };

const sortRooms = (rooms) => {
  return [...rooms].sort((a, b) => {
    if (a.building !== b.building) return a.building.localeCompare(b.building);

    const floorA = floorOrder[a.floor] || Number.POSITIVE_INFINITY;
    const floorB = floorOrder[b.floor] || Number.POSITIVE_INFINITY;
    if (floorA !== floorB) return floorA - floorB;

    return a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true, sensitivity: 'base' });
  });
};

const normalizeStatus = (status, occupiedBeds, capacity) => {
  if (status === 'Maintenance') return 'Maintenance';
  if (occupiedBeds <= 0) return 'Available';
  if (occupiedBeds >= capacity) return 'Occupied';
  return 'Available';
};

const formatPeso = (amount) => {
  const value = Number(amount || 0);
  if (Number.isNaN(value)) return 'P0';
  return `P${value.toLocaleString('en-PH')}`;
};

const splitRoomElectricBill = (total, occupants) => {
  const amount = Number(total || 0);
  const count = Math.max(1, Number(occupants || 1));
  if (Number.isNaN(amount) || amount <= 0) return 0;
  return Number((amount / count).toFixed(2));
};

function RoomsManagement() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    building: '',
    floor: '',
    status: ''
  });
  
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showEditRoom, setShowEditRoom] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [newRoom, setNewRoom] = useState(defaultRoomForm);
  const [editRoom, setEditRoom] = useState(defaultRoomForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tenantUsers, setTenantUsers] = useState([]);
  const [dues, setDues] = useState([]);
  const [roomElectricForm, setRoomElectricForm] = useState({
    roomNo: '',
    billingMonth: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    electricBillTotal: '',
  });
  const [isApplyingElectricSplit, setIsApplyingElectricSplit] = useState(false);
  const [tenantCountByRoom, setTenantCountByRoom] = useState({});
  const [selectedBuilding, setSelectedBuilding] = useState('Building A');

  useEffect(() => {
    if (!db) {
      setError('Firestore is not configured. Add VITE_FIREBASE_* values first.');
      setIsLoading(false);
      return undefined;
    }

    const roomsQuery = collection(db, 'rooms');

    const unsubscribe = onSnapshot(
      roomsQuery,
      (snapshot) => {
        const records = snapshot.docs.map((roomDoc) => {
          const data = roomDoc.data() || {};
          const capacity = Number(data.capacity || 0);
          const occupiedBeds = Number(data.occupiedBeds || 0);
          const status = normalizeStatus(data.status || 'Available', occupiedBeds, capacity);

          return {
            id: roomDoc.id,
            roomNo: String(data.roomNo || ''),
            building: String(data.building || ''),
            floor: String(data.floor || ''),
            capacity,
            occupiedBeds,
            occupancy: `${occupiedBeds}/${capacity}`,
            monthlyRate: Number(data.monthlyRate || 0),
            monthlyRateDisplay: formatPeso(data.monthlyRate || 0),
            status,
          };
        });

        setRooms(sortRooms(records));
        setIsLoading(false);
      },
      () => {
        setError('Unable to load rooms right now.');
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!db) return undefined;

    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const counter = {};

        snapshot.docs.forEach((userDoc) => {
          const data = userDoc.data() || {};
          if (data.role !== 'tenant') return;

          const roomNo = String(data.roomNo || '').trim();
          if (!roomNo) return;
          counter[roomNo] = (counter[roomNo] || 0) + 1;
        });

        const tenants = snapshot.docs
          .map((userDoc) => ({ id: userDoc.id, ...userDoc.data() }))
          .filter((item) => item.role === 'tenant');

        setTenantUsers(tenants);
        setTenantCountByRoom(counter);
      },
      () => {
        setTenantUsers([]);
        setTenantCountByRoom({});
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!db) return undefined;

    const unsubscribe = onSnapshot(
      collection(db, 'dues'),
      (snapshot) => {
        const records = snapshot.docs.map((dueDoc) => ({ id: dueDoc.id, ...dueDoc.data() }));
        setDues(records);
      },
      () => {
        setDues([]);
      }
    );

    return unsubscribe;
  }, []);

  const roomsWithDerivedOccupancy = useMemo(() => {
    return sortRooms(rooms.map((room) => {
      const assignedCount = tenantCountByRoom[room.roomNo] || 0;
      const capacity = Number(room.capacity || 0);
      const occupiedBeds = Math.min(Math.max(assignedCount, Number(room.occupiedBeds || 0)), capacity);
      const status = normalizeStatus(room.status || 'Available', occupiedBeds, capacity);

      return {
        ...room,
        occupiedBeds,
        occupancy: `${occupiedBeds}/${capacity}`,
        monthlyRateDisplay: formatPeso(room.monthlyRate || 0),
        status,
      };
    }));
  }, [rooms, tenantCountByRoom]);

  const filteredRooms = useMemo(() => roomsWithDerivedOccupancy.filter((room) => {
    return (
      (!filters.building || room.building === filters.building) &&
      (!filters.floor || room.floor === filters.floor) &&
      (!filters.status || room.status === filters.status)
    );
  }), [filters, roomsWithDerivedOccupancy]);

  const roomNumberExists = (roomNo, ignoreId = null) => {
    return roomsWithDerivedOccupancy.some((room) => room.roomNo.trim().toLowerCase() === roomNo.trim().toLowerCase() && room.id !== ignoreId);
  };

  const validateRoomPayload = (payload) => {
    const capacity = Number(payload.capacity);
    const occupiedBeds = Number(payload.occupiedBeds || 0);
    const monthlyRate = Number(payload.monthlyRate);

    if (!payload.roomNo.trim() || !payload.building || !payload.floor) {
      return 'Please complete all required room fields.';
    }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 8) {
      return 'Capacity must be a whole number from 1 to 8.';
    }
    if (!Number.isInteger(occupiedBeds) || occupiedBeds < 0 || occupiedBeds > capacity) {
      return 'Occupied beds must be between 0 and room capacity.';
    }
    if (Number.isNaN(monthlyRate) || monthlyRate < 0) {
      return 'Monthly rate must be a valid non-negative number.';
    }
    return '';
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();

    if (!db) {
      setError('Firestore is not configured.');
      return;
    }

    setError('');
    setSuccess('');

    const message = validateRoomPayload(newRoom);
    if (message) {
      setError(message);
      return;
    }

    if (roomNumberExists(newRoom.roomNo)) {
      setError('A room with this room number already exists.');
      return;
    }

    setIsSubmitting(true);

    const capacity = Number(newRoom.capacity);
    const occupiedBeds = Number(newRoom.occupiedBeds || 0);
    const status = normalizeStatus(newRoom.status, occupiedBeds, capacity);

    try {
      await addDoc(collection(db, 'rooms'), {
        roomNo: newRoom.roomNo.trim(),
        building: newRoom.building,
        floor: newRoom.floor,
        capacity,
        occupiedBeds,
        monthlyRate: Number(newRoom.monthlyRate),
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setShowAddRoom(false);
      setNewRoom(defaultRoomForm);
      setSuccess(`Room ${newRoom.roomNo.trim()} added successfully.`);
    } catch {
      setError('Unable to add room right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewRoom = (room) => {
    setSelectedRoom(room);
    setShowRoomModal(true);
  };

  const handleOpenEdit = (room) => {
    setSelectedRoom(room);
    setEditRoom({
      roomNo: room.roomNo,
      building: room.building,
      floor: room.floor,
      capacity: String(room.capacity),
      occupiedBeds: String(room.occupiedBeds || 0),
      monthlyRate: String(room.monthlyRate || 0),
      status: room.status,
    });
    setShowEditRoom(true);
  };

  const handleUpdateRoom = async (e) => {
    e.preventDefault();

    if (!db || !selectedRoom?.id) {
      setError('Room update is not available right now.');
      return;
    }

    setError('');
    setSuccess('');

    const message = validateRoomPayload(editRoom);
    if (message) {
      setError(message);
      return;
    }

    if (roomNumberExists(editRoom.roomNo, selectedRoom.id)) {
      setError('A room with this room number already exists.');
      return;
    }

    setIsSubmitting(true);

    const capacity = Number(editRoom.capacity);
    const occupiedBeds = Number(editRoom.occupiedBeds || 0);
    const status = normalizeStatus(editRoom.status, occupiedBeds, capacity);

    try {
      await updateDoc(doc(db, 'rooms', selectedRoom.id), {
        roomNo: editRoom.roomNo.trim(),
        building: editRoom.building,
        floor: editRoom.floor,
        capacity,
        occupiedBeds,
        monthlyRate: Number(editRoom.monthlyRate),
        status,
        updatedAt: serverTimestamp(),
      });

      setShowEditRoom(false);
      setSelectedRoom(null);
      setSuccess(`Room ${editRoom.roomNo.trim()} updated successfully.`);
    } catch {
      setError('Unable to update room right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoom = async (room) => {
    if (!db) {
      setError('Firestore is not configured.');
      return;
    }

    const shouldDelete = window.confirm(`Delete room ${room.roomNo}? This action cannot be undone.`);
    if (!shouldDelete) return;

    setError('');
    setSuccess('');

    try {
      await deleteDoc(doc(db, 'rooms', room.id));
      setSuccess(`Room ${room.roomNo} deleted.`);
    } catch {
      setError('Unable to delete room right now.');
    }
  };

  const roomColumns = [
    { key: 'roomNo', label: 'Room No' },
    { key: 'building', label: 'Building' },
    { key: 'floor', label: 'Floor' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'occupancy', label: 'Occupancy' },
    { key: 'monthlyRateDisplay', label: 'Monthly Rate' },
    {
      key: 'status',
      label: 'Status',
      render: (status) => <StatusBadge status={status} type={status.toLowerCase().replace(' ', '-')} />
    }
  ];

  const actions = [
    { icon: '👁️', label: 'View', variant: 'view', onClick: handleViewRoom },
    { icon: '✏️', label: 'Edit', variant: 'edit', onClick: handleOpenEdit },
    { icon: '🗑️', label: 'Delete', variant: 'delete', onClick: handleDeleteRoom }
  ];

  const uniqueBuildings = useMemo(
    () => Array.from(new Set(roomsWithDerivedOccupancy.map((room) => room.building).filter(Boolean))).sort(),
    [roomsWithDerivedOccupancy]
  );
  const uniqueFloors = useMemo(
    () => Array.from(new Set(roomsWithDerivedOccupancy.map((room) => room.floor).filter(Boolean))).sort((a, b) => (floorOrder[a] || 99) - (floorOrder[b] || 99)),
    [roomsWithDerivedOccupancy]
  );
  useEffect(() => {
    if (uniqueBuildings.length === 0) {
      setSelectedBuilding('Building A');
      return;
    }

    if (!uniqueBuildings.includes(selectedBuilding)) {
      setSelectedBuilding(uniqueBuildings[0]);
    }
  }, [uniqueBuildings, selectedBuilding]);

  const selectedBuildingRooms = useMemo(
    () => roomsWithDerivedOccupancy.filter((room) => room.building === selectedBuilding),
    [roomsWithDerivedOccupancy, selectedBuilding]
  );

  const selectedBuildingSummary = useMemo(() => {
    const roomCount = selectedBuildingRooms.length;
    const totalBeds = selectedBuildingRooms.reduce((sum, room) => sum + Number(room.capacity || 0), 0);
    const occupiedBeds = selectedBuildingRooms.reduce((sum, room) => sum + Number(room.occupiedBeds || 0), 0);
    const availableBeds = Math.max(totalBeds - occupiedBeds, 0);

    return {
      roomCount,
      occupiedBeds,
      availableBeds,
    };
  }, [selectedBuildingRooms]);

  const occupiedRoomOptions = useMemo(() => {
    return roomsWithDerivedOccupancy
      .filter((room) => Number(room.occupiedBeds || 0) > 0)
      .map((room) => ({
        roomNo: room.roomNo,
        occupiedBeds: Number(room.occupiedBeds || 0),
        monthlyRate: Number(room.monthlyRate || 0),
      }));
  }, [roomsWithDerivedOccupancy]);

  const roomSplitPreview = useMemo(() => {
    const roomNo = String(roomElectricForm.roomNo || '').trim();
    const total = Number(roomElectricForm.electricBillTotal || 0);

    if (!roomNo) return null;

    const occupants = tenantUsers.filter((tenant) => String(tenant.roomNo || '').trim() === roomNo);
    const occupantCount = occupants.length;

    if (occupantCount <= 0) {
      return {
        roomNo,
        occupantCount: 0,
        total,
        perTenant: 0,
        occupantNames: [],
      };
    }

    return {
      roomNo,
      occupantCount,
      total,
      perTenant: splitRoomElectricBill(total, occupantCount),
      occupantNames: occupants.map((tenant) => tenant.fullName || tenant.email || tenant.id),
    };
  }, [roomElectricForm.roomNo, roomElectricForm.electricBillTotal, tenantUsers]);

  const selectedRoomBedOccupants = useMemo(() => {
    if (!selectedRoom) return [];

    const capacity = Number(selectedRoom.capacity || 0);
    if (capacity <= 0) return [];

    const occupants = tenantUsers
      .filter((tenant) => String(tenant.roomNo || '').trim() === String(selectedRoom.roomNo || '').trim())
      .sort((a, b) => {
        const bedA = Number(a.roomBed || 0);
        const bedB = Number(b.roomBed || 0);
        if (bedA && bedB) return bedA - bedB;
        if (bedA) return -1;
        if (bedB) return 1;
        return String(a.fullName || a.email || '').localeCompare(String(b.fullName || b.email || ''));
      });

    const slots = Array.from({ length: capacity }, () => null);
    const unassigned = [];

    occupants.forEach((tenant) => {
      const tenantName = String(tenant.fullName || tenant.email || tenant.id || 'Occupied Bed');
      const bedNumber = Number(tenant.roomBed || 0);

      if (Number.isInteger(bedNumber) && bedNumber >= 1 && bedNumber <= capacity && !slots[bedNumber - 1]) {
        slots[bedNumber - 1] = tenantName;
      } else {
        unassigned.push(tenantName);
      }
    });

    for (let i = 0; i < slots.length && unassigned.length > 0; i += 1) {
      if (!slots[i]) {
        slots[i] = unassigned.shift();
      }
    }

    return slots;
  }, [selectedRoom, tenantUsers]);

  const handleApplyRoomElectricSplit = async (event) => {
    event.preventDefault();

    if (!db) {
      setError('Firestore is not configured.');
      return;
    }

    const roomNo = String(roomElectricForm.roomNo || '').trim();
    const billingMonth = String(roomElectricForm.billingMonth || '').trim();
    const electricBillTotal = Number(roomElectricForm.electricBillTotal || 0);

    if (!roomNo) {
      setError('Please select a room.');
      return;
    }

    if (!billingMonth || !/^[A-Za-z]+\s+\d{4}$/.test(billingMonth)) {
      setError('Billing month must follow format like March 2026.');
      return;
    }

    if (Number.isNaN(electricBillTotal) || electricBillTotal < 0 || electricBillTotal > 1000000) {
      setError('Electric bill must be between 0 and 1,000,000.');
      return;
    }

    const occupants = tenantUsers.filter((tenant) => String(tenant.roomNo || '').trim() === roomNo);
    if (occupants.length === 0) {
      setError(`No tenants are currently assigned to Room ${roomNo}.`);
      return;
    }

    const roomRecord = roomsWithDerivedOccupancy.find((room) => String(room.roomNo || '').trim() === roomNo);
    const electricBillPerTenant = splitRoomElectricBill(electricBillTotal, occupants.length);

    setError('');
    setSuccess('');
    setIsApplyingElectricSplit(true);

    try {
      for (const tenant of occupants) {
        const existingDue = dues.find(
          (due) => due.tenantUid === tenant.id
            && String(due.billingMonth || '').toLowerCase() === billingMonth.toLowerCase()
        );

        const monthlyRate = Number(existingDue?.monthlyRate || roomRecord?.monthlyRate || 0);
        const totalAmount = monthlyRate + electricBillPerTenant;

        const payload = {
          tenantUid: tenant.id,
          tenantEmail: tenant.email || '',
          roomNo,
          billingMonth,
          dueDate: existingDue?.dueDate || new Date().toISOString().slice(0, 10),
          monthlyRate,
          electricBill: electricBillPerTenant,
          amount: totalAmount,
          status: existingDue?.status || 'Pending',
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || null,
          updatedByEmail: user?.email || null,
        };

        if (existingDue?.id) {
          await updateDoc(doc(db, 'dues', existingDue.id), payload);
        } else {
          await addDoc(collection(db, 'dues'), {
            ...payload,
            createdAt: serverTimestamp(),
            createdBy: user?.uid || null,
          });
        }
      }

      setSuccess(
        `Electric bill applied for Room ${roomNo}. Total ${formatPeso(electricBillTotal)} split to ${occupants.length} tenant(s): ${formatPeso(electricBillPerTenant)} each.`
      );
      setRoomElectricForm((prev) => ({ ...prev, electricBillTotal: '' }));
    } catch {
      setError('Unable to apply electric bill split right now.');
    } finally {
      setIsApplyingElectricSplit(false);
    }
  };

  return (
    <AdminLayout>
      <div className="rooms-management-page">
        <div className="page-header">
          <h1>Rooms Management</h1>
          <p className="page-subtitle">Manage all dormitory rooms and their status</p>
        </div>

        {/* Filters Section */}
        <section className="filters-section">
          <div className="filters-grid">
            <div className="filter-group">
              <label>Building</label>
              <select name="building" value={filters.building} onChange={handleFilterChange}>
                <option value="">All Buildings</option>
                {uniqueBuildings.map((building) => (
                  <option key={building} value={building}>{building}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Floor</label>
              <select name="floor" value={filters.floor} onChange={handleFilterChange}>
                <option value="">All Floors</option>
                {uniqueFloors.map((floor) => (
                  <option key={floor} value={floor}>{floor} Floor</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Status</label>
              <select name="status" value={filters.status} onChange={handleFilterChange}>
                <option value="">All Status</option>
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <button className="btn-primary" onClick={() => setShowAddRoom(true)}>
            ➕ Add Room
          </button>
        </section>

        {isLoading && <p>Loading rooms...</p>}
        {error && <p className="admin-feedback is-error">{error}</p>}
        {success && <p className="admin-feedback is-success">{success}</p>}

        <section className="dashboard-widget rooms-electric-widget">
          <div className="widget-header">
            <h2>Room Electric Bill Split</h2>
            <span className="count-badge">Auto split by occupants</span>
          </div>

          <form className="rooms-electric-form" onSubmit={handleApplyRoomElectricSplit}>
            <div className="form-group">
              <label>Room</label>
              <select
                value={roomElectricForm.roomNo}
                onChange={(e) => setRoomElectricForm((prev) => ({ ...prev, roomNo: e.target.value }))}
                required
              >
                <option value="">Select occupied room</option>
                {occupiedRoomOptions.map((room) => (
                  <option key={room.roomNo} value={room.roomNo}>
                    Room {room.roomNo} ({room.occupiedBeds} occupant{room.occupiedBeds > 1 ? 's' : ''})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Billing Month</label>
              <input
                type="text"
                placeholder="e.g., March 2026"
                value={roomElectricForm.billingMonth}
                onChange={(e) => setRoomElectricForm((prev) => ({ ...prev, billingMonth: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label>Room Electric Bill (Total)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g., 1500"
                value={roomElectricForm.electricBillTotal}
                onChange={(e) => setRoomElectricForm((prev) => ({ ...prev, electricBillTotal: e.target.value }))}
                required
              />
            </div>

            <div className="rooms-electric-actions">
              <button type="submit" className="btn-primary" disabled={isApplyingElectricSplit || occupiedRoomOptions.length === 0}>
                {isApplyingElectricSplit ? 'Applying...' : 'Apply and Split'}
              </button>
            </div>
          </form>

          {roomSplitPreview && (
            <div className="rooms-electric-preview">
              {roomSplitPreview.occupantCount > 0 ? (
                <>
                  <p>
                    Room {roomSplitPreview.roomNo}: {formatPeso(roomSplitPreview.total)} / {roomSplitPreview.occupantCount} occupant{roomSplitPreview.occupantCount > 1 ? 's' : ''} = <strong>{formatPeso(roomSplitPreview.perTenant)}</strong> each
                  </p>
                  <small>{roomSplitPreview.occupantNames.join(', ')}</small>
                </>
              ) : (
                <p>No occupants found in Room {roomSplitPreview.roomNo}.</p>
              )}
            </div>
          )}
        </section>

        <section className="dashboard-widget rooms-drilldown-widget">
          <div className="widget-header">
            <h2>Building Rooms Overview</h2>
            <span className="count-badge">{selectedBuilding}</span>
          </div>

          <div className="rooms-building-tabs" role="tablist" aria-label="Select building">
            {uniqueBuildings.map((building) => (
              <button
                key={building}
                type="button"
                className={selectedBuilding === building ? 'rooms-building-tab active' : 'rooms-building-tab'}
                onClick={() => setSelectedBuilding(building)}
              >
                {building}
              </button>
            ))}
          </div>

          <div className="rooms-building-summary">
            <span>Rooms: {selectedBuildingSummary.roomCount}</span>
            <span>Occupied Beds: {selectedBuildingSummary.occupiedBeds}</span>
            <span>Available Beds: {selectedBuildingSummary.availableBeds}</span>
          </div>

          <div className="rooms-card-grid">
            {selectedBuildingRooms.map((room) => {
              const capacity = Number(room.capacity || 0);
              const occupiedBeds = Number(room.occupiedBeds || 0);
              const availableBeds = Math.max(capacity - occupiedBeds, 0);
              const isFullyOccupied = occupiedBeds >= capacity && capacity > 0;
              const cardStatus = room.status === 'Maintenance' ? 'Maintenance' : (isFullyOccupied ? 'Occupied' : 'Available');
              const availabilityLabel = isFullyOccupied
                ? 'Occupied'
                : `Available beds: ${availableBeds}/${capacity}`;

              return (
                <button
                  key={room.id}
                  type="button"
                  className="room-occupancy-card"
                  onClick={() => handleViewRoom(room)}
                >
                  <div className="room-card-head">
                    <h3>Room {room.roomNo}</h3>
                    <StatusBadge status={cardStatus} type={String(cardStatus || '').toLowerCase()} />
                  </div>
                  <p className="room-card-meta">{room.floor} Floor</p>
                  <div className="room-card-stats">
                    <span>{room.occupancy}</span>
                    <span>{availabilityLabel}</span>
                  </div>
                  <small>Tap to view Bed 1 to Bed {room.capacity}</small>
                </button>
              );
            })}
            {selectedBuildingRooms.length === 0 && (
              <div className="rooms-empty-state">
                <p>No rooms found for {selectedBuilding}.</p>
              </div>
            )}
          </div>
        </section>

        {/* Rooms Table */}
        <section className="dashboard-widget">
          <div className="widget-header">
            <h2>Room List ({filteredRooms.length})</h2>
            <span className="count-badge">{filteredRooms.length} of {roomsWithDerivedOccupancy.length} rooms</span>
          </div>
          {!isLoading && <DataTable columns={roomColumns} data={filteredRooms} actions={actions} />}
        </section>

        {/* Room Details Modal */}
        <Modal
          isOpen={showRoomModal}
          title={selectedRoom ? `Room ${selectedRoom.roomNo} Details` : 'Room Details'}
          onClose={() => setShowRoomModal(false)}
          size="large"
        >
          {selectedRoom && (
            <div className="room-modal-content">
              <div className="room-info-grid">
                <div className="info-item">
                  <label>Room Number</label>
                  <p>{selectedRoom.roomNo}</p>
                </div>
                <div className="info-item">
                  <label>Building</label>
                  <p>{selectedRoom.building}</p>
                </div>
                <div className="info-item">
                  <label>Floor</label>
                  <p>{selectedRoom.floor}</p>
                </div>
                <div className="info-item">
                  <label>Capacity</label>
                  <p>{selectedRoom.capacity} beds</p>
                </div>
                <div className="info-item">
                  <label>Monthly Rate</label>
                  <p>{selectedRoom.monthlyRateDisplay}</p>
                </div>
                <div className="info-item">
                  <label>Status</label>
                  <p><StatusBadge status={selectedRoom.status} type={selectedRoom.status.toLowerCase().replace(' ', '-')} /></p>
                </div>
                <div className="info-item">
                  <label>Occupancy</label>
                  <p>{selectedRoom.occupancy}</p>
                </div>
              </div>

              {/* Bed Slots */}
              <div className="beds-section">
                <h3>Bed Slots</h3>
                <div className="beds-grid">
                  {Array.from({ length: Number(selectedRoom.capacity || 0) }).map((_, idx) => {
                    const occupantName = selectedRoomBedOccupants[idx];
                    const isOccupied = Boolean(occupantName);

                    return (
                    <div key={idx} className={`bed-slot ${isOccupied ? 'occupied' : 'empty'}`}>
                      <div className="bed-number">Bed {idx + 1}</div>
                      {isOccupied ? (
                        <div className="bed-tenant">
                          <p className="tenant-name">{occupantName}</p>
                          <p className="bed-status">Occupied</p>
                        </div>
                      ) : (
                        <p className="bed-status">Available</p>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-primary" onClick={() => {
                  setShowRoomModal(false);
                  handleOpenEdit(selectedRoom);
                }}>
                  Edit Room
                </button>
                <button className="btn-secondary" onClick={() => setShowRoomModal(false)}>Close</button>
              </div>
            </div>
          )}
        </Modal>

        {/* Add Room Modal */}
        <Modal
          isOpen={showAddRoom}
          title="Add New Room"
          onClose={() => setShowAddRoom(false)}
          size="medium"
        >
          <form className="add-room-form" onSubmit={handleAddRoom}>
            <div className="form-group">
              <label>Room Number</label>
              <input
                type="text"
                value={newRoom.roomNo}
                onChange={(e) => setNewRoom({ ...newRoom, roomNo: e.target.value })}
                placeholder="e.g., 101"
                required
              />
            </div>

            <div className="form-group">
              <label>Building</label>
              <select
                value={newRoom.building}
                onChange={(e) => setNewRoom({ ...newRoom, building: e.target.value })}
                required
              >
                <option value="">Select Building</option>
                <option value="Building A">Building A</option>
                <option value="Building B">Building B</option>
                <option value="Building C">Building C</option>
              </select>
            </div>

            <div className="form-group">
              <label>Floor</label>
              <select
                value={newRoom.floor}
                onChange={(e) => setNewRoom({ ...newRoom, floor: e.target.value })}
                required
              >
                <option value="">Select Floor</option>
                <option value="1st">1st Floor</option>
                <option value="2nd">2nd Floor</option>
                <option value="3rd">3rd Floor</option>
                <option value="4th">4th Floor</option>
              </select>
            </div>

            <div className="form-group">
              <label>Capacity (Beds)</label>
              <input
                type="number"
                min="1"
                max="8"
                value={newRoom.capacity}
                onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Occupied Beds</label>
              <input
                type="number"
                min="0"
                max={newRoom.capacity || '8'}
                value={newRoom.occupiedBeds}
                onChange={(e) => setNewRoom({ ...newRoom, occupiedBeds: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Monthly Rate</label>
              <input
                type="number"
                min="0"
                value={newRoom.monthlyRate}
                onChange={(e) => setNewRoom({ ...newRoom, monthlyRate: e.target.value })}
                placeholder="e.g., 5000"
                required
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={newRoom.status}
                onChange={(e) => setNewRoom({ ...newRoom, status: e.target.value })}
              >
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            <div className="modal-actions">
              <button type="submit" className="btn-primary" disabled={isSubmitting}>Add Room</button>
              <button type="button" className="btn-secondary" onClick={() => setShowAddRoom(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Room Modal */}
        <Modal
          isOpen={showEditRoom}
          title={selectedRoom ? `Edit Room ${selectedRoom.roomNo}` : 'Edit Room'}
          onClose={() => {
            setShowEditRoom(false);
            setSelectedRoom(null);
          }}
          size="medium"
        >
          <form className="add-room-form" onSubmit={handleUpdateRoom}>
            <div className="form-group">
              <label>Room Number</label>
              <input
                type="text"
                value={editRoom.roomNo}
                onChange={(e) => setEditRoom({ ...editRoom, roomNo: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Building</label>
              <select
                value={editRoom.building}
                onChange={(e) => setEditRoom({ ...editRoom, building: e.target.value })}
                required
              >
                <option value="">Select Building</option>
                <option value="Building A">Building A</option>
                <option value="Building B">Building B</option>
                <option value="Building C">Building C</option>
              </select>
            </div>

            <div className="form-group">
              <label>Floor</label>
              <select
                value={editRoom.floor}
                onChange={(e) => setEditRoom({ ...editRoom, floor: e.target.value })}
                required
              >
                <option value="">Select Floor</option>
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
                <option value="4th">4th</option>
              </select>
            </div>

            <div className="form-group">
              <label>Capacity (Beds)</label>
              <input
                type="number"
                min="1"
                max="8"
                value={editRoom.capacity}
                onChange={(e) => setEditRoom({ ...editRoom, capacity: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Occupied Beds</label>
              <input
                type="number"
                min="0"
                max={editRoom.capacity || '8'}
                value={editRoom.occupiedBeds}
                onChange={(e) => setEditRoom({ ...editRoom, occupiedBeds: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Monthly Rate</label>
              <input
                type="number"
                min="0"
                value={editRoom.monthlyRate}
                onChange={(e) => setEditRoom({ ...editRoom, monthlyRate: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={editRoom.status}
                onChange={(e) => setEditRoom({ ...editRoom, status: e.target.value })}
              >
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            <div className="modal-actions">
              <button type="submit" className="btn-primary" disabled={isSubmitting}>Save Changes</button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowEditRoom(false);
                  setSelectedRoom(null);
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

export default RoomsManagement;
