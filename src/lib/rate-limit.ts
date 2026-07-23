/**
 * Minimal in-memory sliding-window rate limiter.
 * Per-instance only — fine for a single serverless region / dev. For
 * multi-region production, swap the store for Upstash/Redis.
 */

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

const WINDOW_MS = 1000;
const MAX_PER_WINDOW = 10; // 10 req/s per user, per the PRD.

export function rateLimit(key: string, max = MAX_PER_WINDOW): boolean {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

/** Periodically evict stale buckets to bound memory. */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of store) {
      if (bucket.resetAt < now) store.delete(key);
    }
  }, 60_000).unref?.();
}
