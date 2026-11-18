import { NextResponse } from "next/server";
import { COOKIE } from "@/server/auth/session";

export async function POST(req: Request) {
  if (req.headers.get("x-vestora-csrf") !== "1") return NextResponse.json({ errors: ["Missing CSRF header"] }, { status: 403 });
  return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`, "Cache-Control": "no-store" } });
}
