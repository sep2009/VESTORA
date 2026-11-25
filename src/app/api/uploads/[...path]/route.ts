import { readUpload } from "@/server/store/uploads";

export const dynamic = "force-dynamic";

/** Public read of uploaded product images and models. Only files this app generated can be requested. */
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const file = await readUpload((await ctx.params).path.join("/"));
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.bytes), { headers: { "Content-Type": file.mime, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Cache-Control": "public, max-age=31536000, immutable" } });
}
