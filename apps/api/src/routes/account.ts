import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, authSessions, eq, getDb, accountDevices, isNull, userIdentities } from "@open-sunsama/database";
import { z } from "zod";
import { auth, type AuthVariables } from "../middleware/auth.js";
import { NotFoundError, ValidationError, uuidSchema } from "@open-sunsama/utils";

const router = new Hono<{ Variables: AuthVariables }>();
router.use("*", auth);
const deviceInput = z.object({
  clientDeviceId: z.string().uuid(),
  platform: z.enum(["web", "desktop", "android", "ios"]),
  displayName: z.string().trim().min(1).max(120),
}).strict();
const idParams = z.object({ id: uuidSchema });

function requireInteractiveAccount(c: Context<{ Variables: AuthVariables }>) {
  if (!(["jwt", "cookie"].includes(c.get("authMethod")))) {
    throw new ValidationError("Account management requires a signed-in StudyOS session");
  }
}

router.get("/devices", async (c) => {
  requireInteractiveAccount(c);
  const rows = await getDb().select({
    id: accountDevices.id,
    clientDeviceId: accountDevices.clientDeviceId,
    platform: accountDevices.platform,
    displayName: accountDevices.displayName,
    createdAt: accountDevices.createdAt,
    lastActiveAt: accountDevices.lastActiveAt,
    lastSuccessfulSyncAt: accountDevices.lastSuccessfulSyncAt,
    revokedAt: accountDevices.revokedAt,
  }).from(accountDevices).where(eq(accountDevices.userId, c.get("userId"))).orderBy(accountDevices.lastActiveAt);
  return c.json({ success: true, data: rows });
});

router.get("/identities", async (c) => {
  requireInteractiveAccount(c);
  const rows = await getDb().select({
    provider: userIdentities.provider,
    emailAtLink: userIdentities.emailAtLink,
    emailVerifiedAtLink: userIdentities.emailVerifiedAtLink,
    createdAt: userIdentities.createdAt,
  }).from(userIdentities).where(eq(userIdentities.userId, c.get("userId")));
  return c.json({ success: true, data: rows });
});

router.post("/devices", zValidator("json", deviceInput), async (c) => {
  requireInteractiveAccount(c);
  const userId = c.get("userId"), input = c.req.valid("json"), db = getDb();
  const [existing] = await db.select().from(accountDevices).where(and(
    eq(accountDevices.userId, userId), eq(accountDevices.clientDeviceId, input.clientDeviceId),
  )).limit(1);
  if (existing?.revokedAt) throw new ValidationError("This device was revoked. Register it with a new device ID.");
  const [device] = existing
    ? await db.update(accountDevices).set({ platform: input.platform, displayName: input.displayName, lastActiveAt: new Date() }).where(and(eq(accountDevices.id, existing.id), eq(accountDevices.userId, userId), isNull(accountDevices.revokedAt))).returning()
    : await db.insert(accountDevices).values({ userId, ...input }).returning();
  if (!device) throw new Error("Device registration failed");
  const sessionId = c.get("sessionId");
  if (sessionId) await db.update(authSessions).set({ deviceId: device.id }).where(and(eq(authSessions.id, sessionId), eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
  return c.json({ success: true, data: device }, existing ? 200 : 201);
});

router.delete("/devices/:id", zValidator("param", idParams), async (c) => {
  requireInteractiveAccount(c);
  const userId = c.get("userId"), id = c.req.valid("param").id, now = new Date(), db = getDb();
  const changed = await db.transaction(async (tx) => {
    const [device] = await tx.update(accountDevices).set({ revokedAt: now }).where(and(
      eq(accountDevices.id, id), eq(accountDevices.userId, userId), isNull(accountDevices.revokedAt),
    )).returning({ id: accountDevices.id });
    if (!device) return false;
    await tx.update(authSessions).set({ revokedAt: now }).where(and(
      eq(authSessions.deviceId, device.id), eq(authSessions.userId, userId), isNull(authSessions.revokedAt),
    ));
    return true;
  });
  if (!changed) throw new NotFoundError("Device not found");
  return c.json({ success: true });
});

router.get("/sessions", async (c) => {
  requireInteractiveAccount(c);
  const rows = await getDb().select({
    id: authSessions.id, deviceId: authSessions.deviceId, createdAt: authSessions.createdAt,
    lastActiveAt: authSessions.lastActiveAt, expiresAt: authSessions.expiresAt,
  }).from(authSessions).where(and(eq(authSessions.userId, c.get("userId")), isNull(authSessions.revokedAt)));
  return c.json({ success: true, data: rows });
});

router.delete("/sessions/:id", zValidator("param", idParams), async (c) => {
  requireInteractiveAccount(c);
  const result = await getDb().update(authSessions).set({ revokedAt: new Date() }).where(and(
    eq(authSessions.id, c.req.valid("param").id), eq(authSessions.userId, c.get("userId")), isNull(authSessions.revokedAt),
  )).returning({ id: authSessions.id });
  if (!result.length) throw new NotFoundError("Session not found");
  return c.json({ success: true });
});

export { router as accountRouter };
