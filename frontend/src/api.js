export async function api(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const getStops = () => api('/api/stops');
export const getTrips = (from, to) => api(`/api/trips?from=${from}&to=${to}`);
export const getBuses = () => api('/api/buses');
export const sendContact = (data) => api('/api/contact', { method: 'POST', body: data });
