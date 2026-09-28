import React, { useState, useEffect } from 'react';
import { listBookings, cancelBooking } from '../api';

function BookingsList({ refreshKey, onBookingsCountChange }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await listBookings();
      setBookings(data || []);
      if (onBookingsCountChange) {
        const activeCount = (data || []).filter((b) => b.status === 'confirmed').length;
        onBookingsCountChange(activeCount);
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Could not load your bookings. Is the server running?' });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, [refreshKey]);

  const handleCancel = async (bookingId, bookingCode) => {
    if (!window.confirm(`Are you sure you want to cancel booking ${bookingCode}? Your seats will be released.`)) {
      return;
    }

    setCancellingId(bookingId);
    setFeedbackMessage(null);
    try {
      const res = await cancelBooking(bookingId);
      if (res.ok) {
        setFeedbackMessage({ type: 'success', text: `Booking ${bookingCode} has been cancelled.` });
        fetchBookings();
      } else {
        setFeedbackMessage({ type: 'error', text: res.data?.error || 'Could not cancel booking.' });
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Network error occurred.' });
    }
    setCancellingId(null);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '1rem' }}>Loading your bookings…</p>
      </div>
    );
  }

  const activeBookings = bookings.filter((b) => b.status === 'confirmed');
  const pastBookings = bookings.filter((b) => b.status !== 'confirmed');

  return (
    <div className="bookings-container">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 style={{ fontWeight: 700, margin: 0, color: '#fff' }}>
            🎟️ My Booked Trips ({activeBookings.length} Active)
          </h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
            View your boarding passes, driver details, and manage your reservations
          </p>
        </div>
        <button className="btn-refresh-sm" onClick={fetchBookings}>
          <i className="bi bi-arrow-clockwise me-1" /> Refresh
        </button>
      </div>

      {feedbackMessage && (
        <div className={`alert-custom-${feedbackMessage.type === 'success' ? 'success' : 'error'} mb-3`}>
          {feedbackMessage.text}
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="no-offers-box">
          <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.3 }}>🎟️</div>
          <h5 style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>No rides booked yet</h5>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', maxWidth: 420, margin: '0 auto' }}>
            Head over to <strong>Browse Rides</strong> or <strong>Find Match</strong> to reserve empty vehicle seats and start saving!
          </p>
        </div>
      ) : (
        <div className="row g-4">
          {bookings.map((b) => {
            const isCancelled = b.status === 'cancelled';
            const depTime = new Date(b.departure_time);

            return (
              <div className="col-lg-6" key={b.id || b.booking_code}>
                <div className={`ticket-card ${isCancelled ? 'ticket-cancelled' : ''}`}>
                  {/* Top Header */}
                  <div className="ticket-card-top">
                    <div>
                      <span className="ticket-ref-label">BOARDING PASS</span>
                      <div className="ticket-ref-num">{b.booking_code}</div>
                    </div>
                    <span className={`status-badge-pill ${isCancelled ? 'cancelled' : 'confirmed'}`}>
                      {isCancelled ? 'CANCELLED' : 'CONFIRMED'}
                    </span>
                  </div>

                  {/* Route & Driver */}
                  <div className="ticket-route-row">
                    <div className="ticket-loc">
                      <span className="loc-label">FROM</span>
                      <span className="loc-city">📍 {b.origin}</span>
                    </div>
                    <div className="ticket-arrow">
                      <i className="bi bi-arrow-right" />
                      <span className="dist-chip">{b.distance_km} km</span>
                    </div>
                    <div className="ticket-loc text-end">
                      <span className="loc-label">TO</span>
                      <span className="loc-city">🏁 {b.destination}</span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="ticket-info-grid">
                    <div className="info-item">
                      <span className="info-lbl"><i className="bi bi-person-fill me-1" /> Passenger</span>
                      <span className="info-data">{b.passenger_name} ({b.passenger_phone})</span>
                    </div>
                    <div className="info-item">
                      <span className="info-lbl"><i className="bi bi-car-front-fill me-1" /> Driver</span>
                      <span className="info-data">{b.driver_name} {b.driver_phone ? `(📞 ${b.driver_phone})` : ''}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-lbl"><i className="bi bi-clock-fill me-1" /> Departure</span>
                      <span className="info-data">{depTime.toLocaleString()}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-lbl"><i className="bi bi-people-fill me-1" /> Seats Reserved</span>
                      <span className="info-data">💺 {b.seats_booked} Seat(s)</span>
                    </div>
                  </div>

                  {/* Bottom Strip */}
                  <div className="ticket-card-bottom">
                    <div className="ticket-fare-box">
                      <span className="fare-lbl">Total Paid / Payable</span>
                      <span className="fare-val">₹{b.total_fare}</span>
                    </div>

                    {!isCancelled && (
                      <button
                        className="btn-cancel-ticket"
                        onClick={() => handleCancel(b.id, b.booking_code)}
                        disabled={cancellingId === b.id}
                      >
                        {cancellingId === b.id ? 'Cancelling…' : 'Cancel Ride'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default BookingsList;
