import "server-only";

/** Login throttle: 5 failed attempts per 15 minutes per client address, in memory (resets on restart). */
const WINDOW = 15 * 60_000, MAX = 5;
const hits = new Map<string, number[]>();

export function tooMany(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW);
  hits.set(key, recent);
  return recent.length >= MAX;
}
export const recordFailure = (key: string, now = Date.now()) => hits.set(key, [...(hits.get(key) ?? []).filter((t) => now - t < WINDOW), now]);
export const clearFailures = (key: string) => hits.delete(key);
