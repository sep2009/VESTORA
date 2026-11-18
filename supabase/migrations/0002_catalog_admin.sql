-- Vestora catalog + admin schema (supersedes 0001_init.sql).
-- STATUS: WRITTEN BUT NOT RUN. No Supabase project is connected, so this migration, its RLS policies and the
-- storage policies are untested. The running app uses the file-backed store in src/server/store (see docs/ADMIN.md).
-- Run on a fresh project: it drops the 0001 tables first.

drop table if exists product_collections, product_assets, products, sizes, colors, collections, categories, departments cascade;

-- ---------- roles ----------
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer', 'editor', 'admin'))
);
create or replace function public.current_role_name() returns text
  language sql stable security definer set search_path = public as
  $$ select coalesce((select role from profiles where user_id = auth.uid()), 'customer') $$;
create or replace function public.is_staff() returns boolean
  language sql stable security definer set search_path = public as
  $$ select public.current_role_name() in ('editor', 'admin') $$;
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as
  $$ select public.current_role_name() = 'admin' $$;

-- ---------- taxonomy ----------
create table departments (
  slug text primary key, name text not null, tagline text not null default '',
  show_in_mall boolean not null default true, sort_order int not null default 0
);
create table categories (
  slug text primary key, name text not null,
  kind text not null check (kind in ('apparel', 'footwear', 'bag', 'accessory', 'other')),
  parent text references categories(slug) on delete set null
);
create table brands (
  slug text primary key, name text not null, description text not null default '',
  website text, is_demo boolean not null default true
);
create table collections (
  slug text primary key, name text not null, description text not null default ''
);

-- ---------- products ----------
create table products (
  id text primary key,
  slug text unique not null,
  name text not null check (length(name) between 1 and 160),
  brand text not null references brands(slug),
  department text not null references departments(slug),
  category text not null references categories(slug),
  audience text not null check (audience in ('men', 'women', 'unisex')),
  description text not null default '',
  tags text[] not null default '{}',
  materials text[] not null default '{}',
  featured boolean not null default false,
  show_in_mall boolean not null default true,
  price_amount numeric(10,2) not null check (price_amount >= 0),
  sale_amount numeric(10,2) check (sale_amount is null or (sale_amount >= 0 and sale_amount < price_amount)),
  currency char(3) not null default 'USD',
  availability text not null default 'unknown' check (availability in ('in_stock', 'low_stock', 'out_of_stock', 'unknown')),
  model_url text, model_licence text,
  source_kind text not null default 'demo' check (source_kind in ('demo', 'manual', 'brand', 'affiliate')),
  source_url text, source_licence text,
  updated_at timestamptz not null default now(),
  -- real (non-demo) records must say where they came from
  constraint real_needs_source check (source_kind = 'demo' or (source_url is not null and source_licence is not null))
);
create table product_collections (
  product_id text references products(id) on delete cascade,
  collection text references collections(slug) on delete cascade,
  primary key (product_id, collection)
);
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references products(id) on delete cascade,
  url text not null, alt text not null default '', licence text, position int not null default 0
);
create table product_variants (
  sku text primary key,
  product_id text not null references products(id) on delete cascade,
  size text not null, color text not null,
  stock int not null default 0 check (stock >= 0)
);
create index on product_variants (product_id);
create index on products (department);
create index on products (category);

-- ---------- showroom placement (data, not 3D code) ----------
create table showroom_slots (
  id text primary key,
  department text not null references departments(slug) on delete cascade,
  display_type text not null,
  x real not null, z real not null, rotation real not null default 0, scale real not null default 1,
  fixture text, visible boolean not null default true
);
create table showroom_assignments (
  product_id text primary key references products(id) on delete cascade,
  slot_id text not null references showroom_slots(id) on delete cascade
);

-- ---------- audit ----------
create table audit_log (
  id bigserial primary key, at timestamptz not null default now(),
  actor uuid default auth.uid(), action text not null, detail jsonb
);

-- ---------- row level security ----------
alter table profiles enable row level security;
alter table departments enable row level security;
alter table categories enable row level security;
alter table brands enable row level security;
alter table collections enable row level security;
alter table products enable row level security;
alter table product_collections enable row level security;
alter table product_images enable row level security;
alter table product_variants enable row level security;
alter table showroom_slots enable row level security;
alter table showroom_assignments enable row level security;
alter table audit_log enable row level security;

-- Everyone may read the public catalog. Only staff may write; only admins may delete or change taxonomy/roles.
do $$ declare t text; begin
  foreach t in array array['departments','categories','brands','collections','products','product_collections','product_images','product_variants','showroom_slots','showroom_assignments'] loop
    execute format('create policy "%1$s read" on %1$I for select using (true)', t);
    execute format('create policy "%1$s staff insert" on %1$I for insert with check (public.is_staff())', t);
    execute format('create policy "%1$s staff update" on %1$I for update using (public.is_staff()) with check (public.is_staff())', t);
    execute format('create policy "%1$s admin delete" on %1$I for delete using (public.is_admin())', t);
  end loop;
end $$;
-- Taxonomy tables are admin-only for writes.
do $$ declare t text; begin
  foreach t in array array['departments','categories','brands','collections'] loop
    execute format('drop policy "%1$s staff insert" on %1$I', t);
    execute format('drop policy "%1$s staff update" on %1$I', t);
    execute format('create policy "%1$s admin insert" on %1$I for insert with check (public.is_admin())', t);
    execute format('create policy "%1$s admin update" on %1$I for update using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

create policy "own profile read" on profiles for select using (user_id = auth.uid() or public.is_admin());
create policy "admin manages profiles" on profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "admin reads audit" on audit_log for select using (public.is_admin());
create policy "staff writes audit" on audit_log for insert with check (public.is_staff());

-- ---------- storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images', 'product-images', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif','image/avif']),
  ('product-models', 'product-models', true, 26214400, array['model/gltf-binary','model/gltf+json'])
on conflict (id) do nothing;
create policy "public read product media" on storage.objects for select
  using (bucket_id in ('product-images', 'product-models'));
create policy "staff upload product media" on storage.objects for insert
  with check (bucket_id in ('product-images', 'product-models') and public.is_staff());
create policy "staff replace product media" on storage.objects for update
  using (bucket_id in ('product-images', 'product-models') and public.is_staff());
create policy "admin delete product media" on storage.objects for delete
  using (bucket_id in ('product-images', 'product-models') and public.is_admin());
