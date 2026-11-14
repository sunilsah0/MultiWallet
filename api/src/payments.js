import { query } from './db.js';

// Error messages from our database function that are safe to show users
export const SAFE_ERRORS = [
  'insufficient funds',
  'amount must be positive',
  'cannot pay yourself',
  'sender wallet not found',
  'receiver wallet not found',
];

export async function getMyWalletId(userId) {
  const { rows } = await query(
    `select id from wallets where user_id = $1 and kind = 'user'`,
    [userId]
  );
  return rows[0]?.id;
}

// A unique Idempotency-Key per payment stops double charges.
// We tie it to the user so keys of different users can never clash.
export function getIdempotencyKey(req, res) {
  const key = req.get('Idempotency-Key');
  if (!key || key.length < 8 || key.length > 100) {
    res.status(400).json({ error: 'Idempotency-Key header (8-100 characters) is required' });
    return null;
  }
  return `${req.user.id}:${key}`;
}

export async function moveMoney(res, from, to, amountOre, key, type, note) {
  try {
    const { rows } = await query(
      'select transfer_money($1, $2, $3, $4, $5, $6) as id',
      [from, to, amountOre, key, type, note]
    );
    return res.status(201).json({ transaction_id: rows[0].id });
  } catch (err) {
    if (err.code === 'P0001' && SAFE_ERRORS.includes(err.message)) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
}
