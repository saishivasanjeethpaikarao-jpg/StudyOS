import { createHash, randomBytes } from "node:crypto";
import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { and, eq, getDb, googleOAuthTransactions, gt, sql, userIdentities, users, mobileAuthHandoffs, isNull } from "@open-sunsama/database";
import type { AuthVariables } from "../middleware/auth.js";
import { auth } from "../middleware/auth.js";
import { getBrowserSession, issueBrowserSession, SESSION_COOKIE } from "../lib/account-sessions.js";
import { signToken } from "../lib/jwt.js";
import { AuthenticationError } from "@open-sunsama/utils";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const router = new Hono<{ Variables: AuthVariables }>();
const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const PKCE_COOKIE = "studyos_google_pkce";
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const randomToken = () => randomBytes(32).toString("base64url");
const isSecure = () => process.env.NODE_ENV === "production";

function config() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new Error("Google sign-in is not configured");
  return { clientId, clientSecret, redirectUri };
}

function appRedirect(result: "success" | "unavailable" | "failed", token?: string) {
  const base = process.env.WEB_APP_ORIGIN || "http://localhost:3000";
  const url = new URL(result === "success" ? "/app" : "/login", base);
  if (result !== "success") {
    url.searchParams.set("google", result);
  } else if (token) {
    url.hash = `token=${token}`;
  }
  return url.toString();
}

function safeMobileRedirect(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "studyos:" || url.protocol === "opensunsama:") {
      const path = (url.host ? `${url.host}${url.pathname}` : url.pathname.replace(/^\/\//, "")).toLowerCase();
      return path.startsWith("auth/callback") || path === "auth/callback" ? value : null;
    }
    const allowed = (process.env.MOBILE_OAUTH_REDIRECT_URIS || "")
      .split(",").map((item) => item.trim()).filter(Boolean);
    return allowed.includes(value) ? value : null;
  } catch {
    return null;
  }
}

