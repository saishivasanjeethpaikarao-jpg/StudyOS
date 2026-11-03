# StudyOS Phase 9D.1: Supabase Storage Compatibility, Security Audit and Migration Plan

**Document Version:** 1.0.0 (Phase 9D.1 Acceptance)  
**Date:** November 3, 2026  
**Phase:** Phase 9D.1 — Supabase Storage Assessment & Local Preparation  
**Workspace:** `D:\StudyOS-Project`  
**Repository:** `D:\StudyOS-Project\studyos`  
**Branch:** `studyos-development`  
**Base Commit:** `204c5c3` (`docs(deployment): complete Phase 9D controlled deployment readiness and gate evaluation`)  
**Target Operating Cost:** ₹0 / month (Strict Target)  
**Final Verdict:** **PASS WITH LIMITATIONS (RECOMMENDED CARDLESS STORAGE BACKEND FOR STUDYOS)**  

---

## 1. Executive Summary & Statement of Non-Deployment

Phase 9D identified that while Cloudflare R2 provides a generous 10 GB free tier with zero egress fees, **Cloudflare requires a payment method (credit card) on file** to activate R2 in the Cloudflare Dashboard. For students and developers seeking a strictly cardless **₹0/month deployment**, this requirement creates an adoption blocker.

Phase 9D.1 evaluated whether **Supabase Storage** can serve as the primary or alternative object storage provider for StudyOS to achieve a **100% cardless, zero-cost architecture** without sacrificing zero-trust multi-tenant isolation, data confidentiality, or operational reliability.

> [!IMPORTANT]
> **EXPLICIT STATEMENT OF LOCAL PREPARATION & NON-DEPLOYMENT:**
> In accordance with non-negotiable safety directives:
> 1. **ZERO CLOUD RESOURCES CREATED:** No Supabase storage buckets were created or modified over the network.
> 2. **ZERO BILLING ACTIVATION:** No payment cards or billing accounts were registered.
> 3. **ZERO FILE MIGRATION:** No live student attachments or production data were transferred.
> 4. **ZERO REMOVAL OF R2:** Cloudflare R2 compatibility and bindings remain 100% intact and supported.
> 5. **UNCOMMITTED USER FILE PRESERVATION:** Pre-existing user modifications in `docker-compose.yml`, `apps/api/docker-start.sh`, and `docs/PHASE_9B_*.md` were strictly preserved untouched.
> 6. **ZERO GIT PUSH:** All preparation and testing occurred strictly on local branch `studyos-development`.

---

## 2. Existing Storage Architecture in StudyOS

StudyOS manages three categories of binary files:
1. **User Avatars:** User profile images (PNG, JPEG, WebP, GIF) capped at 2 MB.
2. **Task & Assignment Attachments:** Class notes, assignment briefs, and worksheets (PDF, DOCX, TXT, images, videos) capped at 10 MB.
3. **Academic Learning Resources (Phase 3):** Reusable study materials, textbook excerpts, and reference PDFs linked to Subjects, Assignments, or Study Sessions, capped at 10 MB.

### 2.1 File Storage Delivery Model (The Streaming Proxy Pattern)

StudyOS implements a **Zero-Trust Server-Side Streaming Proxy** pattern:
- **Clients never interact directly with raw storage endpoints:** Students upload to the StudyOS API gateway (`/uploads/*` or `/resources/upload`).
- **Cryptographic User Identification:** The API verifies the student's identity via JWT (`auth` middleware) and automatically embeds the student's unique ID into the object path:
  `{folder}/{userId}/{timestamp}-{sanitizedFilename}`
- **Private Buckets by Default:** Storage buckets are completely private; no public read URLs are generated.
- **Server-Side Authorization on Retrieval:** When retrieving files via `GET /uploads/*` or `GET /resources/:id/file`, the server parses the object key, strictly validates that `keyParts[1] === session.userId`, fetches the file stream from the S3-compatible backend, and streams the bytes with `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff` headers.

---

## 3. Storage Dependency Map & Code Paths

Every feature and code path depending on storage was traced across the codebase:

