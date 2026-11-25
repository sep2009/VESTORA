import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/server/env";
import { dbFailure } from "@/server/db/driver";
import { ready } from "@/server/store/db";

export const dynamic = "force-dynamic";

/** Liveness and configuration. Checks the database (connect, schema, seed) and reports which integrations are configured. Never returns secret values. */
export async function GET() {
  try {
    const db = await ready();
    const n = (await db.query<{ products: string; migrations: string }>("select (select count(*) from products) as products, (select count(*) from schema_migrations) as migrations")).rows[0]!;
    return NextResponse.json({ ok: true, database: { engine: db.kind, products: Number(n.products), migrations: Number(n.migrations) }, supabaseConfigured: isSupabaseConfigured }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const kind = dbFailure(e);
    console.error("[health] database check failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, database: { error: kind === "config" ? "not_configured" : kind === "unreachable" ? "unreachable" : "error" } }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
