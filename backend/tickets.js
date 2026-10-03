import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { pool } from './db.js';
import { tripsBetween } from './transit.js';

const METHODS = ['UPI', 'Card', 'Wallet'];
const fmt = (d) => new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

// The tickets table is created automatically the first time the backend starts
async function ensureTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(16) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    from_stop INT NOT NULL,
    to_stop INT NOT NULL,
    passengers INT NOT NULL,
    fare_total INT NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    legs TEXT NOT NULL,
    travel_at DATETIME NOT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
}

const SELECT = `SELECT t.*, a.name AS from_name, b.name AS to_name FROM tickets t
  JOIN stops a ON a.id = t.from_stop JOIN stops b ON b.id = t.to_stop`;
const toTicket = (r) => ({
  id: r.id, code: r.code, passengers: r.passengers, fare_total: r.fare_total, payment_method: r.payment_method,
  status: r.status, from_name: r.from_name, to_name: r.to_name, legs: JSON.parse(r.legs),
  travel_at: r.travel_at, created_at: r.created_at,
  can_cancel: r.status === 'confirmed' && new Date(r.travel_at) > new Date(),
});
async function getTicket(id, userId) {
  const [rows] = await pool.query(`${SELECT} WHERE t.id = ? AND t.user_id = ?`, [id, userId]);
  return rows[0] ? toTicket(rows[0]) : null;
}

function drawPdf(doc, t, name, qr) {
  const W = doc.page.width, m = 36;
  doc.rect(0, 0, W, 78).fill('#101B3D');
  doc.fillColor('#19C6A1').font('Helvetica-Bold').fontSize(22).text('MoveSmart', m, 24);
  doc.fillColor('#FFFFFF').font('Helvetica').fontSize(11).text('Bus ticket', m, 52);

  let y = 100;
  doc.fillColor('#5F6B8A').font('Helvetica').fontSize(9).text('BOOKING CODE', m, y);
  doc.fillColor('#101B3D').font('Helvetica-Bold').fontSize(20).text(t.code, m, y + 12);
  doc.fillColor(t.status === 'confirmed' ? '#0E7A52' : '#B3262B').fontSize(11).text(t.status.toUpperCase(), m, y + 40);
  if (qr) doc.image(qr, W - m - 110, y, { width: 110 });

  y += 105;
  doc.fillColor('#101B3D').font('Helvetica-Bold').fontSize(15).text(`${t.from_name}  >  ${t.to_name}`, m, y);
  y += 30;
  const row = (label, value) => {
    doc.font('Helvetica').fontSize(9).fillColor('#5F6B8A').text(label, m, y + 2);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#101B3D').text(value, m + 110, y);
    y += 20;
  };
  row('Booked by', name);
  row('Passengers', String(t.passengers));
  row('Travel time', fmt(t.travel_at));
  row('Payment', `${t.payment_method} (demo)`);

  y += 6;
  doc.moveTo(m, y).lineTo(W - m, y).strokeColor('#DCE3F2').stroke();
  y += 14;
  t.legs.forEach((l, i) => {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#101B3D')
      .text(`${t.legs.length > 1 ? `Leg ${i + 1}: ` : ''}Bus ${l.route_number} (${l.plate})`, m, y);
    y += 16;
    doc.font('Helvetica').fontSize(10).text(`${l.from_name} to ${l.to_name}`, m, y);
    y += 14;
    doc.fillColor('#5F6B8A').text(`Scheduled departure: ${fmt(l.scheduled_at)}`, m, y);
    y += 24;
  });
  doc.moveTo(m, y).lineTo(W - m, y).strokeColor('#DCE3F2').stroke();
  y += 12;
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#101B3D').text(`Total fare: Rs. ${t.fare_total}`, m, y);
  doc.font('Helvetica').fontSize(8).fillColor('#5F6B8A')
    .text('Show this ticket (or the booking code) to the conductor. Demo ticket: no real payment was made.',
      m, doc.page.height - 50, { width: W - 2 * m });
}

export function registerTickets(app, { wrap, requireAuth, bad }) {
  ensureTable().catch((e) => console.error('Could not create the tickets table:', e.message));

  // Book a ticket for one of the options shown by the search
  app.post('/api/tickets', requireAuth, wrap(async (req, res) => {
    const { from, to, bus_id, passengers, method } = req.body || {};
    const n = Number(passengers);
    if (!Number.isInteger(n) || n < 1 || n > 6) return bad(res, 'Choose 1 to 6 passengers');
    if (!METHODS.includes(method)) return bad(res, 'Choose a payment method');

    const options = await tripsBetween(from, to); // fares, times and seats are always taken from the server
    const trip = options.find((t) => String(t.bus_id) === String(bus_id));
    if (!trip) return bad(res, 'This bus is no longer available. Please search again.');
    const legs = trip.legs || [trip];
    const full = legs.find((l) => l.seats_available < n);
    if (full) return bad(res, `Only ${full.seats_available} seat(s) left on bus ${full.plate}`);

    const stored = legs.map((l) => ({
      bus_id: l.bus_id, plate: l.plate, route_number: l.route_number, route_name: l.route_name,
      from_name: l.from_name || trip.board_name, to_name: l.to_name || trip.drop_name,
      scheduled_at: l.board_scheduled, ride_min: l.ride_min, fare: l.fare,
    }));
    const code = `MS${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const [r] = await pool.query(
      `INSERT INTO tickets (code, user_id, from_stop, to_stop, passengers, fare_total, payment_method, legs, travel_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [code, req.userId, Number(from), Number(to), n, trip.fare * n, method, JSON.stringify(stored), new Date(legs[0].board_scheduled)]);
    for (const l of legs) { // the booked seats count as occupied
      await pool.query('UPDATE buses SET occupied = LEAST(total_seats, occupied + ?) WHERE id = ?', [n, l.bus_id]);
    }
    res.json(await getTicket(r.insertId, req.userId));
  }));

  app.get('/api/tickets', requireAuth, wrap(async (req, res) => {
    const [rows] = await pool.query(`${SELECT} WHERE t.user_id = ? ORDER BY t.id DESC LIMIT 50`, [req.userId]);
    res.json(rows.map(toTicket));
  }));

  app.post('/api/tickets/:id/cancel', requireAuth, wrap(async (req, res) => {
    const t = await getTicket(req.params.id, req.userId);
    if (!t) return res.status(404).json({ error: 'Ticket not found' });
    if (!t.can_cancel) return bad(res, 'This ticket can no longer be cancelled');
    await pool.query("UPDATE tickets SET status = 'cancelled' WHERE id = ?", [t.id]);
    for (const l of t.legs) {
      await pool.query('UPDATE buses SET occupied = GREATEST(0, occupied - ?) WHERE id = ?', [t.passengers, l.bus_id]);
    }
    res.json({ ok: true });
  }));

  // Download the ticket as a PDF (with a QR code)
  app.get('/api/tickets/:id/pdf', requireAuth, wrap(async (req, res) => {
    const t = await getTicket(req.params.id, req.userId);
    if (!t) return res.status(404).json({ error: 'Ticket not found' });
    const [u] = await pool.query('SELECT name FROM users WHERE id = ?', [req.userId]);
    const qr = await QRCode.toBuffer(`MOVESMART|${t.code}|${t.passengers}`, { width: 240, margin: 1 }).catch(() => null);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="MoveSmart-ticket-${t.code}.pdf"`);
    const doc = new PDFDocument({ size: 'A5', margin: 36 });
    doc.pipe(res);
    drawPdf(doc, t, u[0]?.name || 'Passenger', qr);
    doc.end();
  }));
}