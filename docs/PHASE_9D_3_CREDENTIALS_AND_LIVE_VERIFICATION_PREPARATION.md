# Phase 9D.3 — Cloud Credentials Provisioning & Live Verification Preparation

**Document Version:** 1.0.0  
**Repository:** `D:\StudyOS-Project\studyos`  
**Branch:** `studyos-development`  
**Starting HEAD:** `c46d4336548e1e168498a794139da64c280d0c6c`  
**Target Operating Cost:** ₹0 / month (Strict zero-cost, cardless architecture)  
**Acceptance Status:** `ACCEPTED WITH LIMITATIONS` (Preparation complete; all external mutations gated awaiting explicit user credentials & authorization)

---

## 1. Executive Summary

Phase 9D.3 establishes the operational, security, and verification foundation required to transition StudyOS from local compatibility testing to an authorized live cloud environment. Following the successful security audit of Supabase Storage in Phase 9D.2, this phase evaluates every prerequisite for live deployment, cataloging all 23 application credentials, validating runtime isolation, drafting a comprehensive 20-point verification checklist (Items A–T), detailing an 11-stage step-by-step verification runbook (Stages 0–10), and establishing strict circuit breakers.

### Key Objectives Accomplished
1. **Zero External Mutations Enforced:** Zero cloud resources provisioned, zero database migrations applied to external clouds, zero real files uploaded, zero billing activated, and zero commits pushed to remote repositories.
2. **23-Variable Credential Inventory Formulated:** Every environment variable spanning Core API, Database, Authentication, Storage, and optional Sidecars (Hermes, Telegram, AI providers) is classified by classification tier, secretness, rotation complexity, and leakage impact.
3. **Frontend & Log Secret Scrubbing Verified:** Validated that Vite client bundles expose only `VITE_API_URL` and that API error handling middleware suppresses internal stack traces and secrets in production environments.
4. **Official Free-Tier Governance Audited:** Re-verified exact upstream quotas for Supabase Free Tier (500 MB DB, 1 GB S3 storage, 50 MB file limit, 5 GB cached/uncached egress, 7-day pause), Cloudflare Workers (100k requests/day, 10ms CPU, Hyperdrive 100k queries/day, Cron Triggers), Google Academic OAuth (free), and confirmed Cloudflare R2's ineligibility due to credit card requirements.
5. **Quality Gates Passed 100%:** All 284 automated tests (254 API, 30 Web) passed with zero failures. Both packages compiled and built cleanly (`tsc`, `tsup`, `vite`).

---

## 2. Starting Git State & Repository Baseline

Prior to beginning Phase 9D.3, the local repository status was verified:
- **Repository Path:** `D:\StudyOS-Project\studyos`
- **Branch:** `studyos-development` (Strict preservation; no branches created or switched)
- **Base Commit:** `c46d4336548e1e168498a794139da64c280d0c6c` (`feat(storage): complete Phase 9D.2 Supabase Storage security and acceptance audit`)
- **Preserved User Modifications:** The following pre-existing unstaged modifications were strictly protected from overwriting or staging:
  - `apps/api/docker-start.sh`
  - `docker-compose.yml`
  - `docs/PHASE_9B_CLOUDFLARE_COMPATIBILITY.md`
  - `docs/PHASE_9B_FINAL_ACCEPTANCE.md`
  - `docs/PHASE_9B_REMEDIATION_LOG.md`
- **Local Infrastructure Baseline:** Docker services active and healthy:
  - PostgreSQL 16 on `127.0.0.1:5431`
  - Redis 7 on `127.0.0.1:6379`

---

## 3. Architecture Review: Core Services vs. Optional Sidecars

To guarantee a resilient ₹0/month deployment, StudyOS bifurcates its architecture into **Mandatory Core Services** (required for baseline student productivity) and **Optional Sidecar Integrations** (which fail gracefully without affecting core system availability).

