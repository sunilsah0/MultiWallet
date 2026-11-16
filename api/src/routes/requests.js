import { Router } from 'express';
import { z } from 'zod';
import { pool, query } from '../db.js';
import { requireAuth, validate, wrap } from '../middleware.js';
import { phone } from '../schemas.js';
import { SAFE_ERRORS } from '../payments.js';
import { paymentGuard } from '../pin.js';

const router = Router();
router.use(requireAuth);
const isUuid = (v) => z.string().uuid().safeParse(v).success;

// POST /requests : ask someone to pay me
const createSchema = z.object({
  from_phone: phone,
  amount_ore: z.number().int().min(100, 'Minimum is 1 kr').max(10000000, 'Maximum is 100,000 kr'),
  note: z.string().trim().max(140, 'Note is too long').optional(),
});

router.post(
  '/',
  validate(createSchema),
  wrap(async (req, res) => {
    const { from_phone, amount_ore, note } = req.body;

    const payer = await query('select id from users where phone = $1', [from_phone]);
    if (!payer.rows[0]) return res.status(404).json({ error: 'No MultiWallet user with that phone number' });
    if (payer.rows[0].id === req.user.id) {
      return res.status(400).json({ error: 'You cannot request money from yourself' });
    }

    const open = await query(
      `select count(*)::int as n from payment_requests where requester_id = $1 and status = 'pending'`,
      [req.user.id]
    );
    if (open.rows[0].n >= 20) {
      return res.status(400).json({ error: 'You have too many open requests (maximum 20)' });
    }

    const { rows } = await query(
      `insert into payment_requests (requester_id, payer_id, amount_ore, note)
       values ($1, $2, $3, $4)
       returning id, amount_ore, note, status, created_at`,
      [req.user.id, payer.rows[0].id, amount_ore, note ?? null]
    );
    res.status(201).json({ ...rows[0], amount_ore: Number(rows[0].amount_ore) });
  })
);

// GET /requests/incoming : people asking ME to pay (still open)
router.get(
  '/incoming',
  wrap(async (req, res) => {
    const { rows } = await query(
      `select r.id, r.amount_ore, r.note, r.status, r.created_at,
              u.full_name as requester_name, u.phone as requester_phone
       from payment_requests r
       join users u on u.id = r.requester_id
       where r.payer_id = $1 and r.status = 'pending'
       order by r.created_at desc
       limit 50`,
      [req.user.id]
    );
    res.json(rows.map((r) => ({ ...r, amount_ore: Number(r.amount_ore) })));
  })
);

// GET /requests/outgoing : requests I made (any status)
router.get(
  '/outgoing',
  wrap(async (req, res) => {
    const { rows } = await query(
      `select r.id, r.amount_ore, r.note, r.status, r.created_at,
              u.full_name as payer_name, u.phone as payer_phone
       from payment_requests r
       join users u on u.id = r.payer_id
       where r.requester_id = $1
       order by r.created_at desc
       limit 50`,
      [req.user.id]
    );
    res.json(rows.map((r) => ({ ...r, amount_ore: Number(r.amount_ore) })));
  })
);

// POST /requests/:id/pay : I accept and pay a request
router.post(
  '/:id/pay',
  ...paymentGuard,
  wrap(async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: 'Invalid request id' });

    const client = await pool.connect();
    try {
      await client.query('begin');

      // Lock this request row: two taps at once cannot both pay it
      const r = await client.query(
        `select id, requester_id, payer_id, amount_ore, note, status
         from payment_requests where id = $1 for update`,
        [id]
      );
      const pr = r.rows[0];
      if (!pr || pr.payer_id !== req.user.id) {
        await client.query('rollback');
        return res.status(404).json({ error: 'Request not found' });
      }
      if (pr.status !== 'pending') {
        await client.query('rollback');
        return res.status(409).json({ error: `Request is already ${pr.status}` });
      }

      const wallets = await client.query(
        `select id, user_id from wallets where kind = 'user' and user_id = any($1::uuid[])`,
        [[pr.payer_id, pr.requester_id]]
      );
      const payerWallet = wallets.rows.find((w) => w.user_id === pr.payer_id)?.id;
      const requesterWallet = wallets.rows.find((w) => w.user_id === pr.requester_id)?.id;

      // The key is built from the request id, so this request can only ever be paid once
      const tx = await client.query('select transfer_money($1, $2, $3, $4, $5, $6) as id', [
        payerWallet, requesterWallet, pr.amount_ore, `request:${id}`, 'transfer', pr.note ?? 'Payment request',
      ]);

      await client.query(
        `update payment_requests set status = 'paid', transaction_id = $1, resolved_at = now() where id = $2`,
        [tx.rows[0].id, id]
      );
      await client.query('commit');
      res.json({ ok: true, transaction_id: tx.rows[0].id });
    } catch (err) {
      await client.query('rollback').catch(() => {});
      if (err.code === 'P0001' && SAFE_ERRORS.includes(err.message)) {
        return res.status(400).json({ error: err.message });
      }
      throw err;
    } finally {
      client.release();
    }
  })
);

async function closeRequest(req, res, whoColumn, newStatus) {
  const { id } = req.params;
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid request id' });
  // whoColumn is one of our own two constants below, never user input
  const { rows } = await query(
    `update payment_requests set status = $3, resolved_at = now()
     where id = $1 and ${whoColumn} = $2 and status = 'pending'
     returning id`,
    [id, req.user.id, newStatus]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Request not found or already handled' });
  res.json({ ok: true });
}

// POST /requests/:id/decline : the person asked says no
router.post('/:id/decline', wrap((req, res) => closeRequest(req, res, 'payer_id', 'declined')));

// POST /requests/:id/cancel : the person who asked takes it back
router.post('/:id/cancel', wrap((req, res) => closeRequest(req, res, 'requester_id', 'cancelled')));

export default router;
