import { NextResponse } from "next/server";
import { getIndex } from "@/server/catalog/index-data";

export const dynamic = "force-dynamic";

/** Public, read-only search index. No credentials or private fields. */
export function GET() {
  return NextResponse.json(getIndex(), { headers: { "Cache-Control": "no-store" } });
}
