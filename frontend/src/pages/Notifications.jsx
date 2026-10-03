import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

const ICON = { delay: '⏳', info: '📢', arrival: '🚏' };

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const load = () => api('/api/notifications').then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [user?.id]);
  const read = async (id) => { await api(`/api/notifications/${id}/read`, { method: 'POST' }); load(); };
  const readAll = async () => { await api('/api/notifications/read-all', { method: 'POST' }); load(); };
  const unread = items?.filter((n) => !n.is_read).length || 0;

  return (
    <>
      <div className="page-head"><h1>Alerts</h1><p>Delays, route changes and announcements.</p></div>
      <section className="section narrow">
        {user
          ? unread > 0 && <button className="chip-btn" onClick={readAll}>Mark all as read ({unread})</button>
          : <p className="small"><Link to="/login" className="link">Log in</Link> to mark alerts as read.</p>}
        {!items && <p className="empty">Loading...</p>}
        {items?.length === 0 && <p className="empty">No alerts right now.</p>}
        {items?.map((n) => (
          <div key={n.id} className={`notif ${n.is_read ? '' : 'new'}`}>
            <span className="ico">{ICON[n.type] || '🔔'}</span>
            <div><p>{n.message}</p><small>{new Date(n.created_at).toLocaleString()}</small></div>
            {user && !n.is_read && <button className="chip-btn" onClick={() => read(n.id)}>Mark read</button>}
          </div>
        ))}
      </section>
    </>
  );
}