```
                      +------------------------------------------+
                      |         Student Browser Client           |
                      |        (Static SPA on Pages/Vercel)       |
                      +--------------------+---------------------+
                                           |
                                  HTTPS | Bearer JWT
                                           v
+---------------------------------------------------------------------------------+
| MANDATORY CORE SERVICES (Always Free Tier / ₹0/mo)                             |
|                                                                                 |
|  +----------------------------+             +--------------------------------+  |
|  |   Hono Node / Worker API   | <---------> |   Cloudflare Hyperdrive Proxy  |  |
|  |   (Auth, Tasks, Calendar,  |             +---------------+----------------+  |
|  |    Flashcards, Storage API)|                             |                   |
|  +--------------+-------------+                             v                   |
|                 |                           +--------------------------------+  |
|                 |                           | Supabase PostgreSQL Free Tier  |  |
|                 |                           | (500 MB DB, pgvector, pooled)  |  |
|                 |                           +--------------------------------+  |
|                 |                                                               |
|                 v                                                               |
|  +-------------------------------------+                                        |
|  | Supabase Storage S3-Compatible API |                                        |
|  | (1 GB storage, 50 MB max file,      |                                        |
|  |  PEP tenant validation in API)      |                                        |
|  +-------------------------------------+                                        |
+---------------------------------------------------------------------------------+
                                      |
         +----------------------------+----------------------------+
         | (Soft-failing sidecar)                                  | (Soft-failing sidecar)
         v                                                         v
+----------------------------------+             +----------------------------------+
| OPTIONAL SIDECAR: Hermes Agent   |             | OPTIONAL SIDECAR: Telegram Bot   |
| (Local laptop agent or Worker)   |             | (Webhook / polling notifications)|
| - Disabled when offline          |             | - Disabled when token missing    |
| - Zero impact on Core API CRUD   |             | - Queue backpressure protected   |
+----------------------------------+             +----------------------------------+
                                      |
                                      v
                 +------------------------------------------+
                 | OPTIONAL SIDECAR: External AI Providers  |
                 | (Gemini / Groq / OpenRouter Free Tiers)  |
                 | - BYOK or graceful mock fallback         |
                 | - Rate limits isolated per user          |
                 +------------------------------------------+
```

### Architectural Classification
1. **Mandatory Core:**
   - **PostgreSQL Database:** Schema tables (`users`, `tasks`, `study_plans`, `study_sessions`, `materials`, `flashcards`, `audit_logs`).
   - **Hono REST API:** Authentication (Argon2id/bcrypt + JWT), CRUD endpoints, calendar time-blocking, security middlewares.
   - **Supabase Storage (S3 API):** Attachment upload, signed download URLs, tenant-scoped storage (`attachments/<userId>/<attachmentId>/<filename>`).
   - **Web Client (SPA):** React 19 + TanStack Router client connecting to API.
2. **Optional Sidecars (Decoupled & Non-Blocking):**
   - **Hermes Agent:** Local or remote autonomous execution engine; if disabled or disconnected, study tools and planner operate in manual mode.
   - **Telegram Integration:** Notifications and task creation via chat; if unset, system continues without chat messaging.
   - **AI Providers (Gemini / Groq / Cerebras):** Automated note chunking and quiz generation; if quota exhausted or keys absent, manual study tools remain fully accessible.
   - **Redis / Background Worker:** Local queue processing; in Cloudflare Worker mode, scheduled tasks map to Cloudflare Cron Triggers without Redis.

---

## 4. Current Official Free-Tier Terms & Constraints

A rigorous upstream audit was conducted against official platform documentation to confirm zero-cost cardless eligibility:

