import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db.js';
import { wrap, validate } from '../middleware.js';
import { phone } from '../schemas.js';
import { audit } from '../audit.js';

const router = Router();

// Tokens last 1 day and carry a "version". Raising the version in the database
// (see /security/logout-all) logs the user out of every device.
const signToken = (userId, version = 0) =>
  jwt.sign({ sub: userId, tv: version }, process.env.JWT_SECRET, { expiresIn: '1d' });

// Used so a login for an unknown email takes as long as a real one
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

const registerSchema = z.object({
  full_name: z.string().trim().min(2, 'Name is too short').max(80, 'Name is too long'),
  email: z.string().trim().toLowerCase().email('Invalid email'),
  phone,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

router.post(
  '/register',
  validate(registerSchema),
  wrap(async (req, res) => {
    const { full_name, email, phone, password } = req.body;
    const hash = await bcrypt.hash(password, 12);
    try {
      const { rows } = await query(
        `insert into users (email, phone, full_name, password_hash)
         values ($1, $2, $3, $4)
         returning id, email, phone, full_name, token_version`,
        [email, phone, full_name, hash]
      );
      const { token_version, ...user } = rows[0];
      audit(req, 'register', user.id);
      res.status(201).json({ user, token: signToken(user.id, token_version) });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Email or phone is already registered' });
      }
      throw err;
    }
  })
);

router.post(
  '/login',
  validate(loginSchema),
  wrap(async (req, res) => {
    const { email, password } = req.body;

    // Too many recent failures for this account? Make the guesser wait.
    const recent = await query(
      `select count(*)::int as n from audit_log
       where event = 'login_failed' and details->>'email' = $1
         and created_at > now() - interval '15 minutes'`,
      [email]
    );
    if (recent.rows[0].n >= 10) {
      return res.status(429).json({ error: 'Too many failed attempts. Try again in 15 minutes.' });
    }

    const { rows } = await query(
      'select id, password_hash, token_version from users where email = $1',
      [email]
    );
    const user = rows[0];
    const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) {
      audit(req, 'login_failed', user?.id ?? null, { email });
      return res.status(401).json({ error: 'Wrong email or password' });
    }

    audit(req, 'login_ok', user.id);
    res.json({ token: signToken(user.id, user.token_version) });
  })
);

export default router;
