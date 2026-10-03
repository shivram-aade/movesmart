import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import BookModal from '../components/Bookmodal.jsx';
import { getBuses, getStops, getTrips } from '../api';
import PlannerForm from '../components/PlannerForm';
import LiveMap from '../components/LiveMap';
import useStale from '../components/useStale';
import SeatMeter from '../components/SeatMeter';
import Timetable from '../components/timetable.jsx';
import { hm, status } from '../Time.js';

const VIEWS = { map: '📍 Tracking map', eta: '⏱️ ETA', crowd: '👥 Crowd & seats' };
const CROWD = { low: 'Low crowd', medium: 'Medium crowd', high: 'High crowd' };
const ORDER = { low: 0, medium: 1, high: 2 };
const clock = (min) => new Date(Date.now() + min * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function Row({ b, active, onSelect, children }) {
  const [kind, label] = status(b.delay_min);
  return (
    <button className={`trip ${active ? 'active' : ''}`} onClick={onSelect}>
      <div className="trip-top">
        <span className="badge">{b.route_number}</span>
        <div className="trip-name"><b>{b.plate}</b><small>{b.route_name}</small></div>
        <span className={`chip ${kind}`}>{label}</span>
      </div>
      {children}
    </button>
  );
}

export default function Live() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = VIEWS[params.get('view')] ? params.get('view') : 'map';
  const [stops, setStops] = useState([]);
  const [from, setFrom] = useState(params.get('from') || '');
  const [to, setTo] = useState(params.get('to') || '');
  const [filter, setFilter] = useState(from && to ? { from, to } : null);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [leg, setLeg] = useState(null);
  const [book, setBook] = useState(false);
  const stale = useStale(data);

  useEffect(() => { getStops().then(setStops).catch(() => {}); }, []);
  useEffect(() => {
    setData(null);
    const load = () => (filter ? getTrips(filter.from, filter.to) : getBuses())
      .then((d) => { setData(d); setError(''); })
      .catch(() => setError('Cannot reach the server. Check that the backend is running (cd backend, then npm run dev).'));
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [filter]);

  const nameOf = (id) => stops.find((s) => String(s.id) === String(id))?.name || '';
  const apply = (f, t) => { setFilter({ from: f, to: t }); setSelected(null); };
  const clear = () => { setFrom(''); setTo(''); setFilter(null); setSelected(null); };
  const setView = (v) => setParams({ view: v });

  const text = q.trim().toLowerCase();
  let list = (data || []).filter((b) => !text || [b.plate, b.route_number, b.route_name, b.next_stop].join(' ').toLowerCase().includes(text));
  if (view === 'crowd') list = [...list].sort((a, b) => ORDER[a.crowd] - ORDER[b.crowd] || b.seats_available - a.seats_available);
  else if (filter) list = [...list].sort((a, b) => a.eta_min - b.eta_min);
  const active = filter ? list.find((b) => b.bus_id === selected) || list[0] : list.find((b) => b.bus_id === selected);
  const mapBuses = list.flatMap((b) => b.legs || [b]);
  const activeLegs = active ? active.legs || [active] : [];
  const selId = filter ? (activeLegs.find((l) => l.bus_id === leg) || activeLegs[0])?.bus_id : active?.bus_id;
  const cur = active ? activeLegs.find((l) => l.bus_id === selId) || active : null;
  const pickOnMap = (id) => {
    const it = list.find((x) => x.bus_id === id || x.legs?.some((l) => l.bus_id === id));
    if (!it) return;
    setSelected(it.bus_id);
    if (it.legs) setLeg(id);
  };
  const count = (c) => list.filter((b) => b.crowd === c).length;
  const pct = (b) => Math.round((100 * (b.total_seats - b.seats_available)) / b.total_seats);
  const open = (b) => { setSelected(b.bus_id); if (view !== 'map') setView('map'); };

  return (
    <>
      <div className="page-head"><h1>Live tracking <span className="live">● LIVE</span></h1><p>See every bus, or only the buses on your trip.</p></div>
      <section className="planner pull">
        <PlannerForm stops={stops} from={from} to={to} setFrom={setFrom} setTo={setTo} onSubmit={apply} cta="Show these buses" />
        <div className="chips">
          <span>{filter ? `Showing only buses from ${nameOf(filter.from)} to ${nameOf(filter.to)}` : 'Showing all buses. Choose From and To to see only the buses on your trip.'}</span>
          {filter && <button className="chip-btn" onClick={clear}>Show all buses</button>}
        </div>
      </section>

      <div className="tabs" role="group" aria-label="View">
        {Object.entries(VIEWS).map(([k, label]) => (
          <button key={k} className={view === k ? 'on' : ''} aria-pressed={view === k} onClick={() => setView(k)}>{label}</button>
        ))}
      </div>

      <section className="section wide">
        <input className="search" type="search" placeholder="Search bus number, route or stop..." value={q}
          onChange={(e) => setQ(e.target.value)} aria-label="Search buses" />
        {error && <p className="error">{error}</p>}
        {stale && <p className="stale">Buses are not moving. Start the simulator: open a terminal, run cd backend, then npm run simulate.</p>}
        {!data && !error && <p className="empty">Loading buses...</p>}
        {data && list.length === 0 && (
          <div className="note">
            {filter ? 'No bus or connection found between these two stops right now. Try another pair or show all buses.' : 'No bus matches your search.'}
          </div>
        )}

        {view === 'crowd' && list.length > 0 && (
          <div className="summary">
            <span className="crowd low">{count('low')} low</span>
            <span className="crowd medium">{count('medium')} medium</span>
            <span className="crowd high">{count('high')} high</span>
          </div>
        )}

        {view === 'map' ? (
          <div className="live-grid">
            <div>
              {list.map((b) => (
                <Row key={b.bus_id} b={b} active={b.bus_id === active?.bus_id} onSelect={() => setSelected(b.bus_id)}>
                  <p className="mini">
                    {filter ? `${b.eta_min} min to ${nameOf(filter.from)}` : `Next stop: ${b.next_stop} in ${b.next_eta_min} min`}
                    {' · '}{b.seats_available} seats free · {CROWD[b.crowd]}
                  </p>
                </Row>
              ))}
            </div>
            <div className="side">
              <LiveMap buses={mapBuses} selectedId={selId} onSelect={pickOnMap} filtered={!!filter}
                fitKey={`${filter ? `${filter.from}-${filter.to}` : 'all'}|${selId || ''}|${data ? 1 : 0}`} />
              {active && (
                <div className="detail">
                  {filter && (user
                    ? <button className="go book" onClick={() => setBook(true)}>🎫 Book ticket · ₹{active.fare}</button>
                    : <Link to="/login" state={{ from: '/live' }} className="go book linkgo">Log in to book a ticket</Link>)}
                  {book && filter && <BookModal trip={active} from={filter.from} to={filter.to} onClose={() => setBook(false)} />}
                  {active.legs && (
                    <div className="sorts">
                      {active.legs.map((l, i) => (
                        <button key={l.bus_id} className={`chip-btn ${l.bus_id === selId ? 'on' : ''}`} onClick={() => setLeg(l.bus_id)}>
                          Leg {i + 1}: Bus {l.route_number}
                        </button>
                      ))}
                    </div>
                  )}
                  <h3>{cur.plate} · {cur.route_name}</h3>
                  <p>{cur.at_terminal ? 'At the terminal, next trip starts from' : 'Heading to'} <b>{cur.next_stop}</b>. Status: <b className={`st ${status(cur.delay_min)[0]}`}>{status(cur.delay_min)[1]}</b></p>
                  <SeatMeter b={cur} full />
                  <Timetable b={cur} mark={!!filter} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="cards">
            {list.map((b) => (
              <Row key={b.bus_id} b={b} active={false} onSelect={() => open(b)}>
                {view === 'eta' ? (
                  <div className="times in-card">
                    {filter ? (
                      <>
                        <div><small>Board at {b.board_name}</small><span className="sch">Scheduled {hm(b.board_scheduled)}</span><strong>{hm(b.board_expected)}</strong><small>expected, in {b.eta_min} min</small></div>
                        <div><small>Reach {b.drop_name}</small><span className="sch">Scheduled {hm(b.drop_scheduled)}</span><strong>{hm(b.drop_expected)}</strong><small>expected</small></div>
                      </>
                    ) : (
                      <>
                        <div><small>Next: {b.next_stop}</small><span className="sch">Scheduled {hm(b.next_scheduled)}</span><strong>{hm(b.next_expected)}</strong><small>expected, in {b.next_eta_min} min</small></div>
                        <div><small>Final: {b.final_stop}</small><span className="sch">Scheduled {hm(b.final_scheduled)}</span><strong>{hm(b.final_expected)}</strong><small>expected, in {b.final_eta_min} min</small></div>
                      </>
                    )}
                  </div>
                ) : (
                  <SeatMeter b={b} full />
                )}
                <span className="open-map">Track on map →</span>
              </Row>
            ))}
          </div>
        )}
      </section>
    </>
  );
}