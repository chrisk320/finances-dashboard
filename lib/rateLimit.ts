// In-memory sliding-window rate limiter. Backing store is a module-level
// Map, so on Vercel each serverless instance has its own counters and state
// resets on cold start. That's an acceptable trade-off for a hobby demo;
// Phase B replaces this with per-account quotas tied to sign-in.

type Result =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterMs: number };

const buckets = new Map<string, number[]>();

export function consume(
  key: string,
  max: number,
  windowMs: number,
  now: number = Date.now(),
): Result {
  const cutoff = now - windowMs;
  const recent = (buckets.get(key) ?? []).filter((t) => t > cutoff);

  if (recent.length >= max) {
    const oldest = recent[0];
    const retryAfterMs = Math.max(1, oldest + windowMs - now);
    buckets.set(key, recent);
    return { ok: false, retryAfterMs };
  }

  recent.push(now);
  buckets.set(key, recent);
  return { ok: true, remaining: max - recent.length };
}

export function clientKeyFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "anon";
}
