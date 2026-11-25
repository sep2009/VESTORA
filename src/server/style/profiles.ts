import "server-only";
import { ready } from "@/server/store/db";
import type { Answers, Consent } from "@/modules/style/core";

/** A signed-in shopper's quiz answers and personalization choices, so they follow the account (table `style_profiles`). Derived data is recomputed on read, never stored. */
type Rec = { userId: string; answers: Answers; consent: Consent; createdAt: number; updatedAt: number };

export async function getStored(userId: string): Promise<Rec | null> {
  const db = await ready();
  const r = (await db.query<{ data: Rec }>("select data from style_profiles where user_id = $1", [userId])).rows[0];
  return r?.data ?? null;
}
export async function putStored(userId: string, answers: Answers, consent: Consent): Promise<Rec> {
  const db = await ready(), now = Date.now();
  const prev = await getStored(userId);
  const rec: Rec = { userId, answers, consent, createdAt: prev?.createdAt ?? now, updatedAt: now };
  await db.query("insert into style_profiles (user_id, data, updated_at) values ($1, $2::jsonb, now()) on conflict (user_id) do update set data = excluded.data, updated_at = now()", [userId, JSON.stringify(rec)]);
  return rec;
}
export async function deleteStored(userId: string): Promise<number> {
  const db = await ready();
  return (await db.query("delete from style_profiles where user_id = $1 returning user_id", [userId])).rows.length;
}
