import type { MiddlewareHandler } from "hono";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (c: any) => string;
}

interface WindowRecord {
  timestamps: number[];
}

export function createRateLimiter(options: RateLimitOptions): MiddlewareHandler {
  const {
    windowMs,
    max,
    message = "Too many requests. Please try again later.",
    keyGenerator = (c) => {
      const forwarded = c.req.header("x-forwarded-for");
      if (forwarded) {
        return forwarded.split(",")[0].trim();
      }
      return (
        c.req.header("cf-connecting-ip") ||
        c.req.header("x-real-ip") ||
        "127.0.0.1"
      );
    },
  } = options;

  const hits = new Map<string, WindowRecord>();

  // Cleanup old records every 2 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < windowMs);
      if (record.timestamps.length === 0) {
        hits.delete(key);
      }
    }
  }, Math.max(windowMs, 60_000));

  if (typeof cleanupInterval.unref === "function") {
    cleanupInterval.unref();
  }

  return async (c, next) => {
    const now = Date.now();
    const key = keyGenerator(c);
    let record = hits.get(key);

    if (!record) {
      record = { timestamps: [] };
      hits.set(key, record);
    }

    // Retain only timestamps within the current sliding window
    record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

    if (record.timestamps.length >= max) {
      const oldest = record.timestamps[0] ?? now;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((windowMs - (now - oldest)) / 1000)
      );

      c.header("Retry-After", String(retryAfterSeconds));
      c.header("X-RateLimit-Limit", String(max));
      c.header("X-RateLimit-Remaining", "0");
      c.header("X-RateLimit-Reset", String(Math.ceil((oldest + windowMs) / 1000)));

      return c.json(
        {
          success: false,
          error: message,
          retryAfter: retryAfterSeconds,
        },
        429
      );
    }

    record.timestamps.push(now);

    c.header("X-RateLimit-Limit", String(max));
    c.header(
      "X-RateLimit-Remaining",
      String(Math.max(0, max - record.timestamps.length))
    );

    return await next();
  };
}

/** Pre-configured rate limiter for authentication endpoints: max 10 requests per minute per IP */
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many authentication attempts. Please try again in 1 minute.",
});
