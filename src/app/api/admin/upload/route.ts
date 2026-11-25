import { NextResponse } from "next/server";
import { authorize } from "@/server/auth/guard";
import { LIMITS, saveUpload, type UploadKind } from "@/server/store/uploads";

export const dynamic = "force-dynamic";

/** multipart/form-data: kind = "image" | "model", file = the file. Needs the upload permission. */
export async function POST(req: Request) {
  const auth = authorize(req, "upload");
  if (!auth.ok) return auth.response;
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > LIMITS.model + 1024 * 1024) return NextResponse.json({ errors: ["Request too large"] }, { status: 413 });
  const form = await req.formData().catch(() => null);
  const kind = form?.get("kind"), file = form?.get("file");
  if ((kind !== "image" && kind !== "model") || !(file instanceof File)) return NextResponse.json({ errors: ["Send multipart fields: kind (image|model) and file"] }, { status: 400 });
  const r = await saveUpload(kind as UploadKind, Buffer.from(await file.arrayBuffer()));
  return r.ok ? NextResponse.json({ url: r.url, bytes: r.bytes }, { status: 201 }) : NextResponse.json({ errors: [r.error] }, { status: r.status });
}
