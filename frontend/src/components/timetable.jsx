import { hm } from '../Time.js';

// Stop-by-stop timetable of one bus: fixed scheduled time vs the time we expect it now
export default function Timetable({ b, mark }) {
  return (
    <div className="tt">
      <h4>Timetable</h4>
      <table>
        <thead><tr><th>Stop</th><th>Scheduled</th><th>Expected</th></tr></thead>
        <tbody>
          {b.timetable.map((s) => {
            const role = mark ? (s.seq === b.from_seq ? 'board' : s.seq === b.to_seq ? 'drop' : '') : '';
            return (
              <tr key={s.seq} className={`${s.passed ? 'passed' : ''} ${role}`}>
                <td>{s.name}{role === 'board' && ' (board)'}{role === 'drop' && ' (get off)'}</td>
                <td>{hm(s.scheduled_at)}</td>
                <td>{s.passed ? 'Departed' : hm(s.expected_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
