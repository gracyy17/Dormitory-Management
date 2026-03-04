import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/PublicWebsite.css';

function HomePage() {
  const roomTypes = [
    { name: 'Standard Room', rate: '₱5,000 / month', details: '2 beds • Shared bathroom • Wi-Fi' },
    { name: 'Deluxe Room', rate: '₱6,500 / month', details: '2 beds • Private bathroom • Study desk' },
    { name: 'Suite Room', rate: '₱7,500 / month', details: '3 beds • Larger space • Premium floor' },
  ];

  const amenities = ['24/7 Security', 'High-Speed Wi-Fi', 'Laundry Area', 'Study Lounge', 'CCTV Coverage', 'Visitor Parking'];

  return (
    <div className="public-site">
      <header className="public-nav">
        <div className="brand">
          <span className="brand-icon">🏢</span>
          <span>DormC Residences</span>
        </div>
        <div className="nav-actions">
          <Link className="nav-link" to="/tenant/login">Tenant Login</Link>
          <Link className="btn btn-primary" to="/client/login">Client/Admin Login</Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <p className="hero-kicker">Welcome to our dormitory community</p>
            <h1>Safe, clean, and student-friendly dormitory living.</h1>
            <p>
              Find room options, view rates, and contact us online. Existing tenants can log in to check payment dues and requests,
              while the client/admin has a private dashboard to manage website and dorm records.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary" href="#rooms">View Rooms</a>
              <Link className="btn btn-secondary" to="/tenant/login">Tenant Portal</Link>
            </div>
          </div>
          <div className="hero-panel">
            <h3>Quick Access</h3>
            <ul>
              <li><strong>Visitors:</strong> Browse rooms and amenities</li>
              <li><strong>Tenants:</strong> Login for dues and requests</li>
              <li><strong>Client:</strong> Login to admin dashboard</li>
            </ul>
          </div>
        </section>

        <section id="rooms" className="section">
          <div className="section-head">
            <h2>Room Options</h2>
            <p>Transparent rates and clear inclusions.</p>
          </div>
          <div className="card-grid">
            {roomTypes.map((room) => (
              <article key={room.name} className="public-card">
                <h3>{room.name}</h3>
                <p className="rate">{room.rate}</p>
                <p className="details">{room.details}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Amenities</h2>
            <p>Everything students need in one place.</p>
          </div>
          <div className="amenities-grid">
            {amenities.map((item) => (
              <div key={item} className="amenity-item">✅ {item}</div>
            ))}
          </div>
        </section>

        <section className="section contact">
          <div>
            <h2>Contact & Inquiries</h2>
            <p>Email: dormc.residences@example.com</p>
            <p>Mobile: +63 912 345 6789</p>
          </div>
          <Link className="btn btn-primary" to="/tenant/login">Go to Tenant Login</Link>
        </section>
      </main>
    </div>
  );
}

export default HomePage;
