import type { Queryable } from "./driver";

/**
 * Schema migrations, applied automatically (once per server instance, under an advisory lock) and recorded in schema_migrations.
 * They are plain SQL strings so nothing is read from disk at runtime. Add new migrations to the END of the list; never edit an applied one.
 * Domain records keep their validated shape in a JSONB `data` column (zod schemas in src/modules are the source of truth); the columns
 * beside it are the keys, relations and filters the database itself enforces and indexes.
 */
export const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: "0001_core",
    sql: `
create table if not exists meta (key text primary key, value jsonb not null);

create table brands      (slug text primary key, pos int not null default 0, data jsonb not null);
create table categories  (slug text primary key, pos int not null default 0, data jsonb not null);
create table collections (slug text primary key, pos int not null default 0, data jsonb not null);
create table departments (slug text primary key, pos int not null default 0, data jsonb not null);

create table products (
  id text primary key, slug text not null unique, pos int not null default 0,
  brand text not null, department text not null, category text not null, availability text not null,
  price_amount integer, currency char(3), updated_at timestamptz not null default now(), data jsonb not null
);
create index products_department on products (department);
create index products_category on products (category);
create index products_brand on products (brand);

-- 3D mall layout: fixtures (slots) per department and which product is pinned to which fixture
create table showroom_slots (id text primary key, department text not null, pos int not null default 0, data jsonb not null);
create index showroom_slots_department on showroom_slots (department);
create table showroom_assignments (product_id text primary key, slot_id text not null);

create table users (id text primary key, email text not null unique, pos int not null default 0, data jsonb not null);
create table orders (
  id text primary key, pos int not null default 0, user_id text, idempotency_key text,
  payment_status text not null, status text not null, created_at text not null, data jsonb not null
);
create index orders_user on orders (user_id);
create index orders_status on orders (status, payment_status);
create index orders_idem on orders (idempotency_key);
create table reset_tokens (hash text primary key, pos int not null default 0, user_id text not null, expires_at bigint not null, data jsonb not null);
create table payment_events (key text primary key, pos int not null default 0, provider text not null, order_id text, data jsonb not null);

-- admin: every change made through the store is recorded
create table audit_log (id bigserial primary key, at timestamptz not null default now(), actor text not null, action text not null);
-- messages the app would email (no mail provider is configured)
create table outbox (id bigserial primary key, at timestamptz not null default now(), recipient text not null, subject text not null, body text not null);

-- files: admin uploads (public images and 3D models) and private try-on photos and results live in the database, not on disk
create table uploads (name text primary key, kind text not null, mime text not null, bytes bytea not null, created_at timestamptz not null default now());
create table private_files (name text primary key, owner text not null, mime text not null, bytes bytea not null, created_at timestamptz not null default now());
create index private_files_owner on private_files (owner);

create table style_profiles (user_id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table tryon_jobs (id text primary key, user_id text not null, status text not null, created_at bigint not null, data jsonb not null);
create index tryon_jobs_user on tryon_jobs (user_id, created_at desc);
create table tryon_usage (id bigserial primary key, user_id text not null, at bigint not null);
create index tryon_usage_user on tryon_usage (user_id, at);
`,
  },
];

const LOCK = 7_000_001;

/** Create or upgrade the schema. Safe to call from many instances at once (advisory lock + migration ledger). */
export async function migrate(db: { transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T> }): Promise<string[]> {
  return db.transaction(async (tx) => {
    await tx.query("select pg_advisory_xact_lock($1)", [LOCK]);
    await tx.query("create table if not exists schema_migrations (id text primary key, applied_at timestamptz not null default now())");
    const done = new Set((await tx.query<{ id: string }>("select id from schema_migrations")).rows.map((r) => r.id));
    const applied: string[] = [];
    for (const m of MIGRATIONS) {
      if (done.has(m.id)) continue;
      for (const stmt of m.sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) await tx.query(stmt);
      await tx.query("insert into schema_migrations (id) values ($1)", [m.id]);
      applied.push(m.id);
    }
    return applied;
  });
}