function sameSiteBrowserRequest(c: Context): boolean {
  const fetchSite = c.req.header("Sec-Fetch-Site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) return false;
  const origin = c.req.header("Origin");
  if (!origin) return true;
  const allowed = (process.env.CORS_ORIGIN || process.env.WEB_APP_ORIGIN || "http://localhost:3000")
    .split(",").map((value) => value.trim());
  return allowed.includes(origin);
}

async function start(c: Context<{ Variables: AuthVariables }>, intent: "login" | "link", userId?: string, mobileRedirectUri?: string | null) {
  let oauth;
  try { oauth = config(); } catch { return c.json({ success: false, error: "Google sign-in is unavailable" }, 503); }
  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken();
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  await getDb().insert(googleOAuthTransactions).values({
    stateHash: sha256(state), nonceHash: sha256(nonce), userId: userId ?? null, intent,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    mobileRedirectUri: mobileRedirectUri ?? null,
  });
  setCookie(c, PKCE_COOKIE, verifier, { httpOnly: true, secure: isSecure(), sameSite: "Lax", path: "/auth/google/callback", maxAge: 300 });
  const target = new URL(GOOGLE_AUTH);
  target.searchParams.set("client_id", oauth.clientId);
  target.searchParams.set("redirect_uri", oauth.redirectUri);
  target.searchParams.set("response_type", "code");
  target.searchParams.set("scope", "openid email profile");
  target.searchParams.set("state", state);
  target.searchParams.set("nonce", nonce);
  target.searchParams.set("code_challenge", challenge);
  target.searchParams.set("code_challenge_method", "S256");
  target.searchParams.set("prompt", "select_account");
  return c.redirect(target.toString(), 302);
}

router.get("/start", async (c) => start(c, "login", undefined, safeMobileRedirect(c.req.query("mobile_redirect_uri"))));
router.get("/link", auth, async (c) => {
  if (c.get("authMethod") !== "cookie") return c.json({ success: false, error: "Sign in with a browser session to link Google" }, 401);
  if (!sameSiteBrowserRequest(c)) return c.json({ success: false, error: "Browser origin not allowed" }, 403);
  return start(c, "link", c.get("userId"));
});

router.get("/callback", async (c) => {
  const state = c.req.query("state");
  const code = c.req.query("code");
  const verifier = getCookie(c, PKCE_COOKIE);
  deleteCookie(c, PKCE_COOKIE, { path: "/auth/google/callback", secure: isSecure(), sameSite: "Lax" });
  if (!state || !code || !verifier) return c.redirect(appRedirect("failed"));

  const db = getDb();
  const [transaction] = await db.delete(googleOAuthTransactions).where(and(
    eq(googleOAuthTransactions.stateHash, sha256(state)),
    gt(googleOAuthTransactions.expiresAt, new Date()),
  )).returning();
  if (!transaction) return c.redirect(appRedirect("failed"));

  let oauth;
  try { oauth = config(); } catch { return c.redirect(appRedirect("unavailable")); }
  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: oauth.clientId, client_secret: oauth.clientSecret,
        redirect_uri: oauth.redirectUri, grant_type: "authorization_code", code_verifier: verifier,
      }),
    });
    if (!tokenResponse.ok) return c.redirect(appRedirect("failed"));
    const tokens = await tokenResponse.json() as { id_token?: string };
    if (!tokens.id_token) return c.redirect(appRedirect("failed"));
    const verified = await jwtVerify(tokens.id_token, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"], audience: oauth.clientId,
    });
    const claims = verified.payload;
    if (typeof claims.sub !== "string" || typeof claims.email !== "string" || claims.email_verified !== true ||
        typeof claims.exp !== "number" || claims.exp <= Math.floor(Date.now() / 1000) ||
        typeof claims.nonce !== "string" || sha256(claims.nonce) !== transaction.nonceHash) {
      return c.redirect(appRedirect("failed"));
    }
    const googleSubject = claims.sub;

    let userId = transaction.userId;
    if (transaction.intent === "link") {
      const sessionToken = getCookie(c, SESSION_COOKIE);
      const session = sessionToken ? await getBrowserSession(sessionToken) : null;
      if (!userId || !session || session.userId !== userId) return c.redirect(appRedirect("failed"));
      const [existing] = await db.select().from(userIdentities).where(and(
        eq(userIdentities.provider, "google"), eq(userIdentities.providerSubject, googleSubject),
      )).limit(1);
      if (existing && existing.userId !== userId) return c.redirect(appRedirect("failed"));
      if (!existing) await db.insert(userIdentities).values({
        userId, provider: "google", providerSubject: googleSubject,
        emailAtLink: claims.email.toLowerCase(), emailVerifiedAtLink: new Date(),
      });
      return c.redirect(appRedirect("success"));
    }

    const [identity] = await db.select().from(userIdentities).where(and(
      eq(userIdentities.provider, "google"), eq(userIdentities.providerSubject, googleSubject),
    )).limit(1);
    if (identity) {
      userId = identity.userId;
    } else {
      const email = claims.email.toLowerCase();
      const [existingUser] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
      if (existingUser) {
        await db.insert(userIdentities).values({
          userId: existingUser.id,
          provider: "google",
          providerSubject: googleSubject,
          emailAtLink: email,
          emailVerifiedAtLink: new Date(),
        }).onConflictDoNothing();
        userId = existingUser.id;
      } else {
        const name = typeof claims.name === "string" ? claims.name.slice(0, 255) : null;
        const avatarUrl = typeof claims.picture === "string" && claims.picture.startsWith("https://") ? claims.picture.slice(0, 500) : null;
        const created = await db.transaction(async (tx) => {
          const [createdUser] = await tx.insert(users).values({ email, passwordHash: null, name, avatarUrl }).returning({ id: users.id });
          if (!createdUser) throw new Error("Account creation failed");
          await tx.insert(userIdentities).values({
            userId: createdUser.id, provider: "google", providerSubject: googleSubject,
            emailAtLink: email, emailVerifiedAtLink: new Date(),
          });
          return createdUser;
        });
        userId = created.id;
      }
    }
    if (!userId) return c.redirect(appRedirect("failed"));
    if (transaction.mobileRedirectUri) {
      const handoff = randomToken();
      await db.insert(mobileAuthHandoffs).values({
        userId,
        codeHash: sha256(handoff),
        expiresAt: new Date(Date.now() + 60 * 1000),
      });
      const target = new URL(transaction.mobileRedirectUri);
      target.searchParams.set("code", handoff);
      return c.redirect(target.toString());
    }
    await issueBrowserSession(c, userId);
    const token = signToken(userId);
    return c.redirect(appRedirect("success", token));
  } catch {
    // Provider/verification failures intentionally do not log tokens or claims.
    return c.redirect(appRedirect("failed"));
  }
});

router.post("/mobile/exchange", zValidator("json", z.object({ code: z.string().min(20).max(256) }).strict()), async (c) => {
  const { code } = c.req.valid("json");
  const db = getDb();
  const [handoff] = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(mobileAuthHandoffs).where(and(
      eq(mobileAuthHandoffs.codeHash, sha256(code)),
      gt(mobileAuthHandoffs.expiresAt, new Date()),
      isNull(mobileAuthHandoffs.consumedAt),
    )).limit(1).for("update");
    if (!row) return [];
    const [consumed] = await tx.update(mobileAuthHandoffs).set({ consumedAt: new Date() }).where(and(
      eq(mobileAuthHandoffs.id, row.id), isNull(mobileAuthHandoffs.consumedAt),
    )).returning({ userId: mobileAuthHandoffs.userId });
    return consumed ? [consumed] : [];
  });
  if (!handoff) throw new AuthenticationError("Invalid or expired Google sign-in handoff");
  return c.json({ success: true, data: { token: signToken(handoff.userId) } });
});

export { router as googleAuthRouter };
