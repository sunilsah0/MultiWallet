-- ===== BLOCK A: schema changes =====
alter table products add column if not exists unit text not null default '';
alter table order_items add column if not exists product_name text not null default '';

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('pending', 'paid', 'completed', 'cancelled'));

create index if not exists orders_user_idx on orders(user_id);
create index if not exists orders_merchant_idx on orders(merchant_id);
create index if not exists products_merchant_idx on products(merchant_id);

-- ===== BLOCK B: demo businesses (fictional names). Run ONCE. =====
create function seed_business(p_name text, p_category text, p_products jsonb) returns void
language plpgsql as $$
declare w uuid; m uuid; p jsonb;
begin
  insert into wallets (kind) values ('merchant') returning id into w;
  insert into merchants (name, category, wallet_id) values (p_name, p_category, w) returning id into m;
  for p in select value from jsonb_array_elements(p_products) loop
    insert into products (merchant_id, name, description, price_ore, unit)
    values (m, p->>'name', p->>'description', (p->>'price_ore')::bigint, coalesce(p->>'unit', ''));
  end loop;
end $$;

select seed_business('Hotel Skeppsbron', 'hotels', '[
  {"name":"Standard Double Room","description":"Queen bed, city view","price_ore":149000,"unit":"per night"},
  {"name":"Superior Room with Breakfast","description":"King bed, breakfast included","price_ore":189000,"unit":"per night"},
  {"name":"Family Suite","description":"Two rooms, sleeps 4","price_ore":259000,"unit":"per night"}
]'::jsonb);

select seed_business('Cine Sodermalm', 'cinema', '[
  {"name":"Adult ticket","description":"Any evening show","price_ore":14900,"unit":"per ticket"},
  {"name":"Child ticket","description":"Under 12 years","price_ore":9900,"unit":"per ticket"},
  {"name":"Popcorn combo","description":"Large popcorn and a drink","price_ore":8900,"unit":"each"}
]'::jsonb);

select seed_business('Nordic Gadgets', 'shop', '[
  {"name":"Wireless Earbuds","description":"Bluetooth 5, 24h battery","price_ore":69900,"unit":"each"},
  {"name":"Phone Case","description":"Shock-proof, clear","price_ore":14900,"unit":"each"},
  {"name":"USB-C Charger","description":"30W fast charger","price_ore":24900,"unit":"each"}
]'::jsonb);

select seed_business('Sushi Stockholm', 'food', '[
  {"name":"Salmon Nigiri Set","description":"8 pieces","price_ore":12900,"unit":"each"},
  {"name":"Veggie Maki","description":"12 pieces","price_ore":9900,"unit":"each"},
  {"name":"Miso Soup","description":"Warm and light","price_ore":4900,"unit":"each"}
]'::jsonb);

drop function seed_business(text, text, jsonb);
