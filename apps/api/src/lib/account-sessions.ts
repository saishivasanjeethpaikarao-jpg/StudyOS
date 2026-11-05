import { createHash, randomBytes } from "node:crypto";
import { and, authSessions, eq, getDb, isNull, gt, lt } from "@open-sunsama/database";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

export const SESSION_COOKIE = "studyos_session";
const SESSION_DAYS = 30;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const secure = () => process.env.NODE_ENV === "production";

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

// Raw cookie values are never persisted; only their SHA-256 hashes are stored.
export async function issueBrowserSession(c: Context, userId: string, deviceId?: string) {
  const token = createOpaqueToken();
  const csrfToken = createOpaqueToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await getDb().insert(authSessions).values({
    userId,
    tokenHash: hash(token),
    csrfHash: hash(csrfToken),
    deviceId: deviceId ?? null,
    expiresAt,
  });
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secure(),
    sameSite: secure() ? "None" : "Lax",
    path: "/",
    expires: expiresAt,
  });
  return { csrfToken, expiresAt };
}
export async function getBrowserSession(token: string) {
  const db = getDb();
  const now = new Date();
  const [session] = await db.select().from(authSessions).where(and(
    eq(authSessions.tokenHash, hash(token)),
    isNull(authSessions.revokedAt),
    gt(authSessions.expiresAt, now),
  )).limit(1);
  if (session && session.lastActiveAt.getTime() < now.getTime() - 5 * 60 * 1000) {
    await db.update(authSessions).set({ lastActiveAt: now }).where(and(
      eq(authSessions.id, session.id), isNull(authSessions.revokedAt), lt(authSessions.lastActiveAt, new Date(now.getTime() - 5 * 60 * 1000)),
    ));
  }
  return session ?? null;
}

export async function issueCsrfToken(sessionId: string): Promise<string> {
  const csrfToken = createOpaqueToken();
  await getDb().update(authSessions).set({ csrfHash: hash(csrfToken) }).where(eq(authSessions.id, sessionId));
  return csrfToken;
}

export function matchesCsrfToken(sessionHash: string, token: string): boolean {
  return hash(token) === sessionHash;
}

export async function revokeBrowserSession(c: Context, sessionId?: string) {
  if (sessionId) {
    await getDb().update(authSessions).set({ revokedAt: new Date() }).where(and(
      eq(authSessions.id, sessionId), isNull(authSessions.revokedAt),
    ));
  } else {
    const token = getCookie(c, SESSION_COOKIE);
    if (token) {
      await getDb().update(authSessions).set({ revokedAt: new Date() }).where(and(
        eq(authSessions.tokenHash, hash(token)), isNull(authSessions.revokedAt),
      ));
    }
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/", secure: secure(), sameSite: secure() ? "None" : "Lax" });
}
// Session records remain revocable server-side even after a browser cookie is cleared.
