// Applies the database schema to the PostgreSQL database named by NETLIFY_DATABASE_URL (or DATABASE_URL).
// The app also does this automatically on first use; run this to prepare the database ahead of time, e.g. in a deploy step.
//   NETLIFY_DATABASE_URL=postgres://... npm run db:migrate
import pg from "pg";
import { migrate } from "../src/server/db/schema.ts";
const url = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!url) { console.error("Set NETLIFY_DATABASE_URL (Netlify Database) or DATABASE_URL to a PostgreSQL connection string."); process.exit(1); }
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: /sslmode=disable|localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: true } });
const client = await pool.connect();
try {
  const db = { transaction: async (fn) => { try { await client.query("begin"); const r = await fn({ query: (s, p) => client.query(s, p) }); await client.query("commit"); return r; } catch (e) { await client.query("rollback").catch(() => {}); throw e; } } };
  const applied = await migrate(db);
  console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Schema is up to date.");
} finally { client.release(); await pool.end(); }