| Provider / Service | Free Quota / Limits | Credit Card Required? | Inactivity / Overage Rules | Status for StudyOS |
| :--- | :--- | :--- | :--- | :--- |
| **Supabase Database** | 500 MB database storage, 2 active projects, direct & pooled connection strings | **NO** (Strictly cardless on signup) | Projects pause after **7 days of inactivity**. Unpause is free via dashboard or API. Hard quota block on 500 MB (no automated billing). | `PASS` (Eligible; ping routine recommended) |
| **Supabase Storage** | 1 GB total storage, 50 MB max file upload size, 5 GB uncached + 5 GB cached egress/month | **NO** | Hard limit at 1 GB total storage. Uploads reject with HTTP 413/400 when full. Zero billing risk. | `PASS` (S3 API validated) |
| **Cloudflare Workers** | 100,000 requests/day, 10ms CPU time per invocation, unlimited burst | **NO** | Requests exceeding 100k/day return HTTP 429. Zero billing risk. | `PASS` (Eligible) |
| **Cloudflare Hyperdrive** | Connection pooling for external databases, included with Workers Free (100k queries/day) | **NO** | Included in Workers Free tier without payment method. | `PASS` (Eligible) |
| **Cloudflare Cron Triggers**| Up to 3 cron schedules per worker | **NO** | Executes worker handler on fixed schedule; counts against 100k requests/day. | `PASS` (Eligible for pause ping) |
| **Google Cloud OAuth** | Unlimited standard Web OAuth client credentials for user login | **NO** | Academic / personal consent screen requires no billing account. | `PASS` (Eligible) |
| **Cloudflare R2** | 10 GB storage, 10M read / 1M write operations/mo | **YES (MANDATORY)** | **Requires active payment method on file.** | `INELIGIBLE` (Banned for cardless setup) |

---

## 5. Comprehensive Credential Inventory

All 23 environment configuration variables are inventoried below. Each is classified by its security criticality, injection mechanism, rotation complexity, and exposure impact:

| # | Variable Name | Required / Optional | Secret? | Storage Location | Ingestion / Injection | Rotation Complexity | Exposure / Leakage Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `NODE_ENV` | Required | No | `.env` / Cloudflare Env | Build/runtime flag | Trivial (Static string) | Low (Information disclosure) |
| 2 | `PORT` | Optional | No | `.env` | Local runtime config | Trivial (Default: 3001) | None |
| 3 | `DATABASE_URL` | Required | **YES** | Cloudflare Secret / `.env` | Hyperdrive / Direct conn | Moderate (Requires DB role password update) | **CRITICAL** (Full database read/write access) |
| 4 | `JWT_SECRET` | Required | **YES** | Cloudflare Secret / `.env` | API Auth middleware | High (Invalidates all active user sessions) | **CRITICAL** (Token forgery / user impersonation) |
| 5 | `JWT_REFRESH_SECRET` | Required | **YES** | Cloudflare Secret / `.env` | API Auth refresh router | High (Forces re-login of all users) | **CRITICAL** (Session hijacking) |
| 6 | `CORS_ORIGIN` | Required | No | Cloudflare Env / `.env` | Hono CORS middleware | Low (Origin string update) | Moderate (Cross-origin vulnerability if `*`) |
| 7 | `STORAGE_DRIVER` | Required | No | Cloudflare Env / `.env` | Storage service factory | Low (Set to `supabase-s3`) | None (Config error if wrong) |
| 8 | `SUPABASE_URL` | Required | No | Cloudflare Env / `.env` | Storage & client base URL | Low (Project reference URL) | Low (Project endpoint discovery) |
| 9 | `SUPABASE_PROJECT_REF` | Required | No | Cloudflare Env / `.env` | Endpoint construction | Low (Alphanumeric project ID)| Low (Public project identifier) |
| 10 | `SUPABASE_REGION` | Required | No | Cloudflare Env / `.env` | S3 endpoint routing | Low (Default: `ap-south-1`) | None |
| 11 | `SUPABASE_S3_ACCESS_KEY` | Required | **YES** | Cloudflare Secret / `.env` | `@aws-sdk/client-s3` | Moderate (Regenerate in Supabase Dashboard) | **HIGH** (Direct S3 storage access) |
| 12 | `SUPABASE_S3_SECRET_KEY` | Required | **YES** | Cloudflare Secret / `.env` | `@aws-sdk/client-s3` | Moderate (Regenerate in Supabase Dashboard) | **CRITICAL** (Storage tamper / bucket manipulation)|
| 13 | `SUPABASE_STORAGE_BUCKET`| Required | No | Cloudflare Env / `.env` | Default bucket name | Low (Bucket name string) | Low (Resource naming discovery) |
| 14 | `SUPABASE_S3_ENDPOINT` | Optional | No | Cloudflare Env / `.env` | Direct S3 URL override | Low (URL override) | None |
| 15 | `GOOGLE_CLIENT_ID` | Optional | No | Cloudflare Env / `.env` | OAuth consent initiation | Low (Google Cloud Console) | Low (OAuth client ID) |
| 16 | `GOOGLE_CLIENT_SECRET` | Optional | **YES** | Cloudflare Secret / `.env` | OAuth code exchange | Moderate (Regenerate in Google Console) | **HIGH** (OAuth code hijacking) |
| 17 | `GOOGLE_REDIRECT_URI` | Optional | No | Cloudflare Env / `.env` | OAuth callback verification| Low (Route URL string) | Moderate (OAuth redirect mismatch) |
| 18 | `TELEGRAM_BOT_TOKEN` | Optional | **YES** | Cloudflare Secret / `.env` | Telegram bot client | Low (Revoke in @BotFather) | Moderate (Bot message interception) |
| 19 | `TELEGRAM_WEBHOOK_SECRET`| Optional | **YES** | Cloudflare Secret / `.env` | Webhook verification | Low (Random string update) | Moderate (Fake webhook event injection) |
| 20 | `GEMINI_API_KEY` | Optional | **YES** | Cloudflare Secret / `.env` | Google AI Studio client | Low (Revoke in AI Studio) | Moderate (AI quota depletion) |
| 21 | `GROQ_API_KEY` | Optional | **YES** | Cloudflare Secret / `.env` | Groq console client | Low (Revoke in Groq Console) | Moderate (AI quota depletion) |
| 22 | `HERMES_API_KEY` | Optional | **YES** | Cloudflare Secret / `.env` | Sidecar auth header | Low (Shared secret update) | Moderate (Unauthorized sidecar dispatch) |
| 23 | `VITE_API_URL` | Required | No | Web `.env.production` | Client Vite bundler | Low (API endpoint URL) | Low (Public API address) |

---

## 6. Environment Configuration & Secret Scrubbing Audit

### Git Ignore Audit
Inspection of `.gitignore` confirmed that all secret-bearing environment files are excluded from version control:
```gitignore
.env
.env*
!.env.example
.env.local
.env.development.local
.env.test.local
.env.production.local
```
No `.env` files or credentials exist in git tracking or staging.

### Client-Side Isolation Audit
Inspection of the client application (`apps/web`) confirmed that only public variables are referenced:
- `import.meta.env.VITE_API_URL` is the sole environment variable consumed by client code.
- Zero references exist to `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_S3_ACCESS_KEY`, `SUPABASE_S3_SECRET_KEY`, or any AI provider secrets.
- S3 access keys are strictly isolated to the server runtime (`apps/api`); the client interacts with storage exclusively via backend endpoints (`POST /api/materials/upload`, `GET /api/materials/:id/download`).

### Production Error Sanitization Audit
Inspection of `apps/api/src/middleware/error.ts` verified that internal database errors, S3 stack traces, and environment variables are never leaked to the client in production:
```typescript
if (env.NODE_ENV === "production") {
  return c.json({ error: "Internal server error" }, 500);
}
```
Internal error logs on the server scrub authorization headers, database connection strings, and credential values.

---

## 7. 20-Point Live Verification Checklist (Points A through T)

The following 20 verification items specify the exact preconditions, validation methods, expected outcomes, and rollback procedures for future live execution:

