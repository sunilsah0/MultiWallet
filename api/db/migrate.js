// Applies the SQL files in api/db to a database, each one only once.
//
//   DATABASE_URL="postgresql://..." npm run migrate    a NEW, empty database: builds everything
//   npm run migrate -- --baseline                      a database that already has everything
//                                                      (your dev database): just records the files as done
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const dir = path.dirname(fileURLToPath(import.meta.url));
const FILES = ['schema.sql', 'phase6.sql', 'phase7.sql', 'phase9.sql', 'phase10.sql']; // the order matters
const baseline = process.argv.includes('--baseline');

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}
for (const f of FILES) {
  if (!fs.existsSync(path.join(dir, f))) {
    console.error(`Missing file api/db/${f}`);
    process.exit(1);
  }
}

console.log(`Database host: ${new URL(process.env.DATABASE_URL).host}`);
console.log(baseline ? 'Mode: baseline (nothing is executed)' : 'Mode: apply');

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(
    'create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())'
  );
  const done = new Set((await client.query('select name from schema_migrations')).rows.map((r) => r.name));

  for (const file of FILES) {
    if (done.has(file)) {
      console.log(`skip   ${file} (already applied)`);
      continue;
    }
    if (baseline) {
      await client.query('insert into schema_migrations (name) values ($1)', [file]);
      console.log(`mark   ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    process.stdout.write(`apply  ${file} ... `);
    try {
      await client.query('begin');
      await client.query(sql); // the whole file, as one all-or-nothing step
      await client.query('insert into schema_migrations (name) values ($1)', [file]);
      await client.query('commit');
      console.log('ok');
    } catch (err) {
      await client.query('rollback').catch(() => {});
      console.log('FAILED');
      console.error(err.message);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  await client.end();
}
console.log(process.exitCode ? 'Stopped because of an error (nothing from the failed file was kept).' : 'Done.');