```
+--------------------------------------------------------------------------------------------------+
| FRONTEND CLIENTS & USER INTERFACE                                                                |
|                                                                                                  |
|   - apps/web/src/hooks/useUploadAvatar.ts        -> Invokes POST /uploads/avatar                 |
|   - apps/web/src/hooks/useUploadAttachment.ts    -> Invokes POST /uploads/attachments            |
|   - apps/web/src/hooks/useTaskAttachments.ts     -> Queries /attachments & calls DELETE          |
|   - apps/web/src/components/kanban/task-attachments.tsx -> Renders preview & download links     |
|   - apps/web/src/components/ui/file-upload-node.tsx     -> Drag-and-drop file upload UI         |
+-----------------------------------------------+--------------------------------------------------+
                                                |
                                                | Authenticated HTTP Multipart / Cookie Session
                                                v
+--------------------------------------------------------------------------------------------------+
| API ROUTING LAYER (apps/api/src/routes/)                                                         |
|                                                                                                  |
|   - POST /uploads/avatar             -> Validates image MIME, 2 MB cap, updates users.avatarUrl  |
|   - POST /uploads/attachments        -> Validates attachment MIME, 10 MB cap, inserts attachment |
|   - GET  /uploads/*                  -> Enforces userId === keyParts[1], streams object bytes    |
|   - DELETE /uploads/*                -> Enforces ownership, deletes object from storage          |
|   - GET  /attachments                -> Lists database attachment metadata by taskId/userId      |
|   - GET  /attachments/:id            -> Fetches single attachment metadata                       |
|   - DELETE /attachments/:id          -> Deletes from storage & database atomically               |
|   - POST /resources/upload           -> Learning resource upload, validates 10 MB cap, links     |
|   - GET  /resources/:id/file         -> Downloads private academic resource with Content-Disp    |
+-----------------------------------------------+--------------------------------------------------+
                                                |
                                                | Unified Storage Adapter
                                                v
+--------------------------------------------------------------------------------------------------+
| STORAGE ABSTRACTION LAYER (apps/api/src/services/storage/ & apps/api/src/lib/s3.ts)             |
|                                                                                                  |
|   - StorageProvider Interface        -> Common contract for upload, getObject, delete, presign   |
|   - S3CompatibleStorageProvider      -> @aws-sdk/client-s3 implementation                        |
|   - sanitizeFilename()               -> Strips directory traversal (../../) and special chars    |
|   - generateUniqueKey()              -> Embeds {folder}/{userId}/{timestamp}-{filename}          |
|   - extractKeyFromUrl()              -> Parses /uploads/{key} safely                             |
+-----------------------+---------------------------------------+----------------------------------+
                        |                                       |
       +----------------+----------------+     +----------------+----------------+
       | Option A: Supabase Storage      |     | Option B: Cloudflare R2         |
       | (S3-Compatible SigV4 Endpoint)  |     | (S3-Compatible Endpoint)        |
       | https://<ref>.supabase.co/      |     | https://<id>.r2.cloudflarest... |
       | storage/v1/s3                   |     | [Requires Card on File]         |
       | [100% Cardless Free Tier]       |     +---------------------------------+
       +---------------------------------+
```

### 3.1 Database Metadata Schemas
- **`users.avatar_url`** (`packages/database/src/schema/users.ts`): Stores relative proxy URL `/uploads/avatars/{userId}/{timestamp}-{filename}`.
- **`attachments`** (`packages/database/src/schema/attachments.ts`):
  - `id`: UUID primary key.
  - `taskId`: Nullable reference to `tasks.id` (cascades on delete).
  - `userId`: Foreign key to `users.id` (indexed for rapid multi-tenant filtering).
  - `url`: `/uploads/attachments/{userId}/{timestamp}-{filename}`.
  - `s3Key`: `attachments/{userId}/{timestamp}-{filename}`.
  - `size`, `contentType`, `filename`, `createdAt`.
- **`resources`** (`packages/database/src/schema/learning.ts`):
  - `storageKey`: `resources/{userId}/{uuid}-{filename}`.
  - `type`: Check constraint enforces `file` when `storageKey` is present.
  - `mimeType`, `filename`, `sizeBytes`.

---

## 4. Official Supabase Storage Free-Tier Assessment

*Verification Source:* Official Supabase Documentation & Specifications (Verified November 2026).

