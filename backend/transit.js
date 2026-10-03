import { pool } from './db.js';
import { crowdLevel, periodOf, delayAt, progressOf, positionAt, minutesTo } from './utils.js';

async function load() {
  const [rows] = await pool.query(
    `SELECT rs.route_id, rs.seq, rs.offset_min, s.id, s.name, s.lat, s.lng
     FROM route_stops rs JOIN stops s ON s.id = rs.stop_id ORDER BY rs.route_id, rs.seq`);
  const [routes] = await pool.query('SELECT * FROM routes');
  const [buses] = await pool.query('SELECT * FROM buses');
  const stopsOf = {};
  for (const r of rows) {
    (stopsOf[r.route_id] = stopsOf[r.route_id] || []).push(
      { id: r.id, name: r.name, lat: r.lat, lng: r.lng, seq: r.seq, offset_min: r.offset_min });
  }
  return { routes, buses, stopsOf, info: Object.fromEntries(routes.map((r) => [r.id, r])) };
}

const FARE_BASE = 10, FARE_PER_STOP = 4; // rupees: base fare + per stop travelled

// a clock time (whole minute) that is `min` minutes from now
const when = (now, min) => new Date(Math.round((now + min * 60000) / 60000) * 60000).toISOString();

// Everything we know about one bus at this moment
function view(net, b, now) {
  const stops = net.stopsOf[b.route_id];
  const delay = delayAt(b, now);
  const p = progressOf(b, periodOf(stops), now);
  const at = (seq) => {
    const eta = minutesTo(p, stops, seq);
    return { eta, expected_at: when(now, eta), scheduled_at: when(now, eta - delay) };
  };
  const timetable = stops.map((s) => ({
    seq: s.seq, name: s.name, passed: s.offset_min < p,
    scheduled_at: when(now, s.offset_min - p - delay), expected_at: when(now, s.offset_min - p),
  }));
  return { b, stops, route: net.info[b.route_id], delay, p, pos: positionAt(stops, p), at, timetable };
}

function pub(v, extra = {}) {
  const { b, route } = v;
  return {
    bus_id: b.id, plate: b.plate, route_number: route.number, route_name: route.name,
    lat: v.pos.lat, lng: v.pos.lng, next_stop: v.pos.next_stop, at_terminal: v.pos.layover,
    delay_min: Math.round(v.delay), total_seats: b.total_seats,
    seats_available: Math.max(0, b.total_seats - b.occupied), crowd: crowdLevel(b.occupied, b.total_seats),
    stops: v.stops, timetable: v.timetable, ...extra,
  };
}

// Buses that run from `from` to `to` without changing
export async function tripsBetween(from, to) {
  const net = await load();
  const now = Date.now();
  const f = Number(from), t = Number(to);
  const out = [];
  for (const r of net.routes) {
    const stops = net.stopsOf[r.id];
    const a = stops.find((s) => s.id === f), z = stops.find((s) => s.id === t);
    if (!a || !z || a.seq >= z.seq) continue;
    const ride = z.offset_min - a.offset_min;
    for (const b of net.buses.filter((x) => x.route_id === r.id)) {
      const v = view(net, b, now);
      const board = v.at(a.seq);
      out.push(pub(v, {
        eta_min: Math.round(board.eta), ride_min: ride, next_trip: v.p > a.offset_min,
        fare: FARE_BASE + FARE_PER_STOP * (z.seq - a.seq),
        board_name: a.name, drop_name: z.name, from_seq: a.seq, to_seq: z.seq,
        board_expected: board.expected_at, board_scheduled: board.scheduled_at,
        drop_expected: when(now, board.eta + ride), drop_scheduled: when(now, board.eta - v.delay + ride),
      }));
    }
  }
  if (out.length === 0) return journeys(net, f, t, now);
  return out.sort((x, y) => x.eta_min - y.eta_min);
}

