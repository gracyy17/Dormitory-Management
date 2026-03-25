import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/PublicWebsite.css';
import { BrandIcon, CardIcon, HomeIcon, MoonIcon, ShieldIcon, SunIcon, UsersIcon, WifiIcon } from '../common/LineIcons';

function HomePage() {
  const amenities = ['High-Speed Wi-Fi', 'CCTV Coverage'];
  const roomInclusions = [
    '6 pax per room',
    'Double deck with foam and cabinet',
    '1.5 HP aircondition (inverter)',
    'With C.R. per room',
    'With ref per room',
    'Free gas stove',
    'Free Wi-Fi 24/7',
  ];
  const quickFacts = [
    { label: 'Capacity', value: '6 Pax / Room' },
    { label: 'Aircon', value: '1.5 HP Inverter' },
    { label: 'Connectivity', value: 'Wi-Fi 24/7' },
    { label: 'Kitchen', value: 'Free Gas Stove' },
  ];

  const [darkMode, setDarkMode] = useState(() => window.localStorage.getItem('public_dark_mode') === 'true');

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const next = !prev;
      window.localStorage.setItem('public_dark_mode', String(next));
      return next;
    });
  };

  return (
    <div className={`public-site ${darkMode ? 'dark-mode' : ''}`}>
      <div className="ambient-orb orb-a" />
      <div className="ambient-orb orb-b" />

      <header className="public-nav">
        <div className="brand">
          <span className="brand-icon"><BrandIcon className="ui-icon" size={20} /></span>
          <span>MZ Dormitory</span>
        </div>
        <div className="nav-actions">
          <button className="public-theme-toggle" onClick={toggleTheme} aria-label="Toggle public theme">
            {darkMode ? <SunIcon className="ui-icon" size={15} /> : <MoonIcon className="ui-icon" size={15} />}
          </button>
          <Link className="nav-link" to="/tenant/login">Tenant Login</Link>
        </div>
      </header>

      <main className="public-main">
        <section className="hero">
          <div className="hero-content glass-panel reveal-up">
            <p className="hero-kicker">Welcome to MZ Dormitory</p>
            <h1>Comfortable spaces built for focused student living.</h1>
            <p>
              Enjoy a clean, secure, and complete room setup with reliable essentials for daily student life.
            </p>
            <div className="hero-tags">
              <span><ShieldIcon className="ui-icon" size={14} /> Secured Access</span>
              <span><WifiIcon className="ui-icon" size={14} /> Connected Spaces</span>
              <span><UsersIcon className="ui-icon" size={14} /> Tenant-Centered</span>
            </div>
            <div className="hero-cta">
              <Link className="btn btn-primary" to="/tenant/login">Tenant Portal</Link>
            </div>
          </div>
          <aside className="hero-panel glass-panel reveal-up delay-1">
            <h3>At A Glance</h3>
            <div className="pulse-grid">
              {quickFacts.map((fact) => (
                <article key={fact.label}>
                  <p>{fact.label}</p>
                  <strong>{fact.value}</strong>
                </article>
              ))}
            </div>
          </aside>
        </section>

        <section className="feature-strip reveal-up delay-2">
          <article className="feature-chip">
            <HomeIcon className="ui-icon" size={15} />
            <span>Own C.R. and Ref per room</span>
          </article>
          <article className="feature-chip">
            <CardIcon className="ui-icon" size={15} />
            <span>Transparent monthly rental setup</span>
          </article>
          <article className="feature-chip">
            <UsersIcon className="ui-icon" size={15} />
            <span>Balanced room occupancy model</span>
          </article>
        </section>

        <section className="section about-frame glass-panel reveal-up delay-3">
          <div className="section-head">
            <h2>About Us</h2>
            <p>
              MZ Dormitory provides student-friendly living spaces built for comfort, safety, and focused daily routines.
            </p>
          </div>
          <div className="essential-info">
            <p>Essential Info</p>
            <strong>Nearest Landmark: [Placeholder]</strong>
          </div>
        </section>

        <section className="section section-grid">
          <article className="room-offer glass-panel reveal-up delay-3">
            <div className="section-head">
              <h2>Room Inclusions</h2>
              <p>Clear and complete inclusions for each room.</p>
            </div>
            <div className="room-offer-card">
              <ul>
                {roomInclusions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </article>

          <article className="amenities-panel glass-panel reveal-up delay-4">
            <div className="section-head">
              <h2>Amenities</h2>
              <p>Core essentials designed for comfort and focus.</p>
            </div>
            <div className="amenities-grid">
              {amenities.map((item) => (
                <div key={item} className="amenity-item">
                  <span className="amenity-dot" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="section contact glass-panel reveal-up delay-5">
          <div>
            <h2>Contact & Inquiries</h2>
            <p>Email: mzdormitory@example.com</p>
            <p>Mobile: +63 912 345 6789</p>
          </div>
          <Link className="btn btn-primary" to="/tenant/login">Go to Tenant Login</Link>
        </section>
      </main>
    </div>
  );
}

export default HomePage;
