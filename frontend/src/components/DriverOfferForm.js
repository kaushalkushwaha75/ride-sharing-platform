import React, { useState, useEffect } from 'react';
import { postOffer, getCities } from '../api';

function DriverOfferForm({ onSuccess }) {
  const [form, setForm] = useState({
    driver_name: '',
    driver_phone: '',
    origin: '',
    destination: '',
    waypoints: '',
    seats_available: 3,
    total_seats: 4,
    departure_time: '',
    price_per_km: 7.0,
    vehicle_type: 'Sedan',
    vehicle_model: '',
    vehicle_number: '',
    ac_available: true,
    luggage_allowed: 'Medium',
    pet_friendly: false,
    notes: '',
  });

  const [cities, setCities] = useState([]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCities()
      .then((data) => setCities(data.cities || []))
      .catch(() => {});

    // Set default departure to 3 hours from now
    const now = new Date();
    const future = new Date(now.getTime() + 3 * 3600 * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    const defaultTime = `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}T${pad(future.getHours())}:${pad(future.getMinutes())}`;

    setForm((prev) => ({ ...prev, departure_time: defaultTime }));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const payload = {
        ...form,
        seats_available: parseInt(form.seats_available, 10),
        total_seats: parseInt(form.total_seats, 10),
        price_per_km: parseFloat(form.price_per_km),
      };

      const res = await postOffer(payload);
      if (res.error) {
        setMessage({ type: 'error', text: res.error });
      } else {
        setMessage({
          type: 'success',
          text: `✅ Ride posted successfully! Your ride is now live for passengers to book.`,
        });
        setForm((prev) => ({
          ...prev,
          origin: '',
          destination: '',
          waypoints: '',
          notes: '',
        }));
        if (onSuccess) onSuccess();
      }
    } catch {
      setMessage({ type: 'error', text: '⚠️ Network error – is the backend running?' });
    }
    setLoading(false);
  };

  return (
    <div className="form-card">
      <div className="form-card-header driver">
        <i className="bi bi-car-front-fill" style={{ fontSize: '1.3rem' }} />
        Post Your Empty Seats &amp; Share Ride
      </div>
      <div className="form-card-body">
        {message && (
          <div className={`${message.type === 'success' ? 'alert-custom-success' : 'alert-custom-error'} mb-3`}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          {/* Driver details row */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Driver Name</label>
              <input
                type="text"
                className="form-control"
                name="driver_name"
                value={form.driver_name}
                onChange={handleChange}
                placeholder="e.g. Rahul Kumar"
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Contact Phone</label>
              <input
                type="tel"
                className="form-control"
                name="driver_phone"
                value={form.driver_phone}
                onChange={handleChange}
                placeholder="e.g. 9811223344"
                required
              />
            </div>
          </div>

          {/* Route details row */}
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <label className="form-label">Origin City</label>
              <input
                type="text"
                list="driver-cities"
                className="form-control"
                name="origin"
                value={form.origin}
                onChange={handleChange}
                placeholder="e.g. Delhi"
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Destination City</label>
              <input
                type="text"
                list="driver-cities"
                className="form-control"
                name="destination"
                value={form.destination}
                onChange={handleChange}
                placeholder="e.g. Agra"
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Intermediate Stops (Optional)</label>
              <input
                type="text"
                className="form-control"
                name="waypoints"
                value={form.waypoints}
                onChange={handleChange}
                placeholder="e.g. Mathura, Faridabad"
              />
            </div>
          </div>

          <datalist id="driver-cities">
            {cities.map((c, i) => (
              <option key={i} value={c} />
            ))}
          </datalist>

          {/* Vehicle details row */}
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <label className="form-label">Vehicle Type</label>
              <select
                className="form-select"
                name="vehicle_type"
                value={form.vehicle_type}
                onChange={handleChange}
              >
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="EV">Electric (EV)</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Van">Van / MUV</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Vehicle Model</label>
              <input
                type="text"
                className="form-control"
                name="vehicle_model"
                value={form.vehicle_model}
                onChange={handleChange}
                placeholder="e.g. Honda City / Nexon EV"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Vehicle Number</label>
              <input
                type="text"
                className="form-control"
                name="vehicle_number"
                value={form.vehicle_number}
                onChange={handleChange}
                placeholder="e.g. DL01-CA-1234"
              />
            </div>
          </div>

          {/* Ride Specs */}
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <label className="form-label">Empty Seats Offered</label>
              <input
                type="number"
                className="form-control"
                name="seats_available"
                value={form.seats_available}
                onChange={handleChange}
                min="1"
                max="10"
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Departure Date &amp; Time</label>
              <input
                type="datetime-local"
                className="form-control"
                name="departure_time"
                value={form.departure_time}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Price / KM / Seat (₹)</label>
              <input
                type="number"
                className="form-control"
                name="price_per_km"
                value={form.price_per_km}
                onChange={handleChange}
                min="1"
                step="0.5"
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Luggage Allowance</label>
              <select
                className="form-select"
                name="luggage_allowed"
                value={form.luggage_allowed}
                onChange={handleChange}
              >
                <option value="Small">Small Bag Only</option>
                <option value="Medium">Medium Suitcase</option>
                <option value="Large">Large Luggage</option>
              </select>
            </div>
          </div>

          {/* Amenities & Notes */}
          <div className="row g-3 mb-3 align-items-center">
            <div className="col-md-6 d-flex gap-4">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="acCheck"
                  name="ac_available"
                  checked={form.ac_available}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="acCheck">Air Conditioned (AC)</label>
              </div>

              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="petCheck"
                  name="pet_friendly"
                  checked={form.pet_friendly}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="petCheck">Pet Friendly</label>
              </div>
            </div>

            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Pickup notes (e.g. Pickup near Metro Gate 2, no smoking)"
              />
            </div>
          </div>

          <div className="text-center mt-4">
            <button type="submit" className="btn-gradient green" disabled={loading}>
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2" />Publishing Ride…</>
              ) : (
                <><i className="bi bi-send-fill me-2" />Publish Ride &amp; Open Seats</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DriverOfferForm;
