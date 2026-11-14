-- Phase 6: businesses get an owner so they can see their own sales
alter table merchants add column if not exists owner_id uuid references users(id);
create index if not exists merchants_owner_idx on merchants(owner_id);
