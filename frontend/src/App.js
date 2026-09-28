import React, { useState, useRef, useEffect } from 'react';
import DriverOfferForm from './components/DriverOfferForm';
import PassengerRequestForm from './components/PassengerRequestForm';
import MatchFinder from './components/MatchFinder';
import OffersList from './components/OffersList';
import BookingsList from './components/BookingsList';
import RequestsList from './components/RequestsList';
import FareCalculator from './components/FareCalculator';
import { getStats } from './api';
import './App.css';

/* ── Floating Background Particles ── */
function Particles() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    left: Math.random() * 100,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 20,
    opacity: Math.random() * 0.4 + 0.1,
  }));

  return (
    <div className="particles">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}

/* ── Animated Counter ── */
function AnimatedCounter({ target, suffix = '', prefix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const observed = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !observed.current) {
        observed.current = true;
        let start = 0;
        const numTarget = typeof target === 'number' ? target : parseFloat(target) || 0;
        const step = Math.max(1, numTarget / 50);
        const timer = setInterval(() => {
          start += step;
          if (start >= numTarget) {
            setCount(numTarget);
            clearInterval(timer);
          } else {
            setCount(Math.floor(start));
          }
        }, 25);
      }
    }, { threshold: 0.2 });

    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('offers'); // Default to browsing rides
  const [refreshKey, setRefreshKey] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [activeBookingsCount, setActiveBookingsCount] = useState(0);
  const [stats, setStats] = useState({
    active_offers: 6,
    available_seats: 17,
    total_bookings: 12,
    co2_saved_kg: 2840,
    money_saved_inr: 520000,
  });

  // Cross-component state transfers
  const [matchPrefill, setMatchPrefill] = useState(null);
  const tabSectionRef = useRef(null);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  const scrollToTabs = (tab) => {
    if (tab) setActiveTab(tab);
    tabSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fetch live stats from API
  useEffect(() => {
    getStats()
      .then((data) => {
        if (data && !data.error) setStats(data);
      })
      .catch(() => {});
  }, [refreshKey]);

  const handleRouteMatchSelect = (route) => {
    setMatchPrefill(route);
    setActiveTab('match');
    tabSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenRequestOffer = (req) => {
    setMatchPrefill({ origin: req.origin, destination: req.destination });
    setActiveTab('driver');
    tabSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="app-wrapper">
      {/* ── Backgrounds ── */}
      <div className="cosmic-bg" />
      <div className="grid-overlay" />
      <Particles />

      {/* ── Navbar ── */}
      <nav className={`navbar-custom${scrolled ? ' scrolled' : ''}`}>
        <div className="container d-flex align-items-center justify-content-between">
          <div className="navbar-brand-text" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            🚗 RideShare <span className="badge-pro">PRO</span>
          </div>

          <div className="d-none d-lg-flex align-items-center gap-1">
            <span className={`nav-link-top ${activeTab === 'offers' ? 'active-nav' : ''}`} onClick={() => scrollToTabs('offers')}>
              🚗 Browse Rides
            </span>
            <span className={`nav-link-top ${activeTab === 'match' ? 'active-nav' : ''}`} onClick={() => scrollToTabs('match')}>
              🔍 Smart Match
            </span>
            <span className={`nav-link-top ${activeTab === 'driver' ? 'active-nav' : ''}`} onClick={() => scrollToTabs('driver')}>
              ➕ Post Ride
            </span>
            <span className={`nav-link-top ${activeTab === 'passenger' ? 'active-nav' : ''}`} onClick={() => scrollToTabs('passenger')}>
              🙋 Request Ride
            </span>
            <span className={`nav-link-top ${activeTab === 'bookings' ? 'active-nav' : ''}`} onClick={() => scrollToTabs('bookings')}>
              🎟️ My Bookings {activeBookingsCount > 0 && <span className="nav-badge-count">{activeBookingsCount}</span>}
            </span>
            <span className={`nav-link-top ${activeTab === 'calc' ? 'active-nav' : ''}`} onClick={() => scrollToTabs('calc')}>
              🧭 Fare &amp; CO2
            </span>
            <span className={`nav-link-top ${activeTab === 'requests' ? 'active-nav' : ''}`} onClick={() => scrollToTabs('requests')}>
              📋 Open Requests
            </span>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero-section">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-7">
              <div className="hero-badge">
                <span className="dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#43e97b', boxShadow: '0 0 8px #43e97b', display: 'inline-block' }} />
                India's Smart Empty Space Ride Sharing Network
              </div>
              <h1 className="hero-title">
                Share Your Ride,<br />
                Save <span className="highlight">Money</span> &amp; the <span className="highlight">Planet</span>
              </h1>
              <p className="hero-subtitle">
                Traveling with empty vehicle seats? Post your trip and split fuel expenses.
                Need a comfortable ride? Match instantly by route, time, and seats with verified drivers.
              </p>

              <div className="hero-cta-group">
                <button className="hero-cta" onClick={() => scrollToTabs('offers')}>
                  <i className="bi bi-car-front-fill" /> Browse Available Rides
                </button>
                <button className="hero-cta-outline" onClick={() => scrollToTabs('match')}>
                  <i className="bi bi-search-heart" /> Find Smart Match
                </button>
                <button className="hero-cta-secondary" onClick={() => scrollToTabs('driver')}>
                  <i className="bi bi-plus-circle" /> Post Empty Seats
                </button>
              </div>

              {/* Live Platform Stats */}
              <div className="hero-stats">
                <div className="hero-stat">
                  <div className="hero-stat-number">
                    <AnimatedCounter target={stats.active_offers || 6} suffix="+" />
                  </div>
                  <div className="hero-stat-label">Live Routes</div>
                </div>

                <div className="hero-stat">
                  <div className="hero-stat-number">
                    <AnimatedCounter target={stats.available_seats || 17} suffix="+" />
                  </div>
                  <div className="hero-stat-label">Empty Seats</div>
                </div>

                <div className="hero-stat">
                  <div className="hero-stat-number">
                    <AnimatedCounter target={stats.co2_saved_kg || 2840} suffix=" kg" />
                  </div>
                  <div className="hero-stat-label">CO2 Saved</div>
                </div>

                <div className="hero-stat">
                  <div className="hero-stat-number">
                    <AnimatedCounter target={52} prefix="₹" suffix="L+" />
                  </div>
                  <div className="hero-stat-label">Fuel Cost Shared</div>
                </div>
              </div>
            </div>

            <div className="col-lg-5 d-none d-lg-block">
              <div className="hero-illustration-wrap">
                <div className="hero-glow-ring" />
                <div className="hero-glow-ring-outer" />
                <div className="floating-car">🚗</div>
                <div className="hero-route-pill pill-1">
                  📍 Delhi → Agra → Lucknow
                </div>
                <div className="hero-route-pill pill-2">
                  ⚡ EV &amp; AC Sedan · ₹6.5/km
                </div>
                <div className="hero-route-pill pill-3">
                  🎟️ Instant Seat Reservation
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Stats Marquee ── */}
      <div className="live-stats-banner">
        <div className="stats-scroll-track">
          {[
            '🚗 Delhi → Agra • 3 seats available • ₹6.5/km',
            '🚙 Lucknow → Gorakhpur • 2 seats available • ₹7/km',
            '⚡ Mumbai → Pune • EV Ride • 3 seats available',
            '🛣️ Bengaluru → Mysuru • Innova SUV • 4 seats available',
            '🚕 Jaipur → Delhi • Executive Sedan • 2 seats available',
            '✅ Match Confirmed: Boarding Code RS-9821A generated',
            '🌱 Over 2,800 kg CO2 emissions prevented this month',
          ].map((item, i) => (
            <span key={i} className="stat-chip">
              <span className="dot" />
              {item}
              <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: '1rem' }}>|</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Interactive Workspace Section ── */}
      <section className="tab-section" ref={tabSectionRef}>
        <div className="container">
          <div className="text-center mb-4">
            <div className="section-badge">Platform Controls</div>
          </div>
          <h2 className="section-title">What Would You Like to Do?</h2>
          <p className="section-subtitle">
            Browse available rides, match your route, reserve your boarding ticket, or share your empty seats
          </p>

          {/* Navigation Tab Buttons */}
          <div className="tab-nav flex-wrap">
            {[
              { key: 'offers', icon: 'bi-grid-fill', label: 'Browse Rides' },
              { key: 'match', icon: 'bi-search-heart', label: 'Smart Match' },
              { key: 'driver', icon: 'bi-car-front-fill', label: 'Post Empty Seats' },
              { key: 'passenger', icon: 'bi-person-raised-hand', label: 'Request Ride' },
              { key: 'bookings', icon: 'bi-ticket-perforated-fill', label: `My Bookings (${activeBookingsCount})` },
              { key: 'calc', icon: 'bi-calculator-fill', label: 'Fare & CO2 Estimator' },
              { key: 'requests', icon: 'bi-card-checklist', label: 'Open Requests' },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`tab-btn${activeTab === tab.key ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <i className={`bi ${tab.icon}`} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Display */}
          <div className="tab-content-area mt-4">
            {activeTab === 'offers' && (
              <OffersList refreshKey={refreshKey} />
            )}

            {activeTab === 'match' && (
              <MatchFinder
                initialRoute={matchPrefill}
                onPostRequestClick={(r) => {
                  setMatchPrefill(r);
                  setActiveTab('passenger');
                }}
              />
            )}

            {activeTab === 'driver' && (
              <DriverOfferForm
                onSuccess={() => {
                  triggerRefresh();
                  setActiveTab('offers');
                }}
              />
            )}

            {activeTab === 'passenger' && (
              <PassengerRequestForm
                initialRoute={matchPrefill}
                onSuccess={() => {
                  triggerRefresh();
                  setActiveTab('requests');
                }}
                onFindMatchClick={(r) => {
                  setMatchPrefill(r);
                  setActiveTab('match');
                }}
              />
            )}

            {activeTab === 'bookings' && (
              <BookingsList
                refreshKey={refreshKey}
                onBookingsCountChange={setActiveBookingsCount}
              />
            )}

            {activeTab === 'calc' && (
              <FareCalculator
                onSelectRouteForMatch={handleRouteMatchSelect}
              />
            )}

            {activeTab === 'requests' && (
              <RequestsList
                refreshKey={refreshKey}
                onRequestAction={handleOpenRequestOffer}
              />
            )}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="how-it-works">
        <div className="container">
          <div className="text-center mb-4">
            <div className="section-badge">How It Works</div>
          </div>
          <h2 className="section-title">Simple. Transparent. Reliable.</h2>
          <p className="section-subtitle">Connect, travel together, and slash travel costs in 4 steps</p>

          <div className="row g-4">
            {[
              { num: '01', icon: 'bi-geo-alt-fill', cls: 'bg-1', title: 'Route & Waypoint Matching', desc: 'Drivers specify route and stops. Sub-route algorithms match passengers traveling between intermediate cities.' },
              { num: '02', icon: 'bi-speedometer2', cls: 'bg-2', title: 'Accurate Highway Pricing', desc: 'Real highway distances calculated via geodesic coordinates with transparent per-km cost sharing.' },
              { num: '03', icon: 'bi-ticket-perforated-fill', cls: 'bg-3', title: 'Instant Boarding Pass', desc: 'Reserve seats in real-time. Receive a digital boarding pass with unique confirmation code (RS-XXXX).' },
              { num: '04', icon: 'bi-tree-fill', cls: 'bg-4', title: 'Eco & Wallet Friendly', desc: 'Cut solo car emissions by up to 75% and save thousands of rupees on intercity travel.' },
            ].map((s) => (
              <div className="col-md-6 col-lg-3" key={s.num}>
                <div className="step-card">
                  <span className="step-number">{s.num}</span>
                  <div className={`step-icon ${s.cls}`}>
                    <i className={`bi ${s.icon}`} />
                  </div>
                  <h5>{s.title}</h5>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer-custom">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6 text-md-start mb-3 mb-md-0">
              <span className="footer-brand">🚗 RideShare PRO</span>
              <p className="mb-0" style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                Empty Vehicle Space Sharing &amp; Intercity Commute Platform.
              </p>
            </div>
            <div className="col-md-6 text-md-end">
              <div className="footer-links">
                <span>Safe Ride Guarantee</span>
                <span>Community Guidelines</span>
                <span>Fare Calculator</span>
                <span>API Status</span>
              </div>
            </div>
          </div>
          <div className="text-center mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
            © 2026 RideShare Platform. Reducing vehicle carbon footprint across India.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
