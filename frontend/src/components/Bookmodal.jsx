import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { hm } from '../Time.js';

export default function BookModal({ trip, from, to, onClose }) {
  const nav = useNavigate();
  const [n, setN] = useState(1);
  const [method, setMethod] = useState('UPI');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const legs = trip.legs || [trip];
  const total = trip.fare * n;

  const pay = async () => {
    setBusy(true); setErr('');
    try {
      const t = await api('/api/tickets', { method: 'POST', body: { from, to, bus_id: trip.bus_id, passengers: n, method } });
      nav('/tickets', { state: { newId: t.id } });
    } catch (x) { setErr(x.message); setBusy(false); }
  };

  return (
    <div className="modal-bg" onClick={onClose} role="dialog" aria-modal="true" aria-label="Book ticket">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Book ticket</h2>
        <p className="route-line">{trip.board_name} → {trip.drop_name}</p>
        {legs.map((l) => (
          <p key={l.bus_id} className="leg-line">
            <b>Bus {l.route_number}</b> · {l.plate}<br />
            <small>{l.from_name || trip.board_name} → {l.to_name || trip.drop_name}, scheduled {hm(l.board_scheduled)}</small>
          </p>
        ))}
        <div className="row">
          <span>Passengers</span>
          <div className="stepper">
            <button onClick={() => setN(Math.max(1, n - 1))} aria-label="Fewer passengers">−</button>
            <b>{n}</b>
            <button onClick={() => setN(Math.min(6, n + 1))} aria-label="More passengers">+</button>
          </div>
        </div>
        <label>Payment method (demo)
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>UPI</option><option>Card</option><option>Wallet</option>
          </select>
        </label>
        <div className="row total"><span>Fare ₹{trip.fare} × {n}</span><strong>₹{total}</strong></div>
        {err && <p className="error">{err}</p>}
        <div className="row">
          <button className="chip-btn" onClick={onClose}>Cancel</button>
          <button className="go" disabled={busy} onClick={pay}>{busy ? 'Booking...' : `Pay ₹${total}`}</button>
        </div>
        <p className="small">Demo payment: no real money is charged.</p>
      </div>
    </div>
  );
}