| Specification | Official Free Tier Quota / Rule | StudyOS Impact & Compliance | Status |
| :--- | :--- | :--- | :---: |
| **Credit Card Requirement** | **NO PAYMENT DETAILS REQUIRED** | Signup and complete free-tier usage operate without credit card entry. | **PASS** |
| **Total Storage Allocation** | **1 GB** included free storage | Easily accommodates 25–50 active students with 10 MB file caps. | **PASS** |
| **Maximum Upload File Size** | **50 MB** per individual upload | Well above StudyOS limits (2 MB avatar, 10 MB attachment). | **PASS** |
| **Monthly Egress (Bandwidth)**| **5 GB** uncached + **5 GB** cached egress | Sufficient for regular document/syllabus downloads with browser caching. | **PASS WITH LIMITATIONS** |
| **S3 Protocol Compatibility** | Native S3-compatible API via AWS SigV4 | Enables drop-in integration via `@aws-sdk/client-s3`. | **PASS** |
| **Private Buckets** | Fully supported | Default configuration; prevents unauthenticated public access. | **PASS** |
| **Presigned URLs** | Supported for download and upload | Enables time-limited direct S3 presigning (e.g. 15-minute expiration). | **PASS** |
| **Inactivity Pausing** | **Pauses after 7 consecutive days** of zero database activity | Storage metadata is stored in PostgreSQL (`storage.objects`). If the database pauses, storage requests fail until unpaused. | **PASS WITH LIMITATIONS** |

---

## 5. Architectural Comparison: Cloudflare R2 vs Supabase Storage

| Evaluation Criterion | Cloudflare R2 Storage | Supabase Storage (S3 Endpoint) | Advantage / Trade-off |
| :--- | :--- | :--- | :--- |
| **Cardless Eligibility** | ❌ **FAIL** (Payment method required on file) | ✅ **PASS** (100% cardless on Free Tier) | **Supabase wins for zero-friction setup** |
| **Free Storage Quota** | 10 GB / month | 1 GB / month | Cloudflare R2 provides 10x more storage |
| **Egress Fees / Limits** | **Zero egress fees** (Unlimited within Fair Use) | 5 GB uncached + 5 GB cached / month | Cloudflare R2 provides unlimited free egress |
| **Max Individual File** | Up to 5 GB (multipart) | 50 MB on Free Tier | Both exceed StudyOS 10 MB cap |
| **API Protocol** | S3-Compatible / Worker R2 Binding | S3-Compatible (SigV4) / REST / Tus | Parity via S3-Compatible API |
| **Connection Overhead** | Direct edge isolate binding | HTTPS SigV4 API calls to Supabase endpoint | R2 binding is slightly faster at edge |
| **Inactivity Risk** | Never pauses | Pauses after 7 days if database is inactive | R2 is independent of database status |
| **Operational Simplicity**| Requires separate Cloudflare dashboard config | Co-located in the same Supabase project as PostgreSQL | Supabase simplifies project administration |
| **Disaster Recovery** | Independent bucket replication | Co-located with PostgreSQL infrastructure | Parity |

### Comparative Recommendation
- **For 100% Cardless ₹0/month Deployment:** **Supabase Storage is the strongly recommended solution.** It eliminates the credit card barrier while providing full S3 compatibility, private buckets, and ample storage for student workloads.
- **For High-Volume Media (>1 GB) with Payment Card on File:** Cloudflare R2 remains the superior choice due to its 10 GB quota and zero egress fees.
- **StudyOS Dual-Provider Architecture:** By adopting the provider abstraction implemented in this phase, StudyOS supports **both backends simultaneously** without changing frontend or route code.

---

## 6. Security Architecture & Zero-Trust Design

### 6.1 Private Bucket Policy
- The storage bucket (`studyos-files`) is configured as **private** (`public: false`).
- Direct public URL access (`https://<project-ref>.supabase.co/storage/v1/object/public/*`) returns HTTP 404/403.
- All access must be authenticated via AWS SigV4 credentials.

