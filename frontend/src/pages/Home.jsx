import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getStops } from '../api';
import PlannerForm from '../components/PlannerForm';
import { FEATURES, FeatureCard } from './Pages';

export default function Home() {
  const nav = useNavigate();
  const [stops, setStops] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  useEffect(() => { getStops().then(setStops).catch(() => {}); }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <h1>Smart &amp; simple public transportation, <em>live.</em></h1>
          <p>Track buses in real time, find the best route, check crowd levels and reach your destination on time.</p>
          <div className="cta">
            <Link to="/routes" className="btn-mint big">Search Route</Link>
            <Link to="/live" className="btn-ghost big">Track Bus</Link>
          </div>
        </div>
      </section>
      <section className="planner">
        <PlannerForm stops={stops} from={from} to={to} setFrom={setFrom} setTo={setTo}
          onSubmit={(f, t) => nav(`/routes?from=${f}&to=${t}`)} />
      </section>
      <section className="section">
        <h2>Everything you need for a better commute</h2>
        <div className="grid4">
          {FEATURES.slice(0, 4).map((f) => <FeatureCard key={f[1]} f={f} />)}
        </div>
        <p className="center"><Link to="/services" className="link">See all services →</Link></p>
      </section>
      <section className="section stats">
        {[['500+', 'Buses'], ['1,000+', 'Stops'], ['50+', 'Routes'], ['100K+', 'Daily riders']].map(([n, l]) => (
          <div key={l}><strong>{n}</strong><span>{l}</span></div>
        ))}
      </section>
    </>
  );
}
