import "server-only";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { dataDir } from "@/server/store/db";
import type { Answers, Consent } from "@/modules/style/core";

/** A signed-in shopper's quiz answers and personalization choices, so they follow the account. Derived data is recomputed on read, never stored. */
type Rec = { userId: string; answers: Answers; consent: Consent; createdAt: number; updatedAt: number };
const file = () => path.join(dataDir(), "style-profiles.json");
let queue: Promise<unknown> = Promise.resolve();
const read = (): Rec[] => { try { return JSON.parse(readFileSync(file(), "utf8")) as Rec[]; } catch { return []; } };
const write = (d: Rec[]) => { mkdirSync(dataDir(), { recursive: true }); const tmp = `${file()}.${randomBytes(4).toString("hex")}.tmp`; writeFileSync(tmp, JSON.stringify(d)); renameSync(tmp, file()); };
function update<T>(fn: (d: Rec[]) => T): Promise<T> { const run = async () => { const d = read(); const r = fn(d); write(d); return r; }; const n = queue.then(run, run); queue = n.catch(() => undefined); return n; }

export const getStored = (userId: string): Rec | null => read().find((r) => r.userId === userId) ?? null;
export const putStored = (userId: string, answers: Answers, consent: Consent) => update((d) => {
  const i = d.findIndex((r) => r.userId === userId), now = Date.now();
  const rec: Rec = { userId, answers, consent, createdAt: i >= 0 ? d[i]!.createdAt : now, updatedAt: now };
  if (i >= 0) d[i] = rec; else d.push(rec);
  return rec;
});
export const deleteStored = (userId: string) => update((d) => { const n = d.length; const rest = d.filter((r) => r.userId !== userId); d.length = 0; d.push(...rest); return n - rest.length; });
