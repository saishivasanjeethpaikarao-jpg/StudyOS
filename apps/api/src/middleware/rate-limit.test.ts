import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { createRateLimiter } from "./rate-limit.js";

describe("Rate Limiting Middleware", () => {
  it("allows requests under the limit and returns rate limit headers", async () => {
    const app = new Hono();
    app.use(
      "/test",
      createRateLimiter({
        windowMs: 10_000,
        max: 3,
      })
    );
    app.get("/test", (c) => c.text("ok"));

    const res1 = await app.request("/test");
    expect(res1.status).toBe(200);
    expect(res1.headers.get("X-RateLimit-Limit")).toBe("3");
    expect(res1.headers.get("X-RateLimit-Remaining")).toBe("2");

    const res2 = await app.request("/test");
    expect(res2.status).toBe(200);
    expect(res2.headers.get("X-RateLimit-Remaining")).toBe("1");

    const res3 = await app.request("/test");
    expect(res3.status).toBe(200);
    expect(res3.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("blocks requests exceeding the limit with HTTP 429 and Retry-After header", async () => {
    const app = new Hono();
    app.use(
      "/auth-test",
      createRateLimiter({
        windowMs: 10_000,
        max: 2,
        message: "Throttled",
      })
    );
    app.post("/auth-test", (c) => c.text("ok"));

    const r1 = await app.request("/auth-test", { method: "POST" });
    expect(r1.status).toBe(200);

    const r2 = await app.request("/auth-test", { method: "POST" });
    expect(r2.status).toBe(200);

    const r3 = await app.request("/auth-test", { method: "POST" });
    expect(r3.status).toBe(429);
    expect(r3.headers.get("Retry-After")).toBeDefined();
    const body = (await r3.json()) as { success: boolean; error: string; retryAfter: number };
    expect(body.success).toBe(false);
    expect(body.error).toBe("Throttled");
    expect(body.retryAfter).toBeGreaterThan(0);
  });
});
