import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import Modal from '../common/Modal';
import DataTable from '../common/DataTable';
import StatusBadge from '../common/StatusBadge';

function RoomsManagement() {
  const [filters, setFilters] = useState({
    building: '',
    floor: '',
    roomType: '',
    status: ''
  });
  
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [newRoom, setNewRoom] = useState({
    roomNo: '',
    building: '',
    floor: '',
    type: 'Standard',
    capacity: '2',
    monthlyRate: ''
  });

  // Mock data
  const rooms = [
    { id: 1, roomNo: '101', building: 'Building A', floor: '1st', type: 'Standard', capacity: '2', occupancy: '2/2', monthlyRate: '₱5,000', status: 'Occupied', tenants: ['Juan Dela Cruz', 'Maria Santos'] },
    { id: 2, roomNo: '102', building: 'Building A', floor: '1st', type: 'Standard', capacity: '2', occupancy: '1/2', monthlyRate: '₱5,000', status: 'Occupied', tenants: ['Carlos Rodriguez'] },
    { id: 3, roomNo: '103', building: 'Building A', floor: '1st', type: 'Standard', capacity: '2', occupancy: '0/2', monthlyRate: '₱5,000', status: 'Available', tenants: [] },
    { id: 4, roomNo: '104', building: 'Building A', floor: '1st', type: 'Standard', capacity: '2', occupancy: '2/2', monthlyRate: '₱5,000', status: 'Occupied', tenants: ['Ana Reyes', 'David Lee'] },
    { id: 5, roomNo: '201', building: 'Building A', floor: '2nd', type: 'Deluxe', capacity: '2', occupancy: '2/2', monthlyRate: '₱6,500', status: 'Occupied', tenants: ['Sarah Johnson', 'Emma Davis'] },
    { id: 6, roomNo: '202', building: 'Building A', floor: '2nd', type: 'Deluxe', capacity: '2', occupancy: '0/2', monthlyRate: '₱6,500', status: 'Available', tenants: [] },
    { id: 7, roomNo: '301', building: 'Building B', floor: '3rd', type: 'Suite', capacity: '3', occupancy: '2/3', monthlyRate: '₱7,500', status: 'Occupied', tenants: ['Mike Wilson', 'John Smith'] },
    { id: 8, roomNo: '302', building: 'Building B', floor: '3rd', type: 'Standard', capacity: '2', occupancy: '0/2', monthlyRate: '₱5,000', status: 'Maintenance', tenants: [] },
  ];

  const filteredRooms = rooms.filter(room => {
    return (
      (!filters.building || room.building === filters.building) &&
      (!filters.floor || room.floor === filters.floor) &&
      (!filters.roomType || room.type === filters.roomType) &&
      (!filters.status || room.status === filters.status)
    );
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleAddRoom = (e) => {
    e.preventDefault();
    // Add room logic here
    setShowAddRoom(false);
    setNewRoom({ roomNo: '', building: '', floor: '', type: 'Standard', capacity: '2', monthlyRate: '' });
  };

  const handleViewRoom = (room) => {
    setSelectedRoom(room);
    setShowRoomModal(true);
  };

  const roomColumns = [
    { key: 'roomNo', label: 'Room No' },
    { key: 'building', label: 'Building' },
    { key: 'type', label: 'Type' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'occupancy', label: 'Occupancy' },
    { key: 'monthlyRate', label: 'Monthly Rate' },
    {
      key: 'status',
      label: 'Status',
      render: (status) => <StatusBadge status={status} type={status.toLowerCase().replace(' ', '-')} />
    }
  ];

  const actions = [
    { icon: '👁️', label: 'View', variant: 'view', onClick: handleViewRoom },
    { icon: '✏️', label: 'Edit', variant: 'edit', onClick: (room) => {} },
    { icon: '🗑️', label: 'Delete', variant: 'delete', onClick: (room) => {} }
  ];

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
                <option value="Building A">Building A</option>
                <option value="Building B">Building B</option>
                <option value="Building C">Building C</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Floor</label>
              <select name="floor" value={filters.floor} onChange={handleFilterChange}>
                <option value="">All Floors</option>
                <option value="1st">1st Floor</option>
                <option value="2nd">2nd Floor</option>
                <option value="3rd">3rd Floor</option>
                <option value="4th">4th Floor</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Room Type</label>
              <select name="roomType" value={filters.roomType} onChange={handleFilterChange}>
                <option value="">All Types</option>
                <option value="Standard">Standard</option>
                <option value="Deluxe">Deluxe</option>
                <option value="Suite">Suite</option>
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

        {/* Rooms Table */}
        <section className="dashboard-widget">
          <div className="widget-header">
            <h2>Room List ({filteredRooms.length})</h2>
            <span className="count-badge">{filteredRooms.length} of {rooms.length} rooms</span>
          </div>
          <DataTable columns={roomColumns} data={filteredRooms} actions={actions} />
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
                  <p>{selectedRoom.monthlyRate}</p>
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
                  {Array.from({ length: parseInt(selectedRoom.capacity) }).map((_, idx) => (
                    <div key={idx} className={`bed-slot ${selectedRoom.tenants[idx] ? 'occupied' : 'empty'}`}>
                      <div className="bed-number">Bed {idx + 1}</div>
                      {selectedRoom.tenants[idx] ? (
                        <div className="bed-tenant">
                          <p className="tenant-name">{selectedRoom.tenants[idx]}</p>
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
                <button className="btn-primary">Edit Room</button>
                <button className="btn-secondary">View Tenants</button>
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
                max="4"
                value={newRoom.capacity}
                onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Monthly Rate</label>
              <input
                type="text"
                value={newRoom.monthlyRate}
                onChange={(e) => setNewRoom({ ...newRoom, monthlyRate: e.target.value })}
                placeholder="e.g., ₱5,000"
                required
              />
            </div>

            <div className="modal-actions">
              <button type="submit" className="btn-primary">Add Room</button>
              <button type="button" className="btn-secondary" onClick={() => setShowAddRoom(false)}>
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