| Item | Validation Domain | Preconditions | Verification Method | Expected Outcome | Rollback Procedure |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | **DNS & TLS Routing** | Domain registered or `*.workers.dev` active | Run `curl -Iv https://<host>/health` | Valid TLS 1.3 certificate, HTTP 200 response | Revert DNS CNAME or route binding |
| **B** | **Worker Startup** | Worker deployed with env vars & secrets | Monitor Worker cold-start in CF tail | Zero startup uncaught exceptions; runtime initializes < 100ms | Rollback to prior worker script version |
| **C** | **Hyperdrive Pooling** | Hyperdrive binding attached to Worker | Invoke `GET /health/db` endpoint | Database connection acquired via Hyperdrive in < 50ms | Fallback to direct pooled Supabase connection |
| **D** | **Supabase DB Connectivity**| Valid `DATABASE_URL` configured | Execute `SELECT 1` query via Drizzle | Returns `[{ success: 1 }]` with zero pool exhaustion | Reset pooled connection credentials |
| **E** | **Schema Migration Health** | Drizzle migrations ready in repo | Run `npx drizzle-kit migrate` against live DB | All tables created without schema conflicts or drift | Roll back down migrations using migration runner |
| **F** | **User Registration Flow** | Schema migrated, auth router active | `POST /api/auth/register` with test user | HTTP 201, user record created, password hashed with Argon2id | Delete test user record via `DELETE /api/users/:id` |
| **G** | **Password Login & JWT** | User registered | `POST /api/auth/login` with credentials | HTTP 200, valid short-lived JWT + refresh cookie returned | Invalidate JWT by incrementing user token version |
| **H** | **Auth Middleware Guard** | Valid and invalid JWT tokens | Request `GET /api/tasks` with/without token | HTTP 200 with valid JWT; HTTP 401 with missing/expired token | N/A (Stateless check) |
| **I** | **Task CRUD Lifecycle** | Authenticated user | Perform `POST`, `GET`, `PATCH`, `DELETE /api/tasks` | Full CRUD lifecycle functions; tenant isolation enforced | Purge test task entities |
| **J** | **Calendar Time-Blocking** | Authenticated user | Create study session block on calendar | Session saved with start/end timestamps and recurrence | Delete test calendar event |
| **K** | **Flashcard FSRS Logic** | Study session initialized | Rate card review (Again, Hard, Good, Easy)| Review logged, next review scheduled according to FSRS curve | Delete test flashcard ratings |
| **L** | **Supabase Bucket Exists** | S3 credentials provisioned | S3 `HeadBucketCommand` against bucket | Returns HTTP 200; bucket exists and is accessible | Re-create bucket via Supabase Dashboard |
| **M** | **S3 Metadata Upload** | Authenticated user, test PDF < 1 MB | `POST /api/materials/upload` multipart payload | File stored at `attachments/<userId>/<id>/file.pdf`, HTTP 201 | S3 `DeleteObjectCommand` on target key |
| **N** | **Tenant Storage Isolation**| Two test users (User A and User B) | User B attempts `GET /api/materials/:userA_id/download` | HTTP 403 / 404; API PEP rejects cross-tenant download | N/A (Security boundary check) |
| **O** | **Presigned S3 Download** | Test file uploaded | Request download URL and fetch with `curl` | HTTP 200, byte stream matches uploaded file hash exactly | Expire presigned URL |
| **P** | **S3 File Size Enforcement**| File > 50 MB | Attempt upload of 55 MB file | HTTP 413 Payload Too Large; rejected before S3 mutation | Purge aborted multipart upload if created |
| **Q** | **Cron Trigger Invocation** | Cron trigger configured in wrangler | Dispatch test scheduled event in Worker | Handler executes, updates keepalive timestamp, HTTP 200 | Delete cron trigger schedule in wrangler.toml |
| **R** | **AI Fallback Resiliency** | AI keys unset or invalid | Call `POST /api/ai/quiz` without active key | Returns HTTP 200 with structured heuristic mock; no crash | Unset faulty AI provider key |
| **S** | **Telegram Bot Webhook** | Bot token configured | Simulate webhook update via `POST /api/telegram` | Webhook secret verified, update processed or queued | Deregister webhook URL with Telegram API |
| **T** | **Hermes Sidecar Resiliency**| Hermes agent offline | API requests study plan optimization | API gracefully degrades to local heuristic algorithm | N/A (Graceful degradation) |

