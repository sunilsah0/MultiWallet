-- ===== BLOCK A: PIN, token version, audit log =====
alter table users add column if not exists pin_hash text;
alter table users add column if not exists pin_failed_attempts int not null default 0;
alter table users add column if not exists pin_locked_until timestamptz;
alter table users add column if not exists token_version int not null default 0;

create table if not exists audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references users(id),
  event text not null,
  ip text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists audit_user_idx on audit_log(user_id, created_at desc);
create index if not exists audit_event_idx on audit_log(event, created_at desc);

create or replace function block_audit_changes() returns trigger
language plpgsql as $$
begin
  raise exception 'audit log entries cannot be changed or deleted';
end $$;

drop trigger if exists audit_no_change on audit_log;
create trigger audit_no_change
before update or delete on audit_log
for each row execute function block_audit_changes();

-- ===== BLOCK B: transfer_money with a daily limit and automatic audit entries =====
create or replace function transfer_money(
  p_from uuid, p_to uuid, p_amount_ore bigint, p_key text,
  p_type text default 'transfer', p_note text default null
) returns uuid
language plpgsql as $$
declare
  v_tx uuid; v_kind text; v_user uuid; v_balance bigint; v_sent bigint;
begin
  if p_amount_ore <= 0 then raise exception 'amount must be positive'; end if;
  if p_from = p_to then raise exception 'cannot pay yourself'; end if;

  -- lock the sender's wallet so two payments cannot spend the same money
  select kind, user_id into v_kind, v_user from wallets where id = p_from for update;
  if not found then raise exception 'sender wallet not found'; end if;
  if not exists (select 1 from wallets where id = p_to) then
    raise exception 'receiver wallet not found';
  end if;

  -- same key twice = same payment, do nothing the second time
  select id into v_tx from transactions where idempotency_key = p_key;
  if found then return v_tx; end if;

  -- enough money? (the system wallet may go negative: it creates test money)
  if v_kind <> 'system' then
    select coalesce(sum(amount_ore), 0) into v_balance from ledger_entries where wallet_id = p_from;
    if v_balance < p_amount_ore then raise exception 'insufficient funds'; end if;
  end if;

  -- daily limit for normal users: 20,000 kr sent in any 24 hours
  if v_kind = 'user' then
    select coalesce(-sum(amount_ore), 0) into v_sent
    from ledger_entries
    where wallet_id = p_from and amount_ore < 0 and created_at > now() - interval '24 hours';
    if v_sent + p_amount_ore > 2000000 then raise exception 'daily limit exceeded'; end if;
  end if;

  insert into transactions (type, idempotency_key, note)
  values (p_type, p_key, p_note) returning id into v_tx;

  insert into ledger_entries (transaction_id, wallet_id, amount_ore) values
    (v_tx, p_from, -p_amount_ore),
    (v_tx, p_to,    p_amount_ore);

  -- every money movement is written to the audit log, inside the same database transaction
  insert into audit_log (user_id, event, details)
  values (v_user, 'payment', jsonb_build_object(
    'transaction_id', v_tx, 'type', p_type, 'amount_ore', p_amount_ore, 'to_wallet', p_to));

  return v_tx;
end $$;
