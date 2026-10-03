import { pool } from './db.js';
import { delayAt } from './utils.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rand = (n) => Math.round(Math.random() * 2 * n - n);
const late = {}; // bus id -> true while it is reported as badly delayed

async function notify(type, message) {
  const [r] = await pool.query('INSERT INTO notifications (type, message) VALUES (?, ?)', [type, message]);
  await pool.query('DELETE FROM notifications WHERE id <= ?', [r.insertId - 100]); // keep the latest 100
}

async function tick() {
  const [buses] = await pool.query('SELECT b.*, r.number FROM buses b JOIN routes r ON r.id = b.route_id');
  const now = Date.now();
  for (const b of buses) {
    const d = delayAt(b, now);
    if (late[b.id] === undefined) late[b.id] = d >= 5;
    else if (d >= 5 && !late[b.id]) { late[b.id] = true; await notify('delay', `Bus ${b.plate} (Route ${b.number}) is delayed by ${Math.round(d)} minutes due to traffic.`); }
    else if (d < 3 && late[b.id]) { late[b.id] = false; await notify('info', `Bus ${b.plate} (Route ${b.number}) is running closer to schedule again.`); }
    if (Math.random() < 0.35) { // passengers get on and off
      await pool.query('UPDATE buses SET occupied = ? WHERE id = ?', [clamp(b.occupied + rand(3), 0, b.total_seats), b.id]);
    }
  }
}
setInterval(() => tick().catch(console.error), 5000);
console.log('Simulating passengers and delay alerts... (bus positions follow the timetable and the clock)');