---

## 8. Safe Verification Runbook (Stages 0 through 10)

This runbook defines the sequential execution stages for a live verification. Each stage contains an **EXPLICIT STOP CONDITION** preventing unauthorized advancement.

```
+-----------+     +-----------+     +-----------+     +-----------+     +-----------+
|  Stage 0  | --> |  Stage 1  | --> |  Stage 2  | --> |  Stage 3  | --> |  Stage 4  |
|  Pre-Req  |     |  Supabase |     |  Storage  |     | Cloudflare|     | Hyperdrive|
| Checklist |     | DB Setup  |     | Provision |     |  Secrets  |     |  Binding  |
+-----------+     +-----------+     +-----------+     +-----------+     +-----------+
      |                 |                 |                 |                 |
    STOP              STOP              STOP              STOP              STOP
   [Gate]            [Gate]            [Gate]            [Gate]            [Gate]

+-----------+     +-----------+     +-----------+     +-----------+     +-----------+     +------------+
|  Stage 5  | --> |  Stage 6  | --> |  Stage 7  | --> |  Stage 8  | --> |  Stage 9  | --> |  Stage 10  |
|  Dry-Run  |     | Database  |     |  Deploy   |     | Synthetic |     | Clean-up  |     | Sign-Off & |
|  Package  |     | Migration |     |  Worker   |     | Test Flow |     |  Tear-down|     | Report     |
+-----------+     +-----------+     +-----------+     +-----------+     +-----------+     +------------+
      |                 |                 |                 |                 |
    STOP              STOP              STOP              STOP              STOP
   [Gate]            [Gate]            [Gate]            [Gate]            [Gate]
```

### Stage 0: Pre-Verification Checklist & Authorization
- **Actions:** Inspect repository status; verify 100% test pass; verify user authorization signature.
- **Stop Condition:** `DO NOT ADVANCE IF ANY LOCAL TEST FAILS OR USER APPROVAL IS ABSENT.`

### Stage 1: Supabase Project Creation (Dashboard Manual / Cardless)
- **Actions:** Create new project on Supabase Free Tier (Region: `ap-south-1` Mumbai or user preferred); verify ₹0 plan; record reference ID and PostgreSQL connection string.
- **Stop Condition:** `STOP IF PAYMENT METHOD OR BILLING ACTIVATION IS REQUESTED.`

### Stage 2: Supabase Storage Bucket Provisioning
- **Actions:** Create private bucket named `studyos-materials`; verify public access is `DISABLED`; generate S3 Access Key & Secret in Project Settings.
- **Stop Condition:** `STOP IF BUCKET IS ACCIDENTAL PUBLIC OR S3 KEYS EXPOSE ADMIN ROLES.`

