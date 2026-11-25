// A real PostgreSQL wire-protocol server (PGlite behind a socket) for exercising the production `pg` driver path locally.
// node scripts/pg-test-server.mjs [port]   then start the app with  DATABASE_URL=postgres://postgres:postgres@127.0.0.1:<port>/postgres?sslmode=disable DB_POOL_MAX=1
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
const port = Number(process.argv[2] ?? 5433);
const db = await PGlite.create();
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1" });
await server.start();
console.log(`PostgreSQL (PGlite) listening on 127.0.0.1:${port}`);
process.on("SIGINT", async () => { await server.stop(); await db.close(); process.exit(0); });
