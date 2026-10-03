const LABEL = { low: 'Low crowd', medium: 'Medium crowd', high: 'High crowd' };
const MSG = {
  low: 'Plenty of seats available',
  medium: 'Filling up, seats are limited',
  high: 'Very crowded, you may have to stand',
};

// Seats free + crowd level. "full" also draws one square per seat (grey = taken, green = free).
export default function SeatMeter({ b, full }) {
  const used = b.total_seats - b.seats_available;
  const pct = Math.round((100 * used) / b.total_seats);
  return (
    <div className="meter">
      <div className="meter-top">
        <span className={`crowd-pill ${b.crowd}`}>{LABEL[b.crowd]}</span>
        <span className="free-count"><strong>{b.seats_available}</strong> of {b.total_seats} seats free</span>
      </div>
      {full ? (
        <div className="seats" aria-hidden="true">
          {Array.from({ length: b.total_seats }, (_, i) => <i key={i} className={i < used ? 'taken' : 'free'} />)}
        </div>
      ) : (
        <div className="bar"><i className={`fill ${b.crowd}`} style={{ width: `${pct}%` }} /></div>
      )}
      <small>{MSG[b.crowd]} · {pct}% full</small>
    </div>
  );
}
