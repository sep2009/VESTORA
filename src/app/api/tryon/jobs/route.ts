import { PHOTO_LIMITS } from "@/modules/tryon/core";
import { fail, ok } from "@/server/store/db";
import { apiRoute } from "@/server/commerce/http";
import { createJob, deleteJobs, listJobs } from "@/server/tryon/jobs";

export const dynamic = "force-dynamic";

/** Create a try-on: multipart form with the photo, the product and the shopper's explicit consent. Signed-in customers only. */
export function POST(req: Request) {
  return apiRoute(req, { auth: "required", noBody: true, rate: { name: "tryon-create", max: Number(process.env.TRYON_RATE_PER_HOUR) || 20, windowMs: 3_600_000 } }, async ({ user, origin }) => {
    const len = Number(req.headers.get("content-length") ?? "0");
    if (!len || len > PHOTO_LIMITS.maxBytes + 64 * 1024) return fail(413, `The upload is too large (limit ${PHOTO_LIMITS.maxBytes / 1024 / 1024} MB) or empty.`);
    if (!(req.headers.get("content-type") ?? "").startsWith("multipart/form-data")) return fail(415, "Send the photo as a form upload.");
    let form: FormData;
    try { form = await req.formData(); } catch { return fail(400, "The upload could not be read."); }
    const file = form.get("photo");
    if (!(file instanceof File)) return fail(422, "Choose a photo to upload.");
    const str = (k: string, max: number) => { const v = form.get(k); return typeof v === "string" && v.length <= max ? v : null; };
    const productId = str("productId", 80);
    if (!productId) return fail(422, "Choose a product first.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    return createJob(user!, {
      productId, sku: str("sku", 60) || null, color: str("color", 40) || null, size: str("size", 20) || null, photo: bytes, origin,
      consent: { accepted: str("consent", 8) === "yes", version: str("consentVersion", 60) ?? "", providerId: str("consentProvider", 60) ?? "" }, testMode: str("testMode", 20),
    });
  });
}
export function GET(req: Request) { return apiRoute(req, { auth: "required" }, async ({ user }) => ok({ jobs: await listJobs(user!) })); }
/** Delete every try-on photo and result of the signed-in customer. */
export function DELETE(req: Request) { return apiRoute(req, { auth: "required" }, async ({ user }) => ok(await deleteJobs(user!, null))); }
