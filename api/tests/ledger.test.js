// Automated safety tests for the money rules.  Run:  npm test
// They talk to your Neon database and create their own throw-away users
// (named "AutoTest ..."). The ledger is append-only, so those rows stay: harmless.
import 'dotenv/config';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 15 });
const q = (text, params) => pool.query(text, params);
after(() => pool.end());

async function makeUser(label) {
  const id = crypto.randomUUID();
  const phone = `+4690${String(crypto.randomInt(0, 100000000)).padStart(8, '0')}`;
  await q(
    'insert into users (id, email, phone, full_name, password_hash) values ($1, $2, $3, $4, $5)',
    [id, `autotest-${id}@example.test`, phone, `AutoTest ${label}`, 'not-a-real-hash']
  );
  const w = await q(`select id from wallets where user_id = $1 and kind = 'user'`, [id]);
  return { id, wallet: w.rows[0].id };
}

async function systemWallet() {
  const r = await q(`select id from wallets where kind = 'system' limit 1`);
  return r.rows[0].id;
}

const transfer = (from, to, amount, key = crypto.randomUUID(), type = 'transfer') =>
  q('select transfer_money($1, $2, $3, $4, $5, $6) as id', [from, to, amount, key, type, null]);

async function balance(wallet) {
  const r = await q('select balance_ore from wallet_balances where wallet_id = $1', [wallet]);
  return Number(r.rows[0].balance_ore);
}

test('a payment moves money and the two ledger rows add up to zero', async () => {
  const sys = await systemWallet();
  const a = await makeUser('A');
  const b = await makeUser('B');
  await transfer(sys, a.wallet, 10000, crypto.randomUUID(), 'topup');
  const tx = await transfer(a.wallet, b.wallet, 2500);

  assert.equal(await balance(a.wallet), 7500);
  assert.equal(await balance(b.wallet), 2500);
  const sum = await q('select sum(amount_ore) as s from ledger_entries where transaction_id = $1', [tx.rows[0].id]);
  assert.equal(Number(sum.rows[0].s), 0);
});

test('the same idempotency key only charges once', async () => {
  const sys = await systemWallet();
  const a = await makeUser('A');
  const b = await makeUser('B');
  await transfer(sys, a.wallet, 10000, crypto.randomUUID(), 'topup');
  const key = crypto.randomUUID();
  const first = await transfer(a.wallet, b.wallet, 3000, key);
  const second = await transfer(a.wallet, b.wallet, 3000, key);

  assert.equal(first.rows[0].id, second.rows[0].id);
  assert.equal(await balance(a.wallet), 7000);
});

test('you cannot spend money you do not have', async () => {
  const a = await makeUser('A');
  const b = await makeUser('B');
  await assert.rejects(transfer(a.wallet, b.wallet, 100), { message: 'insufficient funds' });
});

test('you cannot pay yourself and amounts must be positive', async () => {
  const a = await makeUser('A');
  await assert.rejects(transfer(a.wallet, a.wallet, 100), { message: 'cannot pay yourself' });
  const b = await makeUser('B');
  await assert.rejects(transfer(a.wallet, b.wallet, 0), { message: 'amount must be positive' });
  await assert.rejects(transfer(a.wallet, b.wallet, -500), { message: 'amount must be positive' });
});

test('ledger and audit log can never be edited or deleted', async () => {
  const sys = await systemWallet();
  const a = await makeUser('A');
  await transfer(sys, a.wallet, 1000, crypto.randomUUID(), 'topup');
  await assert.rejects(q('update ledger_entries set amount_ore = 1 where wallet_id = $1', [a.wallet]), /cannot be changed or deleted/);
  await assert.rejects(q('delete from ledger_entries where wallet_id = $1', [a.wallet]), /cannot be changed or deleted/);
  await assert.rejects(q('delete from audit_log where user_id = $1', [a.id]), /cannot be changed or deleted/);
});

test('10 payments at the same moment can never overspend', async () => {
  const sys = await systemWallet();
  const a = await makeUser('A');
  const b = await makeUser('B');
  await transfer(sys, a.wallet, 10000, crypto.randomUUID(), 'topup'); // 100 kr

  const results = await Promise.allSettled(
    Array.from({ length: 10 }, () => transfer(a.wallet, b.wallet, 3000)) // 10 x 30 kr
  );
  const ok = results.filter((r) => r.status === 'fulfilled').length;

  assert.equal(ok, 3); // only 3 x 30 kr fit into 100 kr
  assert.equal(await balance(a.wallet), 1000);
  assert.equal(await balance(b.wallet), 9000);
});

test('the daily limit stops a user from sending more than 20,000 kr in 24 hours', async () => {
  const sys = await systemWallet();
  const a = await makeUser('A');
  const b = await makeUser('B');
  await transfer(sys, a.wallet, 2500000, crypto.randomUUID(), 'topup'); // 25,000 kr

  await transfer(a.wallet, b.wallet, 2000000); // exactly 20,000 kr is allowed
  await assert.rejects(transfer(a.wallet, b.wallet, 100), { message: 'daily limit exceeded' });
});

test('every payment is written to the audit log', async () => {
  const sys = await systemWallet();
  const a = await makeUser('A');
  const b = await makeUser('B');
  await transfer(sys, a.wallet, 5000, crypto.randomUUID(), 'topup');
  const tx = await transfer(a.wallet, b.wallet, 1200);

  const r = await q(
    `select details from audit_log where user_id = $1 and event = 'payment' and details->>'transaction_id' = $2`,
    [a.id, tx.rows[0].id]
  );
  assert.equal(r.rows.length, 1);
  assert.equal(Number(r.rows[0].details.amount_ore), 1200);
});

test('across the whole database the ledger adds up to exactly zero', async () => {
  const r = await q('select coalesce(sum(amount_ore), 0) as s from ledger_entries');
  assert.equal(Number(r.rows[0].s), 0);
});
