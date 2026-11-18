import "server-only";

/** Fixed-window request limiter, in memory (resets on restart; use a shared store when running several servers). */
const buckets = new Map<string, number[]>();
/** RATE_LIMIT_SCALE (default 1) multiplies every limit. Only for running the automated suites against one server; never set it in production. */
const SCALE = Math.max(1, Number(process.env.RATE_LIMIT_SCALE) || 1);
export function limited(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  max *= SCALE;
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
  return recent.length > max;
}
