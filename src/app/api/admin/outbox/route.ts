import { adminRoute } from "@/server/store/http";
import { fail, ok, ready } from "@/server/store/db";

export const dynamic = "force-dynamic";

/**
 * Messages the app wanted to email but could not (no mail provider is configured), newest first. Admin only, and DEVELOPMENT/TEST ONLY:
 * reset links are credentials, so this endpoint does not exist in production (unless ALLOW_TEST_OUTBOX=1, for the automated tests; never set it in production). Connect a mail provider in deliverEmail instead.
 */
export const GET = (req: Request) => adminRoute(req, "taxonomy.write", async () => {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_TEST_OUTBOX !== "1") return fail(404, "Not found");
  const db = await ready();
  return ok({ messages: (await db.query("select at, recipient, subject, body from outbox order by id desc limit 50")).rows });
});
