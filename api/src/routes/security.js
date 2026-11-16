import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth, validate, wrap } from '../middleware.js';
import { checkPin } from '../pin.js';
import { audit } from '../audit.js';

const router = Router();
router.use(requireAuth);

// GET /security/status : does this user have a payment PIN yet?
router.get(
  '/status',
  wrap(async (req, res) => {
    const { rows } = await query('select pin_hash is not null as has_pin from users where id = $1', [req.user.id]);
    res.json({ has_pin: Boolean(rows[0]?.has_pin) });
  })
);

const WEAK_PINS = new Set([
  '000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999',
  '123456', '654321', '012345', '123123', '121212',
]);

const pinSchema = z.object({
  pin: z
    .string()
    .regex(/^\d{6}$/, 'PIN must be exactly 6 digits')
    .refine((p) => !WEAK_PINS.has(p), 'That PIN is too easy to guess'),
  password: z.string().optional(), // needed the FIRST time
  current_pin: z.string().optional(), // needed when CHANGING the PIN
});

// POST /security/pin : set or change the payment PIN
router.post(
  '/pin',
  validate(pinSchema),
  wrap(async (req, res) => {
    const { pin, password, current_pin } = req.body;
    const { rows } = await query('select password_hash, pin_hash from users where id = $1', [req.user.id]);
    const u = rows[0];

    if (u.pin_hash) {
      const check = await checkPin(req.user.id, current_pin, req);
      if (!check.ok) return res.status(check.status).json(check.body);
    } else {
      const ok = password && (await bcrypt.compare(password, u.password_hash));
      if (!ok) return res.status(403).json({ error: 'Wrong password' });
    }

    const hash = await bcrypt.hash(pin, 10);
    await query(
      'update users set pin_hash = $2, pin_failed_attempts = 0, pin_locked_until = null where id = $1',
      [req.user.id, hash]
    );
    audit(req, 'pin_set', req.user.id);
    res.json({ ok: true });
  })
);

// POST /security/logout-all : every login token issued so far stops working
router.post(
  '/logout-all',
  wrap(async (req, res) => {
    await query('update users set token_version = token_version + 1 where id = $1', [req.user.id]);
    audit(req, 'logout_all', req.user.id);
    res.json({ ok: true });
  })
);

export default router;
