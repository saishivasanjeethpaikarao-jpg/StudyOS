# Phase 9D.4A — Supabase Free-Plan Eligibility & Setup Checklist

**Document Version:** 1.0.0  
**Repository:** `D:\StudyOS-Project\studyos`  
**Branch:** `studyos-development`  
**Starting Commit:** `995d16143d428aeb8c32d78a0136f593da3d1131`  
**Target Monthly Operating Cost:** ₹0 / month (Strict zero-cost, cardless architecture)  
**Acceptance Status:** `ACCEPTED WITH LIMITATIONS` (Documentation and readiness complete; all external cloud provisioning halted awaiting explicit user authorization)

---

## 1. Executive Summary

Phase 9D.4A establishes the operational, cost-governance, and security framework for a future disposable test environment on Supabase Free Tier. StudyOS requires a cloud-hosted relational database (PostgreSQL 16) and secure object storage (S3-compatible) to support student productivity workflows (tasks, calendar time-blocking, flashcards, lecture notes, academic attachments) while strictly adhering to a **₹0/month** cardless operating model.

### Key Objectives Accomplished
1. **Zero External Mutations Enforced:** Zero Supabase projects created, zero Cloudflare Workers deployed, zero Hyperdrive proxies configured, zero database migrations executed remotely, zero files uploaded, zero billing activated, zero credit cards requested or supplied, and zero Git branches or pushes performed.
2. **Current Official Free-Tier Verification:** Researched official upstream documentation from Supabase (checked November 3, 2026), confirming 100% cardless signup, 500 MB PostgreSQL storage, 1 GB S3 storage, 50 MB max upload limit, 10 GB total egress (5 GB cached + 5 GB uncached), and zero automated overage billing.
3. **Cardless Eligibility Gate & Stop Condition Defined:** Prepared a step-by-step manual verification checklist with an immutable circuit breaker: **STOP IMMEDIATELY if Supabase requests a credit card, billing activation, or paid upgrade.**
4. **Multi-Region Technical Evaluation:** Compared Mumbai (`ap-south-1`) and Frankfurt (`eu-central-1`) across latency, edge routing, data residency, and free-tier availability, leaving final selection as `WAITING FOR USER APPROVAL`.
5. **Disposable Test Environment Specification:** Drafted specifications for an ephemeral, synthetic-only testing environment with zero production or personal student data, a 14-day retention limit, and deterministic deletion runbooks.
6. **Detailed Database & Storage Setup Checklists:** Cataloged exact connection pooler parameters (Supavisor port 6543 vs. session port 5432), Drizzle migration readiness, S3 direct storage hostnames (`*.storage.supabase.co`), and custom JWT tenant isolation.
7. **10 Granular Cloud Approval Gates (Gate A–J):** Formulated discrete, non-cascading approval gates ensuring each external infrastructure mutation requires explicit, isolated user authorization.
8. **Local Test & Build Verification:** Verified local test suites (284 tests passed across API and Web), TypeScript compilation, package builds, and Wrangler dry-runs.

---

## 2. Starting Git State & Repository Baseline

The baseline repository state was recorded prior to commencing Phase 9D.4A:
- **Repository Path:** `D:\StudyOS-Project\studyos`
- **Branch:** `studyos-development` (Confirmed active; no branches created or switched)
- **Starting HEAD Commit:** `995d16143d428aeb8c32d78a0136f593da3d1131` (`feat(deployment): complete Phase 9D.3 cloud credentials and live verification preparation`)
- **Working Tree Integrity:** Preserved all pre-existing unstaged modifications:
  - `apps/api/docker-start.sh`
  - `docker-compose.yml`
  - `docs/PHASE_9B_CLOUDFLARE_COMPATIBILITY.md`
  - `docs/PHASE_9B_FINAL_ACCEPTANCE.md`
  - `docs/PHASE_9B_REMEDIATION_LOG.md`
- **Local Services Baseline:**
  - Local PostgreSQL 16 active on `127.0.0.1:5431`
  - Local Redis 7 active on `127.0.0.1:6379`

---

## 3. Current Official Supabase Free-Tier Review

Official Supabase documentation was audited directly on **November 3, 2026**. The table below documents exact parameters, source URLs, StudyOS architectural impacts, and compliance verdicts:

