import 'dotenv/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) console.warn('JWT_SECRET is not set in .env: using a temporary one (everyone is logged out when the server restarts).');

export const hash = (p) => bcrypt.hash(p, 10);
export const check = (p, h) => bcrypt.compare(p, h);
export const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

export function sign(res, id, remember = true) {
  const opts = { httpOnly: true, sameSite: 'lax' };
  if (remember) opts.maxAge = 7 * 24 * 3600 * 1000;
  res.cookie('ms_token', jwt.sign({ id }, SECRET, { expiresIn: '7d' }), opts);
}
const read = (req) => { try { return jwt.verify(req.cookies.ms_token, SECRET).id; } catch { return null; } };
export const optionalAuth = (req, _res, next) => { req.userId = read(req); next(); };
export const requireAuth = (req, res, next) => {
  req.userId = read(req);
  if (!req.userId) return res.status(401).json({ error: 'Please log in' });
  next();
};
