import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { requireAuth, wrap } from '../middleware.js';
import { phone } from '../schemas.js';

const router = Router();

// Looking up names can be abused to find out who is registered, so we slow it down
const lookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// "Anna Lindqvist" -> "Anna L." (we never show full names to strangers)
function shortName(full) {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// GET /users/lookup?phone=%2B46701234567 : who owns this number? (used before paying)
router.get(
  '/lookup',
  requireAuth,
  lookupLimiter,
  wrap(async (req, res) => {
    let raw = String(req.query.phone ?? '');
    if (raw.startsWith(' ')) raw = '+' + raw.trim(); // a "+" in a URL can arrive as a space
    const parsed = phone.safeParse(raw);
    if (!parsed.success) return res.status(400).json({ error: 'Phone must look like +46701234567' });

    const { rows } = await query('select id, full_name from users where phone = $1', [parsed.data]);
    if (!rows[0]) return res.status(404).json({ error: 'No MultiWallet user with that phone number' });
    res.json({ name: shortName(rows[0].full_name), is_me: rows[0].id === req.user.id });
  })
);

export default router;
