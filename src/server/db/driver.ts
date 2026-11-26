import "server-only";

/**
 * Database connection. PRODUCTION uses PostgreSQL through the connection string Netlify Database provides
 * (NETLIFY_DB_URL; NETLIFY_DATABASE_URL and DATABASE_URL work too). Nothing is ever written to the filesystem.
 *
 * Local development and the automated tests, when no connection string is set and NODE_ENV is not "production", use PGlite:
 * a real PostgreSQL engine (WebAssembly) held in memory, seeded on first use. It is never used in production: a missing
 * connection string in production is a configuration error and is reported as one. (VESTORA_DB=pglite explicitly allows the in-memory engine
 * with a production build, for local verification and the test suite only. Never set it on Netlify.)
 */
export type Row = Record<string, unknown>;
export type Queryable = { query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> };
export type Db = Queryable & { transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>; kind: "postgres" | "pglite" };

export class DbConfigError extends Error { constructor(message: string) { super(message); this.name = "DbConfigError"; } }

/** Classifies an error as a database availability problem ("config" = no connection string, "unreachable" = cannot connect/authenticate/time out), or null. */
export function dbFailure(e: unknown): "config" | "unreachable" | null {
  if (e instanceof DbConfigError) return "config";
  const m = e instanceof Error ? `${e.name} ${e.message} ${(e as { code?: string }).code ?? ""}` : "";
  return /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET|EAI_AGAIN|Connection terminated|timeout expired|password authentication|no pg_hba|SSL|57P01|53300|08006|08001|3D000/i.test(m) ? "unreachable" : null;
}
export const UNAVAILABLE = "The service is temporarily unavailable. Please try again in a moment.";

/** NETLIFY_DB_URL is what Netlify Database sets; NETLIFY_DATABASE_URL is its older name; DATABASE_URL is any other PostgreSQL (e.g. Neon). */
export const connectionString = () => process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || null;

type G = { __vestoraDb?: Promise<Db> };
const g = globalThis as unknown as G;

async function connectPostgres(url: string): Promise<Db> {
  const { Pool } = await import("pg");
  // Serverless: a few short-lived connections per function instance. Netlify Database pools on its side.
  const pool = new Pool({ connectionString: url, max: Number(process.env.DB_POOL_MAX) || 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000, ssl: /sslmode=disable|localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: true } });
  pool.on("error", (e) => console.error("[db] idle client error", e.message));
  return {
    kind: "postgres",
    query: (sql, params) => pool.query(sql, params as unknown[]) as never,
    async transaction(fn) {
      const c = await pool.connect();
      try { await c.query("begin"); const r = await fn({ query: (s, p) => c.query(s, p as unknown[]) as never }); await c.query("commit"); return r; }
      catch (e) { try { await c.query("rollback"); } catch { /* connection already broken */ } throw e; }
      finally { c.release(); }
    },
  };
}

async function connectPglite(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DATA_DIR; // optional: keep local development data between restarts (development only)
  const db = dir ? new PGlite(dir) : new PGlite();
  await db.waitReady;
  return {
    kind: "pglite",
    query: (sql, params) => db.query(sql, params as unknown[]) as never,
    transaction: (fn) => db.transaction((tx) => fn({ query: (s, p) => tx.query(s, p as unknown[]) as never })),
  };
}

/** One connection pool per server instance. A failed attempt is not cached, so the next request retries. */
export function getDb(): Promise<Db> {
  if (!g.__vestoraDb) {
    const url = connectionString();
    if (!url && process.env.NODE_ENV === "production" && process.env.VESTORA_DB !== "pglite") throw new DbConfigError("No database is configured. Set NETLIFY_DB_URL (Netlify Database) or DATABASE_URL to a PostgreSQL connection string.");
    const p = url ? connectPostgres(url) : connectPglite();
    g.__vestoraDb = p;
    p.catch(() => { if (g.__vestoraDb === p) g.__vestoraDb = undefined; });
  }
  return g.__vestoraDb;
}
