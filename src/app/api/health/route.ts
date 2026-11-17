import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/server/env";

/** Reports which integrations are configured. Never returns secret values. */
export function GET() {
  return NextResponse.json({ ok: true, supabaseConfigured: isSupabaseConfigured });
}