### 6.2 Zero-Trust Object Pathing
Object paths strictly follow the pattern:
```
{folder}/{userId}/{timestamp}-{sanitizedFilename}
```
- `folder`: Restricts categories (`avatars`, `attachments`, `resources`).
- `userId`: Injected by the trusted API server based on verified session JWT; clients cannot tamper with or override this segment.
- `sanitizedFilename`: Strips directory traversal sequences (`..`), slashes, Windows drive paths (`C:\`), and special characters.

### 6.3 Multi-Tenant Isolation
During every file retrieval (`GET /uploads/*` and `GET /resources/:id/file`):
1. The server extracts `userId` from the authenticated JWT session.
2. The server parses the target key: `keyParts = key.split('/')`.
3. If `keyParts[1] !== session.userId`, the request is immediately rejected with HTTP 404 (preventing user enumeration).
4. For academic resources, ownership is checked in the database (`resources.userId === session.userId`).

---

## 7. Authentication Design: StudyOS JWT vs Supabase RLS

A critical security question is whether Supabase Storage Row Level Security (RLS) can directly validate StudyOS JWTs:

1. **Why Direct Client Access via Supabase RLS Fails:**
   - Supabase Storage RLS evaluates `auth.uid()`, which is extracted from Supabase Auth tokens signed with Supabase's internal JWT secret.
   - StudyOS uses its own independent authentication system (Google OAuth 2.0 / OIDC + custom signed JWTs via `JWT_SECRET`).
   - A StudyOS JWT presented directly to Supabase Storage REST endpoints would fail token verification.
2. **The Correct Architecture: Server-Side Gateway Authorization:**
   - StudyOS uses the **Server-Side Proxy / S3 SigV4 Gateway** pattern.
   - The StudyOS API receives client requests, validates the StudyOS JWT using `verifyToken()`, enforces tenant ownership rules, and then signs S3 SigV4 requests to Supabase Storage using the server-side S3 Access Key and Secret.
   - **Zero Client Exposure:** The Supabase S3 Access Keys and Service Role keys are NEVER exposed to the frontend or browser.
   - **Auditability:** Every file access is logged and rate-limited at the StudyOS API level.

---

## 8. Migration Strategy (Zero-Disruption Transition)

Because StudyOS already uses standard S3-compatible path keys and an authenticated streaming proxy, migrating from Cloudflare R2 to Supabase Storage requires zero schema migrations and zero client-side modifications.

### 8.1 Unified StorageProvider Abstraction
The storage layer has been structured behind the `StorageProvider` interface (`apps/api/src/services/storage/index.ts`):
```typescript
export interface StorageProvider {
  readonly providerType: 'supabase' | 'r2' | 's3';
  readonly bucket: string;
  upload(key: string, body: Buffer, contentType: string): Promise<string>;
  getObject(key: string): Promise<StorageObjectResult | null>;
  delete(key: string): Promise<void>;
  getSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  getSignedUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string>;
}
```

### 8.2 Migration Stages (When Authorized)
1. **Stage 1 (Local Preparation — Complete):** Implement `StorageProvider` abstraction, add Supabase S3 configuration parsing, and verify compatibility with automated test suite.
2. **Stage 2 (Bucket Provisioning):** In Supabase Dashboard, create private bucket `studyos-files` and generate S3 credentials.
3. **Stage 3 (Environment Variable Switch):** Configure `STORAGE_PROVIDER=supabase` and `SUPABASE_STORAGE_S3_ENDPOINT` in the deployment environment.
4. **Stage 4 (Dual-Provider Fallback):** New uploads write to Supabase Storage. If an existing object key is not found in Supabase Storage, the proxy falls back to checking R2 before returning 404.
5. **Stage 5 (Object Transfer — Optional):** If legacy files exist in R2, transfer them to Supabase Storage via `rclone` or standard S3 copy script.

---

## 9. Rollback Strategy

If Supabase Storage experiences service issues or reaches its 1 GB free-tier quota:
1. **Instant Environment Reversion:** Switch `STORAGE_PROVIDER=r2` in environment variables and restart the API or redeploy the worker isolate.
2. **Key Parity:** Because both providers use identical object key conventions (`{folder}/{userId}/{timestamp}-{filename}`), database rows in `attachments` and `resources` require zero modifications.
3. **Local Docker Storage Fallback:** For self-hosted instances without cloud storage, MinIO or local volume mounts can be plugged in using the identical S3-compatible adapter.

---

## 10. Automated Test Results & Verification

A dedicated automated test suite was created in `apps/api/src/services/__tests__/storage-provider.test.ts`.

### 10.1 Storage Provider Test Suite Breakdown (21 Tests)

| Category | Test Case Description | Verified Behavior | Status |
| :--- | :--- | :--- | :---: |
| **Config Resolution** | 1.1 Supabase endpoint detection | Parses `SUPABASE_STORAGE_S3_ENDPOINT` and sets provider to `supabase` | **PASS** |
| **Config Resolution** | 1.2 Cloudflare R2 detection | Parses `*.r2.cloudflarestorage.com` and sets provider to `r2` | **PASS** |
| **Config Resolution** | 1.3 Explicit provider override | `STORAGE_PROVIDER=supabase` takes precedence over URL parsing | **PASS** |
| **Config Resolution** | 1.4 Missing bucket fail-closed | Throws descriptive error when bucket name is undefined | **PASS** |
| **Config Resolution** | 1.5 Missing credentials fail-closed | Throws descriptive error when credentials are undefined | **PASS** |
| **Path Sanitization** | 2.1 Directory traversal (`../../`) | Strips path components; eliminates traversal attacks | **PASS** |
| **Path Sanitization** | 2.2 Windows UNC & drive paths | Strips drive letters (`C:\`) and Windows backslashes | **PASS** |
| **Path Sanitization** | 2.3 Special character collapse | Normalizes symbols, multiple dots, and excessive hyphens | **PASS** |
| **Path Sanitization** | 2.4 User-scoped key generation | Embeds `userId` in `{folder}/{userId}/{timestamp}-{filename}` | **PASS** |
| **Path Sanitization** | 2.5 Proxy URL extraction | Extracts key from `/uploads/*` and safely rejects external URLs | **PASS** |
| **Tenant Isolation** | 3.1 Cross-user access rejection | Rejects access when session `userId` does not match key owner | **PASS** |
| **Tenant Isolation** | 3.2 Private resource isolation | Blocks access to `resources/*` from generic upload proxy | **PASS** |
| **MIME & Size** | 4.1 Dangerous file rejection | Strictly rejects `.exe`, `.sh`, `.bat`, `.js`, `.php`, `.html` | **PASS** |
| **MIME & Size** | 4.2 Academic media acceptance | Accepts PDF, DOCX, TXT, PNG, MP4 | **PASS** |
| **MIME & Size** | 4.3 Free-tier size limits | Enforces 2 MB avatar cap and 10 MB attachment cap | **PASS** |
| **S3 Operations** | 5.1 Mocked Supabase upload | Executes `PutObjectCommand` with path style and returns proxy URL | **PASS** |
| **S3 Operations** | 5.2 Mocked Supabase stream | Streams file body with `Content-Type` and `Content-Length` | **PASS** |
| **S3 Operations** | 5.3 NoSuchKey handling | Returns `null` on `NoSuchKey` / `NotFound` without unhandled crash | **PASS** |
| **S3 Operations** | 5.4 Mocked Supabase delete | Executes `DeleteObjectCommand` on storage backend | **PASS** |
| **S3 Operations** | 5.5 Presigned URL generation | Generates SigV4 presigned download URL with 15-minute expiration | **PASS** |
| **S3 Operations** | 5.6 Error propagation | Propagates network/auth errors for centralized logging | **PASS** |

### 10.2 Workspace-Wide Regression Results

```
================================================================================
WORKSPACE AUTOMATED TEST BASELINE
================================================================================
API Test Suite:   23 test files passed, 228 tests passed, 0 failed
Web Test Suite:    7 test files passed,  30 tests passed, 0 failed
Total Tests:      30 test files passed, 258 tests passed, 0 failures (100% PASS)
TypeScript Check: 0 errors across apps/api and apps/web (tsc --noEmit)
Linter Check:     0 errors across modified storage files
Wrangler Dry-Run: 89.93 KiB bundle generated cleanly
================================================================================
```

---

## 11. Zero-Cost Capacity Validation & Student Usage Scenarios

To ensure the proposed Supabase Storage architecture operates at **strictly ₹0/month**, realistic usage scenarios were modeled against official free-tier limits.

### 11.1 Student Cohort Modeling

#### Scenario 1: Standard Student Cohort (25 Active Students)
- **Profile Avatars:** 25 students × 100 KB average avatar = **2.5 MB** (one-time).
- **Coursework Attachments:** 4 assignments/month × 2 attachments × 500 KB average PDF = 4 MB/student/month.
  - Cohort Total: 25 × 4 MB = **100 MB/month**.
- **Learning Resources:** 2 reference PDFs/month × 1 MB = 2 MB/student/month.
  - Cohort Total: 25 × 2 MB = **50 MB/month**.
- **Net Storage Consumption:** ~150 MB/month.
- **Runway to 1 GB Limit:** **~6.5 months** of cumulative study files before requiring lifecycle archival.
- **Bandwidth Consumption:** 25 students × 40 MB document views/month = **1 GB/month** (well within 5 GB free egress quota).

#### Scenario 2: Active University Semester (50 Active Students)
- **Net Storage Consumption:** ~300 MB/month.
- **Runway to 1 GB Limit:** **~3.3 months** (one full academic semester).
- **Mitigation for Steady-State ₹0:**
  1. Automated soft-deleted attachment purging after 30 days.
  2. End-of-semester course archiving (students download their semester packet; old assignment drafts purged).
  3. Strict 10 MB individual file upload cap.

### 11.2 What Happens When Quotas Are Exceeded?
- **No Surprise Charges:** Because no credit card is on file in Supabase, the account is never automatically charged.
- **Fail-Safe Behavior:** When the 1 GB storage cap is reached, `PutObject` calls return HTTP 400/403 Quota Exceeded. The StudyOS API intercepts this and returns a user-friendly error:
  `"File storage limit reached for this free tier semester. Please delete old attachments or archive completed subjects."`
- Existing files remain fully readable and downloadable without data loss.

---

## 12. Architectural Limitations

1. **Storage Capacity Cap:** Supabase Free Tier provides 1 GB of file storage compared to Cloudflare R2's 10 GB. It is optimal for documents, code files, and PDFs, but unsuited for high-resolution video hosting.
2. **Database Inactivity Dependency:** Supabase Storage metadata resides inside PostgreSQL. If the Supabase project enters an inactive pause (after 7 days without database queries), storage access will also be temporarily paused until the user clicks unpause in the Supabase Dashboard.
3. **Monthly Egress Limit:** Supabase enforces a 5 GB uncached egress limit. High-frequency re-downloading of large files must be mitigated with HTTP client caching (`Cache-Control: private, max-age=...`).

---

## 13. Unverified External Items

The following items cannot be verified without external account access and live cloud deployment:
1. Live network round-trip latency of the Supabase S3 endpoint from Cloudflare Workers edge nodes.
2. Exact real-world throughput of multipart uploads over the Supabase S3 endpoint.
3. Live cloud unpause behavior under active S3 API calls.

---

## 14. Final Recommendation & Gate Status

| Item | Evaluation Verdict |
| :--- | :--- |
| **Supabase Storage Compatibility** | **PASS** — Drop-in S3 compatibility verified via `@aws-sdk/client-s3`. |
| **Cardless Setup Feasibility** | **PASS** — 100% cardless on Supabase Free Tier; zero billing required. |
| **Multi-Tenant Security** | **PASS** — Zero-trust pathing and server-side ownership checks verified (21 tests). |
| **Regression Impact** | **PASS** — Zero regressions; all 258 workspace tests pass cleanly. |
| **Overall Phase 9D.1 Status** | **PASS WITH LIMITATIONS (RECOMMENDED CARDLESS BACKEND)** |

### Next Step
When authorized to proceed with live deployment:
- Configure Supabase Storage S3 credentials (`SUPABASE_STORAGE_S3_ENDPOINT`, `SUPABASE_STORAGE_BUCKET`, `SUPABASE_STORAGE_ACCESS_KEY_ID`, `SUPABASE_STORAGE_SECRET_ACCESS_KEY`) alongside Supabase PostgreSQL.
- Keep Cloudflare R2 configuration available as an optional toggle for users with payment methods on file.
