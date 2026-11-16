import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { pool } from './db.js';
import { audit } from './audit.js';
import { wrap } from './middleware.js';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// Checks a payment PIN, with lockout after too many wrong guesses.
// Returns { ok: true } or { ok: false, status, body }.
// The user row is locked while we check, so parallel guesses cannot dodge the counter.
export async function checkPin(userId, pin, req) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const { rows } = await client.query(
      `select pin_hash, pin_failed_attempts, pin_locked_until,
              (pin_locked_until > now()) as locked,
              extract(epoch from (pin_locked_until - now())) as secs_left
       from users where id = $1 for update`,
      [userId]
    );
    const u = rows[0];

    let result;
    if (!u || !u.pin_hash) {
      result = {
        ok: false,
        status: 403,
        body: { error: 'Set a payment PIN first (Profile, then Payment PIN)', code: 'PIN_REQUIRED' },
      };
    } else if (u.locked) {
      const mins = Math.max(1, Math.ceil(Number(u.secs_left) / 60));
      result = {
        ok: false,
        status: 429,
        body: { error: `Too many wrong PINs. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`, code: 'PIN_LOCKED' },
      };
    } else {
      let attempts = u.pin_failed_attempts;
      if (u.pin_locked_until) {
        // an old lock has expired: start fresh
        await client.query('update users set pin_failed_attempts = 0, pin_locked_until = null where id = $1', [userId]);
        attempts = 0;
      }

      const good = typeof pin === 'string' && /^\d{6}$/.test(pin) && (await bcrypt.compare(pin, u.pin_hash));
      if (good) {
        if (attempts > 0) await client.query('update users set pin_failed_attempts = 0 where id = $1', [userId]);
        result = { ok: true };
      } else {
        const next = attempts + 1;
        const lock = next >= MAX_ATTEMPTS;
        await client.query(
          `update users set pin_failed_attempts = $2,
             pin_locked_until = case when $3::boolean then now() + make_interval(mins => $4::int) else null end
           where id = $1`,
          [userId, next, lock, LOCK_MINUTES]
        );
        audit(req, lock ? 'pin_locked' : 'pin_wrong', userId, { attempts: next });
        const left = MAX_ATTEMPTS - next;
        result = lock
          ? { ok: false, status: 429, body: { error: `Too many wrong PINs. Locked for ${LOCK_MINUTES} minutes.`, code: 'PIN_LOCKED' } }
          : { ok: false, status: 403, body: { error: `Wrong PIN. ${left} attempt${left === 1 ? '' : 's'} left.`, code: 'WRONG_PIN' } };
      }
    }

    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Express middleware: the app sends the PIN in the X-Payment-Pin header
export const requirePin = wrap(async (req, res, next) => {
  const result = await checkPin(req.user.id, req.get('X-Payment-Pin'), req);
  if (!result.ok) return res.status(result.status).json(result.body);
  next();
});

// At most 20 payment attempts per minute per user
const payLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: { error: 'Too many payment attempts. Wait a minute and try again.' },
});

// Put this on every route that moves money: ...paymentGuard
export const paymentGuard = [payLimiter, requirePin];
