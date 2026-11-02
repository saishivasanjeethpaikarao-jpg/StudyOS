import { createHash, randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import {
  and,
  eq,
  getDb,
  googleOAuthTransactions,
  inArray,
  mobileAuthHandoffs,
  resetDbInstance,
  users,
  type DbClient,
} from "@open-sunsama/database";
import { signToken, verifyToken } from "../lib/jwt.js";
import { errorHandler } from "../middleware/error.js";
import { authRouter } from "./auth.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

describe.skipIf(!testDatabaseUrl)("Google Auth & Mobile Exchange Handoff", () => {
  const app = new Hono();
  app.route("/auth", authRouter);
  app.onError(errorHandler);

  let db: DbClient;
  let ownerId = "";
  let otherId = "";

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl!;
    resetDbInstance();
    db = getDb();
    const marker = randomUUID();
    const rows = await db
      .insert(users)
      .values([
        { email: `google-owner-${marker}@example.test`, passwordHash: null, name: "Google Owner" },
        { email: `google-other-${marker}@example.test`, passwordHash: null, name: "Google Other" },
      ])
      .returning({ id: users.id });
    ownerId = rows[0]!.id;
    otherId = rows[1]!.id;
  });

  afterAll(async () => {
    if (!ownerId || !otherId) return;
    await db.delete(users).where(inArray(users.id, [ownerId, otherId]));
    await resetDbInstance();
  });

  it("exchanges a valid, unconsumed handoff code for a valid StudyOS JWT", async () => {
    const rawCode = randomBytes(32).toString("base64url");
    await db.insert(mobileAuthHandoffs).values({
      userId: ownerId,
      codeHash: sha256(rawCode),
      expiresAt: new Date(Date.now() + 60 * 1000),
    });

    const res = await app.request("/auth/google/mobile/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: rawCode }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; data: { token: string } };
    expect(json.success).toBe(true);
    expect(typeof json.data.token).toBe("string");

    const claims = verifyToken(json.data.token);
    expect(claims?.userId).toBe(ownerId);

    // Verify in database that it is marked as consumed
    const [row] = await db
      .select()
      .from(mobileAuthHandoffs)
      .where(eq(mobileAuthHandoffs.codeHash, sha256(rawCode)));
    expect(row?.consumedAt).not.toBeNull();
  });

  it("prevents replay attacks: rejects a code that has already been consumed", async () => {
    const rawCode = randomBytes(32).toString("base64url");
    await db.insert(mobileAuthHandoffs).values({
      userId: ownerId,
      codeHash: sha256(rawCode),
      expiresAt: new Date(Date.now() + 60 * 1000),
      consumedAt: new Date(),
    });

    const res = await app.request("/auth/google/mobile/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: rawCode }),
    });

    expect(res.status).toBe(401);
    const json = (await res.json()) as { success: boolean; error: { code: string; message: string } };
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("AUTHENTICATION_ERROR");
  });

  it("rejects an expired handoff code", async () => {
    const rawCode = randomBytes(32).toString("base64url");
    await db.insert(mobileAuthHandoffs).values({
      userId: ownerId,
      codeHash: sha256(rawCode),
      expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
    });

    const res = await app.request("/auth/google/mobile/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: rawCode }),
    });

    expect(res.status).toBe(401);
    const json = (await res.json()) as { success: boolean; error: { code: string } };
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("AUTHENTICATION_ERROR");
  });

  it("rejects an unknown or tampered code", async () => {
    const unknownCode = randomBytes(32).toString("base64url");
    const res = await app.request("/auth/google/mobile/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: unknownCode }),
    });

    expect(res.status).toBe(401);
    const json = (await res.json()) as { success: boolean; error: { code: string } };
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("AUTHENTICATION_ERROR");
  });

  it("validates request payload schema strictly (minimum length and strict fields)", async () => {
    // Too short
    const shortRes = await app.request("/auth/google/mobile/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "too-short" }),
    });
    expect(shortRes.status).toBe(400);

    // Extra unknown property
    const extraRes = await app.request("/auth/google/mobile/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: randomBytes(32).toString("base64url"), extra: "forbidden" }),
    });
    expect(extraRes.status).toBe(400);
  });

  it("cascades deletion: deleting a user deletes any associated handoffs", async () => {
    const tempUserMarker = randomUUID();
    const [tempUser] = await db
      .insert(users)
      .values({ email: `temp-${tempUserMarker}@example.test`, passwordHash: null })
      .returning({ id: users.id });

    const rawCode = randomBytes(32).toString("base64url");
    await db.insert(mobileAuthHandoffs).values({
      userId: tempUser!.id,
      codeHash: sha256(rawCode),
      expiresAt: new Date(Date.now() + 60 * 1000),
    });

    // Delete user
    await db.delete(users).where(eq(users.id, tempUser!.id));

    // Verify handoff was cascade-deleted
    const remaining = await db
      .select()
      .from(mobileAuthHandoffs)
      .where(eq(mobileAuthHandoffs.codeHash, sha256(rawCode)));
    expect(remaining).toHaveLength(0);
  });

  it("records mobileRedirectUri in google_oauth_transactions during start", async () => {
    // Set minimal Google OAuth config in env for the start route
    const originalClientId = process.env.GOOGLE_CLIENT_ID;
    const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const originalRedirectUri = process.env.GOOGLE_REDIRECT_URI;
    process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/auth/google/callback";

    try {
      // 1. Valid opensunsama:// callback
      const validRes = await app.request(
        "/auth/google/start?mobile_redirect_uri=" + encodeURIComponent("opensunsama://auth/callback")
      );
      expect(validRes.status).toBe(302);
      const location = validRes.headers.get("Location");
      expect(location).toContain("accounts.google.com");

      // Verify the transaction stored in DB has the mobileRedirectUri
      const [tx] = await db
        .select()
        .from(googleOAuthTransactions)
        .where(eq(googleOAuthTransactions.mobileRedirectUri, "opensunsama://auth/callback"))
        .limit(1);
      expect(tx).toBeDefined();
      expect(tx?.mobileRedirectUri).toBe("opensunsama://auth/callback");

      // 2. Untrusted open-redirect attempt should NOT store mobileRedirectUri
      const evilRes = await app.request(
        "/auth/google/start?mobile_redirect_uri=" + encodeURIComponent("https://evil.attacker.com/steal")
      );
      expect(evilRes.status).toBe(302);
      const evilTx = await db
        .select()
        .from(googleOAuthTransactions)
        .where(eq(googleOAuthTransactions.mobileRedirectUri, "https://evil.attacker.com/steal"));
      expect(evilTx).toHaveLength(0);

      // Clean up test transactions
      await db.delete(googleOAuthTransactions).where(eq(googleOAuthTransactions.mobileRedirectUri, "opensunsama://auth/callback"));
    } finally {
      process.env.GOOGLE_CLIENT_ID = originalClientId;
      process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
      process.env.GOOGLE_REDIRECT_URI = originalRedirectUri;
    }
  });
});
