import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth, validate, wrap } from '../middleware.js';

const router = Router();
const CATEGORIES = ['hotels', 'cinema', 'shop', 'food'];
const isUuid = (v) => z.string().uuid().safeParse(v).success;

// ---------- Public: anyone can browse ----------

// GET /catalog/category/food : businesses in one category
router.get(
  '/category/:category',
  wrap(async (req, res) => {
    const { category } = req.params;
    if (!CATEGORIES.includes(category)) return res.status(404).json({ error: 'Unknown category' });
    const { rows } = await query(
      `select m.id, m.name, m.category,
         (select count(*)::int from products p where p.merchant_id = m.id and p.active) as product_count,
         (select min(p.price_ore) from products p where p.merchant_id = m.id and p.active) as from_price_ore
       from merchants m
       where m.active and m.category = $1
       order by m.name`,
      [category]
    );
    res.json(rows.map((r) => ({ ...r, from_price_ore: r.from_price_ore === null ? null : Number(r.from_price_ore) })));
  })
);

// GET /catalog/merchants/:id : one business with its menu / products
router.get(
  '/merchants/:id',
  wrap(async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: 'Invalid business id' });
    const m = await query('select id, name, category from merchants where id = $1 and active', [id]);
    if (!m.rows[0]) return res.status(404).json({ error: 'Business not found' });
    const p = await query(
      `select id, name, description, price_ore, unit
       from products where merchant_id = $1 and active
       order by name`,
      [id]
    );
    res.json({
      merchant: m.rows[0],
      products: p.rows.map((r) => ({ ...r, price_ore: Number(r.price_ore) })),
    });
  })
);

// ---------- Owner only: manage my products ----------

const productSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80, 'Name is too long'),
  description: z.string().trim().max(200, 'Description is too long').optional(),
  price_ore: z.number().int().min(100, 'Minimum price is 1 kr').max(10000000, 'Maximum price is 100,000 kr'),
  unit: z.string().trim().max(20, 'Unit is too long').optional(),
});

// POST /catalog/merchants/:id/products
router.post(
  '/merchants/:id/products',
  requireAuth,
  validate(productSchema),
  wrap(async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: 'Invalid business id' });
    const own = await query('select id from merchants where id = $1 and owner_id = $2', [id, req.user.id]);
    if (!own.rows[0]) return res.status(404).json({ error: 'Business not found' });

    const { name, description, price_ore, unit } = req.body;
    const { rows } = await query(
      `insert into products (merchant_id, name, description, price_ore, unit)
       values ($1, $2, $3, $4, $5)
       returning id, name, description, price_ore, unit`,
      [id, name, description ?? null, price_ore, unit ?? '']
    );
    res.status(201).json({ ...rows[0], price_ore: Number(rows[0].price_ore) });
  })
);

// DELETE /catalog/products/:id : hide a product (old orders keep working)
router.delete(
  '/products/:id',
  requireAuth,
  wrap(async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: 'Invalid product id' });
    const { rows } = await query(
      `update products set active = false
       where id = $1 and merchant_id in (select id from merchants where owner_id = $2)
       returning id`,
      [id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json({ ok: true });
  })
);

export default router;
