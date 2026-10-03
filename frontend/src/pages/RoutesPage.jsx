import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, getStops, getTrips } from '../api';
import { useAuth } from '../AuthContext';
import PlannerForm from '../components/PlannerForm';
import TripCard from '../components/TripCard';
import LiveMap from '../components/LiveMap';
import SeatMeter from '../components/SeatMeter';
import Timetable from '../components/timetable.jsx';
import BookModal from '../components/Bookmodal.jsx';
import { hm, status } from '../Time.js';
import useStale from '../components/useStale';

const clock = (min) =>
  new Date(Date.now() + min * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const ORDER = { low: 0, medium: 1, high: 2 };
const SORTS = {
  eta: ['Soonest', (a, b) => a.eta_min - b.eta_min],
  ride: ['Fastest ride', (a, b) => a.ride_min - b.ride_min],
  crowd: ['Least crowded', (a, b) => ORDER[a.crowd] - ORDER[b.crowd] || a.eta_min - b.eta_min],
  seats: ['Most seats', (a, b) => b.seats_available - a.seats_available],
  fare: ['Cheapest', (a, b) => a.fare - b.fare || a.eta_min - b.eta_min],
  changes: ['Fewer changes', (a, b) => (a.journey ? 1 : 0) - (b.journey ? 1 : 0) || a.eta_min - b.eta_min],
};

export default function RoutesPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const f0 = params.get('from') || '', t0 = params.get('to') || '';
  const [stops, setStops] = useState([]);
  const [from, setFrom] = useState(f0);
  const [to, setTo] = useState(t0);
  const [query, setQuery] = useState(f0 && t0 ? { from: f0, to: t0 } : null);
  const [trips, setTrips] = useState(null);
  const [selected, setSelected] = useState(null);
  const [sort, setSort] = useState('eta');
  const [error, setError] = useState('');
  const [favs, setFavs] = useState([]);
  const [reach, setReach] = useState([]);
  const [leg, setLeg] = useState(null);
  const [book, setBook] = useState(false);
  const ref = useRef(null);
  const stale = useStale(trips);

  useEffect(() => { getStops().then(setStops).catch(() => setError('Cannot reach the server. Is the backend running?')); }, []);
  const loadFavs = () => (user ? api('/api/favorites').then(setFavs).catch(() => {}) : setFavs([]));
  useEffect(() => { loadFavs(); }, [user?.id]);

  useEffect(() => {
    if (!query) return;
    const load = () => getTrips(query.from, query.to)
      .then((d) => { setTrips(d); setError(''); })
      .catch(() => setError('Live data is unavailable. Retrying...'));
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [query]);

  const none = !!trips && trips.length === 0;
  useEffect(() => {
    if (query && none) api(`/api/reachable?from=${query.from}`).then(setReach).catch(() => setReach([]));
    else setReach([]);
  }, [query, none]);

  const name = (id) => stops.find((s) => String(s.id) === String(id))?.name;
  const list = trips ? [...trips].sort(SORTS[sort][1]) : null;
  const active = list?.find((t) => t.bus_id === selected) || list?.[0];
  const fav = query && favs.find((f) => String(f.from_stop) === String(query.from) && String(f.to_stop) === String(query.to));

  const legs = active ? active.legs || [active] : [];
  const selLeg = legs.find((l) => l.bus_id === leg) || legs[0];
  const pickOnMap = (id) => {
    const it = list?.find((x) => x.bus_id === id || x.legs?.some((l) => l.bus_id === id));
    if (!it) return;
    setSelected(it.bus_id);
    if (it.legs) setLeg(id);
  };
  const search = (f, t) => {
    if (!f || !t || f === t) return;
    setFrom(f); setTo(t); setTrips(null); setSelected(null); setQuery({ from: f, to: t });
    if (user) api('/api/history', { method: 'POST', body: { from: f, to: t } }).catch(() => {});
    setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };
  const toggleFav = async () => {
    if (fav) await api(`/api/favorites/${fav.id}`, { method: 'DELETE' });
    else await api('/api/favorites', { method: 'POST', body: { from: query.from, to: query.to } });
    loadFavs();
  };

  return (
    <>
      <div className="page-head"><h1>Search routes</h1><p>Type a stop name or pick one from the list.</p></div>
      <section className="planner pull">
        <PlannerForm stops={stops} from={from} to={to} setFrom={setFrom} setTo={setTo} onSubmit={search} />
        {from && to && from === to && <p className="hint">Start and destination must be different.</p>}
      </section>
      {error && <p className="error">{error}</p>}
      {!query && <p className="empty">Choose your stops above to see live buses.</p>}
      {query && (
        <section className="results" ref={ref}>
          <div>
            <h2>{list ? `${list.length} bus${list.length === 1 ? '' : 'es'} on this route` : 'Finding buses...'}</h2>
            <p className="route-line">{name(query.from)} → {name(query.to)}</p>
            {user
              ? <button className={`star ${fav ? 'on' : ''}`} onClick={toggleFav}>{fav ? '★ Saved to favorites' : '☆ Save this route'}</button>
              : <Link to="/login" state={{ from: '/routes' }} className="star">☆ Log in to save this route</Link>}
            {stale && <p className="stale">Buses are not moving. Start the simulator: open a terminal, run cd backend, then npm run simulate.</p>}
            <div className="sorts" role="group" aria-label="Sort buses">
              {Object.entries(SORTS).map(([k, [label]]) => (
                <button key={k} className={`chip-btn ${sort === k ? 'on' : ''}`} onClick={() => setSort(k)}>{label}</button>
              ))}
            </div>
            {none && (
              <div className="note">
                <p>No bus or connection found from {name(query.from)} to {name(query.to)} right now.</p>
                {reach.length > 0 && <>
                  <p>Direct buses from {name(query.from)} go to:</p>
                  <div className="sorts">{reach.map((s) => (
                    <button key={s.id} className="chip-btn" onClick={() => search(query.from, String(s.id))}>{s.name}</button>
                  ))}</div>
                </>}
              </div>
            )}
            {list?.map((t) => (
              <TripCard key={t.bus_id} t={t} clock={clock} active={t.bus_id === active?.bus_id}
                onSelect={() => setSelected(t.bus_id)} />
            ))}
          </div>
          <div className="side">
            {active && (
              <>
                <LiveMap buses={list.flatMap((b) => b.legs || [b])} selectedId={selLeg.bus_id} onSelect={pickOnMap} filtered
                  fitKey={`${query.from}-${query.to}|${selLeg.bus_id}`} />
                <div className="detail">
                  {user
                    ? <button className="go book" onClick={() => setBook(true)}>🎫 Book ticket · ₹{active.fare}</button>
                    : <Link to="/login" state={{ from: '/routes' }} className="go book linkgo">Log in to book a ticket</Link>}
                  {book && <BookModal trip={active} from={query.from} to={query.to} onClose={() => setBook(false)} />}
                  {active.legs && (
                    <div className="sorts">
                      {active.legs.map((l, i) => (
                        <button key={l.bus_id} className={`chip-btn ${l.bus_id === selLeg.bus_id ? 'on' : ''}`} onClick={() => setLeg(l.bus_id)}>
                          Leg {i + 1}: Bus {l.route_number}
                        </button>
                      ))}
                    </div>
                  )}
                  <h3>{selLeg.plate} · Route {selLeg.route_number}</h3>
                  <p>{selLeg.at_terminal ? 'At the terminal, next trip starts from' : 'Heading to'} <b>{selLeg.next_stop}</b>. Status: <b className={`st ${status(selLeg.delay_min)[0]}`}>{status(selLeg.delay_min)[1]}</b></p>
                  <SeatMeter b={selLeg} full />
                  <div className="times">
                    <div><small>Board at {active.board_name}</small><span className="sch">Scheduled {hm(active.board_scheduled)}</span><strong>{hm(active.board_expected)}</strong><small>expected</small></div>
                    <div><small>Reach {active.drop_name}</small><span className="sch">Scheduled {hm(active.drop_scheduled)}</span><strong>{hm(active.drop_expected)}</strong><small>expected</small></div>
                  </div>
                  <Timetable b={selLeg} mark />
                </div>
              </>
            )}
          </div>
        </section>
      )}
    </>
  );
}