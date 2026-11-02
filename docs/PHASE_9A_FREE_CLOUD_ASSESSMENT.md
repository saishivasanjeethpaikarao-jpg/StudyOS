# Phase 9A — Free Cloud Infrastructure Assessment

**Project:** StudyOS  
**Workspace:** `D:\StudyOS-Project`  
**Repository:** `D:\StudyOS-Project\studyos`  
**Branch:** `studyos-development`  
**Target Operating Cost:** **₹0 / month ($0.00)**  
**Target Availability:** 24/7 operation independent of the student's laptop  

---

## 1. Executive Summary

This assessment evaluates free-tier cloud architectures capable of hosting StudyOS 24 hours a day, 7 days a week, at an operating cost of **₹0/month**, without relying on the student's personal laptop.

### Core Objectives & Constraints
1. **Zero Monthly Cost:** Must utilize permanent free tiers, not temporary promotional credits (e.g., AWS $300 1-year trial, GCP $300 90-day trial, or Railway trial credits).
2. **Laptop Independence:** Telegram bot interactions, upcoming assignment alerts, daily briefings, sync cursor management, and study session calendar integrations must remain active when the student's laptop is powered off.
3. **Preserve Canonical Architecture:** PostgreSQL and Drizzle ORM must remain the single authoritative persistence engine. No migration away from relational PostgreSQL.
4. **Hermes Agent Realism:** Acknowledge that the full Python-based Hermes Agent runtime cannot run inside lightweight serverless isolates (like Cloudflare Workers) and design a practical availability and fallback model.

---

## 2. Existing StudyOS Architecture & Dependencies

Inspection of the StudyOS codebase (`D:\StudyOS-Project\studyos`) reveals the following components and operational constraints:

| Component | Current Implementation | Runtime & Package | Hosting Requirement |
| :--- | :--- | :--- | :--- |
| **API Server** | Hono REST API (`apps/api`) | Node.js / Bun (`@hono/node-server`, `hono`) | HTTP / HTTPS server, supports Edge & Node runtimes. |
| **Database** | PostgreSQL 16 (`packages/database`) | Drizzle ORM + `postgres` (postgres.js) | Relational SQL, 14 forward migrations, strict foreign keys. |
| **Background Jobs** | `pg-boss` v10 (`apps/api/src/workers`) | PostgreSQL queue tables (`pgboss.*`), `setInterval` polling | Periodic evaluation, task rollover, daily summaries, reminders. |
| **Automations Engine** | `AutomationsService` (`apps/api/src/services`) | Timezone math, `/automations/tick` | Cron-driven or periodic runner evaluating active rules. |
| **File Storage** | S3 Client (`apps/api/src/lib/s3.ts`) | `@aws-sdk/client-s3` | S3-compatible object storage (buckets, uploads, presigned URLs). |
| **Authentication** | JWT + Cookie CSRF (`apps/api/src/lib/jwt.ts`) | `jose`, `jsonwebtoken`, `bcrypt` | `bcrypt` requires significant CPU (50–100ms) or Web Crypto replacement. |
| **Telegram Bot** | Webhook handler (`POST /integrations/telegram/webhook`) | HTTP POST listener with secret header | Public HTTPS endpoint available 24/7 with <2s response time. |
| **MCP Server** | `@open-sunsama/mcp` (17 academic tools) | TypeScript, `@modelcontextprotocol/sdk` | Stdio for local IDE/agent, or HTTP SSE / Stream transport for remote. |
| **Hermes Agent** | `hermes-agent` (`D:\StudyOS-Project\hermes-agent`) | Python 3.11+, LangChain, native tools | Persistent Python environment, 1–2 GB RAM, sustained CPU. |
| **AI Adapters** | Gemini, Groq, NVIDIA NIM (`apps/api/src/services/ai`) | Outbound HTTP `fetch` to AI provider APIs | Outbound HTTPS network access. |
| **Web Frontend** | React 18, Vite (`apps/web/dist`) | Static SPA + pre-rendered HTML (165 pages) | Static web hosting with CDN and custom domain. |
| **Desktop / Mobile** | Windows (Tauri/Electron), Android (Expo) | Native runtimes | Connect over HTTPS to remote API. |

---

## 3. Cloudflare Ecosystem Compatibility Analysis

The Cloudflare developer platform provides extensive free-tier primitives. Each primitive is evaluated below against StudyOS requirements:

### A. Cloudflare Pages
- **Free Tier Allowance:** 500 builds/month, unlimited static requests, unlimited bandwidth, custom domains with free Universal SSL.
- **StudyOS Compatibility:** **100% Perfect Fit**.
- **Role:** Hosts the compiled production web application (`apps/web/dist`, 31.3 MB) including the marketing landing pages, documentation, and the full SPA student dashboard.

### B. Cloudflare Workers
- **Free Tier Allowance:** 100,000 requests/day, 10 milliseconds CPU time per invocation, 128 MB RAM, 50 external subrequests per invocation.
- **StudyOS Compatibility:** **High (API Routing & Webhooks), with 2 critical adaptations required**:
  1. *CPU Time Constraint (10 ms):* Pure I/O (waiting for database queries or AI API responses) does **not** count toward the 10 ms CPU limit. However, CPU-intensive tasks—specifically `bcrypt` password hashing (50–100 ms)—will exceed the 10 ms limit on Workers Free. Authentication must either use Web Crypto API (e.g. PBKDF2 / Argon2-wasm) or run on a container backend.
  2. *Process Polling Limitation:* Standard `pg-boss` relies on a continuous Node.js event loop (`setInterval`). Workers freeze immediately after returning an HTTP response. Therefore, background tasks must be triggered via **Cloudflare Cron Triggers** hitting HTTP tick endpoints rather than an internal polling loop.

### C. Cloudflare Hyperdrive
- **Free Tier Allowance:** **100,000 queries per day free** (included in Workers Free plan).
- **StudyOS Compatibility:** **100% Perfect Fit**.
- **Role:** Maintains a globally distributed connection pool from Cloudflare's edge to the origin PostgreSQL database (e.g. Supabase or Neon). Eliminates connection setup latency and enables Workers to query Postgres over TCP seamlessly without exhausting connection limits.

### D. Cloudflare R2 (Object Storage)
- **Free Tier Allowance:** **10 GB-month storage**, 1,000,000 Class A write operations/month, 10,000,000 Class B read operations/month, **$0.00 egress fees** (completely free bandwidth).
- **StudyOS Compatibility:** **100% Perfect Fit**.
- **Role:** Replaces AWS S3 / Railway S3. Fully compatible with `@aws-sdk/client-s3` already in `apps/api/src/lib/s3.ts`. Used for student resource uploads, imported Google Drive documents, and avatar images.

### E. Cloudflare Queues
- **Free Tier Allowance:** 10,000 operations per day (1 operation per 64 KB read/write/delete), 24-hour retention.
- **StudyOS Compatibility:** Suitable for asynchronous notification dispatch and email queueing, though standard Cron Triggers are simpler for scheduled student automations.

### F. Cloudflare Cron Triggers
- **Free Tier Allowance:** Up to 3 Cron Triggers per Worker script on the Free plan, with minimum execution interval of 1 minute (`* * * * *`).
- **StudyOS Compatibility:** **100% Fit for Automations**.
- **Role:** Fires scheduled HTTP requests every minute to `/integrations/automations/tick` and `/workers/rollover/tick`, executing daily briefings, study reminders, and midnight rollovers without needing a continuously running container.

### G. Cloudflare Tunnel (`cloudflared`)
- **Free Tier Allowance:** Completely free and unlimited.
- **StudyOS Compatibility:** High.
- **Role:** Enables secure outbound-only tunneling from a home server, VPS, or desktop to a public Cloudflare domain without opening firewall ports or exposing static IP addresses.

---

## 4. Free PostgreSQL Database Assessment

PostgreSQL must remain the canonical persistence layer. The following providers offer permanent free tiers:

