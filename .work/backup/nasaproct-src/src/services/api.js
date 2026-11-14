// Frontend API Client connecting to Express Backend on http://localhost:5000
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

async function request(path, { method = 'GET', body, signal } = {}) {
  const options = {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error('Backend offline. Ensure backend is running at http://localhost:5000');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export function getDashboard(astronautId = 1, options = {}) {
  return request(`/dashboard/${encodeURIComponent(astronautId)}`, options);
}

export function postChat(message, astronautId = 1) {
  return request('/chat', {
    method: 'POST',
    body: { astronaut_id: astronautId, message },
  });
}

export function syncSpaceWeather() {
  return request('/space-weather/sync');
}

export function resolveAlert(alertId) {
  return request(`/alerts/${encodeURIComponent(alertId)}/resolve`, {
    method: 'PATCH',
  });
}

export function createReading({
  radiation_rate_usv_hr,
  cumulative_dose_msv,
  radiation_type = 'GCR',
  heart_rate_bpm = 75,
  data_source = 'WEARABLE',
}, astronautId = 1) {
  return request('/readings', {
    method: 'POST',
    body: {
      astronaut_id: astronautId,
      radiation_rate_usv_hr,
      cumulative_dose_msv,
      radiation_type,
      heart_rate_bpm,
      data_source,
    },
  });
}
