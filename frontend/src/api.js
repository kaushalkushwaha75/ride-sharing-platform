const API_BASE = process.env.REACT_APP_API_URL || '/api';

export async function postOffer(data) {
  const res = await fetch(`${API_BASE}/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteOffer(id) {
  const res = await fetch(`${API_BASE}/offers/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function listOffers(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${API_BASE}/offers?${query}` : `${API_BASE}/offers`;
  const res = await fetch(url);
  return res.json();
}

export async function postRequest(data) {
  const res = await fetch(`${API_BASE}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function listRequests() {
  const res = await fetch(`${API_BASE}/requests`);
  return res.json();
}

export async function deleteRequest(id) {
  const res = await fetch(`${API_BASE}/requests/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function findMatch(data) {
  const res = await fetch(`${API_BASE}/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  return { ok: res.ok, data: json };
}

export async function bookSeat(data) {
  const res = await fetch(`${API_BASE}/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  return { ok: res.ok, data: json };
}

export async function listBookings() {
  const res = await fetch(`${API_BASE}/bookings`);
  return res.json();
}

export async function cancelBooking(id) {
  const res = await fetch(`${API_BASE}/bookings/${id}/cancel`, {
    method: 'POST',
  });
  const json = await res.json();
  return { ok: res.ok, data: json };
}

export async function calculateFare(data) {
  const res = await fetch(`${API_BASE}/calculate-fare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getCities() {
  const res = await fetch(`${API_BASE}/cities`);
  return res.json();
}

export async function getStats() {
  const res = await fetch(`${API_BASE}/stats`);
  return res.json();
}
