import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { useAuth } from '../AuthContext';

const LINKS = [['/', 'Home'], ['/about', 'About'], ['/services', 'Services'],
  ['/routes', 'Routes'], ['/live', 'Live Tracking'], ['/contact', 'Contact']];

export default function Header() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const close = () => setOpen(false);
  const out = async () => { close(); await logout(); nav('/'); };
  return (
    <header className="site-header">
      <div className="bar-in">
        <Link to="/" onClick={close} aria-label="MoveSmart home"><Logo light /></Link>
        <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? '✕' : '☰'}</button>
        <nav className={`menu ${open ? 'open' : ''}`}>
          {LINKS.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} onClick={close}>{label}</NavLink>)}
          <NavLink to="/notifications" onClick={close} aria-label="Notifications">🔔 Alerts</NavLink>
          {user ? (
            <>
              <Link to="/dashboard" className="btn-ghost" onClick={close}>{user.name.split(' ')[0]}</Link>
              <button className="btn-mint linkbtn" onClick={out}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost" onClick={close}>Login</Link>
              <Link to="/signup" className="btn-mint" onClick={close}>Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
