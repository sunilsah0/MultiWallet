import { Router } from 'express';
import { z } from 'zod';
import { pool, query } from '../db.js';
import { requireAuth, validate, wrap } from '../middleware.js';
import { SAFE_ERRORS, getIdempotencyKey } from '../payments.js';

const router = Router();
router.use(requireAuth);
const isUuid = (v) => z.string().uuid().safeParse(v).success;

// POST /orders : order + pay in ONE safe step
const orderSchema = z.object({
  merchant_id: z.string().uuid('Invalid business'),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid('Invalid product'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1').max(20, 'Maximum 20 of each item'),
      })
    )
    .min(1, 'Your cart is empty')
    .max(20, 'Too many different items'),
  note: z.string().trim().max(140, 'Note is too long').optional(),
});

router.post(
  '/',
  validate(orderSchema),
  wrap(async (req, res) => {
    const key = getIdempotencyKey(req, res);
    if (!key) return;
    const { merchant_id, items, note } = req.body;

    const ids = items.map((i) => i.product_id);
    if (new Set(ids).size !== ids.length) {
      return res.status(400).json({ error: 'The same product appears twice in the cart' });
    }

    const client = await pool.connect();
    try {
      await client.query('begin');

      // Requests with the same key wait for each other, so a retry can never double-charge
      await client.query('select pg_advisory_xact_lock(hashtext($1))', [key]);

      // Same key already produced an order? Return that order again.
      const prev = await client.query(
        `select o.id, o.total_ore, o.transaction_id
         from orders o join transactions t on t.id = o.transaction_id
         where t.idempotency_key = $1`,
        [key]
      );
      if (prev.rows[0]) {
        await client.query('commit');
        return res.status(201).json({
          order_id: prev.rows[0].id,
          transaction_id: prev.rows[0].transaction_id,
          total_ore: Number(prev.rows[0].total_ore),
        });
      }

      // The key must not belong to some other kind of payment
      const used = await client.query('select 1 from transactions where idempotency_key = $1', [key]);
      if (used.rows[0]) {
        await client.query('rollback');
        return res.status(409).json({ error: 'This Idempotency-Key was already used for another payment' });
      }

      const m = await client.query('select id, wallet_id, owner_id from merchants where id = $1 and active', [merchant_id]);
      if (!m.rows[0]) {
        await client.query('rollback');
        return res.status(404).json({ error: 'Business not found' });
      }
      if (m.rows[0].owner_id === req.user.id) {
        await client.query('rollback');
        return res.status(400).json({ error: 'You cannot order from your own business' });
      }

      // Prices ALWAYS come from the database, never from the app
      const prods = await client.query(
        `select id, name, price_ore from products
         where merchant_id = $1 and active and id = any($2::uuid[])`,
        [merchant_id, ids]
      );
      if (prods.rows.length !== ids.length) {
        await client.query('rollback');
        return res.status(400).json({ error: 'Some items are no longer available' });
      }
      const byId = new Map(prods.rows.map((p) => [p.id, p]));
      let total = 0;
      const lines = items.map((i) => {
        const p = byId.get(i.product_id);
        const unitPrice = Number(p.price_ore);
        total += unitPrice * i.quantity;
        return { product_id: p.id, name: p.name, quantity: i.quantity, unitPrice };
      });
      if (total > 10000000) {
        await client.query('rollback');
        return res.status(400).json({ error: 'Maximum order is 100,000 kr' });
      }

      const buyer = await client.query(`select id from wallets where user_id = $1 and kind = 'user'`, [req.user.id]);
      const order = await client.query(
        `insert into orders (user_id, merchant_id, total_ore, status)
         values ($1, $2, $3, 'pending') returning id`,
        [req.user.id, merchant_id, total]
      );
      const orderId = order.rows[0].id;

      for (const l of lines) {
        await client.query(
          `insert into order_items (order_id, product_id, product_name, quantity, unit_price_ore)
           values ($1, $2, $3, $4, $5)`,
          [orderId, l.product_id, l.name, l.quantity, l.unitPrice]
        );
      }

      // Pay. If this fails (for example "insufficient funds") everything above is undone.
      const tx = await client.query('select transfer_money($1, $2, $3, $4, $5, $6) as id', [
        buyer.rows[0].id, m.rows[0].wallet_id, total, key, 'order', note ?? null,
      ]);

      await client.query(`update orders set transaction_id = $1, status = 'paid' where id = $2`, [tx.rows[0].id, orderId]);
      await client.query('commit');

      res.status(201).json({ order_id: orderId, transaction_id: tx.rows[0].id, total_ore: total });
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

// GET /orders/mine : what I have ordered
router.get(
  '/mine',
  wrap(async (req, res) => {
    const { rows } = await query(
      `select o.id, o.total_ore, o.status, o.created_at, m.name as merchant_name, m.category,
         coalesce(json_agg(json_build_object(
           'name', oi.product_name, 'quantity', oi.quantity, 'unit_price_ore', oi.unit_price_ore
         ) order by oi.product_name) filter (where oi.id is not null), '[]') as items
       from orders o
       join merchants m on m.id = o.merchant_id
       left join order_items oi on oi.order_id = o.id
       where o.user_id = $1 and o.status <> 'pending'
       group by o.id, m.name, m.category
       order by o.created_at desc
       limit 50`,
      [req.user.id]
    );
    res.json(rows.map((r) => ({ ...r, total_ore: Number(r.total_ore) })));
  })
);

// GET /orders/business/:merchantId : orders my business received (owner only)
router.get(
  '/business/:merchantId',
  wrap(async (req, res) => {
    const { merchantId } = req.params;
    if (!isUuid(merchantId)) return res.status(400).json({ error: 'Invalid business id' });
    const own = await query('select id from merchants where id = $1 and owner_id = $2', [merchantId, req.user.id]);
    if (!own.rows[0]) return res.status(404).json({ error: 'Business not found' });

    const { rows } = await query(
      `select o.id, o.total_ore, o.status, o.created_at, u.full_name as customer,
         coalesce(json_agg(json_build_object(
           'name', oi.product_name, 'quantity', oi.quantity, 'unit_price_ore', oi.unit_price_ore
         ) order by oi.product_name) filter (where oi.id is not null), '[]') as items
       from orders o
       join users u on u.id = o.user_id
       left join order_items oi on oi.order_id = o.id
       where o.merchant_id = $1 and o.status <> 'pending'
       group by o.id, u.full_name
       order by o.created_at desc
       limit 50`,
      [merchantId]
    );
    res.json(rows.map((r) => ({ ...r, total_ore: Number(r.total_ore) })));
  })
);

// POST /orders/:id/complete : the owner marks an order as delivered / done
router.post(
  '/:id/complete',
  wrap(async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: 'Invalid order id' });
    const { rows } = await query(
      `update orders set status = 'completed'
       where id = $1 and status = 'paid'
         and merchant_id in (select id from merchants where owner_id = $2)
       returning id`,
      [id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Order not found or already completed' });
    res.json({ ok: true });
  })
);

export default router;
