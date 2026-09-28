#!/usr/bin/env node
// StudyOS local development: runs the API and web dev servers against the
// PostgreSQL 16 service defined in docker-compose.yml.
//
//   bun run dev:local            # API on :3001 + web on :3000
//   node scripts/dev-local.mjs api   # API only
//   node scripts/dev-local.mjs web   # web only
//
// Ports: API_PORT / WEB_PORT (defaults 3001 / 3000), so worktrees can run
// side by side. Database precedence:
//   1. DEV_DATABASE_URL when explicitly set.
//   2. The local Docker PostgreSQL service on localhost:5431.
//   3. Railway only with the explicit DEV_DATABASE_SOURCE=railway opt-in.
//
// Every variable the API needs is passed explicitly. The API loads
// apps/api/.env through dotenv, which never overrides a variable that is
// already set — so a production URL in that file can't leak in.

import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import net from "node:net";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const localDatabaseUrl =
  "postgresql://opensunsama:opensunsama@localhost:5431/opensunsama";

const mode = process.argv[2] ?? "all";
if (!["all", "api", "web"].includes(mode)) {
  console.error(`Unknown mode "${mode}". Use: all | api | web`);
  process.exit(1);
}

const apiPort = process.env.API_PORT ?? "3001";
const webPort = process.env.WEB_PORT ?? "3000";
const apiUrl = `http://localhost:${apiPort}`;
const webUrl = `http://localhost:${webPort}`;

function devDatabaseUrl() {
  if (process.env.DEV_DATABASE_URL) {
    return { url: process.env.DEV_DATABASE_URL, source: "explicit" };
  }

  const source = (process.env.DEV_DATABASE_SOURCE ?? "local")
    .trim()
    .toLowerCase();
  if (source === "local") {
    return { url: localDatabaseUrl, source };
  }
  if (source !== "railway") {
    console.error(
      `Unknown DEV_DATABASE_SOURCE "${source}". Use "local" or "railway", or set DEV_DATABASE_URL.`
    );
    process.exit(1);
  }

  let out;
  try {
    out = execFileSync(
      "railway",
      ["variables", "-e", "development", "-s", "dev-postgres", "--kv"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
  } catch (err) {
    console.error(
      "Couldn't read the explicitly requested Railway development database URL. Run `railway login` and `railway link` only if you are an authorized upstream maintainer, or set DEV_DATABASE_URL.\n",
      err.stderr?.toString() ?? err.message
    );
    process.exit(1);
  }
  const line = out
    .split("\n")
    .find((l) => l.startsWith("DATABASE_PUBLIC_URL="));
  if (!line) {
    console.error(
      "dev-postgres has no DATABASE_PUBLIC_URL in the Railway development environment."
    );
    process.exit(1);
  }
  return {
    url: line.slice("DATABASE_PUBLIC_URL=".length).trim(),
    source,
  };
}

async function assertLocalPostgresAvailable(databaseUrl) {
  const parsed = new URL(databaseUrl);
  const host = parsed.hostname === "localhost" ? "127.0.0.1" : parsed.hostname;
  const port = Number(parsed.port || "5432");

  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const fail = (error) => {
      socket.destroy();
      reject(error);
    };

    socket.setTimeout(1500, () => fail(new Error("connection timed out")));
    socket.once("error", fail);
    socket.once("connect", () => {
      socket.end();
      resolve();
    });
  }).catch((error) => {
    console.error(
      `StudyOS local PostgreSQL is not reachable at localhost:5431 (${error.message}).\n` +
        "Start it with `docker compose up -d postgres`, wait until it is healthy, then retry.\n" +
        "To use another development database, set DEV_DATABASE_URL explicitly."
    );
    process.exit(1);
  });
}

const children = [];
function run(name, dir, args, env) {
  const child = spawn("bun", args, {
    cwd: path.join(root, dir),
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  child.on("exit", (code) => {
    console.log(`[dev-local] ${name} exited (${code ?? "signal"})`);
    shutdown(code ?? 0);
  });
  children.push(child);
}

function shutdown(code) {
  for (const child of children) if (!child.killed) child.kill("SIGTERM");
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

if (mode === "all" || mode === "api") {
  const database = devDatabaseUrl();
  const databaseUrl = database.url;
  if (/ballast\.proxy\.rlwy\.net/.test(databaseUrl)) {
    console.error("Refusing to start: that's the production database.");
    process.exit(1);
  }
  if (database.source === "local") {
    await assertLocalPostgresAvailable(databaseUrl);
    console.log("[dev-local] Database: local PostgreSQL at localhost:5431");
  } else if (database.source === "railway") {
    console.log(
      "[dev-local] Database: explicitly selected Railway development environment"
    );
  } else {
    console.log("[dev-local] Database: explicit DEV_DATABASE_URL override");
  }
  run("api", "apps/api/", ["run", "dev"], {
    NODE_ENV: "development",
    PORT: apiPort,
    API_URL: apiUrl,
    WEB_APP_URL: webUrl,
    CORS_ORIGIN: webUrl,
    DATABASE_URL: databaseUrl,
    // Creates or updates tables on start; migrations are idempotent.
    MIGRATE_ON_START: "true",
    MIGRATIONS_DIR: path.join(root, "packages/database/drizzle"),
    JWT_SECRET:
      process.env.JWT_SECRET ?? "local-dev-only-jwt-secret-not-for-production",
    // Nothing below may reach production services from a laptop.
    REDIS_URL: "",
    RESEND_API_KEY: "",
    ROLLOVER_ENABLED: "false",
    EMAIL_WORKERS_ENABLED: "false",
    CALENDAR_SYNC_ENABLED: "false",
    RECURRING_ENABLED: "false",
    AWS_ACCESS_KEY_ID: "",
    AWS_SECRET_ACCESS_KEY: "",
    AWS_ENDPOINT_URL: "",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    MICROSOFT_CLIENT_ID: "",
    MICROSOFT_CLIENT_SECRET: "",
    VAPID_PUBLIC_KEY: "",
    VAPID_PRIVATE_KEY: "",
  });
}

if (mode === "all" || mode === "web") {
  run("web", "apps/web/", ["x", "vite", "--port", webPort, "--strictPort"], {
    VITE_API_URL: apiUrl,
    VITE_WS_URL: apiUrl.replace(/^http/, "ws"),
  });
}
