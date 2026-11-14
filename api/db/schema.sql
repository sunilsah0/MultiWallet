#BlockA
create extension if not exists pgcrypto;

-- Who the users are
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text unique,
  created_at timestamptz not null default now()
);

-- Every user, merchant and the system has a wallet
create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  kind text not null default 'user' check (kind in ('user','merchant','system')),
  currency text not null default 'SEK',
  created_at timestamptz not null default now()
);
create unique index one_wallet_per_user on public.wallets(user_id) where kind = 'user';

-- One row per payment
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'transfer' check (type in ('transfer','topup','order','refund')),
  status text not null default 'completed',
  idempotency_key text not null unique,
  note text,
  created_at timestamptz not null default now()
);

-- The ledger: two rows per payment (one minus, one plus)
create table public.ledger_entries (
  id bigint generated always as identity primary key,
  transaction_id uuid not null references public.transactions(id),
  wallet_id uuid not null references public.wallets(id),
  amount_ore bigint not null check (amount_ore <> 0),
  created_at timestamptz not null default now()
);
create index on public.ledger_entries(wallet_id);
create index on public.ledger_entries(transaction_id);

-- Businesses (hotels, cinema, shops, restaurants)
create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('hotels','cinema','shop','food')),
  wallet_id uuid not null references public.wallets(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  name text not null,
  description text,
  price_ore bigint not null check (price_ore > 0),
  active boolean not null default true
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  merchant_id uuid not null references public.merchants(id),
  total_ore bigint not null check (total_ore > 0),
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  transaction_id uuid references public.transactions(id),
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity int not null check (quantity > 0),
  unit_price_ore bigint not null
);

#BlockB

-- 1) When someone signs up, create their profile and wallet automatically
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), nullif(new.phone,''));
  insert into public.wallets (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 2) Ledger rows can never be changed or deleted
create function public.block_ledger_changes() returns trigger
language plpgsql as $$
begin
  raise exception 'ledger entries cannot be changed or deleted';
end $$;

create trigger ledger_no_change
before update or delete on public.ledger_entries
for each row execute function public.block_ledger_changes();

-- 3) Balance = sum of ledger rows
create view public.wallet_balances with (security_invoker = true) as
select w.id as wallet_id,
       coalesce(sum(l.amount_ore), 0)::bigint as balance_ore
from public.wallets w
left join public.ledger_entries l on l.wallet_id = w.id
group by w.id;

-- 4) The one safe way to move money
create function public.transfer_money(
  p_from uuid, p_to uuid, p_amount_ore bigint, p_key text,
  p_type text default 'transfer', p_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_tx uuid; v_kind text; v_balance bigint;
begin
  if p_amount_ore <= 0 then raise exception 'amount must be positive'; end if;
  if p_from = p_to then raise exception 'cannot pay yourself'; end if;

  -- lock the sender's wallet so two payments cannot spend the same money
  select kind into v_kind from wallets where id = p_from for update;
  if not found then raise exception 'sender wallet not found'; end if;
  if not exists (select 1 from wallets where id = p_to) then
    raise exception 'receiver wallet not found';
  end if;

  -- same key twice = same payment, do nothing the second time
  select id into v_tx from transactions where idempotency_key = p_key;
  if found then return v_tx; end if;

  -- enough money? (the system wallet is allowed to go negative: it creates test money)
  if v_kind <> 'system' then
    select coalesce(sum(amount_ore),0) into v_balance from ledger_entries where wallet_id = p_from;
    if v_balance < p_amount_ore then raise exception 'insufficient funds'; end if;
  end if;

  insert into transactions (type, idempotency_key, note)
  values (p_type, p_key, p_note) returning id into v_tx;

  insert into ledger_entries (transaction_id, wallet_id, amount_ore) values
    (v_tx, p_from, -p_amount_ore),
    (v_tx, p_to,    p_amount_ore);

  return v_tx;
end $$;

-- Only our backend (service role) may call it, never the app directly
revoke execute on function public.transfer_money(uuid, uuid, bigint, text, text, text)
from public, anon, authenticated;

#BLOCKC 
do $$
declare sys uuid; a uuid; b uuid;
begin
  select id into sys from wallets where kind = 'system' limit 1;
  select w.id into a from wallets w join auth.users u on u.id = w.user_id where u.email = 'anna@test.com';
  select w.id into b from wallets w join auth.users u on u.id = w.user_id where u.email = 'bob@test.com';

  perform transfer_money(sys, a, 100000, 'topup-anna-1', 'topup', 'Test top-up 1,000 kr');
  perform transfer_money(a, b, 20000, 'pay-1', 'transfer', 'Lunch');
  perform transfer_money(a, b, 20000, 'pay-1', 'transfer', 'Lunch');  -- same key: ignored
end $$;

select * from wallet_balances;
select sum(amount_ore) as must_be_zero from ledger_entries;

#BlockD 
do $$
declare sys uuid; a uuid; b uuid;
begin
  select id into sys from wallets where kind = 'system' limit 1;
  select w.id into a from wallets w join auth.users u on u.id = w.user_id where u.email = 'anna@test.com';
  select w.id into b from wallets w join auth.users u on u.id = w.user_id where u.email = 'bob@test.com';

  perform transfer_money(sys, a, 100000, 'topup-anna-1', 'topup', 'Test top-up 1,000 kr');
  perform transfer_money(a, b, 20000, 'pay-1', 'transfer', 'Lunch');
  perform transfer_money(a, b, 20000, 'pay-1', 'transfer', 'Lunch');  -- same key: ignored
end $$;

select * from wallet_balances;
select sum(amount_ore) as must_be_zero from ledger_entries;
