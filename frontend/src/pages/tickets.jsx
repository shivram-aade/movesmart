import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api';

const fmt = (iso) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

export default function Tickets() {
  const loc = useLocation();
  const [list, setList] = useState(null);
  const [msg, setMsg] = useState('');
  const load = () => api('/api/tickets').then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, []);

  const cancel = async (t) => {
    if (!window.confirm('Cancel this ticket?')) return;
    try {
      await api(`/api/tickets/${t.id}/cancel`, { method: 'POST' });
      setMsg(`Ticket ${t.code} cancelled. Refund of ₹${t.fare_total} (demo).`);
      load();
    } catch (e) { setMsg(e.message); }
  };
  const print = (id) => {
    const el = document.getElementById(`ticket-${id}`);
    document.body.classList.add('printing');
    el.classList.add('print-me');
    const done = () => { document.body.classList.remove('printing'); el.classList.remove('print-me'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  };

  return (
    <>
      <div className="page-head"><h1>My tickets</h1><p>Download or print your tickets.</p></div>
      <section className="section narrow tickets">
        {loc.state?.newId && <p className="ok">Booking confirmed! Your ticket is below.</p>}
        {msg && <p className="ok">{msg}</p>}
        {!list && <p className="empty">Loading...</p>}
        {list?.length === 0 && (
          <div className="note">No tickets yet. <Link to="/routes" className="link">Search a route</Link> and tap "Book ticket".</div>
        )}
        {list?.map((t) => (
          <article key={t.id} id={`ticket-${t.id}`} className={`ticket ${t.status} ${loc.state?.newId === t.id ? 'new' : ''}`}>
            <div className="ticket-head">
              <div><small>Booking code</small><strong className="code">{t.code}</strong></div>
              <span className={`chip ${t.status === 'confirmed' ? 'ontime' : 'late'}`}>{t.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}</span>
            </div>
            <p className="route-line">{t.from_name} → {t.to_name}</p>
            {t.legs.map((l, i) => (
              <p key={l.bus_id} className="leg-line">
                <b>{t.legs.length > 1 ? `Leg ${i + 1}: ` : ''}Bus {l.route_number}</b> · {l.plate}<br />
                <small>{l.from_name} → {l.to_name}, scheduled {fmt(l.scheduled_at)}</small>
              </p>
            ))}
            <div className="ticket-foot">
              <div><small>Passengers</small><strong>{t.passengers}</strong></div>
              <div><small>Total fare</small><strong>₹{t.fare_total}</strong></div>
              <div><small>Payment</small><strong>{t.payment_method} (demo)</strong></div>
            </div>
            <div className="ticket-actions no-print">
              <a className="go linkgo" href={`/api/tickets/${t.id}/pdf`} download>⬇ Download PDF</a>
              <button className="chip-btn" onClick={() => print(t.id)}>🖨 Print</button>
              {t.can_cancel && <button className="chip-btn" onClick={() => cancel(t)}>Cancel ticket</button>}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}