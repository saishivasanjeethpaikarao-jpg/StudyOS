import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import {
  assignments, eq, getDb, inArray, resetDbInstance, subjects, syncChanges, users,
  type DbClient,
} from "@open-sunsama/database";
import { signToken } from "../lib/jwt.js";
import { issueBrowserSession, SESSION_COOKIE } from "../lib/account-sessions.js";
import { auth } from "../middleware/auth.js";
import { isAllowedBrowserOrigin } from "../lib/websocket/auth.js";
import { errorHandler } from "../middleware/error.js";
import { accountRouter } from "./account.js";
import { authRouter } from "./auth.js";
import { syncRouter } from "./sync.js";
import { uploadsRouter } from "./uploads.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)("Phase 4 account sessions and sync boundaries", () => {
  const app = new Hono();
  app.route("/auth", authRouter);
  app.route("/account", accountRouter);
  app.route("/sync", syncRouter);
  app.route("/uploads", uploadsRouter);
  app.get("/_test/issue-session", async (c) => {
    const issued = await issueBrowserSession(c, ownerId);
    return c.json(issued);
  });
  app.post("/_test/cookie-protected", auth, (c) => c.json({ success: true, userId: c.get("userId") }));
  app.onError(errorHandler);

  let db: DbClient;
  let ownerId = "";
  let otherId = "";
  let ownerToken = "";
  let otherToken = "";

  const request = (path: string, token = ownerToken, method = "GET", body?: unknown) => app.request(path, {
    method,
    headers: new Headers({ ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl!;
    resetDbInstance();
    db = getDb();
    const marker = randomUUID();
    const rows = await db.insert(users).values([
      { email: `phase4-owner-${marker}@example.test`, passwordHash: null },
      { email: `phase4-other-${marker}@example.test`, passwordHash: null },
    ]).returning({ id: users.id });
    ownerId = rows[0]!.id;
    otherId = rows[1]!.id;
    ownerToken = signToken(ownerId);
    otherToken = signToken(otherId);
  });

  afterAll(async () => {
    if (!ownerId || !otherId) return;
    await db.delete(users).where(inArray(users.id, [ownerId, otherId]));
    await resetDbInstance();
  });

  it("uses an HttpOnly session cookie and rejects unsafe requests without CSRF", async () => {
    const issuedResponse = await app.request("/_test/issue-session");
    expect(issuedResponse.status).toBe(200);
    const issued = await issuedResponse.json() as { csrfToken: string };
    const cookie = issuedResponse.headers.get("set-cookie");
    expect(cookie).toContain(`${SESSION_COOKIE}=`);
    expect(cookie).toContain("HttpOnly");
    expect((await app.request("/_test/cookie-protected", { method: "POST", headers: { Cookie: cookie!.split(";")[0]! } })).status).toBe(401);
    const accepted = await app.request("/_test/cookie-protected", {
      method: "POST", headers: { Cookie: cookie!.split(";")[0]!, "X-CSRF-Token": issued.csrfToken, Origin: "http://localhost:3000" },
    });
    expect(accepted.status).toBe(200);
    expect((await accepted.json() as { userId: string }).userId).toBe(ownerId);
    const logout = await app.request("/auth/logout", {
      method: "POST", headers: { Cookie: cookie!.split(";")[0]!, "X-CSRF-Token": issued.csrfToken, Origin: "http://localhost:3000" },
    });
    expect(logout.status).toBe(200);
    expect((await app.request("/_test/cookie-protected", { method: "POST", headers: { Cookie: cookie!.split(";")[0]! } })).status).toBe(401);
  });

  it("rejects callback state without creating a session and validates WebSocket browser origins", async () => {
    const response = await app.request("/auth/google/callback?state=not-issued&code=unused", {
      headers: { Cookie: "studyos_google_pkce=unused-verifier" },
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("google=failed");
    expect(isAllowedBrowserOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedBrowserOrigin("https://attacker.example")).toBe(false);
    expect(isAllowedBrowserOrigin(undefined)).toBe(false);
  });

  it("registers and revokes devices only within the authenticated account", async () => {
    const clientDeviceId = randomUUID();
    const created = await request("/account/devices", ownerToken, "POST", { clientDeviceId, platform: "web", displayName: "Test browser" });
    expect(created.status).toBe(201);
    const device = (await created.json() as { data: { id: string } }).data;
    expect((await request("/account/devices")).status).toBe(200);
    expect((await request(`/account/devices/${device.id}`, otherToken, "DELETE")).status).toBe(404);
    expect((await request(`/account/devices/${device.id}`, ownerToken, "DELETE")).status).toBe(200);
    const rows = await db.select().from(users).where(eq(users.id, ownerId));
    expect(rows).toHaveLength(1);
  });

  it("returns account-scoped change cursors, tombstones, and paginated bootstrap data", async () => {
    const [owned] = await db.insert(subjects).values({ userId: ownerId, name: "Phase 4 owned subject" }).returning();
    const [foreign] = await db.insert(subjects).values({ userId: otherId, name: "Phase 4 private subject" }).returning();
    const page1Response = await request("/sync/bootstrap", ownerToken, "POST", { pageSize: 1 });
    expect(page1Response.status).toBe(200);
    const page1 = (await page1Response.json() as { data: { complete: boolean; nextPageToken: string | null; snapshotSequence: string; entries: Array<{ entityType: string; data: unknown }> } }).data;
    expect(page1.entries.length).toBe(1);
    let token = page1.nextPageToken;
    let complete = page1.complete;
    const cursor = page1.snapshotSequence;
    let foundOwned = false, foundForeign = false, hiddenPassword = false;
    const inspect = (entries: Array<{ data: unknown }>) => {
      for (const entry of entries) {
        const value = JSON.stringify(entry.data);
        if (value.includes(owned!.id)) foundOwned = true;
        if (value.includes(foreign!.id) || value.includes("Phase 4 private subject")) foundForeign = true;
        if (value.includes("passwordHash") || value.includes("password_hash")) hiddenPassword = true;
      }
    };
    inspect(page1.entries);
    while (!complete) {
      const pageResponse = await request("/sync/bootstrap", ownerToken, "POST", { pageSize: 1, pageToken: token });
      expect(pageResponse.status).toBe(200);
      const page = (await pageResponse.json() as { data: typeof page1 }).data;
      inspect(page.entries);
      complete = page.complete; token = page.nextPageToken;
    }
    expect(foundOwned).toBe(true);
    expect(foundForeign).toBe(false);
    expect(hiddenPassword).toBe(false);
    const feedResponse = await request(`/sync/changes?cursor=0&limit=500`, ownerToken);
    expect(feedResponse.status).toBe(200);
    const feed = (await feedResponse.json() as { data: { changes: Array<{ entityId: string; operation: string }>; nextCursor: string } }).data;
    expect(feed.changes.some((change) => change.entityId === owned!.id)).toBe(true);
    expect(feed.changes.some((change) => change.entityId === foreign!.id)).toBe(false);
    expect(Number(feed.nextCursor)).toBeGreaterThanOrEqual(Number(cursor));

    const [assignment] = await db.insert(assignments).values({ userId: ownerId, title: "Tombstone test", dueAt: new Date("2030-01-01T00:00:00Z") }).returning();
    const before = await db.select().from(syncChanges).where(eq(syncChanges.userId, ownerId));
    await db.update(assignments).set({ deletedAt: new Date(), revision: 2, updatedAt: new Date() }).where(eq(assignments.id, assignment!.id));
    const tombstone = await db.select().from(syncChanges).where(eq(syncChanges.entityId, assignment!.id));
    expect(tombstone.at(-1)?.operation).toBe("delete");
    expect(before.length).toBeGreaterThan(0);
  });

  it("processes idempotent mutations once and returns conflicts without leaking foreign rows", async () => {
    const id = randomUUID(), mutationId = randomUUID();
    const input = { clientMutationId: mutationId, entityType: "subject", operation: "create", entityId: id, payload: { name: "Offline Biology" } };
    const first = await request("/sync/mutations", ownerToken, "POST", input);
    expect(first.status).toBe(200);
    const firstData = (await first.json() as { data: { replayed: boolean } }).data;
    expect(firstData.replayed).toBe(false);
    const replay = await request("/sync/mutations", ownerToken, "POST", input);
    expect((await replay.json() as { data: { replayed: boolean } }).data.replayed).toBe(true);
    expect((await request("/sync/mutations", ownerToken, "POST", { ...input, payload: { name: "Different content" } })).status).toBe(409);

    const [foreign] = await db.insert(subjects).values({ userId: otherId, name: "Private foreign subject" }).returning();
    const attacked = await request("/sync/mutations", ownerToken, "POST", {
      clientMutationId: randomUUID(), entityType: "subject", operation: "update", entityId: foreign!.id,
      expectedRevision: foreign!.revision, payload: { name: "stolen" },
    });
    expect(attacked.status).toBe(404);
  });

  it("does not serve another user's private upload key", async () => {
    const response = await request(`/uploads/attachments/${otherId}/private-file.pdf`);
    expect(response.status).toBe(404);
  });
});
