import { Router } from 'express';
import { z } from 'zod';
import { pool, query } from '../db.js';
import { requireAuth, validate, wrap } from '../middleware.js';
import { getIdempotencyKey, getMyWalletId, moveMoney } from '../payments.js';
import { paymentGuard } from '../pin.js';

const router = Router();
const isUuid = (v) => z.string().uuid().safeParse(v).success;

// GET /merchants : public list of active businesses
router.get(
  '/',
  wrap(async (req, res) => {
    const { rows } = await query(
      'select id, name, category from merchants where active order by name'
    );
    res.json(rows);
  })
);

// Everything below needs a login
router.use(requireAuth);

// POST /merchants : register my own business
const createSchema = z.object({
  name: z.string().trim().min(2, 'Business name is too short').max(60, 'Business name is too long'),
  category: z.enum(['hotels', 'cinema', 'shop', 'food'], {
    errorMap: () => ({ message: 'Choose hotels, cinema, shop or food' }),
  }),
});

router.post(
  '/',
  validate(createSchema),
  wrap(async (req, res) => {
    const count = await query('select count(*)::int as n from merchants where owner_id = $1', [
      req.user.id,
    ]);
    if (count.rows[0].n >= 5) {
      return res.status(400).json({ error: 'You can register up to 5 businesses' });
    }

    // Create the business wallet and the business together, or not at all
    const client = await pool.connect();
    try {
      await client.query('begin');
      const wallet = await client.query(
        `insert into wallets (kind) values ('merchant') returning id`
      );
      const merchant = await client.query(
        `insert into merchants (name, category, wallet_id, owner_id)
         values ($1, $2, $3, $4)
         returning id, name, category`,
        [req.body.name, req.body.category, wallet.rows[0].id, req.user.id]
      );
      await client.query('commit');
      res.status(201).json(merchant.rows[0]);
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
  })
);

// GET /merchants/mine : my businesses with their balances
router.get(
  '/mine',
  wrap(async (req, res) => {
    const { rows } = await query(
      `select m.id, m.name, m.category, b.balance_ore
       from merchants m
       join wallet_balances b on b.wallet_id = m.wallet_id
       where m.owner_id = $1
       order by m.created_at`,
      [req.user.id]
    );
    res.json(rows.map((r) => ({ ...r, balance_ore: Number(r.balance_ore) })));
  })
);

// GET /merchants/:id/sales : sales dashboard (owner only)
router.get(
  '/:id/sales',
  wrap(async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: 'Invalid business id' });

    const m = await query(
      'select id, name, category, wallet_id from merchants where id = $1 and owner_id = $2',
      [id, req.user.id]
    );
    if (!m.rows[0]) return res.status(404).json({ error: 'Business not found' });
    const walletId = m.rows[0].wallet_id;

    const summary = await query(
      `select
         coalesce(sum(amount_ore) filter (where amount_ore > 0), 0) as total_ore,
         coalesce(sum(amount_ore) filter (
           where amount_ore > 0 and created_at >= date_trunc('day', now())), 0) as today_ore,
         (count(*) filter (where amount_ore > 0))::int as sales_count
       from ledger_entries
       where wallet_id = $1`,
      [walletId]
    );

    const sales = await query(
      `select t.id, t.note, t.created_at, l.amount_ore,
         (select u.full_name
          from ledger_entries l2
          join wallets w2 on w2.id = l2.wallet_id
          join users u on u.id = w2.user_id
          where l2.transaction_id = t.id and l2.wallet_id <> l.wallet_id
          limit 1) as customer
       from ledger_entries l
       join transactions t on t.id = l.transaction_id
       where l.wallet_id = $1 and l.amount_ore > 0
       order by l.id desc
       limit 50`,
      [walletId]
    );

    const s = summary.rows[0];
    res.json({
      merchant: { id: m.rows[0].id, name: m.rows[0].name, category: m.rows[0].category },
      summary: {
        total_ore: Number(s.total_ore),
        today_ore: Number(s.today_ore),
        sales_count: s.sales_count,
      },
      sales: sales.rows.map((r) => ({ ...r, amount_ore: Number(r.amount_ore) })),
    });
  })
);

// POST /merchants/:id/pay : pay a business (a simple version of "order"; real orders come in Phase 7)
const paySchema = z.object({
  amount_ore: z.number().int().min(100, 'Minimum is 1 kr').max(10000000, 'Maximum is 100,000 kr'),
  note: z.string().trim().max(140, 'Note is too long').optional(),
});

router.post(
  '/:id/pay',
  validate(paySchema),
  ...paymentGuard,
  wrap(async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: 'Invalid business id' });
    const key = getIdempotencyKey(req, res);
    if (!key) return;

    const m = await query('select wallet_id, owner_id from merchants where id = $1 and active', [id]);
    if (!m.rows[0]) return res.status(404).json({ error: 'Business not found' });
    if (m.rows[0].owner_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot pay your own business' });
    }

    const mine = await getMyWalletId(req.user.id);
    return moveMoney(res, mine, m.rows[0].wallet_id, req.body.amount_ore, key, 'order', req.body.note ?? null);
  })
);

export default router;