| Provider | Free Storage | Compute / Inactivity Rules | Connection Limits & Pooling | Drizzle Compatibility | Permanent Free? | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Supabase** | **500 MB** | Pauses **only after 7 consecutive days of zero database activity**. | Built-in Supavisor pooling on port 6543 (transaction & session mode); 15 direct + 200 pooled connections. | **100% Compatible** (`drizzle-orm/postgres-js`). | **Yes** (No credit card required). | **TOP RECOMMENDATION** for 24/7 always-on operation. Pinging via daily cron prevents pausing. |
| **Neon** | **1 GB** | **100 Compute Unit-hours/month**. Scales to zero after **5 minutes of inactivity** (cold start: ~500ms–1s). | Connection pooler (port 5432) + WebSocket/HTTP serverless driver. | **100% Compatible** (`@neondatabase/serverless`). | **Yes** (No credit card required). | **Excellent for Serverless**, but **cannot** support continuous `pg-boss` polling (which burns 100 CU-hours in ~4 days). |
| **CockroachDB Serverless** | 5 GB | 50 million Request Units/month. No pausing. | Connection limits apply. | Partial (Differences in Postgres extensions & Drizzle DDL syntax). | Yes | Not recommended due to Postgres dialect discrepancies with inherited Open Sunsama schemas. |
| **Render PostgreSQL** | 1 GB | **EXPIRES after 30 days**. | Limited. | Compatible. | **NO (Trial only)** | **REJECTED**: Paid $7/mo required after 30 days. |
| **Railway** | 512 MB | **Requires $5/mo minimum plan** after initial trial credit. | Unlimited. | Compatible. | **NO (Paid only)** | **REJECTED**: Not free. |
| **Oracle Cloud Always Free (Self-hosted)** | Up to 50–200 GB | **24/7 dedicated compute** (Ampere A1 ARM or AMD micro VM). | Direct native PostgreSQL, no connection caps. | 100% Native. | **Yes** (Requires credit card on signup). | **Excellent alternative** if self-hosting is preferred. |

### Supabase vs. Neon Architectural Verdict
- **For Cloudflare-First / Serverless:** **Supabase** is superior because it does **not** count compute hours. A daily student interaction or minute-level automation tick generates active database queries, keeping the 7-day inactivity pause permanently at bay.
- **For Pure On-Demand Scale-to-Zero:** **Neon** is ideal if using the `@neondatabase/serverless` HTTP driver, provided background jobs are batched rather than continuously polled.

---

## 5. Background Workers & Automation Execution at ₹0/month

In local development, `pg-boss` polls Postgres continuously via `setInterval`. To achieve ₹0/month 24/7 execution without the user's laptop, the polling paradigm must be adapted to serverless scheduled invocations:

```
┌─────────────────────────────────────────────────────────────┐
│                 Cloudflare Cron Trigger                     │
│                  (Fires every 1 minute)                     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP POST /integrations/automations/tick
                               │ Header: X-Cron-Secret: <token>
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               StudyOS API (Cloudflare Worker)               │
│                                                             │
│  1. Evaluates active automations matching student timezone  │
│  2. Checks deduplication (skips if already ran today)       │
│  3. Dispatches due alerts (Telegram / In-App)               │
│  4. Evaluates midnight task rollovers & calendar sync       │
└──────────────────────────────┬──────────────────────────────┘
                               │ Queries via Hyperdrive (Pooled)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Supabase PostgreSQL (Free)                  │
│                (Storage & Execution Logs)                   │
└─────────────────────────────────────────────────────────────┘
```

### Why this satisfies 24/7 execution:
1. **Zero Compute Waste:** The system consumes CPU time **only during the few milliseconds** when the cron tick executes.
2. **Never Misses an Alert:** Because Cloudflare Cron Triggers fire globally every minute, student automations scheduled for "08:00" in `Asia/Kolkata` or `America/New_York` execute precisely at that minute.
3. **Database Remains Active:** The minute-by-minute or hourly cron hits ensure that Supabase's 7-day inactivity pause is never triggered.

---

## 6. Hermes Agent & MCP Hosting Evaluation

### A. The Reality of Hermes on Free Hosting
- **Architecture:** Hermes (`D:\StudyOS-Project\hermes-agent`) is an advanced Python autonomous agent framework with memory, trajectory compression, toolsets, and dynamic skill execution.
- **Resource Footprint:** Requires a persistent Python 3.11+ environment, 1.0–2.0 GB RAM, and several hundred megabytes of disk for model cache and dependencies.
- **Can it run on Cloudflare Workers?** **No**. Workers cannot execute Python runtimes or long-running CPU loops.
- **Can it run on a Free Container Tier?**
  - *Koyeb Free (512 MB RAM):* Too constrained for Hermes (will hit OOM crashes).
  - *Hugging Face Spaces (Docker):* **Yes**. Provides 2 vCPU, 16 GB RAM continuous runner for free. A Dockerized Hermes bridge can be hosted on a private Hugging Face Space.
  - *Oracle Cloud Always Free (Ampere ARM):* **Yes**. 2 OCPUs, 12 GB RAM can run full Hermes 24/7.

