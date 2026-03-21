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

const defaultRoomForm = {
  roomNo: '',
  building: '',
  floor: '',
  type: 'Standard',
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
  return 'Occupied';
};

const formatPeso = (amount) => {
  const value = Number(amount || 0);
  if (Number.isNaN(value)) return 'P0';
  return `P${value.toLocaleString('en-PH')}`;
};

function RoomsManagement() {
  const [filters, setFilters] = useState({
    building: '',
    floor: '',
    roomType: '',
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
  const [tenantCountByRoom, setTenantCountByRoom] = useState({});

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
            type: String(data.type || 'Standard'),
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

        setTenantCountByRoom(counter);
      },
      () => {
        setTenantCountByRoom({});
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
      (!filters.roomType || room.type === filters.roomType) &&
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

    if (!payload.roomNo.trim() || !payload.building || !payload.floor || !payload.type) {
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
        type: newRoom.type,
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
      type: room.type,
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
        type: editRoom.type,
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
    { key: 'type', label: 'Type' },
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
  const uniqueTypes = useMemo(
    () => Array.from(new Set(roomsWithDerivedOccupancy.map((room) => room.type).filter(Boolean))).sort(),
    [roomsWithDerivedOccupancy]
  );

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
              <label>Room Type</label>
              <select name="roomType" value={filters.roomType} onChange={handleFilterChange}>
                <option value="">All Types</option>
                {uniqueTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
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
        {error && <p style={{ color: '#b91c1c', marginBottom: 12 }}>{error}</p>}
        {success && <p style={{ color: '#166534', marginBottom: 12 }}>{success}</p>}

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
                  <label>Type</label>
                  <p>{selectedRoom.type}</p>
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
                  {Array.from({ length: Number(selectedRoom.capacity || 0) }).map((_, idx) => (
                    <div key={idx} className={`bed-slot ${idx < Number(selectedRoom.occupiedBeds || 0) ? 'occupied' : 'empty'}`}>
                      <div className="bed-number">Bed {idx + 1}</div>
                      {idx < Number(selectedRoom.occupiedBeds || 0) ? (
                        <div className="bed-tenant">
                          <p className="tenant-name">Occupied Bed</p>
                          <p className="bed-status">Occupied</p>
                        </div>
                      ) : (
                        <p className="bed-status">Available</p>
                      )}
                    </div>
                  ))}
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
              <label>Room Type</label>
              <select
                value={newRoom.type}
                onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}
              >
                <option value="Standard">Standard</option>
                <option value="Deluxe">Deluxe</option>
                <option value="Suite">Suite</option>
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
              <label>Room Type</label>
              <select
                value={editRoom.type}
                onChange={(e) => setEditRoom({ ...editRoom, type: e.target.value })}
              >
                <option value="Standard">Standard</option>
                <option value="Deluxe">Deluxe</option>
                <option value="Suite">Suite</option>
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
