import React, { useState } from 'react';
import { bookSeat } from '../api';

function BookingModal({ ride, onClose, onBookingSuccess }) {
  const [seats, setSeats] = useState(ride.seats_matched || 1);
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  if (!ride) return null;

  const maxSeats = ride.seats_available || 4;
  const distanceKm = ride.distance_km || 200;
  const pricePerKm = ride.price_per_km || 7.0;
  const calculatedFare = Math.round(distanceKm * pricePerKm * seats);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!passengerName.trim() || !passengerPhone.trim()) {
      setError('Please provide your name and contact phone number.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      offer_id: ride.offer_id || ride.id,
      driver_name: ride.driver_name || ride.driver_id,
      driver_phone: ride.driver_phone || '9876543210',
      passenger_name: passengerName.trim(),
      passenger_phone: passengerPhone.trim(),
      passenger_email: passengerEmail.trim(),
      origin: ride.origin || (ride.route ? ride.route.split('->')[0] : 'Origin'),
      destination: ride.destination || (ride.route ? ride.route.split('->').slice(-1)[0] : 'Destination'),
      seats_booked: parseInt(seats, 10),
      distance_km: distanceKm,
      total_fare: calculatedFare,
      notes: notes.trim(),
    };

    try {
      const res = await bookSeat(payload);
      if (res.ok && res.data.booking) {
        setConfirmedBooking(res.data.booking);
        if (onBookingSuccess) onBookingSuccess(res.data.booking);
      } else {
        setError(res.data?.error || 'Failed to complete booking. Please try again.');
      }
    } catch {
      setError('Network error occurred while reserving seat.');
    }
    setLoading(false);
  };

  return (
    <div className="modal-backdrop-custom" onClick={onClose}>
      <div className="modal-card-custom" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-custom">
          <div>
            <h4 style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              {confirmedBooking ? '🎉 Booking Confirmed!' : '🎟️ Reserve Your Seat'}
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
              {confirmedBooking ? 'Your ride ticket has been generated' : 'Review trip details and confirm your ride'}
            </p>
          </div>
          <button className="btn-close-custom" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body-custom">
          {error && <div className="alert-custom-error mb-3">{error}</div>}

          {confirmedBooking ? (
            <div className="booking-ticket-view">
              <div className="ticket-badge-header">
                <div>
                  <span className="ticket-label">BOOKING REFERENCE</span>
                  <div className="ticket-code">{confirmedBooking.booking_code}</div>
                </div>
                <div className="ticket-status-pill">CONFIRMED</div>
              </div>

              <div className="ticket-grid">
                <div className="ticket-cell">
                  <span className="cell-label">ROUTE</span>
                  <span className="cell-val">📍 {confirmedBooking.origin} &rarr; {confirmedBooking.destination}</span>
                </div>
                <div className="ticket-cell">
                  <span className="cell-label">DRIVER</span>
                  <span className="cell-val">🚗 {confirmedBooking.driver_name}</span>
                </div>
                <div className="ticket-cell">
                  <span className="cell-label">DRIVER CONTACT</span>
                  <span className="cell-val">📞 {confirmedBooking.driver_phone || '9876543210'}</span>
                </div>
                <div className="ticket-cell">
                  <span className="cell-label">DEPARTURE</span>
                  <span className="cell-val">⏰ {new Date(confirmedBooking.departure_time).toLocaleString()}</span>
                </div>
                <div className="ticket-cell">
                  <span className="cell-label">SEATS BOOKED</span>
                  <span className="cell-val">💺 {confirmedBooking.seats_booked} Seat(s)</span>
                </div>
                <div className="ticket-cell">
                  <span className="cell-label">TOTAL FARE</span>
                  <span className="cell-val fare-green">₹{confirmedBooking.total_fare}</span>
                </div>
              </div>

              <div className="ticket-footer-msg">
                <i className="bi bi-shield-check me-2" style={{ color: '#43e97b' }} />
                Driver has been notified. Please be at your pickup point 10 minutes before departure.
              </div>

              <div className="text-center mt-4">
                <button className="btn-gradient green w-100" onClick={onClose}>
                  Done &amp; View My Bookings
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleBooking}>
              {/* Trip summary banner */}
              <div className="ride-summary-banner mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="badge-route">
                    📍 {ride.origin || ride.route?.split('->')[0]} &rarr; {ride.destination || ride.route?.split('->').slice(-1)[0]}
                  </span>
                  <span className="badge-vehicle">
                    🚗 {ride.vehicle_type || 'Sedan'} {ride.vehicle_model ? `(${ride.vehicle_model})` : ''}
                  </span>
                </div>
                <div className="d-flex justify-content-between text-muted-custom" style={{ fontSize: '0.85rem' }}>
                  <span>Driver: <strong style={{ color: '#fff' }}>{ride.driver_name || ride.driver_id}</strong></span>
                  <span>Departure: <strong style={{ color: '#fff' }}>{new Date(ride.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                  <span>Rate: <strong style={{ color: '#43e97b' }}>₹{ride.price_per_km}/km</strong></span>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Passenger Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Your Full Name"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="e.g. 9876543210"
                    value={passengerPhone}
                    onChange={(e) => setPassengerPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Email (Optional)</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="For ticket confirmation"
                    value={passengerEmail}
                    onChange={(e) => setPassengerEmail(e.target.value)}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Number of Seats (Max {maxSeats})</label>
                  <div className="d-flex align-items-center gap-2">
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      max={maxSeats}
                      value={seats}
                      onChange={(e) => setSeats(Math.max(1, Math.min(maxSeats, parseInt(e.target.value, 10) || 1)))}
                      required
                    />
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                      {maxSeats} available
                    </span>
                  </div>
                </div>

                <div className="col-12">
                  <label className="form-label">Pickup Landmark / Notes</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Near Metro Gate 2, 1 medium bag"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Price Calculation Card */}
              <div className="fare-calculation-box mt-3 mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                    Est. Distance &times; Rate &times; Seats
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                    {distanceKm} km &times; ₹{pricePerKm} &times; {seats} seat(s)
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ fontWeight: 700 }}>Total Payable Fare</span>
                  <span className="total-fare-amount">₹{calculatedFare}</span>
                </div>
              </div>

              <div className="d-flex gap-2">
                <button type="button" className="btn-cancel-custom" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-gradient green flex-grow-1" disabled={loading}>
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm me-2" />Reserving…</>
                  ) : (
                    <><i className="bi bi-check-circle-fill me-2" />Confirm &amp; Reserve (₹{calculatedFare})</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookingModal;
