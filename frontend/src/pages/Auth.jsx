import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

function Shell({ title, sub, children }) {
  return (
    <>
      <div className="page-head"><h1>{title}</h1><p>{sub}</p></div>
      <section className="auth"><div className="auth-card">{children}</div></section>
    </>
  );
}
const useForm = (init) => {
  const [f, setF] = useState(init);
  return [f, (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })];
};

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, set] = useForm({ id: '', password: '', remember: true });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!f.id.trim() || !f.password) return setErr('Enter your email or mobile and your password');
    setBusy(true); setErr('');
    try { await login(f); nav(loc.state?.from || '/dashboard'); } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <Shell title="Welcome back" sub="Log in to your MoveSmart account.">
      <form className="form" onSubmit={submit} noValidate>
        <label>Email or mobile number<input value={f.id} onChange={set('id')} autoComplete="username" /></label>
        <label>Password<input type="password" value={f.password} onChange={set('password')} autoComplete="current-password" /></label>
        <div className="row"><label className="check"><input type="checkbox" checked={f.remember} onChange={set('remember')} /> Remember me</label>
          <Link to="/forgot" className="link">Forgot password?</Link></div>
        {err && <p className="error">{err}</p>}
        <button className="go" disabled={busy}>{busy ? 'Logging in...' : 'Login'}</button>
        <p className="center">New here? <Link to="/signup" className="link">Create an account</Link></p>
      </form>
    </Shell>
  );
}

export function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [f, set] = useForm({ name: '', email: '', mobile: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return setErr('Enter your full name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setErr('Enter a valid email address');
    if (f.mobile && !/^[0-9+\- ]{7,15}$/.test(f.mobile)) return setErr('Enter a valid mobile number');
    if (f.password.length < 8) return setErr('Password must be at least 8 characters');
    if (f.password !== f.confirm) return setErr('Passwords do not match');
    setBusy(true); setErr('');
    try { await signup(f); nav('/dashboard'); } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <Shell title="Create your account" sub="Save routes, get alerts and track your trips.">
      <form className="form" onSubmit={submit} noValidate>
        <label>Full name<input value={f.name} onChange={set('name')} maxLength={80} autoComplete="name" /></label>
        <label>Email<input type="email" value={f.email} onChange={set('email')} autoComplete="email" /></label>
        <label>Mobile number (optional)<input type="tel" value={f.mobile} onChange={set('mobile')} autoComplete="tel" /></label>
        <label>Password (min 8 characters)<input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" /></label>
        <label>Confirm password<input type="password" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" /></label>
        {err && <p className="error">{err}</p>}
        <button className="go" disabled={busy}>{busy ? 'Creating...' : 'Create account'}</button>
        <p className="center">Already have an account? <Link to="/login" className="link">Login</Link></p>
      </form>
    </Shell>
  );
}

export function Forgot() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr('Enter a valid email address');
    setErr('');
    try { await api('/api/auth/forgot', { method: 'POST', body: { email } }); setDone(true); } catch (x) { setErr(x.message); }
  };
  return (
    <Shell title="Forgot password" sub="We will create a reset link for your account.">
      {done ? (
        <div className="form">
          <p className="ok">If an account exists for that email, a reset link has been created.</p>
          <p className="small">This project has no email service yet, so the link is printed in the backend terminal. Copy it into your browser.</p>
          <Link to="/login" className="link">Back to login</Link>
        </div>
      ) : (
        <form className="form" onSubmit={submit} noValidate>
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          {err && <p className="error">{err}</p>}
          <button className="go">Create reset link</button>
        </form>
      )}
    </Shell>
  );
}

export function Reset() {
  const [params] = useSearchParams();
  const [f, set] = useForm({ password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (f.password.length < 8) return setErr('Password must be at least 8 characters');
    if (f.password !== f.confirm) return setErr('Passwords do not match');
    setErr('');
    try { await api('/api/auth/reset', { method: 'POST', body: { token: params.get('token'), ...f } }); setDone(true); }
    catch (x) { setErr(x.message); }
  };
  return (
    <Shell title="Reset password" sub="Choose a new password.">
      {done ? (
        <div className="form"><p className="ok">Your password has been changed.</p><Link to="/login" className="go linkgo">Go to login</Link></div>
      ) : (
        <form className="form" onSubmit={submit} noValidate>
          <label>New password<input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" /></label>
          <label>Confirm new password<input type="password" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" /></label>
          {err && <p className="error">{err}</p>}
          <button className="go">Change password</button>
        </form>
      )}
    </Shell>
  );
}
