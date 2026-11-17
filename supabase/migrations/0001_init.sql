-- Vestora foundation schema. Run in the Supabase SQL editor or via the Supabase CLI.
create table departments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null, description text not null default '',
  theme_key text not null, sort_order int not null default 0
);
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null, department_id uuid not null references departments(id)
);
create table collections (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null, description text not null default ''
);
create table sizes (code text primary key, label text not null);
create table colors (code text primary key, label text not null, hex text not null);
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null, description text not null default '',
  department_id uuid not null references departments(id),
  category_id uuid not null references categories(id),
  published boolean not null default false
);
create table product_collections (
  product_id uuid references products(id) on delete cascade,
  collection_id uuid references collections(id) on delete cascade,
  primary key (product_id, collection_id)
);
create table product_assets (
  product_id uuid primary key references products(id) on delete cascade,
  images text[] not null default '{}', model_url text
);
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text unique not null,
  size text not null references sizes(code), color text not null references colors(code),
  price_amount int not null check (price_amount >= 0), currency char(3) not null default 'USD'
);
create table inventory (
  variant_id uuid primary key references product_variants(id) on delete cascade,
  quantity_available int not null default 0 check (quantity_available >= 0)
);
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null, role text not null default 'customer' check (role in ('customer','admin'))
);
create table user_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  preferred_department_ids uuid[] not null default '{}', preferred_size_codes text[] not null default '{}',
  style_quiz_result jsonb not null default '{}', currency char(3) not null default 'USD'
);
create table avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references profiles(id) on delete cascade,
  height_cm numeric not null, build numeric not null, skin_tone text not null,
  hair_style_key text not null, hair_color text not null
);
create table outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade, name text not null
);
create table outfit_items (
  outfit_id uuid references outfits(id) on delete cascade,
  product_id uuid references products(id), variant_id uuid references product_variants(id),
  slot text not null
);
create table carts (
  id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete cascade
);
create table cart_items (
  cart_id uuid references carts(id) on delete cascade,
  product_id uuid references products(id), variant_id uuid references product_variants(id),
  quantity int not null check (quantity between 1 and 20), primary key (cart_id, variant_id)
);
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  status text not null default 'pending', total_amount int not null, currency char(3) not null,
  created_at timestamptz not null default now()
);
create table order_items (
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id), variant_id uuid references product_variants(id),
  quantity int not null, unit_price_amount int not null
);
create table recommendations (
  user_id uuid references profiles(id) on delete cascade, product_id uuid references products(id) on delete cascade,
  score numeric not null check (score between 0 and 1), source text not null,
  primary key (user_id, product_id, source)
);

-- Row-level security: catalog is publicly readable only when published; user data is owner-only.
alter table departments enable row level security;
alter table categories enable row level security;
alter table collections enable row level security;
alter table sizes enable row level security;
alter table colors enable row level security;
alter table products enable row level security;
alter table product_collections enable row level security;
alter table product_assets enable row level security;
alter table product_variants enable row level security;
alter table inventory enable row level security;
alter table profiles enable row level security;
alter table user_preferences enable row level security;
alter table avatars enable row level security;
alter table outfits enable row level security;
alter table outfit_items enable row level security;
alter table carts enable row level security;
alter table cart_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table recommendations enable row level security;

create policy "public read" on departments for select using (true);
create policy "public read" on categories for select using (true);
create policy "public read" on collections for select using (true);
create policy "public read" on sizes for select using (true);
create policy "public read" on colors for select using (true);
create policy "published products" on products for select using (published);
create policy "published product_collections" on product_collections for select
  using (exists (select 1 from products p where p.id = product_id and p.published));
create policy "published product_assets" on product_assets for select
  using (exists (select 1 from products p where p.id = product_id and p.published));
create policy "published variants" on product_variants for select
  using (exists (select 1 from products p where p.id = product_id and p.published));
create policy "published inventory" on inventory for select
  using (exists (select 1 from product_variants v join products p on p.id = v.product_id where v.id = variant_id and p.published));
create policy "own profile" on profiles for select using (auth.uid() = id);
create policy "own prefs" on user_preferences for all using (auth.uid() = user_id);
create policy "own avatar" on avatars for all using (auth.uid() = user_id);
create policy "own outfits" on outfits for all using (auth.uid() = user_id);
create policy "own outfit items" on outfit_items for all
  using (exists (select 1 from outfits o where o.id = outfit_id and o.user_id = auth.uid()));
create policy "own cart" on carts for all using (auth.uid() = user_id);
create policy "own cart items" on cart_items for all
  using (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy "own orders" on orders for select using (auth.uid() = user_id);
create policy "own order items" on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "own recommendations" on recommendations for select using (auth.uid() = user_id);
-- Writes to catalog, orders and recommendations happen server-side with the service role only.
