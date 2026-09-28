import React, { useState, useEffect } from 'react';
import { calculateFare, getCities } from '../api';

function FareCalculator({ onSelectRouteForMatch }) {
  const [origin, setOrigin] = useState('Delhi');
  const [destination, setDestination] = useState('Agra');
  const [pricePerKm, setPricePerKm] = useState(7.0);
  const [seats, setSeats] = useState(1);
  const [cities, setCities] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCities()
      .then((data) => setCities(data.cities || []))
      .catch(() => {});
    // Initial calculation
    handleCalculate();
  }, []);

  const handleCalculate = async (e) => {
    if (e) e.preventDefault();
    if (!origin.trim() || !destination.trim()) {
      setError('Please enter both origin and destination cities.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await calculateFare({
        origin: origin.trim(),
        destination: destination.trim(),
        price_per_km: parseFloat(pricePerKm),
      });
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError('Could not calculate fare. Please ensure backend is running.');
    }
    setLoading(false);
  };

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  return (
    <div className="fare-calc-wrapper">
      <div className="form-card">
        <div className="form-card-header" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
          <i className="bi bi-calculator-fill" style={{ fontSize: '1.3rem' }} />
          Smart Route, Fare &amp; Eco-Savings Estimator
        </div>

        <div className="form-card-body">
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Calculate accurate highway distances, estimated driving time, fuel savings, and fair cost-sharing per passenger.
          </p>

          <form onSubmit={handleCalculate}>
            <div className="row g-3 align-items-center">
              <div className="col-md-5">
                <label className="form-label">Origin City</label>
                <input
                  type="text"
                  list="cities-list"
                  className="form-control"
                  placeholder="e.g. Delhi"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  required
                />
              </div>

              <div className="col-md-2 text-center pt-md-4">
                <button
                  type="button"
                  className="btn-swap-cities"
                  onClick={handleSwap}
                  title="Swap Origin & Destination"
                >
                  <i className="bi bi-arrow-left-right" />
                </button>
              </div>

              <div className="col-md-5">
                <label className="form-label">Destination City</label>
                <input
                  type="text"
                  list="cities-list"
                  className="form-control"
                  placeholder="e.g. Agra"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                />
              </div>

              <datalist id="cities-list">
                {cities.map((c, i) => (
                  <option key={i} value={c} />
                ))}
              </datalist>

              <div className="col-md-6">
                <label className="form-label">Price per KM (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  className="form-control"
                  value={pricePerKm}
                  onChange={(e) => setPricePerKm(e.target.value)}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Passenger Seats</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  className="form-control"
                  value={seats}
                  onChange={(e) => setSeats(parseInt(e.target.value, 10) || 1)}
                />
              </div>
            </div>

            <div className="text-center mt-4">
              <button type="submit" className="btn-gradient green" disabled={loading}>
                {loading ? 'Calculating…' : <><i className="bi bi-speedometer2 me-2" />Calculate Route &amp; Savings</>}
              </button>
            </div>
          </form>

          {error && <div className="alert-custom-error mt-3">{error}</div>}

          {result && (
            <div className="calc-results-section mt-4">
              <h5 style={{ fontWeight: 700, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📍 {result.origin}</span>
                <i className="bi bi-arrow-right" style={{ color: '#43e97b' }} />
                <span>{result.destination}</span>
              </h5>

              <div className="row g-3">
                <div className="col-6 col-md-3">
                  <div className="metric-box">
                    <div className="metric-icon"><i className="bi bi-signpost-2" /></div>
                    <div className="metric-val">{result.distance_km} km</div>
                    <div className="metric-lbl">Highway Distance</div>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="metric-box">
                    <div className="metric-icon"><i className="bi bi-clock-history" /></div>
                    <div className="metric-val">
                      {Math.floor(result.estimated_duration_mins / 60)}h {result.estimated_duration_mins % 60}m
                    </div>
                    <div className="metric-lbl">Est. Travel Time</div>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="metric-box highlight-fare">
                    <div className="metric-icon"><i className="bi bi-cash-stack" /></div>
                    <div className="metric-val">₹{Math.round(result.estimated_fare_per_seat * seats)}</div>
                    <div className="metric-lbl">{seats} Seat(s) Total Fare</div>
                  </div>
                </div>

                <div className="col-6 col-md-3">
                  <div className="metric-box highlight-eco">
                    <div className="metric-icon"><i className="bi bi-tree-fill" /></div>
                    <div className="metric-val">{result.co2_saved_kg * seats} kg</div>
                    <div className="metric-lbl">CO2 Emissions Saved</div>
                  </div>
                </div>
              </div>

              {onSelectRouteForMatch && (
                <div className="text-center mt-4">
                  <button
                    className="btn-gradient blue"
                    onClick={() => onSelectRouteForMatch({ origin: result.origin, destination: result.destination })}
                  >
                    <i className="bi bi-search me-2" />
                    Find Rides For This Route ({result.origin} &rarr; {result.destination})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FareCalculator;
