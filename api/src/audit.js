import { query } from './db.js';

// Writes one line to the audit log. It never blocks or breaks the request.
// NEVER put passwords, PINs or tokens in `details`.
export function audit(req, event, userId, details = {}) {
  query('insert into audit_log (user_id, event, ip, details) values ($1, $2, $3, $4)', [
    userId ?? null,
    event,
    req?.ip ?? null,
    JSON.stringify(details),
  ]).catch((e) => console.error('audit log failed:', e.message));
}
