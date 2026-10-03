import SeatMeter from './SeatMeter';
import { hm, status, when } from '../Time.js';

export default function TripCard({ t, active, onSelect }) {
  const [kind, label] = status(t.delay_min);
  return (
    <button className={`trip ${active ? 'active' : ''}`} onClick={onSelect}>
      <div className="trip-top">
        <span className="badge">{t.route_number}</span>
        <div className="trip-name">
          <b>{t.plate}{t.next_trip && <em className="nt"> · next trip</em>}</b>
          <small>{t.route_name} · Fare ₹{t.fare}</small>
        </div>
        <span className={`chip ${kind}`}>{label}</span>
      </div>
      {t.legs && (
        <>
          <ol className="legs">
            {t.legs.map((l) => (
              <li key={l.bus_id}><b>Bus {l.route_number}</b>: {l.from_name} → {l.to_name} ({l.ride_min} min)</li>
            ))}
          </ol>
          <p className="change">Change at {t.transfer_stop}{t.wait_min > 0 ? `, wait about ${t.wait_min} min` : ', no waiting'}</p>
        </>
      )}
      <div className="times in-card">
        <div>
          <small>Board at {t.board_name}</small>
          <span className="sch">Scheduled {hm(t.board_scheduled)}</span>
          <strong>{hm(t.board_expected)}</strong>
          <small>expected, {when(t.eta_min)}</small>
        </div>
        <div>
          <small>Reach {t.drop_name}</small>
          <span className="sch">Scheduled {hm(t.drop_scheduled)}</span>
          <strong>{hm(t.drop_expected)}</strong>
          <small>expected, {t.ride_min} min trip</small>
        </div>
      </div>
      <SeatMeter b={t} />
    </button>
  );
}