### B. The Canonical Hybrid Model (Recommended by Master Spec)
Per Master Spec `14_HERMES_AGENT_BRIDGE.md`:
> *"A user's Windows PC may run Hermes + a small StudyOS Agent Bridge. When the PC is off, Hermes is offline. StudyOS cloud, Telegram, sync and normal AI continue working."*

- **When Laptop is ON:** The student's local Hermes Agent starts, sends an authenticated heartbeat (`POST /integrations/agent/heartbeat`) to the StudyOS Cloud API, and processes complex planning proposals.
- **When Laptop is OFF:** StudyOS marks Hermes as `offline`. All core features—Today view, assignments, Google Calendar export, Telegram bot, scheduled alerts, and Cloud AI planning (via Gemini / Groq)—**continue running 24/7 without interruption**.
- **MCP Server:** `@open-sunsama/mcp` can run locally on the student's machine over stdio for Cursor/Claude/Hermes, or be exposed via HTTP SSE from the API server.

---

## 7. Comparison of Three Complete Architectures

```
                              ARCHITECTURE COMPARISON
═══════════════════════════════════════════════════════════════════════════════
DIMENSION             Option A: Serverless Edge    Option B: Hybrid Edge+Container   Option C: Dedicated Cloud VM
                      (Cloudflare + Supabase)      (Cloudflare + Koyeb + Postgres)   (Oracle Cloud Always Free)
───────────────────────────────────────────────────────────────────────────────
Monthly Cost (INR)    ₹0 / month                   ₹0 / month                        ₹0 / month
Web Hosting           Cloudflare Pages (Static)    Cloudflare Pages (Static)         Nginx / Caddy on VM
API Hosting           Cloudflare Workers (Hono)    Koyeb Free Container (512MB)      Docker on Ampere VM (12GB)
Database              Supabase Postgres (500MB)    Supabase / Neon Postgres (500MB)  Self-hosted Postgres on VM
Object Storage        Cloudflare R2 (10GB free)    Cloudflare R2 (10GB free)         Local NVMe + R2 Backup
Scheduler / Workers   Cloudflare Cron Triggers     Native pg-boss in Koyeb           Native pg-boss in Docker
Telegram Webhook      Edge Worker (<20ms latency)  Koyeb (Sleep cold start 3-5s)     VM Caddy (<50ms latency)
Hermes Agent          Local PC Hybrid (Laptop)     Hugging Face Space / Laptop       Directly on VM (24/7)
Cold Start Delay      Zero (0 ms)                  1–5s after 1 hr idle              Zero (0 ms)
Credit Card Needed?   NO                           NO                                YES (Verification only)
Vendor Lock-In        Low (Standard Hono/Postgres) Minimal (Standard Docker)         Zero (Standard Docker)
Maintenance Overhead  Near-Zero (Managed)          Low (Container restart)           Medium (Linux OS updates)
═══════════════════════════════════════════════════════════════════════════════
```

### Detailed Breakdown of Each Architecture:

### Architecture A: Cloudflare-First Serverless Edge (Recommended)
- **Components:**
  - `apps/web` on **Cloudflare Pages** (unmetered bandwidth, custom domain).
  - `apps/api` on **Cloudflare Workers** via Hono edge adapter.
  - Database on **Supabase Free** (500 MB Postgres) pooled via **Cloudflare Hyperdrive**.
  - File attachments on **Cloudflare R2** (10 GB free S3 storage, zero egress).
  - Automations via **Cloudflare Cron Triggers** (`* * * * *` calling `/automations/tick`).
  - Telegram Webhook handled directly by Workers at edge (<20ms response, zero cold start).
  - Hermes Agent via **Local PC Hybrid Bridge** (online when PC is active, graceful cloud fallback when PC is sleeping).
- **Monthly Cost:** **₹0 / month**.
- **Pros:** Zero cold starts, no credit card required, zero server maintenance, high reliability, global CDN.
- **Cons:** Authentication requires Web Crypto (PBKDF2) instead of C++ native `bcrypt`; Hermes is hybrid rather than 24/7 cloud.

### Architecture B: Hybrid Edge + Free Container (Koyeb / Render)
- **Components:**
  - `apps/web` on Cloudflare Pages.
  - `apps/api` running as a Docker container on **Koyeb Free Tier** (512 MB RAM).
  - Database on Supabase Free.
  - S3 on Cloudflare R2.
  - Background jobs run via native `pg-boss` inside Koyeb container.
