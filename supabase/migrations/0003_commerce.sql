-- Vestora commerce schema: customer data, orders, payments, atomic stock.
-- STATUS: WRITTEN BUT NOT RUN. No Supabase project is connected; the running app uses the file store (src/server/commerce).
-- Depends on 0002_catalog_admin.sql (profiles, is_admin(), is_staff(), products, product_variants).

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default '', full_name text not null, line1 text not null, line2 text not null default '',
  city text not null, region text not null default '', postal_code text not null, country char(2) not null, phone text not null default '',
  is_default boolean not null default false
);
create table user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references products(id) on delete cascade,
  primary key (user_id, product_id)
);

create table orders (
  id text primary key,                                   -- VST-XXXXXXXX
  user_id uuid references auth.users(id) on delete set null,
  idempotency_key text,
  customer_email text not null, customer_name text not null, customer_phone text not null default '',
  shipping_address jsonb not null,
  shipping_method text not null, shipping_price int not null check (shipping_price >= 0), shipping_estimate text not null,
  currency char(3) not null,
  subtotal_regular int not null, discount int not null, subtotal int not null, total int not null check (total >= 0),
  payment_provider text not null, payment_ref text, payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','failed','cancelled','expired')),
  payment_test boolean not null default false, paid_at timestamptz,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment','processing','packed','shipped','delivered','cancelled','needs_attention')),
  reserved_until timestamptz, stock_committed boolean not null default false, refund_required boolean not null default false,
  tracking text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index orders_idem on orders (idempotency_key, customer_email) where payment_status in ('pending','paid');
create index orders_user on orders (user_id, created_at desc);
create table order_lines (
  order_id text not null references orders(id) on delete cascade,
  sku text not null, product_id text not null, name text not null, brand_name text not null, image text,
  size text, color text, quantity int not null check (quantity between 1 and 20),
  unit_regular int not null, unit_price int not null, demo boolean not null default false,
  primary key (order_id, sku)
);
create table order_notes (id bigserial primary key, order_id text not null references orders(id) on delete cascade, at timestamptz not null default now(), by text not null, body text not null);
create table order_history (id bigserial primary key, order_id text not null references orders(id) on delete cascade, at timestamptz not null default now(), event text not null);
-- Webhook idempotency: the provider's event id is unique per provider, so a duplicate delivery inserts nothing.
create table payment_events (provider text not null, event_id text not null, order_id text, type text not null, outcome text not null, at timestamptz not null default now(), primary key (provider, event_id));

-- Stock is held while payment is pending and committed only on a verified paid event.
create or replace function public.available_stock(p_sku text, p_except text default null) returns int
  language sql stable as $$
  select v.stock - coalesce((select sum(l.quantity) from order_lines l join orders o on o.id = l.order_id
    where l.sku = p_sku and o.payment_status = 'pending' and o.reserved_until > now() and o.id is distinct from p_except), 0)
  from product_variants v where v.sku = p_sku $$;

-- Atomic commit. Row locks (FOR UPDATE) on the variants make concurrent confirmations safe: stock can never go negative.
create or replace function public.commit_order_stock(p_order text) returns boolean
  language plpgsql security definer set search_path = public as $$
declare l record; ok boolean := true;
begin
  for l in select sku, sum(quantity) q from order_lines where order_id = p_order group by sku order by sku loop
    perform 1 from product_variants where sku = l.sku for update;
    if (select stock from product_variants where sku = l.sku) < l.q then ok := false; end if;
  end loop;
  if not ok then return false; end if;
  update product_variants v set stock = v.stock - x.q from (select sku, sum(quantity) q from order_lines where order_id = p_order group by sku) x where v.sku = x.sku;
  update orders set stock_committed = true where id = p_order;
  return true;
end $$;
revoke all on function public.commit_order_stock(text) from public, anon, authenticated;  -- callable only with the service role (the webhook handler)

alter table addresses enable row level security; alter table user_favorites enable row level security;
alter table orders enable row level security; alter table order_lines enable row level security;
alter table order_notes enable row level security; alter table order_history enable row level security; alter table payment_events enable row level security;
create policy "own addresses" on addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own favorites" on user_favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own orders read" on orders for select using (user_id = auth.uid() or public.is_staff());
create policy "staff update orders" on orders for update using (public.is_staff()) with check (public.is_staff());
create policy "admin delete orders" on orders for delete using (public.is_admin() and not (payment_status = 'paid' and not payment_test));
create policy "own lines read" on order_lines for select using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff())));
create policy "own history read" on order_history for select using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff())));
create policy "staff notes" on order_notes for all using (public.is_staff()) with check (public.is_staff());
-- Orders are created, and payments recorded, only by server code using the service role (which bypasses RLS). No insert policies exist for customers.
