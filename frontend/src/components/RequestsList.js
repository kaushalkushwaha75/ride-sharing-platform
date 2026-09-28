import React, { useState, useEffect } from 'react';
import { listRequests, deleteRequest } from '../api';

function RequestsList({ refreshKey, onRequestAction }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await listRequests();
      setRequests(data || []);
    } catch {
      setError('Could not load passenger requests.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [refreshKey]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this passenger request?')) return;
    try {
      await deleteRequest(id);
      fetchRequests();
    } catch {
      alert('Error deleting request.');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-info" role="status" />
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '1rem' }}>Loading passenger requests…</p>
      </div>
    );
  }

  return (
    <div className="requests-container">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 style={{ fontWeight: 700, margin: 0, color: '#fff' }}>
            📋 Open Passenger Ride Requests ({requests.length})
          </h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
            Commuters actively looking for empty seats along these corridors
          </p>
        </div>
        <button className="btn-refresh-sm" onClick={fetchRequests}>
          <i className="bi bi-arrow-clockwise me-1" /> Refresh
        </button>
      </div>

      {error && <div className="alert-custom-error mb-3">{error}</div>}

      {requests.length === 0 ? (
        <div className="no-offers-box">
          <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.3 }}>🙋</div>
          <h5 style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>No open passenger requests</h5>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            Passengers can post their travel needs from the <strong>Request Ride</strong> tab.
          </p>
        </div>
      ) : (
        <div className="row g-4">
          {requests.map((r) => (
            <div className="col-md-6 col-lg-4" key={r.id}>
              <div className="passenger-req-card">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="route-badge-sm">
                    📍 {r.origin || 'Any'} &rarr; {r.destination}
                  </span>
                  <button
                    className="btn-delete-tiny"
                    onClick={() => handleDelete(r.id)}
                    title="Delete Request"
                  >
                    &times;
                  </button>
                </div>

                <div className="detail-row">
                  <i className="bi bi-person-fill" />
                  <span><strong>{r.passenger_name}</strong> {r.passenger_phone ? `(📞 ${r.passenger_phone})` : ''}</span>
                </div>

                <div className="detail-row">
                  <i className="bi bi-people-fill" />
                  <span>{r.seats_needed} seat(s) needed</span>
                </div>

                <div className="detail-row">
                  <i className="bi bi-clock-fill" />
                  <span>
                    {new Date(r.earliest_departure).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                    {new Date(r.earliest_departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &ndash;{' '}
                    {new Date(r.latest_departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {r.max_price_per_km && (
                  <div className="detail-row">
                    <i className="bi bi-currency-rupee" />
                    <span>Max ₹{r.max_price_per_km}/km</span>
                  </div>
                )}

                {onRequestAction && (
                  <div className="mt-3">
                    <button
                      className="btn-gradient green w-100"
                      style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
                      onClick={() => onRequestAction(r)}
                    >
                      <i className="bi bi-car-front-fill me-1" /> Offer Ride to {r.passenger_name.split(' ')[0]}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RequestsList;