- **Monthly Cost:** **₹0 / month**.
- **Pros:** 100% code parity with current local Node.js environment (preserves `bcrypt` and `pg-boss` polling unchanged).
- **Cons:** Koyeb free services enter deep sleep after 1 hour of inactivity. Pinging is required to keep it awake; if it sleeps, Telegram webhooks or student mobile requests experience a 3–5 second cold start.

### Architecture C: Dedicated Always Free Cloud VM (Oracle Cloud Infrastructure)
- **Components:**
  - 1 x OCI Ampere A1 Compute Instance (2 OCPUs, 12 GB RAM, 50 GB NVMe disk).
  - Runs full StudyOS `docker-compose.yml`: PostgreSQL 16, Redis, StudyOS API, Web Nginx, pg-boss, AND 24/7 Hermes Agent!
  - Cloudflare Free DNS and Cloudflare Tunnel (`cloudflared`) routing traffic without opening public VM ports.
- **Monthly Cost:** **₹0 / month**.
- **Pros:** Can host the **full Hermes Agent 24/7 in the cloud**; completely identical to local environment; 12 GB RAM is massive for a free tier.
- **Cons:** Requires a credit card for identity verification during sign-up; OCI Ampere capacity can be out of stock in high-demand regions (e.g. Mumbai, Frankfurt), requiring retries or script-based provisioning.

---

## 8. Security and Reliability Assessment

1. **Secret Management:**
   - Secrets (`JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `DATABASE_URL`, `R2_ACCESS_KEY`, `CALENDAR_ENCRYPTION_KEY`) must be stored in Cloudflare Worker Secrets (`wrangler secret put`) or container environment secrets. Never checked into Git.
2. **OAuth Callback Security:**
   - Google OAuth redirects must be registered with exact HTTPS URLs (`https://api.studyos.app/oauth/google/callback`). Cloudflare provides automated TLS certificates with HSTS.
3. **Database Security & Backups:**
   - Supabase encrypts data at rest and provides SSL connections (`sslmode=require`).
   - On the free plan, automated Point-in-Time Recovery is not included. A scheduled GitHub Action workflow can execute `pg_dump` weekly, encrypt the backup via GPG, and store it in Cloudflare R2 for ₹0 disaster recovery.
4. **Rate Limiting & DDoS Protection:**
   - Cloudflare provides unmetered DDoS mitigation, Web Application Firewall (WAF) rate limiting rules, and bot management on the free tier.
5. **Data Privacy & Multi-Tenancy:**
   - All StudyOS queries enforce `userId` tenancy boundaries. External AI calls (Gemini, Groq) use sanitized prompts that exclude private credentials.

---

## 9. Hosting Compatibility Matrix

| StudyOS Subsystem | Cloudflare Pages | Cloudflare Workers | Supabase / Neon | Cloudflare R2 | Koyeb Container | OCI Always Free VM |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Web SPA Dashboard** | **Native (Ideal)** | Overkill | N/A | N/A | Supported | Supported |
| **REST API Routes** | N/A | **Native (Hono)** | N/A | N/A | **Native (Node)** | **Native (Docker)** |
| **PostgreSQL Database** | N/A | N/A | **Native (Ideal)** | N/A | N/A | **Native (Docker)** |
| **File Storage / Drive Imports** | N/A | N/A | N/A | **Native (S3)** | N/A | Local / R2 |
| **Telegram 24/7 Webhook** | N/A | **Native (<20ms)** | N/A | N/A | Cold-start risk | **Native (<50ms)** |
| **Automations Scheduler** | N/A | **Via Cron Trigger** | N/A | N/A | Native pg-boss | Native pg-boss |
| **Hermes Agent (Python)** | Incompatible | Incompatible | N/A | N/A | OOM Risk (512MB) | **Native (12GB RAM)** |
| **MCP Server (Academic Tools)** | N/A | Via HTTP SSE | N/A | N/A | Via HTTP SSE | Via Stdio / HTTP |

---

## 10. Final Recommendation & Implementation Path

### The Recommended Architecture: **Architecture A (Cloudflare Serverless + Supabase + Hybrid Hermes)**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             STUDYOS CLIENTS                                 │
│          Web Browser (SPA)   •   Android App   •   Windows Desktop          │
└───────────────────────┬──────────────────────────────┬──────────────────────┘
                        │ HTTPS (Static Assets)        │ HTTPS (API & Sync)
                        ▼                              ▼
┌──────────────────────────────┐    ┌─────────────────────────────────────────┐
│       Cloudflare Pages       │    │           Cloudflare Workers            │
│      (Web Frontend Dist)     │    │     (Hono Edge REST API + Webhooks)     │
│        Cost: ₹0/month        │    │             Cost: ₹0/month              │
└──────────────────────────────┘    └───────┬──────────────┬───────────┬──────┘
                                            │              │           │
                 ┌──────────────────────────┘              │           └──────────┐
                 │ Cloudflare Hyperdrive                   │ S3 API               │ Outbound Webhook
                 ▼ (Pooled TCP)                            ▼                      ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐    ┌───────────────────┐
│     Supabase PostgreSQL      │    │        Cloudflare R2         │    │   Telegram Bot    │
│    (Canonical Database)      │    │   (Object Storage 10 GB)     │    │     API 24/7      │
│        Cost: ₹0/month        │    │        Cost: ₹0/month        │    │   Cost: ₹0/month  │
└──────────────────────────────┘    └──────────────────────────────┘    └───────────────────┘
                 ▲
                 │ Outbound Heartbeat & Proposal Staging (When PC is active)
┌────────────────┴─────────────┐
│     Student's Windows PC     │
│  Hermes Agent + Agent Bridge │
│   (Optional / Zero Cloud $)  │
└──────────────────────────────┘
```

### Why Architecture A is the Superior Choice:
1. **Absolute ₹0 Operating Cost:** Requires no credit card, no recurring subscriptions, and stays strictly within permanent free allowances.
2. **Instant Response (Zero Cold Starts):** Unlike free container platforms that sleep after 1 hour (causing 5-second delays on mobile or Telegram), Cloudflare Workers and Pages serve requests globally in under 30 milliseconds.
3. **24/7 Autonomous Student Support:** The Telegram bot answers `/today` and `/assignments` instantly at any hour of the night, even when the laptop is closed.
4. **Resilient Scheduling:** Minute-by-minute Cron Triggers evaluate due study sessions, assignments, and daily briefings reliably.
5. **Faithful to Master Spec:** Fully adheres to `14_HERMES_AGENT_BRIDGE.md` and `20_CLOUDFLARE_DEPLOYMENT.md`.

---

## 11. Staged Deployment Sequence (Phase 9B Preview)

When the project proceeds to Phase 9B deployment, the execution should follow this safe order:

1. **Step 1: Database Provisioning (Supabase)**
   - Create free Supabase organization & project.
   - Run Drizzle migrations (`bun run --filter @open-sunsama/database migrate`) against the Supabase pooled connection string.
2. **Step 2: Object Storage Setup (Cloudflare R2)**
   - Create R2 bucket `studyos-attachments`.
   - Generate S3 API credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`).
