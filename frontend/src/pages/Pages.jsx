import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendContact } from '../api';

export const FEATURES = [
  ['🚌', 'Live Bus Tracking', 'See where every bus is on the map, right now.', '/live?view=map'],
  ['🗺️', 'Smart Route Planning', 'Find the best bus between any two stops.', '/routes'],
  ['⏱️', 'Accurate ETA', 'See the arrival time of every bus, or only your bus.', '/live?view=eta'],
  ['👥', 'Crowd Information', 'See how crowded each bus is before it arrives.', '/live?view=crowd'],
  ['💺', 'Seat Availability', 'Check free seats before boarding.', '/live?view=crowd'],
  ['🔔', 'Travel Alerts', 'Delay and service notifications.', '/notifications'],
  ['⭐', 'Favorite Routes', 'Save the routes you use every day.', '/dashboard'],
  ['📍', 'Find Stops', 'Search any bus stop by name.', '/routes'],
];

export function FeatureCard({ f }) {
  const [icon, title, text, to] = f;
  return (
    <Link to={to} className="feature link-card">
      <span>{icon}</span><h3>{title}</h3><p>{text}</p><em>Open →</em>
    </Link>
  );
}

const Head = ({ title, text }) => <div className="page-head"><h1>{title}</h1>{text && <p>{text}</p>}</div>;

export function About() {
  return (
    <>
      <Head title="About MoveSmart" text="A smart public transportation platform for easier daily travel." />
      <section className="section narrow">
        <p>MoveSmart is designed to make daily travel easier, faster and more convenient by showing where your bus is, when it will arrive, and how full it is.</p>
        <div className="grid2">
          <div className="feature"><h3>Our mission</h3><p>Make public transport reliable and easy to understand for every rider.</p></div>
          <div className="feature"><h3>Our vision</h3><p>A city where people choose the bus because it is the smartest way to travel.</p></div>
        </div>
        <h2>Why MoveSmart</h2>
        <ul className="ticks">
          <li>Real-time bus locations and honest delay information</li>
          <li>Crowd level and seat availability before you board</li>
          <li>Simple search from any stop to any stop</li>
          <li>Works on phone, tablet and desktop</li>
        </ul>
        <div className="stats inline">
          {[['500+', 'Buses'], ['1,000+', 'Stops'], ['50+', 'Routes'], ['100K+', 'Daily riders']].map(([n, l]) => (
            <div key={l}><strong>{n}</strong><span>{l}</span></div>
          ))}
        </div>
        <p className="small">Figures shown are sample values for this project.</p>
      </section>
    </>
  );
}

export function Services() {
  return (
    <>
      <Head title="Services" text="Everything MoveSmart offers riders." />
      <section className="section"><div className="grid4">
        {FEATURES.map((f) => <FeatureCard key={f[1]} f={f} />)}
      </div></section>
    </>
  );
}

const FAQS = [
  ['How can I track a bus?', 'Open Live Tracking, search the bus number, route or stop, and tap a bus to see it on the map.'],
  ['How accurate is the ETA?', 'ETA is calculated from the bus position and speed along its route. It updates every few seconds and can change with traffic.'],
  ['How do I check seat availability?', 'Every bus card shows seats free and a crowd level (low, medium or high).'],
  ['How can I save a favorite route?', 'Create a free account, search a route, then tap the star to save it. Saved routes appear in your dashboard.'],
  ['What happens if a bus is delayed?', 'The bus card shows how many minutes late it is, and delay alerts appear on the Alerts page.'],
];

export function Faq() {
  return (
    <>
      <Head title="Help & FAQ" text="Quick answers to common questions." />
      <section className="section narrow">
        {FAQS.map(([q, a]) => <details key={q} className="faq"><summary>{q}</summary><p>{a}</p></details>)}
        <p className="center">Still need help? <Link to="/contact" className="link">Contact support</Link></p>
      </section>
    </>
  );
}

export function Contact() {
  const [f, setF] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState('idle');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email) && f.subject.trim() && f.message.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setStatus('sending');
    try { await sendContact(f); setStatus('done'); setF({ name: '', email: '', phone: '', subject: '', message: '' }); }
    catch { setStatus('error'); }
  };

  return (
    <>
      <Head title="Contact & Support" text="We are happy to help." />
      <section className="section contact">
        <form className="form" onSubmit={submit} noValidate>
          <label>Name<input value={f.name} onChange={set('name')} maxLength={80} required /></label>
          <label>Email<input type="email" value={f.email} onChange={set('email')} maxLength={120} required /></label>
          <label>Phone (optional)<input type="tel" value={f.phone} onChange={set('phone')} maxLength={20} /></label>
          <label>Subject<input value={f.subject} onChange={set('subject')} maxLength={120} required /></label>
          <label>Message<textarea rows="5" value={f.message} onChange={set('message')} maxLength={2000} required /></label>
          <button className="go" disabled={!valid || status === 'sending'}>{status === 'sending' ? 'Sending...' : 'Send message'}</button>
          {status === 'done' && <p className="ok">Thank you! Your message has been received.</p>}
          {status === 'error' && <p className="error">Could not send. Please try again.</p>}
        </form>
        <aside className="feature">
          <h3>Get in touch</h3>
          <p>Email: support@movesmart.example<br />Phone: +00 000 000 0000<br />Office: 1 Transit Street, Your City</p>
          <h3>Support hours</h3>
          <p>Monday to Saturday, 8:00 AM to 8:00 PM</p>
          <p><Link to="/faq" className="link">Read the FAQ →</Link></p>
        </aside>
      </section>
    </>
  );
}

const LEGAL = {
  privacy: ['Privacy Policy', [
    ['Information we collect', 'Account details you provide (name, email, mobile number) and basic usage such as searched routes.'],
    ['How we use it', 'To show you buses, save your favorite routes and send travel alerts. We do not sell personal data.'],
    ['Security', 'Passwords are stored encrypted and data is sent over secure connections.'],
    ['Your choices', 'You can update or delete your account information at any time.'],
  ]],
  terms: ['Terms & Conditions', [
    ['Use of service', 'MoveSmart provides bus information for your convenience. Times, delays and seat counts are estimates.'],
    ['Accounts', 'You are responsible for keeping your login details safe.'],
    ['Acceptable use', 'Do not misuse the service or try to disrupt it.'],
    ['Changes', 'We may update these terms and the service from time to time.'],
  ]],
};

export function Legal({ kind }) {
  const [title, parts] = LEGAL[kind];
  return (
    <>
      <Head title={title} />
      <section className="section narrow">
        {parts.map(([h, t]) => <div key={h}><h3>{h}</h3><p>{t}</p></div>)}
        <p className="small">Sample text for this project. Replace it with your organisation's official policy before launch.</p>
      </section>
    </>
  );
}

export function Soon({ title }) {
  return (
    <>
      <Head title={title} />
      <section className="section narrow center">
        <p>This page is coming in the next update.</p>
        <Link to="/" className="btn-mint big">Back to Home</Link>
      </section>
    </>
  );
}
