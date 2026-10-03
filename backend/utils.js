// Distance between two GPS points in km
export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

// Distance the bus still has to travel (along the route) to reach the stop with seq = targetSeq.
// If the bus already passed that stop, it goes to the end of the route and comes back from the start.
export function remainingKm(bus, stops, targetSeq) {
  const at = (q) => stops.find((s) => s.seq === q);
  const leg = (a, b) => haversineKm(a.lat, a.lng, b.lat, b.lng);
  const next = at(bus.next_seq);
  if (!next) return 0;
  let km = haversineKm(bus.lat, bus.lng, next.lat, next.lng);
  let i = bus.next_seq;
  if (bus.next_seq > targetSeq) {
    for (; i < stops.length; i++) km += leg(at(i), at(i + 1));
    i = 1;
  }
  for (; i < targetSeq; i++) km += leg(at(i), at(i + 1));
  return km;
}

// ETA in minutes (uses at least 20 km/h so a slow bus never gives an infinite ETA)
export function etaMinutes(km, speed) {
  return Math.max(1, Math.round((km / Math.max(speed || 0, 20)) * 60));
}

// Crowd level from how full the bus is
export function crowdLevel(occupied, total) {
  const ratio = occupied / total;
  if (ratio < 0.5) return 'low';
  if (ratio < 0.85) return 'medium';
  return 'high';
}

// ---------- timetable (every bus runs a fixed schedule; delay = how far behind it is) ----------
const MIN = 60000;
export const LAYOVER = 3; // minutes a bus waits at the last stop before starting its next trip
const mod = (a, n) => ((a % n) + n) % n;

export const periodOf = (stops) => stops[stops.length - 1].offset_min + LAYOVER;

// Minutes behind schedule right now (negative = slightly early). It changes slowly and smoothly with the clock.
// The bus table's delay_min is the typical delay of that bus.
export function delayAt(bus, nowMs) {
  const d = bus.delay_min + 1.4 * Math.sin((2 * Math.PI * (nowMs / MIN)) / 40 + bus.id * 1.7);
  return Math.min(12, Math.max(-1, d));
}

// Where the bus should be on its timetable (minutes since the start of its trip) and where it really is
const schedProgress = (bus, P, nowMs) => mod(nowMs / MIN - ((bus.id * 7) % P), P);
export const progressOf = (bus, P, nowMs) => mod(schedProgress(bus, P, nowMs) - delayAt(bus, nowMs), P);

// Position on the map for a given trip progress (straight line between stops)
export function positionAt(stops, p) {
  const last = stops[stops.length - 1];
  if (p >= last.offset_min) {
    return { lat: last.lat, lng: last.lng, next_seq: 1, next_stop: stops[0].name, layover: true };
  }
  let i = 0;
  while (i < stops.length - 2 && stops[i + 1].offset_min <= p) i++;
  const a = stops[i], b = stops[i + 1];
  const f = (p - a.offset_min) / (b.offset_min - a.offset_min);
  return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f, next_seq: b.seq, next_stop: b.name, layover: false };
}

// Minutes until the bus reaches the stop with this seq (next round if it already passed it)
export function minutesTo(p, stops, seq) {
  const o = stops.find((s) => s.seq === seq).offset_min;
  return p <= o ? o - p : periodOf(stops) - p + o;
}