3. **Step 3: Edge API Configuration (Cloudflare Worker)**
   - Configure `wrangler.toml` in `apps/api`.
   - Bind Cloudflare Hyperdrive to Supabase connection string.
   - Configure Cloudflare Cron Trigger (`* * * * *`).
   - Store encrypted secrets (`wrangler secret put`).
4. **Step 4: Frontend Deployment (Cloudflare Pages)**
   - Deploy `apps/web/dist` to Cloudflare Pages.
   - Bind custom domain with automated SSL.
5. **Step 5: Integrations & Webhook Registration**
   - Point Telegram bot webhook to `https://api.studyos.app/integrations/telegram/webhook`.
   - Update Google OAuth Authorized Redirect URIs to production domain.
6. **Step 6: End-to-End Verification**
   - Verify web login, mobile sync cursor, Telegram commands, study session calendar export, and automated daily briefing tick.

---

## 12. Outstanding Decisions for User Confirmation

Before implementation in Phase 9B, the following decisions are confirmed:
1. **Password Hashing on Workers:** Recommend migrating from native Node `bcrypt` to Web Crypto PBKDF2 / WebAssembly Argon2 to stay under the 10 ms CPU isolate limit, or proxying auth endpoints if container-based.
2. **Backup Location:** Confirm whether weekly automated database dumps should be archived to Cloudflare R2 or committed encrypted to a private GitHub repository.
3. **Domain Name:** User may either use Cloudflare's free subdomains (`*.pages.dev`, `*.workers.dev`) at ₹0, or connect their own custom domain name (e.g. `studyos.in`).

*Assessment complete. No application code, database migrations, or branches were altered.*
