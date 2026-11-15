-- Phase 9: payment requests ("please pay me")
create table if not exists payment_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references users(id),
  payer_id uuid not null references users(id),
  amount_ore bigint not null check (amount_ore > 0),
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'declined', 'cancelled')),
  transaction_id uuid references transactions(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (requester_id <> payer_id)
);
create index if not exists payment_requests_payer_idx on payment_requests(payer_id, status);
create index if not exists payment_requests_requester_idx on payment_requests(requester_id, status);
