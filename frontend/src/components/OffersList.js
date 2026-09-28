import React, { useEffect, useState } from 'react';
import { listOffers, deleteOffer } from '../api';
import BookingModal from './BookingModal';

function OffersList({ refreshKey }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [originFilter, setOriginFilter] = useState('');
  const [destFilter, setDestFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('time');

  // Booking Modal State
  const [selectedRideForBooking, setSelectedRideForBooking] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const data = await listOffers({
        origin: originFilter,
        destination: destFilter,
      });
      setOffers(data || []);
      setError(null);
    } catch {
      setError('Could not load rides. Please ensure backend is running.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOffers();
  }, [refreshKey, originFilter, destFilter]);

  const handleDeleteOffer = async (offerId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this ride offer?')) return;
    try {
      await deleteOffer(offerId);
      setToastMessage('Ride offer removed.');
      fetchOffers();
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      alert('Error deleting offer.');
    }
  };

  const filteredOffers = offers
    .filter((o) => {
      if (vehicleFilter !== 'ALL' && (o.vehicle_type || '').toUpperCase() !== vehicleFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price') return a.price_per_km - b.price_per_km;
      if (sortBy === 'seats') return b.seats_available - a.seats_available;
      return new Date(a.departure_time) - new Date(b.departure_time);
    });

  return (
    <div className="offers-section-wrapper">
      {/* Toast Alert */}
      {toastMessage && <div className="alert-custom-success mb-3">{toastMessage}</div>}

      {/* Filter and Search Bar */}
      <div className="filter-search-bar mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-md-3">
            <div className="input-icon-wrap">
              <i className="bi bi-geo-alt-fill" />
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="From (e.g. Delhi)"
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-3">
            <div className="input-icon-wrap">
              <i className="bi bi-pin-map-fill" />
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="To (e.g. Agra)"
                value={destFilter}
                onChange={(e) => setDestFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-3">
            <select
              className="form-select form-select-sm"
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
            >
              <option value="ALL">All Vehicle Types</option>
              <option value="SEDAN">Sedan</option>
              <option value="SUV">SUV</option>
              <option value="EV">Electric (EV)</option>
              <option value="HATCHBACK">Hatchback</option>
            </select>
          </div>

          <div className="col-md-3">
            <select
              className="form-select form-select-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="time">Sort: Earliest Departure</option>
              <option value="price">Sort: Lowest Price/KM</option>
              <option value="seats">Sort: Most Seats Available</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '1rem' }}>Searching available rides…</p>
        </div>
      ) : error ? (
        <div className="alert-custom-error text-center">{error}</div>
      ) : filteredOffers.length === 0 ? (
        <div className="no-offers-box">
          <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.25 }}>🚗</div>
          <h5 style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>No rides matching your search</h5>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            Try clearing filters or click <strong>Post Ride</strong> to add a new ride for this route.
          </p>
        </div>
      ) : (
        <div className="offers-grid">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
              Showing <strong style={{ color: '#43e97b' }}>{filteredOffers.length}</strong> active ride{filteredOffers.length !== 1 ? 's' : ''}
            </span>
            <button className="btn-refresh-sm" onClick={fetchOffers}>
              <i className="bi bi-arrow-clockwise me-1" /> Refresh
            </button>
          </div>

          <div className="row g-4">
            {filteredOffers.map((offer) => {
              const depDate = new Date(offer.departure_time);
              const isUrgent = depDate - new Date() < 3600 * 1000 * 4 && depDate - new Date() > 0;
              const isEV = (offer.vehicle_type || '').toLowerCase() === 'ev';

              return (
                <div className="col-md-6 col-lg-4" key={offer.id}>
                  <div className="offer-card-enhanced">
                    {/* Header: Route & Delete */}
                    <div className="card-top-bar">
                      <div className="route-main">
                        📍 {offer.origin} &rarr; {offer.destination}
                      </div>
                      <button
                        className="btn-delete-tiny"
                        onClick={(e) => handleDeleteOffer(offer.id, e)}
                        title="Delete this ride"
                      >
                        &times;
                      </button>
                    </div>

                    {/* Waypoints if any */}
                    {offer.waypoints && (
                      <div className="waypoints-tag">
                        <i className="bi bi-geo-alt me-1" /> Via: {offer.waypoints}
                      </div>
                    )}

                    {/* Vehicle & Amenities */}
                    <div className="vehicle-info-bar">
                      <span className={`vehicle-chip ${isEV ? 'ev-chip' : ''}`}>
                        {isEV ? '⚡' : '🚗'} {offer.vehicle_type || 'Car'} • {offer.vehicle_model || 'Standard'}
                      </span>
                      {offer.ac_available && <span className="amenity-chip">❄️ AC</span>}
                      {offer.luggage_allowed && <span className="amenity-chip">🧳 {offer.luggage_allowed}</span>}
                      {isUrgent && <span className="urgent-chip">🔥 Leaving Soon</span>}
                    </div>

                    {/* Driver & Details */}
                    <div className="card-details-section">
                      <div className="detail-row">
                        <i className="bi bi-person-circle" />
                        <span>Driver: <strong style={{ color: '#fff' }}>{offer.driver_name}</strong></span>
                      </div>
                      <div className="detail-row">
                        <i className="bi bi-clock-fill" />
                        <span>{depDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} at {depDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="detail-row">
                        <i className="bi bi-people-fill" />
                        <span>
                          <strong style={{ color: offer.seats_available <= 1 ? '#ff7675' : '#43e97b' }}>
                            {offer.seats_available}
                          </strong>{' '}
                          seat{offer.seats_available !== 1 ? 's' : ''} left (out of {offer.total_seats || 4})
                        </span>
                      </div>
                    </div>

                    {/* Notes if provided */}
                    {offer.notes && (
                      <div className="driver-notes-box">
                        <i className="bi bi-chat-quote me-1" />"{offer.notes}"
                      </div>
                    )}

                    {/* Card Footer: Price + Book Button */}
                    <div className="card-footer-strip">
                      <div className="price-tag-wrap">
                        <span className="price-currency">₹{offer.price_per_km}</span>
                        <span className="price-unit">/ km / seat</span>
                      </div>

                      <button
                        className="btn-book-now"
                        onClick={() => setSelectedRideForBooking(offer)}
                      >
                        <i className="bi bi-ticket-perforated-fill me-1" /> Book Seat
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {selectedRideForBooking && (
        <BookingModal
          ride={selectedRideForBooking}
          onClose={() => {
            setSelectedRideForBooking(null);
            fetchOffers();
          }}
          onBookingSuccess={() => {
            fetchOffers();
          }}
        />
      )}
    </div>
  );
}

export default OffersList;