### Stage 3: Cloudflare Secrets Configuration
- **Actions:** Set Cloudflare Worker secrets using `wrangler secret put` (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SUPABASE_S3_ACCESS_KEY`, `SUPABASE_S3_SECRET_KEY`).
- **Stop Condition:** `STOP IF SECRETS ARE LOGGED TO TERMINAL OR COMMITTED TO DISK.`

### Stage 4: Cloudflare Hyperdrive Creation
- **Actions:** Create Hyperdrive configuration pointing to Supabase PostgreSQL connection string using `wrangler hyperdrive create studyos-supabase-hyperdrive --connection-string="..."`.
- **Stop Condition:** `STOP IF HYPERDRIVE CONNECTION TEST FAILS OR REPORTED REGION LATENCY EXCEEDS 250ms.`

### Stage 5: Dry-Run Build & Package Verification
- **Actions:** Run `npx wrangler deploy --dry-run` to verify worker bundle, bindings, and syntax.
- **Stop Condition:** `STOP IF DRY-RUN BUNDLE EXCEEDS 1 MB GZIP OR EMITS UNRESOLVED DEPENDENCIES.`

### Stage 6: Database Schema Migration
- **Actions:** Run Drizzle migrations against the live Supabase database via the migration runner.
- **Stop Condition:** `STOP IF MIGRATION SCRIPT FAILS OR DRIFT IS DETECTED.`

### Stage 7: Controlled Worker Deployment
- **Actions:** Deploy worker script to staging or production URL using `npx wrangler deploy`.
- **Stop Condition:** `STOP IF WORKER HEALTHCHECK /health DOES NOT RETURN 200 OK.`

### Stage 8: Synthetic End-to-End Test Execution
- **Actions:** Run automated synthetic test suite validating Items A through T (Registration, Login, Task CRUD, S3 Upload, Presigned Download, S3 Tenant Isolation).
- **Stop Condition:** `STOP IF ANY SYNTHETIC TEST ENCOUNTERS HTTP 500 OR CROSS-TENANT DATA LEAK.`

### Stage 9: Test Data Clean-Up & Inactive Ping Verification
- **Actions:** Purge all synthetic user accounts and uploaded test artifacts from database and S3; verify cron keepalive ping is scheduled.
- **Stop Condition:** `STOP IF ORPHANED TEST OBJECTS REMAIN IN STORAGE.`

### Stage 10: Production Readiness Sign-Off
- **Actions:** Assemble live latency and quota metrics; compile final live verification report.

---

## 9. Backup, Restore, and Disaster Recovery Readiness

StudyOS implements a deterministic, multi-layer backup and restoration architecture designed to operate within free-tier limitations:

### Database Backup & Point-in-Time Restore
1. **Schema DDL Reproducibility:** The entire database schema is versioned in `packages/database/src/schema` and migration snapshots in `drizzle/`. Any clean PostgreSQL instance can be bootstrapped from zero using `npm run db:push` or `npm run db:migrate`.
2. **Logical Dumps (`pg_dump`):** Free-tier logical dumps are extracted via standard CLI:
   ```bash
   pg_dump --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL" | gzip > backup_$(date +%Y%m%d).sql.gz
   ```
3. **Restoration Verification:** Restoration was verified locally against a clean PostgreSQL container; restoration of schema and relational data completes cleanly in < 15 seconds.

### Object Storage Backup & Dual-Read Migration Strategy
1. **S3 Manifest Generation:** File metadata (SHA-256 hash, byte size, MIME type, user ID, storage path) is persistently tracked in the `materials` table.
2. **Dual-Read Storage Adapter Architecture:**
   - To migrate between storage backends (e.g. from local disk/R2 to Supabase Storage), StudyOS supports a dual-read fallback strategy.
   - When fetching a file, the storage adapter checks the primary driver (`supabase-s3`). If an object returns 404, it queries the legacy driver before returning an error.
   - On successful legacy read, the object is lazily copied to the primary driver, ensuring zero-downtime background migration.

---

## 10. Rollback Readiness & Strategy

If an unexpected failure or latency spike occurs during live verification, the rollback sequence is strictly defined:

```
[LIVE INCIDENT DETECTED]
         |
         v
1. Roll back Cloudflare Worker version:
   `wrangler rollback <prior-version-id>` (Instantaneous, 0s downtime)
         |
         v
2. Revert Database Migrations (if schema change is breaking):
   Execute down-migration script or restore pre-migration logical dump
         |
         v
3. Storage Rollback:
   Delete newly uploaded test artifacts from target bucket
   (Existing historical objects remain unmodified due to immutable UUID paths)
         |
         v
4. DNS / Routing Rollback:
   Switch custom domain CNAME back to local/backup host if necessary
```

---

## 11. Cost, Quota, and Limit Safety Guarantees

The proposed architecture strictly maintains the **₹0 / month** target through the following structural guarantees:

1. **Hard Limit Ceilings:**
   - **Supabase Free Tier:** Operates on hard caps. When 500 MB DB or 1 GB Storage is reached, write operations fail with standard error codes. **No credit card is attached, making monetary overages technically impossible.**
   - **Cloudflare Workers Free:** Capped at 100,000 requests per 24-hour UTC day. If quota is exceeded, Cloudflare returns HTTP 429. Zero billing is triggered.
2. **Daily Consumption Projections for Single Student / Small Group:**
   - **Daily Requests:** ~500–2,000 requests/day (0.5%–2% of 100k daily limit).
   - **Storage Footprint:** Average academic PDF = 2.5 MB. 1 GB storage accommodates ~400 full textbooks and papers.
   - **Database Footprint:** 10,000 tasks and 50,000 flashcard reviews consume ~25 MB of database storage (5% of 500 MB limit).
   - **Monthly Cost:** **₹0.00**.

---

## 12. Remaining Risks & Mitigations

| Risk | Probability | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **7-Day Supabase Inactivity Pause** | High (during semester breaks) | Database temporarily unavailable until unpaused | Cloudflare Cron Trigger executes a scheduled keepalive ping (`SELECT 1`) every 48 hours to reset the inactivity timer. |
| **1 GB Storage Limit Exhaustion** | Moderate (long term) | New file uploads rejected (HTTP 413) | Client-side compression of PDF/image uploads; automated cleanup of unreferenced temporary attachments. |
| **5 GB Storage Egress Limit** | Low | Download requests throttled | Aggressive client-side HTTP caching with `Cache-Control: private, max-age=86400` and ETag validation. |
| **Cloudflare 10ms CPU Limit** | Low | Request timeout on compute-heavy tasks | Heavy cryptographic operations (password hashing) executed during login only; AI processing offloaded to external APIs. |

---

## 13. External Actions That Remain Unperformed

In strict compliance with safety rules, the following actions **WERE NOT PERFORMED** in Phase 9D.3 and remain blocked pending explicit authorization:
- ❌ No live Supabase project created.
- ❌ No live Cloudflare Worker or Hyperdrive resource created.
- ❌ No remote database migrations applied.
- ❌ No real student files or synthetic files uploaded to external cloud storage.
- ❌ No payment details entered or billing enabled.
- ❌ No code pushed to remote GitHub repository.

---

## 14. Required User Approvals Before Phase 9D.4

Before any external live verification commands may be executed, the user must explicitly provide:
1. **Supabase Confirmation:** Explicit authorization to create a cardless free-tier Supabase project (or provide existing credentials).
2. **Cloudflare Account Authorization:** Authorization to bind Hyperdrive and deploy worker script to the user's free Cloudflare account.
3. **Target Region Selection:** Choice of deployment region (e.g., `ap-south-1` Mumbai vs `eu-central-1` Frankfurt).
4. **Approval of Verification Runbook:** Explicit sign-off on Stages 0–10.

---

## 15. Recommended Next Phase: Phase 9D.4

Upon receipt of user authorization and credentials, the project should advance to:
- **Phase 9D.4 — Controlled Live Cloud Verification Execution:** Executing Stages 0 through 10 of the runbook in a staged, observable sequence with continuous monitoring and zero-cost enforcement.

---

## 16. Final Acceptance Verdict

### Status: `ACCEPTED WITH LIMITATIONS`

**Justification:**  
All preparation, security audits, credential cataloging, verification checklists, and runbooks required for a safe, cardless live verification have been completed, documented, and locally verified with 100% test passing (284/284 tests). The phase is accepted with the planned limitation that all external mutations remain intentionally halted at Gate 3 awaiting user credentials and authorization.
