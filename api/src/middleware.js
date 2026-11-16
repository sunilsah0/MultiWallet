import jwt from 'jsonwebtoken';
import { query } from './db.js';

// Sends any error from an async route to our error handler
export const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Blocks the request unless a valid, current login token is present
export const requireAuth = wrap(async (req, res, next) => {
  const header = req.get('Authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Please log in' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }

  // "Log out on all devices" raises token_version, which makes older tokens useless
  const { rows } = await query('select token_version from users where id = $1', [payload.sub]);
  if (!rows[0] || rows[0].token_version !== (payload.tv ?? 0)) {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }

  req.user = { id: payload.sub };
  next();
});

// Checks the request body against a zod schema
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message });
    }
    req.body = result.data;
    next();
  };
}
