import React, { useState, useEffect } from 'react';
import { findMatch, getCities } from '../api';
import BookingModal from './BookingModal';

function MatchFinder({ initialRoute, onPostRequestClick }) {
  const [form, setForm] = useState({
    passenger_name: '',
    origin: initialRoute?.origin || 'Delhi',
    destination: initialRoute?.destination || 'Agra',
    earliest_departure: '',
    latest_departure: '',
    seats_needed: 1,
  });

  const [cities, setCities] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRideForBooking, setSelectedRideForBooking] = useState(null);

  useEffect(() => {
    getCities()
      .then((data) => setCities(data.cities || []))
      .catch(() => {});

    // Set default departure times: now to +24 hours
    const now = new Date();
    const plus24 = new Date(now.getTime() + 24 * 3600 * 1000);
    const formatLocal = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setForm((prev) => ({
      ...prev,
      earliest_departure: formatLocal(now),
      latest_departure: formatLocal(plus24),
    }));
  }, []);

  // Update when initialRoute changes
  useEffect(() => {
    if (initialRoute?.origin && initialRoute?.destination) {
      setForm((prev) => ({
        ...prev,
        origin: initialRoute.origin,
        destination: initialRoute.destination,
      }));
    }
  }, [initialRoute]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwap = () => {
    setForm((prev) => ({
      ...prev,
      origin: prev.destination,
      destination: prev.origin,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const payload = {
        ...form,
        seats_needed: parseInt(form.seats_needed, 10) || 1,
      };
      const { ok, data } = await findMatch(payload);
      if (ok) {
        setResult(data);
      } else {
        setError(data.error || 'No matching rides found for this route and time.');
      }
    } catch {
      setError('Network error – is the backend running?');
    }
    setLoading(false);
  };

  const matchesList = result?.all_matches || (result ? [result] : []);

  return (
    <div className="match-finder-wrapper">
      <div className="form-card">
        <div className="form-card-header match">
          <i className="bi bi-search-heart" style={{ fontSize: '1.3rem' }} />
          Find &amp; Match Rides Instantly
        </div>
        <div className="form-card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Your Name</label>
                <input
                  type="text"
                  className="form-control"
                  name="passenger_name"
                  value={form.passenger_name}
                  onChange={handleChange}
                  placeholder="e.g. Amit Singh"
                  required
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Pickup City</label>
                <input
                  type="text"
                  list="cities-list"
                  className="form-control"
                  name="origin"
                  value={form.origin}
                  onChange={handleChange}
                  placeholder="e.g. Delhi"
                  required
                />
              </div>

              <div className="col-md-1 text-center pt-md-4">
                <button
                  type="button"
                  className="btn-swap-cities-sm"
                  onClick={handleSwap}
                  title="Swap Origin & Destination"
                >
                  <i className="bi bi-arrow-left-right" />
                </button>
              </div>

              <div className="col-md-4">
                <label className="form-label">Destination City</label>
                <input
                  type="text"
                  list="cities-list"
                  className="form-control"
                  name="destination"
                  value={form.destination}
                  onChange={handleChange}
                  placeholder="e.g. Agra"
                  required
                />
              </div>

              <datalist id="cities-list">
                {cities.map((c, i) => (
                  <option key={i} value={c} />
                ))}
              </datalist>

              <div className="col-md-5">
                <label className="form-label">Earliest Departure</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  name="earliest_departure"
                  value={form.earliest_departure}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-5">
                <label className="form-label">Latest Departure</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  name="latest_departure"
                  value={form.latest_departure}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-md-2">
                <label className="form-label">Seats Needed</label>
                <input
                  type="number"
                  className="form-control"
                  name="seats_needed"
                  value={form.seats_needed}
                  onChange={handleChange}
                  min="1"
                  max="8"
                  required
                />
              </div>
            </div>

            <div className="text-center mt-4">
              <button type="submit" className="btn-gradient orange" disabled={loading}>
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2" />Searching Drivers…</>
                ) : (
                  <><i className="bi bi-search me-2" />Find Best Matches</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Match Results List */}
      {result && matchesList.length > 0 && (
        <div className="matches-results-section mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 style={{ fontWeight: 700, color: '#fff', margin: 0 }}>
              🎉 Found {matchesList.length} Matching Ride{matchesList.length !== 1 ? 's' : ''}!
            </h5>
            <span style={{ fontSize: '0.85rem', color: '#43e97b' }}>
              Ranked by route accuracy &amp; best fare
            </span>
          </div>

          <div className="row g-4">
            {matchesList.map((m, idx) => {
              const depDate = new Date(m.departure_time);
              const isBest = idx === 0;

              return (
                <div className="col-lg-6" key={m.offer_id || idx}>
                  <div className={`match-result-card-enhanced ${isBest ? 'best-match-border' : ''}`}>
                    <div className="match-card-header">
                      <div>
                        {isBest && <span className="best-match-tag">⭐ Top Recommendation</span>}
                        <div className="match-route-title">
                          📍 {m.origin} &rarr; {m.destination}
                        </div>
                      </div>
                      <div className="match-score-badge">
                        {m.match_score}% Match ({m.match_type})
                      </div>
                    </div>

                    <div className="match-grid-info">
                      <div className="grid-item">
                        <span className="lbl"><i className="bi bi-person-fill me-1" /> Driver</span>
                        <span className="val">{m.driver_name}</span>
                      </div>
                      <div className="grid-item">
                        <span className="lbl"><i className="bi bi-car-front-fill me-1" /> Vehicle</span>
                        <span className="val">{m.vehicle_type} ({m.vehicle_model})</span>
                      </div>
                      <div className="grid-item">
                        <span className="lbl"><i className="bi bi-clock-fill me-1" /> Departure</span>
                        <span className="val">{depDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} at {depDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="grid-item">
                        <span className="lbl"><i className="bi bi-speedometer2 me-1" /> Distance &amp; ETA</span>
                        <span className="val">{m.distance_km} km (~{Math.floor(m.estimated_duration_mins / 60)}h {m.estimated_duration_mins % 60}m)</span>
                      </div>
                    </div>

                    <div className="match-card-bottom-bar">
                      <div>
                        <span className="fare-subtext">Estimated Cost for {m.seats_matched} seat(s)</span>
                        <div className="fare-main-cost">₹{m.estimated_cost}</div>
                      </div>

                      <button
                        className="btn-gradient green"
                        onClick={() => setSelectedRideForBooking({ ...m, passenger_name: form.passenger_name })}
                      >
                        <i className="bi bi-ticket-fill me-1" /> Reserve Seat(s)
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="error-card-custom mt-4">
          <div className="d-flex align-items-center gap-3">
            <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '2rem', color: '#ff7675' }} />
            <div>
              <h5 style={{ margin: 0, fontWeight: 700, color: '#ff7675' }}>No Direct Driver Found</h5>
              <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                {error}
              </p>
            </div>
          </div>

          {onPostRequestClick && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                className="btn-gradient blue"
                onClick={() => onPostRequestClick({ origin: form.origin, destination: form.destination })}
              >
                <i className="bi bi-plus-circle me-1" /> Post as an Open Passenger Request
              </button>
            </div>
          )}
        </div>
      )}

      {/* Booking Modal */}
      {selectedRideForBooking && (
        <BookingModal
          ride={selectedRideForBooking}
          onClose={() => setSelectedRideForBooking(null)}
          onBookingSuccess={() => {
            setSelectedRideForBooking(null);
          }}
        />
      )}
    </div>
  );
}

export default MatchFinder;
