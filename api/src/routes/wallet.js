import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth, validate, wrap } from '../middleware.js';
import { phone } from '../schemas.js';
import { getIdempotencyKey, getMyWalletId, moveMoney } from '../payments.js';
import { paymentGuard } from '../pin.js';

const router = Router();
router.use(requireAuth); // every wallet route needs a login

// GET /wallet : my profile and balance
router.get(
  '/',
  wrap(async (req, res) => {
    const { rows } = await query(
      `select u.id, u.full_name, u.email, u.phone, w.id as wallet_id, b.balance_ore
       from users u
       join wallets w on w.user_id = u.id and w.kind = 'user'
       join wallet_balances b on b.wallet_id = w.id
       where u.id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ ...rows[0], balance_ore: Number(rows[0].balance_ore) });
  })
);

// POST /wallet/topup : add TEST money (only while ALLOW_TEST_TOPUP=true). No PIN: it is not real money.
const topupSchema = z.object({
  amount_ore: z.number().int().min(100, 'Minimum is 100 öre').max(500000, 'Test top-up max is 5,000 kr'),
});

router.post(
  '/topup',
  validate(topupSchema),
  wrap(async (req, res) => {
    if (process.env.ALLOW_TEST_TOPUP !== 'true') {
      return res.status(403).json({ error: 'Test top-up is disabled' });
    }
    const key = getIdempotencyKey(req, res);
    if (!key) return;
    const mine = await getMyWalletId(req.user.id);
    const sys = await query(`select id from wallets where kind = 'system' limit 1`);
    return moveMoney(res, sys.rows[0].id, mine, req.body.amount_ore, key, 'topup', 'Test top-up');
  })
);

// POST /wallet/send : pay another MultiWallet user by phone number (needs the payment PIN)
const sendSchema = z.object({
  to_phone: phone,
  amount_ore: z.number().int().min(100, 'Minimum is 1 kr').max(10000000, 'Maximum is 100,000 kr'),
  note: z.string().trim().max(140, 'Note is too long').optional(),
});

router.post(
  '/send',
  validate(sendSchema),
  ...paymentGuard,
  wrap(async (req, res) => {
    const key = getIdempotencyKey(req, res);
    if (!key) return;
    const { to_phone, amount_ore, note } = req.body;

    const mine = await getMyWalletId(req.user.id);
    const recipient = await query(
      `select w.id from wallets w
       join users u on u.id = w.user_id
       where u.phone = $1 and w.kind = 'user'`,
      [to_phone]
    );
    if (!recipient.rows[0]) {
      return res.status(404).json({ error: 'No MultiWallet user with that phone number' });
    }
    return moveMoney(res, mine, recipient.rows[0].id, amount_ore, key, 'transfer', note ?? null);
  })
);

// GET /wallet/history : my last 50 money movements
router.get(
  '/history',
  wrap(async (req, res) => {
    const mine = await getMyWalletId(req.user.id);
    const { rows } = await query(
      `select t.id, t.type, t.note, t.created_at, l.amount_ore,
         (select coalesce(u.full_name, m.name, 'MultiWallet')
          from ledger_entries l2
          join wallets w2 on w2.id = l2.wallet_id
          left join users u on u.id = w2.user_id
          left join merchants m on m.wallet_id = w2.id
          where l2.transaction_id = t.id and l2.wallet_id <> l.wallet_id
          limit 1) as counterparty
       from ledger_entries l
       join transactions t on t.id = l.transaction_id
       where l.wallet_id = $1
       order by l.id desc
       limit 50`,
      [mine]
    );
    res.json(rows.map((r) => ({ ...r, amount_ore: Number(r.amount_ore) })));
  })
);

export default router;
