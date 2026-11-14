import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db.js';
import { wrap, validate } from '../middleware.js';
import { phone } from '../schemas.js';

const router = Router();

const signToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

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
         returning id, email, phone, full_name`,
        [email, phone, full_name, hash]
      );
      res.status(201).json({ user: rows[0], token: signToken(rows[0].id) });
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
    const { rows } = await query(
      'select id, password_hash from users where email = $1',
      [email]
    );
    const user = rows[0];
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) return res.status(401).json({ error: 'Wrong email or password' });
    res.json({ token: signToken(user.id) });
  })
);

export default router;