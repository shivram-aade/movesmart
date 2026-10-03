import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [favs, setFavs] = useState(null);
  const [hist, setHist] = useState(null);
  const [notes, setNotes] = useState([]);
  const [tix, setTix] = useState([]);
  const loadFavs = () => api('/api/favorites').then(setFavs).catch(() => setFavs([]));
  useEffect(() => {
    loadFavs();
    api('/api/history').then(setHist).catch(() => setHist([]));
    api('/api/notifications').then((d) => setNotes(d.slice(0, 4))).catch(() => {});
    api('/api/tickets').then((d) => setTix(d.slice(0, 3))).catch(() => {});
  }, []);
  const remove = async (id) => { await api(`/api/favorites/${id}`, { method: 'DELETE' }); loadFavs(); };
  const go = (a, b) => `/routes?from=${a}&to=${b}`;

  return (
    <>
      <div className="page-head"><h1>Hello, {user.name.split(' ')[0]}</h1><p>Your MoveSmart dashboard.</p></div>
      <section className="section dash">
        <div className="feature">
          <h3>Profile</h3>
          <p>{user.name}<br />{user.email}<br />{user.mobile || 'No mobile number added'}</p>
        </div>
        <div className="feature">
          <h3>⭐ Favorite routes</h3>
          {favs?.length === 0 && <p className="small">None yet. Search a route and tap "Save this route".</p>}
          {favs?.map((f) => (
            <div key={f.id} className="li">
              <Link to={go(f.from_stop, f.to_stop)} className="link">{f.from_name} → {f.to_name}</Link>
              <button className="x" onClick={() => remove(f.id)} aria-label="Remove favorite">✕</button>
            </div>
          ))}
        </div>
        <div className="feature">
          <h3>Recent searches</h3>
          {hist?.length === 0 && <p className="small">Your searches will show up here.</p>}
          {hist?.map((h) => (
            <div key={`${h.from_stop}-${h.to_stop}`} className="li">
              <Link to={go(h.from_stop, h.to_stop)} className="link">{h.from_name} → {h.to_name}</Link>
            </div>
          ))}
        </div>
        <div className="feature">
          <h3>🎫 My tickets</h3>
          {tix.length === 0 && <p className="small">No tickets yet.</p>}
          {tix.map((t) => <div key={t.id} className="li"><span className="small">{t.code} · {t.from_name} → {t.to_name}</span></div>)}
          <Link to="/tickets" className="link">All tickets →</Link>
        </div>
        <div className="feature">
          <h3>🔔 Latest alerts</h3>
          {notes.map((n) => <p key={n.id} className={`small ${n.is_read ? '' : 'strong'}`}>{n.message}</p>)}
          <Link to="/notifications" className="link">All alerts →</Link>
        </div>
      </section>
    </>
  );
}