import { NextResponse } from "next/server";
import { roleFromRequest } from "@/server/auth/guard";

export const dynamic = "force-dynamic";
export function GET(req: Request) {
  const role = roleFromRequest(req);
  return NextResponse.json({ role }, { status: role ? 200 : 401, headers: { "Cache-Control": "no-store" } });
}
