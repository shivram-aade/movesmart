import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { pool } from './db.js';
import { hash, check, sha, sign, requireAuth, optionalAuth } from './auth.js';
import { tripsBetween, allBuses } from './transit.js';
import { registerTickets } from './tickets.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Express 4 does not catch async errors by itself, so wrap every handler
const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server' });
  });

// All stops (for the From / To dropdowns)
app.get('/api/stops', wrap(async (_req, res) => {
  const [rows] = await pool.query('SELECT id, name FROM stops ORDER BY name');
  res.json(rows);
}));

// Buses (or bus changes) between two stops, with scheduled and expected times
app.get('/api/trips', wrap(async (req, res) => {
  res.json(await tripsBetween(req.query.from, req.query.to));
}));

// All buses (Live Tracking page)
app.get('/api/buses', wrap(async (_req, res) => {
  res.json(await allBuses());
}));

// Contact form (validated; for now the message is only printed in this terminal)
app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body || {};
  const okEmail = typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!name?.trim() || !okEmail || !subject?.trim() || !message?.trim() || message.length > 2000) {
    return res.status(400).json({ error: 'Please fill all fields with valid values' });
  }
  console.log('Contact message:', { name, email, subject });
  res.json({ ok: true });
});

// ---------- stops reachable directly from a stop (used when no bus is found) ----------
app.get('/api/reachable', wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT DISTINCT s.id, s.name FROM route_stops a
     JOIN route_stops b ON a.route_id = b.route_id AND a.seq < b.seq
     JOIN stops s ON s.id = b.stop_id WHERE a.stop_id = ? ORDER BY s.name`, [req.query.from]);
  res.json(rows);
}));

// ---------- accounts ----------
const bad = (res, msg) => res.status(400).json({ error: msg });
const emailOk = (e) => typeof e === 'string' && e.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const pub = (u) => ({ id: u.id, name: u.name, email: u.email, mobile: u.mobile });

app.post('/api/auth/signup', wrap(async (req, res) => {
  const { name, email, mobile, password, confirm } = req.body || {};
  if (!name?.trim() || name.length > 80) return bad(res, 'Enter your full name');
  if (!emailOk(email)) return bad(res, 'Enter a valid email address');
  if (mobile && !/^[0-9+\- ]{7,15}$/.test(mobile)) return bad(res, 'Enter a valid mobile number');
  if (typeof password !== 'string' || password.length < 8) return bad(res, 'Password must be at least 8 characters');
  if (password !== confirm) return bad(res, 'Passwords do not match');
  const mail = email.toLowerCase();
  const [dup] = await pool.query('SELECT id FROM users WHERE email = ? OR (mobile IS NOT NULL AND mobile = ?)', [mail, mobile || '']);
  if (dup.length) return bad(res, 'An account with this email or mobile already exists');
  const [r] = await pool.query('INSERT INTO users (name, email, mobile, password_hash) VALUES (?,?,?,?)',
    [name.trim(), mail, mobile || null, await hash(password)]);
  sign(res, r.insertId);
  res.json({ id: r.insertId, name: name.trim(), email: mail, mobile: mobile || null });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const { id, password, remember } = req.body || {};
  const who = String(id || '').trim();
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? OR mobile = ?', [who.toLowerCase(), who]);
  const u = rows[0];
  if (!u || !(await check(String(password || ''), u.password_hash))) {
    return res.status(401).json({ error: 'Incorrect email/mobile or password' });
  }
  sign(res, u.id, remember !== false);
  res.json(pub(u));
}));

app.post('/api/auth/logout', (_req, res) => { res.clearCookie('ms_token'); res.json({ ok: true }); });

app.get('/api/auth/me', requireAuth, wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
  if (!rows[0]) return res.status(401).json({ error: 'Please log in' });
  res.json(pub(rows[0]));
}));

// No email service yet: the reset link is printed in this terminal
app.post('/api/auth/forgot', wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [String(req.body?.email || '').toLowerCase()]);
  if (rows[0]) {
    const token = crypto.randomBytes(24).toString('hex');
    await pool.query('INSERT INTO resets (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))', [sha(token), rows[0].id]);
    console.log(`\nPassword reset link: http://localhost:5173/reset?token=${token}\n`);
  }
  res.json({ ok: true });
}));

