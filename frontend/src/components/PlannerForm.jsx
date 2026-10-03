import { useState } from 'react';
import StopSelect from './StopSelect';

export default function PlannerForm({ stops, from, to, setFrom, setTo, onSubmit, cta = 'Find buses' }) {
  const [k, setK] = useState(0); // changes on swap so both boxes refresh
  return (
    <div className="planner-card">
      <StopSelect key={`f${k}`} label="From" placeholder="Choose starting stop" stops={stops} value={from} onChange={setFrom} />
      <button className="swap" onClick={() => { setFrom(to); setTo(from); setK(k + 1); }} aria-label="Swap from and to">⇅</button>
      <StopSelect key={`t${k}`} label="To" placeholder="Choose destination" stops={stops} value={to} onChange={setTo} />
      <button className="go" disabled={!from || !to || from === to} onClick={() => onSubmit(from, to)}>{cta}</button>
    </div>
  );
}