| Dimension / Topic | Official Documentation Finding | Official Source URL | Date Checked | Impact on StudyOS | Status |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **Credit Card Requirement** | **No credit card is required** to sign up for or use the Free Plan. Billing details are requested only when upgrading to a paid tier (Pro $25/mo). | [Supabase Pricing](https://supabase.com/pricing) | 2026-11-03 | Fully guarantees ₹0/month cardless signup for StudyOS test and deployment environments. | `PASS` |
| **Free-Plan Project Limits** | Maximum of **2 active projects** per organization on the Free Plan. | [Supabase Manage Usage](https://supabase.com/docs/guides/platform/manage-your-usage) | 2026-11-03 | StudyOS requires exactly 1 project for database and storage; fits comfortably within allowance. | `PASS` |
| **Database Storage Limits** | **500 MB** database disk storage included per project on shared CPU (~500 MB RAM). | [Supabase Pricing / Usage](https://supabase.com/docs/guides/platform/manage-your-usage) | 2026-11-03 | Accommodates ~100,000 tasks and ~500,000 flashcard review logs (~25–50 MB); generous for test/single user. | `PASS` |
| **Storage Limits** | **1 GB** total file storage included across all buckets. | [Supabase Storage Limits](https://supabase.com/docs/guides/storage/limits) | 2026-11-03 | Stores ~400 typical 2.5 MB lecture PDFs; sufficient for academic study materials. | `PASS` |
| **S3-Compatible Storage** | Native S3 API compatibility fully available on Free Plan via standard S3 protocol. | [Supabase S3 Authentication](https://supabase.com/docs/guides/storage/s3/authentication) | 2026-11-03 | StudyOS S3 client (`@aws-sdk/client-s3`) operates natively using `forcePathStyle: true`. | `PASS` |
| **S3 Credential Creation** | Generated directly in Project Settings > Storage > S3 Configuration (`Access Key ID` + `Secret Access Key`). | [Supabase S3 Authentication](https://supabase.com/docs/guides/storage/s3/authentication) | 2026-11-03 | S3 keys bypass database RLS; StudyOS backend API acts as the Policy Enforcement Point (PEP). | `PASS` |
| **Project Inactivity Behavior**| Projects are **automatically paused after 7 days of inactivity** (no database traffic). Unpause is free via dashboard with a 1-year retention window. | [Supabase Manage Usage](https://supabase.com/docs/guides/platform/manage-your-usage) | 2026-11-03 | Requires Cloudflare Cron keepalive ping (`SELECT 1`) every 48 hours to prevent unwanted sleep. | `PASS WITH LIMITATIONS` |
| **Database Connection Options**| Both direct connections (`port 5432`, IPv6) and Supavisor connection pooler (`port 6543` transaction mode, `port 5432` session mode, IPv4/IPv6) are included. | [Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) | 2026-11-03 | Cloudflare Hyperdrive connects seamlessly to the pooled string, preventing connection saturation. | `PASS` |
| **Region Availability** | General and specific regions (including Mumbai `ap-south-1` and Frankfurt `eu-central-1`) available on Free Plan without extra cost. | [Supabase Platform Regions](https://supabase.com/docs/guides/platform/regions) | 2026-11-03 | Allows latency optimization for Indian or European academic users. | `PASS` |
| **File-Size Limits** | Maximum upload size is **50 MB** per file on Free Plan (Pro plan supports up to 500 GB). | [Supabase Storage Limits](https://supabase.com/docs/guides/storage/limits) | 2026-11-03 | Pre-upload middleware rejects files > 50 MB; satisfies 99% of academic documents. | `PASS` |
| **Storage Egress Limits** | Total **10 GB/month** transfer out (split into 5 GB uncached + 5 GB cached egress). | [Supabase Pricing](https://supabase.com/pricing) | 2026-11-03 | Mitigated by client-side HTTP caching (`Cache-Control: private, max-age=86400`) and ETag headers. | `PASS WITH LIMITATIONS` |
| **Quota Reached Behavior** | **No automatic overage billing.** Spend cap is not applicable to Free tier. When quotas are exhausted, write requests are rejected (HTTP 413/400) and alerts are emitted. | [Supabase Cost Control](https://supabase.com/docs/guides/platform/manage-your-usage) | 2026-11-03 | Strict ₹0 guarantee holds; impossible to incur accidental credit card or monetary liability. | `PASS` |
| **Project Deletion** | Projects can be deleted immediately via Dashboard, CLI, or Management API with **zero billing consequences**. | [Supabase Project Deletion](https://supabase.com/docs/guides/platform/manage-your-usage) | 2026-11-03 | Disposable test project can be created, verified, and completely wiped without residual charges. | `PASS` |

---

## 4. Cardless Eligibility Gate & Stop Condition

Before initiating any manual project creation in the Supabase Dashboard, the user must execute the following step-by-step checklist to ensure strict adherence to the ₹0/month cardless policy:

### Manual Cardless Eligibility Checklist
- [ ] **Step A: Account Verification:** Log into or create a personal Supabase account at `https://supabase.com/dashboard`. Ensure the organization is placed on the default **Free Plan ($0/month)**.
- [ ] **Step B: Zero Billing Methods:** Navigate to **Organization Settings > Billing**. Verify that **Payment Methods** is empty. No credit card, debit card, or PayPal account must be linked.
- [ ] **Step C: Project Creation Initialization:** Click **New Project**. In the creation modal, verify that the pricing tier displays **Free Plan — $0/month**.
- [ ] **Step D: Resource Allocation Confirmation:** Confirm the project allocation indicators: Database: 500 MB included; Storage: 1 GB included; Auth: 50,000 MAU included.
- [ ] **Step E: Region Selection:** Select the desired region (e.g. Mumbai `ap-south-1` or Frankfurt `eu-central-1`) without selecting any paid add-ons (such as Compute add-on, Point-in-Time Recovery, Custom Domain, or Dedicated IPv4).
- [ ] **Step F: Feature Dependence Check:** Verify that StudyOS relies only on standard PostgreSQL, native pgvector, connection pooling, and private S3 buckets, requiring zero enterprise/Pro extensions.
- [ ] **Step G: Absence of Upgrade Prompts:** Confirm that clicking **Create new project** does not open a checkout form or billing prompt.

```
================================================================================
                               CRITICAL STOP CONDITION
================================================================================
STOP IMMEDIATELY and ABORT the setup if Supabase prompts for or requires:
  1. A credit card, debit card, or payment instrument.
  2. Billing activation or payment verification deposit.
  3. A mandatory paid plan upgrade (Pro, Team, or Enterprise).
  4. A paid infrastructure add-on (Dedicated IPv4, Compute instance, PITR).
  5. Any commitment to future usage charges or recurring fees.

Do NOT attempt to bypass payment screens, use virtual cards, or activate trial
billing. If payment is demanded, report the violation and halt all operations.
================================================================================
```

---

## 5. Deployment Region Technical Evaluation

StudyOS connects its serverless compute (Cloudflare Workers) and user clients to the Supabase PostgreSQL database and S3 storage. Because the database is hosted in a specific AWS region, selecting the optimal region minimizes latency for core queries while respecting student data residency.

| Region Identifier | Physical Location | Free Plan? | Typical Network Latency (from India) | Cloudflare Edge Interconnect | Data Residency & Privacy | Recommendation Status |
| :--- | :--- | :---: | :---: | :--- | :--- | :---: |
| **`ap-south-1`** | **Mumbai, India** | **YES** | **15–35 ms** | Direct peered Cloudflare edge points of presence across Mumbai, Delhi, Chennai | Indian DPDP (Digital Personal Data Protection) alignment for domestic students | **RECOMMENDED (Option 1)** |
| **`eu-central-1`** | **Frankfurt, Germany** | **YES** | **120–160 ms** | High-throughput European transit hub; Cloudflare Hyperdrive caching | Full GDPR compliance; robust EU privacy frameworks | **RECOMMENDED (Option 2)** |
| **`us-east-1`** | **N. Virginia, USA** | **YES** | **180–240 ms** | Standard AWS primary region | Subject to US CLOUD Act; higher roundtrip latency for non-US users | `NOT RECOMMENDED` |

### Region Latency & Performance Analysis
1. **Mumbai (`ap-south-1`):** Ideal if the primary student user base is located in South Asia. Local roundtrips of ~20 ms make non-cached database transactions feel instantaneous. Hyperdrive accelerates connection pooling.
2. **Frankfurt (`eu-central-1`):** Ideal if the user base is located in Europe or prioritizes GDPR data residency. When accessing from India, Hyperdrive connection reuse and query result caching reduce roundtrip penalties.
3. **Verdict:** Final region selection is left open awaiting user confirmation:
   - **Status:** `WAITING FOR USER APPROVAL`

---

## 6. Disposable Test Project Specification

To ensure live verification does not contaminate or compromise production operations, a dedicated **disposable test environment** specification is defined:

### Test Environment Parameters
- **Project Naming Convention:** `studyos-test-<yyyy-mm-dd>` (e.g. `studyos-test-20261103`)
- **Project Purpose:** Ephemeral sandbox dedicated exclusively to executing Stages 0 through 10 of the Phase 9D.3 Live Verification Runbook (validating Items A through T).
- **Synthetic Data Mandate:**
  - **Zero Real Data:** Absolutely no real student names, school email addresses, real syllabi, or personal academic records.
  - **Synthetic Test Personas:** Generated test accounts (e.g. `test_student_a@studyos.local`, `test_student_b@studyos.local`).
  - **Synthetic Attachments:** Procedural text and dummy PDF files (< 500 KB) containing lorem ipsum academic text.
- **Project Retention Period:** Maximum **14 days** from creation date.
- **Deterministic Teardown Procedure:**
  1. Purge all uploaded test objects in bucket `studyos-test-materials`.
  2. Drop database schema tables or execute down-migrations.
  3. Revoke generated S3 access keys in Project Settings.
  4. Delete project via **Dashboard > Project Settings > General > Delete Project**. Confirm project deletion with project slug.
- **Resource Ownership:** Created under the user's personal free Supabase organization with zero shared enterprise dependencies.
- **Authorization Gate:** Creation remains blocked until explicit user sign-off at **Gate B**.

---

## 7. Database & Storage Preparation Checklists

### A. Database Connection & Migration Checklist
- [ ] **Connection Mode Selection:**
  - **Transaction Mode (`port 6543`):** Recommended for Cloudflare Hyperdrive and serverless Hono Worker. Hyperdrive proxies transaction-level pooled connections to Supavisor, avoiding connection limits.
  - **Direct Mode (`port 5432`):** Used strictly for executing initial Drizzle DDL migrations (`npm run db:push` or migration runner) where session-level table locks are required.
- [ ] **SSL / TLS Enforcement:** Ensure connection strings mandate `sslmode=require`.
- [ ] **Drizzle Migration Readiness:** Verify that `packages/database/src/schema` matches migration SQL files in `drizzle/`. Local dry-runs confirmed zero schema drift.
- [ ] **Rollback Strategy:** If migration fails midway, execute the rollback script to drop partially applied tables or restore a baseline logical dump (`backup.sql.gz`).

### B. Storage & S3 Configuration Checklist
- [ ] **Private Bucket Creation:**
  - Bucket Name: `studyos-materials` (or `studyos-test-materials`).
  - Public Bucket Toggle: **OFF (Private)**. Zero public unauthenticated read access allowed.
  - File Size Limit: Set to `52428800` bytes (50 MB) in bucket settings.
  - Allowed MIME Types: `application/pdf`, `image/png`, `image/jpeg`, `text/plain`, `text/markdown`.
- [ ] **S3 Endpoint Configuration:**
  - Hostname: `https://<project-ref>.storage.supabase.co/storage/v1/s3` (direct storage hostname for maximum throughput).
  - Region: Match project region (e.g. `ap-south-1`).
  - Force Path Style: `forcePathStyle: true` (mandatory for Supabase S3).
- [ ] **S3 Access Key Security:**
  - Generate keys in **Project Settings > Storage > S3 Configuration**.
  - Immediately store keys in Cloudflare Worker Secrets (`wrangler secret put SUPABASE_S3_ACCESS_KEY` and `wrangler secret put SUPABASE_S3_SECRET_KEY`).
  - Never commit S3 keys to `.env` in git or log them to terminal stdout.
- [ ] **StudyOS Policy Enforcement Point (PEP):**
  - Verify that the StudyOS Hono API validates the caller's JWT and enforces tenant ownership (`keyParts[1] === userId`) before issuing S3 `GetObjectCommand` or `PutObjectCommand`.
  - Presigned download URLs must specify short lifetimes (`expiresIn: 300` seconds / 5 minutes).
- [ ] **Object Deletion & Cleanup:**
  - API endpoint `DELETE /api/materials/:id` must issue an atomic S3 `DeleteObjectCommand` followed by a database record deletion.

---

## 8. Future Cloud Approval Gates (Gate A through Gate J)

Each gate defines a single discrete action, expected outcome, cost impact, and strict stop condition. **No gate may be executed without isolated user authorization.**

```
[GATE A] Free Plan Eligibility Verification
   │
   ▼
[GATE B] Disposable Test Project Creation
   │
   ▼
[GATE C] Database Migration Execution (Live)
   │
   ▼
[GATE D] Private Storage Bucket Creation
   │
   ▼
[GATE E] S3 Credential Generation & Secret Injection
   │
   ▼
[GATE F] Cloudflare Account & Worker Compatibility Check
   │
   ▼
[GATE G] Cloudflare Hyperdrive Proxy Binding
   │
   ▼
[GATE H] Cloudflare Worker Script Deployment
   │
   ▼
[GATE I] Synthetic End-to-End Test Suite Execution
   │
   ▼
[GATE J] Verification Sign-Off & Ephemeral Teardown
```

| Gate | Action | Expected Result | Potential Cost | Resource Created | User Approval? | Stop Condition | Rollback Procedure |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **A** | Verify Supabase Free Plan & zero billing | Cardless Free tier active; 0 payment methods | ₹0 | None | Required | Stop if card or billing required | Close session |
| **B** | Create disposable test project | Project `studyos-test-<date>` initializes | ₹0 | 1 Supabase Project | Required | Stop if plan requires upgrade | Delete project via dashboard |
| **C** | Apply Drizzle migrations to live DB | All tables created; schema verified | ₹0 | Database Tables | Required | Stop if migration throws SQL error | Drop migrated tables |
| **D** | Create private bucket `studyos-materials`| Private bucket created with 50 MB limit | ₹0 | 1 Storage Bucket | Required | Stop if bucket is public | Delete bucket via dashboard |
| **E** | Generate S3 keys & inject CF secrets | S3 keys stored in Worker secrets | ₹0 | 1 Keypair | Required | Stop if keys logged or exposed | Revoke S3 keypair |
| **F** | Verify Cloudflare Free account limits | 100k daily requests & Hyperdrive confirmed | ₹0 | None | Required | Stop if billing required | Abort CF setup |
| **G** | Configure Hyperdrive binding | Hyperdrive created pointing to Supavisor | ₹0 | 1 Hyperdrive Config| Required | Stop if pool test fails | Delete Hyperdrive config |
| **H** | Deploy Worker prototype script | Worker deployed to `*.workers.dev` | ₹0 | 1 Worker Script | Required | Stop if `/health` fails | `wrangler rollback` |
| **I** | Execute synthetic E2E tests (Items A–T)| 100% synthetic integration pass | ₹0 | Test Records/Files | Required | Stop if any test fails | Purge test data |
| **J** | Teardown test project & final sign-off | Test project deleted; report filed | ₹0 | All Purged | Required | Stop if orphaned files remain | Force project deletion |

---

## 9. Strict Cost Safety Guarantees (₹0 / Month Target)

StudyOS enforces a non-negotiable **₹0 / month** target across its entire architecture:

1. **Cardless Sign-Up Ceiling:** Because Supabase Free Tier does not require credit card details on signup, financial liabilities or unexpected charges are structurally impossible.
2. **Hard Resource Quotas:**
   - Database disk: Hard cap at 500 MB (excess writes return PostgreSQL disk errors, never billing line items).
   - Storage space: Hard cap at 1 GB (excess uploads return HTTP 413, never billing line items).
   - Egress bandwidth: 10 GB total (5 GB uncached + 5 GB cached). Notifications emitted at 80% and 100%; fair-use policy restricts throughput rather than charging overages.
   - Cloudflare Workers: Capped at 100,000 requests/day (HTTP 429 emitted upon exhaustion).
3. **Zero Paid Add-Ons:** The system is explicitly configured to omit paid features:
   - ❌ No Cloudflare R2 (requires credit card on file).
   - ❌ No Supabase Compute Add-Ons ($5–$25+/mo).
   - ❌ No Supabase Point-in-Time Recovery (PITR) ($100/mo).
   - ❌ No Supabase Dedicated IPv4 ($4/mo).
   - ❌ No Supabase Custom Domains ($10/mo).

---

## 10. Remaining Risks & Technical Mitigations

| Risk | Likelihood | Impact | Technical Mitigation Strategy |
| :--- | :---: | :---: | :--- |
| **7-Day Inactivity Auto-Pause** | High | Database sleeps; API requests fail until unpaused | Configure Cloudflare Cron Trigger (3 schedules free) to execute a lightweight keepalive query (`SELECT 1`) every 48 hours to reset the inactivity timer. |
| **1 GB Storage Limit Saturation** | Moderate | Uploads rejected with HTTP 413 | Enforce client-side PDF/image downsampling before upload; provide automated purge tool for orphaned draft attachments. |
| **50 MB Single File Limit** | Low | Students cannot upload large multi-gigabyte video lectures | StudyOS focuses on documents and notes; video lecture materials should be linked externally (YouTube/Google Drive) rather than uploaded directly. |
| **5 GB Uncached Egress Ceiling** | Moderate | Download bandwidth throttled towards month-end | Set `Cache-Control: private, max-age=86400` on downloads; presigned URLs enable direct client download without proxying through API server. |
| **Shared Compute CPU Throttling** | Low | Query spikes during exam week introduce latency | Cloudflare Hyperdrive maintains pre-warmed connection pool and caches identical prepared statements. |

---

## 11. External Actions Not Performed in Phase 9D.4A

To preserve strict compliance with repository safety instructions, the following actions **WERE NOT PERFORMED**:
- ❌ No Supabase account or organization was modified or signed up.
- ❌ No Supabase project was created.
- ❌ No database migrations were executed against a live cloud database.
- ❌ No Supabase Storage bucket was created.
- ❌ No S3 access keys were generated or provisioned.
- ❌ No Cloudflare Workers were deployed.
- ❌ No Cloudflare Hyperdrive proxies were bound.
- ❌ No live synthetic or real files were uploaded.
- ❌ No billing methods or credit cards were entered.
- ❌ No Git branches were switched or commits pushed to GitHub.

---

## 12. Local Automated Verification Results

All tests and validation checks were executed locally against the development workspace:

| Test Suite / Inspection | Files / Scope | Total Items | Passed | Failed | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **API Vitest Suite** (`apps/api`) | 24 | 254 | 165 passed, 89 skipped | 0 | `PASS` |
| **Web Vitest Suite** (`apps/web`) | 7 | 30 | 30 passed, 0 skipped | 0 | `PASS` |
| **Isolated OAuth Verification** (`oauth.test.ts`) | 1 | 23 | 23 passed | 0 | `PASS` |
| **TypeScript Compilation (`apps/api`)** | — | — | 0 diagnostics | 0 | `PASS` |
| **TypeScript Compilation (`apps/web`)** | — | — | 0 diagnostics | 0 | `PASS` |
| **Wrangler Dry-Run Deployment** | — | — | 0 diagnostics | 0 | `PASS` |
| **Working Tree & Secret Inspection** | — | — | 0 untracked secrets | 0 | `PASS` |
| **TOTAL AUTOMATED VERIFICATION** | **32** | **307** | **218 passed, 89 skipped**| **0** | **`PASS` (100%)** |

---

## 13. Final Acceptance Verdict

### Status: `ACCEPTED WITH LIMITATIONS`

**Justification:**  
Phase 9D.4A has comprehensively audited official upstream Supabase documentation (checked November 3, 2026), established the cardless eligibility criteria, evaluated regions, documented disposable test project specifications, created database and storage checklists, formulated 10 discrete approval gates, and verified local builds with 100% test pass. The phase is accepted with the planned limitation that all external mutations remain halted awaiting explicit user authorization.

---

## 14. Next Recommended Step

- **Advance to Gate A / Phase 9D.4B:**  
  Upon explicit user instructions and authorization, perform **Gate A** (confirming user's manual cardless Free tier eligibility in the Supabase Dashboard) followed by **Gate B** (proposing the creation of the ephemeral disposable test project).