app.post('/api/auth/reset', wrap(async (req, res) => {
  const { token, password, confirm } = req.body || {};
  if (typeof password !== 'string' || password.length < 8) return bad(res, 'Password must be at least 8 characters');
  if (password !== confirm) return bad(res, 'Passwords do not match');
  const [rows] = await pool.query('SELECT user_id FROM resets WHERE token_hash = ? AND expires_at > NOW()', [sha(String(token || ''))]);
  if (!rows[0]) return bad(res, 'This reset link is invalid or has expired');
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [await hash(password), rows[0].user_id]);
  await pool.query('DELETE FROM resets WHERE user_id = ?', [rows[0].user_id]);
  res.json({ ok: true });
}));

// ---------- favorites and recent searches ----------
app.get('/api/favorites', requireAuth, wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT f.id, f.from_stop, f.to_stop, a.name AS from_name, b.name AS to_name FROM favorites f
     JOIN stops a ON a.id = f.from_stop JOIN stops b ON b.id = f.to_stop WHERE f.user_id = ? ORDER BY f.id DESC`, [req.userId]);
  res.json(rows);
}));
app.post('/api/favorites', requireAuth, wrap(async (req, res) => {
  const f = Number(req.body?.from), t = Number(req.body?.to);
  if (!f || !t || f === t) return bad(res, 'Choose two different stops');
  await pool.query('INSERT IGNORE INTO favorites (user_id, from_stop, to_stop) VALUES (?,?,?)', [req.userId, f, t]);
  res.json({ ok: true });
}));
app.delete('/api/favorites/:id', requireAuth, wrap(async (req, res) => {
  await pool.query('DELETE FROM favorites WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ ok: true });
}));
app.get('/api/history', requireAuth, wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT h.from_stop, h.to_stop, a.name AS from_name, b.name AS to_name FROM search_history h
     JOIN stops a ON a.id = h.from_stop JOIN stops b ON b.id = h.to_stop
     WHERE h.user_id = ? ORDER BY h.searched_at DESC LIMIT 8`, [req.userId]);
  res.json(rows);
}));
app.post('/api/history', requireAuth, wrap(async (req, res) => {
  const f = Number(req.body?.from), t = Number(req.body?.to);
  if (f && t && f !== t) {
    await pool.query('INSERT INTO search_history (user_id, from_stop, to_stop) VALUES (?,?,?) ON DUPLICATE KEY UPDATE searched_at = NOW()', [req.userId, f, t]);
  }
  res.json({ ok: true });
}));

// ---------- notifications ----------
app.get('/api/notifications', optionalAuth, wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT n.id, n.type, n.message, n.created_at, (r.user_id IS NOT NULL) AS is_read FROM notifications n
     LEFT JOIN notif_reads r ON r.notification_id = n.id AND r.user_id = ? ORDER BY n.id DESC LIMIT 30`, [req.userId || 0]);
  res.json(rows.map((r) => ({ ...r, is_read: !!r.is_read })));
}));
app.post('/api/notifications/read-all', requireAuth, wrap(async (req, res) => {
  await pool.query('INSERT IGNORE INTO notif_reads (user_id, notification_id) SELECT ?, id FROM notifications', [req.userId]);
  res.json({ ok: true });
}));
app.post('/api/notifications/:id/read', requireAuth, wrap(async (req, res) => {
  await pool.query('INSERT IGNORE INTO notif_reads (user_id, notification_id) SELECT ?, id FROM notifications WHERE id = ?', [req.userId, req.params.id]);
  res.json({ ok: true });
}));

registerTickets(app, { wrap, requireAuth, bad });

app.listen(process.env.PORT || 5000, () =>
  console.log(`API running on http://localhost:${process.env.PORT || 5000}`));