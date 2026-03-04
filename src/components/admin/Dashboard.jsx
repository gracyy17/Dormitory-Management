import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import SummaryCard from '../common/SummaryCard';
import DataTable from '../common/DataTable';
import RecentActivity from '../common/RecentActivity';
import StatusBadge from '../common/StatusBadge';

function Dashboard() {
  // Mock data
  const summaryCards = [
    {
      icon: '🏠',
      title: 'Total Rooms',
      value: '48',
      subtitle: '4 Floors × 12 Rooms',
      color: 'blue',
      trend: { type: 'neutral', text: 'Unchanged' }
    },
    {
      icon: '✅',
      title: 'Available Beds',
      value: '12',
      subtitle: '25% capacity',
      color: 'green',
      trend: { type: 'positive', text: '+2 this week' }
    },
    {
      icon: '👥',
      title: 'Occupied Beds',
      value: '36',
      subtitle: '75% occupancy',
      color: 'cyan',
      trend: { type: 'neutral', text: 'Stable' }
    },
    {
      icon: '💳',
      title: 'Pending Payments',
      value: '₱45,200',
      subtitle: '5 residents',
      color: 'orange',
      trend: { type: 'negative', text: '-2 paid' }
    },
    {
      icon: '🔧',
      title: 'Maintenance Requests',
      value: '8',
      subtitle: '3 urgent',
      color: 'red',
      trend: { type: 'negative', text: '+3 new' }
    },
    {
      icon: '📈',
      title: 'Monthly Revenue',
      value: '₱156,000',
      subtitle: 'On track',
      color: 'purple',
      trend: { type: 'positive', text: '+5% vs last month' }
    },
  ];

  const recentActivities = [
    { icon: '✅', message: 'Room 302 payment confirmed', time: '2 hours ago', status: 'Paid' },
    { icon: '⚠️', message: 'Maintenance request submitted for Room 105', time: '3 hours ago', status: 'Pending' },
    { icon: '👤', message: 'New tenant checked in - Room 201', time: '5 hours ago' },
    { icon: '💳', message: 'Payment reminder sent to 3 residents', time: '1 day ago', status: 'Pending' },
    { icon: '📤', message: 'Tenant moved out of Room 404', time: '2 days ago' },
    { icon: '✅', message: 'Room 103 maintenance completed', time: '3 days ago' },
  ];

  const latestTenants = [
    { id: 'T001', name: 'Juan Dela Cruz', room: '201', checkIn: '2024-02-28', status: 'Active' },
    { id: 'T002', name: 'Maria Santos', room: '302', checkIn: '2024-02-25', status: 'Active' },
    { id: 'T003', name: 'Carlos Rodriguez', room: '103', checkIn: '2024-02-20', status: 'Active' },
    { id: 'T004', name: 'Ana Reyes', room: '405', checkIn: '2024-02-15', status: 'Active' },
  ];

  const upcomingDueDates = [
    { tenant: 'John Smith', room: '105', dueDate: '2024-03-05', amount: '₱5,000', status: 'Pending' },
    { tenant: 'Sarah Johnson', room: '203', dueDate: '2024-03-08', amount: '₱5,500', status: 'Pending' },
    { tenant: 'Mike Wilson', room: '301', dueDate: '2024-03-10', amount: '₱6,000', status: 'Overdue' },
    { tenant: 'Emma Davis', room: '402', dueDate: '2024-03-12', amount: '₱5,500', status: 'Pending' },
    { tenant: 'David Lee', room: '104', dueDate: '2024-03-15', amount: '₱5,000', status: 'Pending' },
  ];

  const tenantColumns = [
    { key: 'name', label: 'Tenant Name' },
    { key: 'id', label: 'ID' },
    { key: 'room', label: 'Room' },
    { key: 'checkIn', label: 'Check-in Date' },
    {
      key: 'status',
      label: 'Status',
      render: (status) => <StatusBadge status={status} type={status.toLowerCase()} />
    }
  ];

  const dueColumns = [
    { key: 'tenant', label: 'Tenant' },
    { key: 'room', label: 'Room' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'amount', label: 'Amount' },
    {
      key: 'status',
      label: 'Status',
      render: (status) => <StatusBadge status={status} type={status.toLowerCase().replace(' ', '-')} />
    }
  ];

  return (
    <AdminLayout>
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's your dormitory overview.</p>
        </div>

        {/* Summary Cards */}
        <section className="summary-section">
          <div className="cards-grid">
            {summaryCards.map((card, idx) => (
              <SummaryCard key={idx} {...card} />
            ))}
          </div>
        </section>

        {/* Main Content */}
        <section className="dashboard-content">
          {/* Recent Activity */}
          <div className="dashboard-widget">
            <div className="widget-header">
              <h2>Recent Activity</h2>
              <a href="#view-all" className="view-all-link">View All →</a>
            </div>
            <RecentActivity activities={recentActivities} limit={6} />
          </div>

          {/* Latest Tenants */}
          <div className="dashboard-widget">
            <div className="widget-header">
              <h2>Latest Tenants</h2>
              <a href="#view-all" className="view-all-link">View All →</a>
            </div>
            <DataTable columns={tenantColumns} data={latestTenants} />
          </div>

          {/* Upcoming Due Dates */}
          <div className="dashboard-widget">
            <div className="widget-header">
              <h2>Upcoming Due Dates</h2>
              <a href="#view-all" className="view-all-link">View All →</a>
            </div>
            <DataTable columns={dueColumns} data={upcomingDueDates} />
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default Dashboard;
