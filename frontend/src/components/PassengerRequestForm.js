import React, { useState, useEffect } from 'react';
import { postRequest, getCities } from '../api';

function PassengerRequestForm({ initialRoute, onSuccess, onFindMatchClick }) {
  const [form, setForm] = useState({
    passenger_name: '',
    passenger_phone: '',
    origin: initialRoute?.origin || 'Lucknow',
    destination: initialRoute?.destination || 'Gorakhpur',
    earliest_departure: '',
    latest_departure: '',
    seats_needed: 1,
    max_price_per_km: '',
  });

  const [cities, setCities] = useState([]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCities()
      .then((data) => setCities(data.cities || []))
      .catch(() => {});

    const now = new Date();
    const plus12 = new Date(now.getTime() + 12 * 3600 * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    const formatLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setForm((prev) => ({
      ...prev,
      earliest_departure: formatLocal(now),
      latest_departure: formatLocal(plus12),
    }));
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const payload = {
        ...form,
        seats_needed: parseInt(form.seats_needed, 10) || 1,
        max_price_per_km: form.max_price_per_km ? parseFloat(form.max_price_per_km) : null,
      };

      const res = await postRequest(payload);
      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setMessage({
          type: 'success',
          text: `✅ Request posted! Drivers heading your way will see your request.`,
        });
        if (onSuccess) onSuccess();
      }
    } catch {
      setMessage({ type: 'error', text: '⚠️ Network error – is the backend running?' });
    }
    setLoading(false);
  };

  return (
    <div className="form-card">
      <div className="form-card-header passenger">
        <i className="bi bi-person-raised-hand" style={{ fontSize: '1.3rem' }} />
        Request a Ride / Custom Commute
      </div>
      <div className="form-card-body">
        {message && (
          <div className={`${message.type === 'success' ? 'alert-custom-success' : 'alert-custom-error'} mb-3`}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Passenger Full Name</label>
              <input
                type="text"
                className="form-control"
                name="passenger_name"
                value={form.passenger_name}
                onChange={handleChange}
                placeholder="e.g. Sneha Patel"
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                className="form-control"
                name="passenger_phone"
                value={form.passenger_phone}
                onChange={handleChange}
                placeholder="e.g. 9711002233"
                required
              />
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Pickup City / Town</label>
              <input
                type="text"
                list="passenger-cities"
                className="form-control"
                name="origin"
                value={form.origin}
                onChange={handleChange}
                placeholder="e.g. Lucknow"
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Destination City</label>
              <input
                type="text"
                list="passenger-cities"
                className="form-control"
                name="destination"
                value={form.destination}
                onChange={handleChange}
                placeholder="e.g. Gorakhpur"
                required
              />
            </div>
          </div>

          <datalist id="passenger-cities">
            {cities.map((c, i) => (
              <option key={i} value={c} />
            ))}
          </datalist>

          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <label className="form-label">Earliest Departure Time</label>
              <input
                type="datetime-local"
                className="form-control"
                name="earliest_departure"
                value={form.earliest_departure}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Latest Departure Time</label>
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
                max="10"
                required
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Max Rate / KM (₹)</label>
              <input
                type="number"
                step="0.5"
                className="form-control"
                name="max_price_per_km"
                value={form.max_price_per_km}
                onChange={handleChange}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="d-flex justify-content-center gap-3 mt-4">
            <button type="submit" className="btn-gradient blue" disabled={loading}>
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2" />Submitting…</>
              ) : (
                <><i className="bi bi-send-fill me-2" />Post Passenger Request</>
              )}
            </button>

            {onFindMatchClick && (
              <button
                type="button"
                className="btn-gradient orange"
                onClick={() => onFindMatchClick({ origin: form.origin, destination: form.destination })}
              >
                <i className="bi bi-search me-1" /> Search Available Drivers Now
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default PassengerRequestForm;