// Trips with one bus change (used when there is no direct bus)
function journeys(net, f, t, now) {
  const base = (n) => n.replace('R', '');
  const rank = { low: 0, medium: 1, high: 2 };
  const cache = new Map();
  const V = (b) => { if (!cache.has(b.id)) cache.set(b.id, view(net, b, now)); return cache.get(b.id); };
  const etas = (rid, seq) => net.buses.filter((b) => b.route_id === rid)
    .map((b) => ({ v: V(b), eta: minutesTo(V(b).p, V(b).stops, seq) })).sort((x, y) => x.eta - y.eta);

  const found = [];
  for (const A of net.routes) {
    const sa = net.stopsOf[A.id];
    const fa = sa.find((s) => s.id === f);
    if (!fa) continue;
    for (const B of net.routes) {
      if (B.id === A.id || base(B.number) === base(A.number)) continue;
      const sb = net.stopsOf[B.id];
      const tb = sb.find((s) => s.id === t);
      if (!tb) continue;
      let best = null;
      for (const x of sa.filter((s) => s.seq > fa.seq)) {
        const xb = sb.find((s) => s.id === x.id);
        if (!xb || xb.seq >= tb.seq) continue;
        const ca = etas(A.id, fa.seq)[0];
        const arrive = ca ? ca.eta + (x.offset_min - fa.offset_min) : 0;
        // a bus of the 2nd route that passes the change stop before we get there is missed: it comes again next round
        const cb = etas(B.id, xb.seq)
          .map((c) => { let e = c.eta; while (e < arrive) e += periodOf(sb); return { ...c, eta: e }; })
          .sort((x, y) => x.eta - y.eta)[0];
        if (!ca || !cb) continue;
        const depart = cb.eta;
        const total = depart + (tb.offset_min - xb.offset_min);
        if (!best || total < best.total) best = { fa, x, xb, tb, ca, cb, arrive, depart, total };
      }
      if (best) found.push(best);
    }
  }

  const leg = (c, a, z) => pub(c.v, {
    from_name: a.name, to_name: z.name, from_seq: a.seq, to_seq: z.seq,
    eta_min: Math.round(c.eta), ride_min: z.offset_min - a.offset_min,
    fare: FARE_BASE + FARE_PER_STOP * (z.seq - a.seq),
    board_expected: when(now, c.eta), board_scheduled: when(now, c.eta - c.v.delay),
  });
  return found.sort((p, q) => p.total - q.total).slice(0, 5).map((p) => {
    const l1 = leg(p.ca, p.fa, p.x), l2 = leg(p.cb, p.xb, p.tb);
    return {
      journey: true, bus_id: `${l1.bus_id}-${l2.bus_id}`, plate: `${l1.plate} + ${l2.plate}`,
      route_number: `${l1.route_number}+${l2.route_number}`, route_name: `Change at ${p.x.name}`,
      lat: l1.lat, lng: l1.lng, next_stop: l1.next_stop, at_terminal: l1.at_terminal,
      delay_min: Math.max(l1.delay_min, l2.delay_min),
      total_seats: Math.min(l1.total_seats, l2.total_seats),
      seats_available: Math.min(l1.seats_available, l2.seats_available),
      crowd: rank[l1.crowd] >= rank[l2.crowd] ? l1.crowd : l2.crowd,
      stops: l1.stops, timetable: l1.timetable, next_trip: false,
      eta_min: l1.eta_min, ride_min: Math.round(p.total - p.ca.eta),
      board_name: p.fa.name, drop_name: p.tb.name, from_seq: l1.from_seq, to_seq: l1.to_seq,
      board_expected: l1.board_expected, board_scheduled: l1.board_scheduled,
      drop_expected: when(now, p.total),
      drop_scheduled: when(now, p.cb.eta - p.cb.v.delay + (p.tb.offset_min - p.xb.offset_min)),
      transfer_stop: p.x.name, wait_min: Math.round(p.depart - p.arrive), legs: [l1, l2], fare: l1.fare + l2.fare,
    };
  });
}

// Every bus (Live Tracking page without a From/To filter)
export async function allBuses() {
  const net = await load();
  const now = Date.now();
  const buses = [...net.buses].sort((a, b) =>
    net.info[a.route_id].number.localeCompare(net.info[b.route_id].number, undefined, { numeric: true }) || a.plate.localeCompare(b.plate));
  return buses.map((b) => {
    const v = view(net, b, now);
    const n = v.stops.length;
    const nx = v.at(v.pos.next_seq), fin = v.at(n);
    return pub(v, {
      final_stop: v.stops[n - 1].name, from_seq: 1, to_seq: n,
      next_eta_min: Math.round(nx.eta), next_expected: nx.expected_at, next_scheduled: nx.scheduled_at,
      final_eta_min: Math.round(fin.eta), final_expected: fin.expected_at, final_scheduled: fin.scheduled_at,
    });
  });
}