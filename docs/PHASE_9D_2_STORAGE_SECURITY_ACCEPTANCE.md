# StudyOS Phase 9D.2: Supabase Storage Security & Production Acceptance Audit Report

**Document Version:** 1.0.0 (Phase 9D.2 Audit)  
**Date:** November 3, 2026  
**Phase:** Phase 9D.2 — Supabase Storage Security, Implementation & Production-Readiness Audit  
**Workspace:** `D:\StudyOS-Project`  
**Repository:** `D:\StudyOS-Project\studyos`  
**Branch:** `studyos-development`  
**Starting HEAD Commit:** `2a38740` (`feat(storage): complete Phase 9D.1 Supabase Storage compatibility, security audit, and migration plan`)  
**Target Operating Cost:** ₹0 / month (Strict Target)  
**Security & Acceptance Verdict:** **ACCEPTED WITH LIMITATIONS (CARDLESS SERVER-SIDE ENFORCED STORAGE GATEWAY)**  

---

## 1. Executive Summary

Phase 9D.2 conducted an exhaustive security, architectural, and production-readiness audit of the proposed Supabase Storage backend for StudyOS. The primary goal was to determine whether Supabase Storage can securely serve as a **100% cardless, ₹0/month storage provider** without exposing user files to cross-tenant data leaks, privilege escalation, or unauthorized access.

### Critical Security Finding: The RLS vs S3 Admin Credential Dichotomy
Official Supabase documentation research revealed a fundamental architectural truth:
1. **S3 Access Keys Bypass Supabase RLS:** In Supabase Storage, S3 access keys generated in project settings are administrative credentials that **bypass all PostgreSQL Row Level Security (RLS) policies**.
2. **PostgreSQL RLS Requires Supabase Auth Tokens:** Supabase Storage RLS policies only evaluate requests authenticated via Supabase Auth user JWTs (`sessionToken: session.access_token`). Because StudyOS uses independent authentication (Google OAuth 2.0 / custom signed JWTs), StudyOS tokens cannot be directly evaluated by Supabase RLS.
3. **The Secure Solution (The Server-Side PEP Gateway):** StudyOS file security does **not** rely on Supabase Storage RLS. Instead, the **StudyOS API Server acts as the Policy Enforcement Point (PEP)**. The API gateway validates the student's StudyOS JWT, derives the user ID from the verified cryptographic payload, validates tenant ownership (`keyParts[1] === session.userId`), strips path traversal sequences, and proxies bytes to/from Supabase Storage using server-side S3 credentials that are **never exposed to client-side code**.

---

## 2. Starting Git State & Working Tree Integrity

- **Branch:** `studyos-development`
- **Initial HEAD:** `2a38740`
- **Preserved User Modifications:**
  - `apps/api/docker-start.sh` (Uncommitted user changes preserved untouched)
  - `docker-compose.yml` (Uncommitted user changes preserved untouched)
  - `docs/PHASE_9B_*.md` (Audit notes preserved untouched)
- **Safety Compliance:**
  - Zero branches switched.
  - Zero git resets, rebases, or force pushes.
  - Zero pushes to GitHub or remote repositories.
  - Zero external cloud resources provisioned or modified.
  - Zero payment methods entered; zero billing activated.

---

## 3. Files Inspected

The audit conducted deep static code analysis and traced actual runtime paths across:
- **Storage Abstraction & Services:**
  - [`apps/api/src/services/storage/index.ts`](file:///D:/StudyOS-Project/studyos/apps/api/src/services/storage/index.ts)
  - [`apps/api/src/services/storage/cleanup.ts`](file:///D:/StudyOS-Project/studyos/apps/api/src/services/storage/cleanup.ts)
  - [`apps/api/src/lib/s3.ts`](file:///D:/StudyOS-Project/studyos/apps/api/src/lib/s3.ts)
- **API Routing & Policy Enforcement:**
  - [`apps/api/src/routes/uploads.ts`](file:///D:/StudyOS-Project/studyos/apps/api/src/routes/uploads.ts)
  - [`apps/api/src/routes/attachments.ts`](file:///D:/StudyOS-Project/studyos/apps/api/src/routes/attachments.ts)
  - [`apps/api/src/routes/resources.ts`](file:///D:/StudyOS-Project/studyos/apps/api/src/routes/resources.ts)
  - [`apps/api/src/middleware/auth.ts`](file:///D:/StudyOS-Project/studyos/apps/api/src/middleware/auth.ts)
  - [`apps/api/src/validation/uploads.ts`](file:///D:/StudyOS-Project/studyos/apps/api/src/validation/uploads.ts)
- **Database Schemas & Relations:**
  - [`packages/database/src/schema/attachments.ts`](file:///D:/StudyOS-Project/studyos/packages/database/src/schema/attachments.ts)
  - [`packages/database/src/schema/learning.ts`](file:///D:/StudyOS-Project/studyos/packages/database/src/schema/learning.ts)
  - [`packages/database/src/schema/users.ts`](file:///D:/StudyOS-Project/studyos/packages/database/src/schema/users.ts)
- **Frontend Hooks & Components:**
  - [`apps/web/src/hooks/useUploadAttachment.ts`](file:///D:/StudyOS-Project/studyos/apps/web/src/hooks/useUploadAttachment.ts)
  - [`apps/web/src/hooks/useUploadAvatar.ts`](file:///D:/StudyOS-Project/studyos/apps/web/src/hooks/useUploadAvatar.ts)
  - [`apps/web/src/hooks/useTaskAttachments.ts`](file:///D:/StudyOS-Project/studyos/apps/web/src/hooks/useTaskAttachments.ts)
- **Cloudflare Edge Prototype:**
  - [`apps/api/src/cloudflare-prototype/index.ts`](file:///D:/StudyOS-Project/studyos/apps/api/src/cloudflare-prototype/index.ts)
  - [`apps/api/src/cloudflare-prototype/wrangler.toml`](file:///D:/StudyOS-Project/studyos/apps/api/src/cloudflare-prototype/wrangler.toml)

---

## 4. Official Supabase Documentation Sources

*Audit Date:* November 3, 2026.  
All findings were verified against official upstream documentation from `supabase.com/docs`:

1. **Supabase Storage S3 Compatibility & Configuration:**  
   `https://supabase.com/docs/guides/storage/s3`  
   *Verified:* Direct storage endpoint is `https://<project-ref>.storage.supabase.co/storage/v1/s3` with `forcePathStyle: true`.
2. **S3 Credentials & RLS Interaction:**  
   `https://supabase.com/docs/guides/storage/s3/authentication`  
   *Verified:* S3 Access Keys generated in dashboard bypass PostgreSQL RLS. Session Tokens (`sessionToken`) enforce RLS using Supabase Auth JWTs.
3. **Supabase Pricing & Free-Tier Quotas:**  
   `https://supabase.com/pricing`  
   *Verified:* Free Tier includes 1 GB storage, 50 MB max upload, 5 GB uncached + 5 GB cached egress/month, and no credit card required on signup.
4. **Project Inactivity & Pausing:**  
   `https://supabase.com/docs/guides/platform/pausing`  
   *Verified:* Free projects pause after 7 consecutive days of zero database queries. Unpausing is 1-click in the dashboard without data loss.

---

## 5. S3 Authentication & Credential Architecture

| Aspect | Technical Finding | Impact on StudyOS | Status |
| :--- | :--- | :--- | :---: |
| **Credential Type** | AWS Signature Version 4 (SigV4) Access Key & Secret Key | Compatible with standard `@aws-sdk/client-s3`. | **PASS** |
| **Credential Scope** | Root / Project-Level Administrative Scope | Bypasses Supabase PostgreSQL table RLS policies. | **PASS WITH LIMITATIONS** |
| **Client Exposure** | Server-Side Only (`process.env`) | Frontend never receives S3 keys or service secrets. | **PASS** |
| **Endpoint Format** | `https://<ref>.storage.supabase.co/storage/v1/s3` | Validated by S3 client URI parser. | **PASS** |

> [!WARNING]
> **CRITICAL SECURITY RISK & MITIGATION:**
> Because Supabase S3 credentials have administrative project scope, they must **NEVER** be embedded in web, desktop, or mobile applications. All S3 operations must remain strictly inside the StudyOS API server.

---

## 6. Row-Level Security (RLS) Findings

| Area | Audit Determination | Practical Impact | Status |
| :--- | :--- | :--- | :---: |
| **Supabase Storage RLS** | **NOT ENFORCED ON S3 ACCESS KEYS** | When using S3 access keys, Supabase does not evaluate `storage.objects` RLS. | **PASS WITH LIMITATIONS** |
| **StudyOS Custom JWTs** | Not evaluated by Supabase Auth | StudyOS JWTs cannot be passed as `sessionToken` to Supabase S3 directly. | **NOT APPLICABLE** |
| **Policy Enforcement Point** | **ENFORCED AT STUDYOS API GATEWAY** | The StudyOS server enforces authentication and multi-tenant isolation before issuing S3 commands. | **PASS** |

---

## 7. Actual StudyOS Authorization Architecture

The audit confirmed that StudyOS implements a **Zero-Trust Server-Side Policy Enforcement Point (PEP)**:

```
STUDENT (Browser / Desktop / Mobile)
       │
       │ 1. HTTP Request with Session Cookie / Bearer Token
       ▼
STUDYOS API GATEWAY (apps/api/src/routes/)
       │
       │ 2. auth middleware verifies StudyOS JWT via verifyToken()
       │ 3. Derives userId strictly from verified JWT payload (c.get("userId"))
       │ 4. Rejects spoofed client-supplied userIds in request bodies
       │ 5. Validates tenant boundary: keyParts[1] === userId
       │ 6. Validates MIME type against whitelist & enforces 2 MB / 10 MB caps
       ▼
STORAGE ABSTRACTION (apps/api/src/services/storage/index.ts)
       │
       │ 7. Signs AWS SigV4 request using server-side credentials
       ▼
SUPABASE STORAGE S3 BUCKET (Private: studyos-files)
```

1. **Does StudyOS authenticate before every file operation?**  
   **YES.** All upload, download, and delete routes (`/uploads/avatar`, `/uploads/attachments`, `/uploads/*`, `/resources/upload`, `/resources/:id/file`) require the `auth` middleware.
2. **Can a client submit an arbitrary user ID?**  
   **NO.** The user ID is extracted directly from the cryptographically verified JWT payload (`c.get("userId")`). Client-supplied IDs in form bodies are discarded.
3. **Can User A access or delete User B’s object?**  
   **NO.** In `GET /uploads/*` and `DELETE /uploads/*`, the server parses `keyParts = key.split('/')` and enforces `keyParts[1] === userId`. If mismatched, it returns HTTP 404 (preventing file existence enumeration).
4. **Are S3 credentials ever exposed to the frontend?**  
   **NO.** All S3 client initialization and signing occur strictly in Node.js server memory.

---

## 8. User-Isolation Test Results

An automated test suite was executed in [`apps/api/src/services/__tests__/storage-security-audit.test.ts`](file:///D:/StudyOS-Project/studyos/apps/api/src/services/__tests__/storage-security-audit.test.ts):

| Test Case | Simulated Scenario | Result | Status |
| :--- | :--- | :--- | :---: |
| **1.1** | User A uploads file and receives `attachments/userA/...` key | Verified | **PASS** |
| **1.2** | User B uploads file and receives `attachments/userB/...` key | Verified | **PASS** |
| **1.3** | User A attempts to download User B’s file | Ownership check fails; rejected | **PASS** |
| **1.4** | User B attempts to download User A’s file | Ownership check fails; rejected | **PASS** |
| **1.5** | User A attempts to delete User B’s file | Ownership check fails; rejected | **PASS** |
| **1.6** | User B attempts to delete User A’s file | Ownership check fails; rejected | **PASS** |
| **1.7** | User B supplies User A’s ID in body | Server ignores body; uses session ID | **PASS** |
| **1.8** | User B guesses User A’s object key | Key validation rejects mismatched tenant | **PASS** |

---

## 9. Object-Key Security Findings

Object key generation in `sanitizeFilename` and `generateUniqueKey` was audited against common web vulnerabilities:

| Vulnerability Vector | Tested Input | Sanitized Output / Behavior | Status |
| :--- | :--- | :--- | :---: |
| **Directory Traversal** | `../../../../etc/passwd` | `passwd` (directory components stripped) | **PASS** |
| **Windows UNC / Drive Paths**| `C:\Windows\System32\cmd.exe` | `cmd.exe` (slashes and drive stripped) | **PASS** |
| **Null-Byte Poisoning** | `homework\0malicious.exe.pdf` | `homeworkmalicious.exe.pdf` (nulls stripped) | **PASS** |
| **Non-Printable ASCII** | `exam\x01\x02\x1Fnotes.pdf` | `examnotes.pdf` (control characters stripped)| **PASS** |
| **Special Characters** | `Physics Exam #1 & Answers!.pdf`| `physics-exam-1-answers-.pdf` (hyphen collapsed)| **PASS** |
| **Empty / Dot-Only Filename**| `.` or `..` or `---` | Falls back to `unnamed-file` | **PASS** |
| **Excessive Length (>200)** | 250 characters + `.pdf` | Truncated to ≤200 chars while keeping `.pdf` | **PASS** |
| **Unicode Characters** | `수학_기말고사.pdf` | Normalized safe ASCII slug with valid extension | **PASS** |

---

## 10. Upload Validation Findings & Exact Boundary Testing

File size boundaries were audited at Limit − 1 byte, exactly at Limit, and Limit + 1 byte:

| Upload Type | Permitted MIME Types | Lower Boundary (−1 Byte) | Exact Boundary (Cap) | Upper Boundary (+1 Byte) | Status |
| :--- | :--- | :-: | :-: | :-: | :---: |
| **User Avatar** | `image/jpeg`, `image/png`, `image/gif`, `image/webp` | 2,097,151 B: **PASS** | 2,097,152 B (2 MB): **PASS** | 2,097,153 B: **REJECTED** | **PASS** |
| **Attachment** | Images, videos, PDF, DOCX, XLSX, TXT | 10,485,759 B: **PASS**| 10,485,760 B (10 MB): **PASS**| 10,485,761 B: **REJECTED** | **PASS** |
| **Executable Rejection**| `.exe`, `.sh`, `.bat`, `.js`, `.php`, `.html` | N/A | N/A | All strictly rejected | **PASS** |

---

## 11. Signed URL Security Findings

StudyOS supports time-limited AWS SigV4 signed URLs via `@aws-sdk/s3-request-presigner`:
1. **Server-Side Generation Gate:** Signed URLs are generated **only after** server-side authentication and tenant ownership checks. User A cannot trigger the API to sign an object belonging to User B.
2. **Short-Lived Expiration:** Expiration defaults to 15 minutes (900 seconds) and cannot be set indefinitely.
3. **No Secret Leakage:** The signing secret is used internally by the HMAC algorithm; secrets are never placed in the URL query string.
4. **Safe Headers:** Downloads streamed through the API enforce:
   - `Content-Disposition: attachment; filename="..."`
   - `X-Content-Type-Options: nosniff`
   - `Cache-Control: private, no-store`

---

## 12. Deletion, Soft Deletion, and Orphan Cleanup

The lifecycle of deleted objects was audited:
- **Immediate Deletion:** `DELETE /attachments/:id` deletes the S3 storage object and database record simultaneously.
- **Soft Deletion:** `DELETE /resources/:id` sets `resources.deletedAt = NOW()`. Binary file bytes remain in the private storage bucket.
- **Account Deletion Risk:** `attachments` references `users(id) ON DELETE CASCADE`. If a user is deleted via cascading foreign key in PostgreSQL, database records are removed, but storage objects could be orphaned.
- **Storage Cleanup Utility:** Implemented [`apps/api/src/services/storage/cleanup.ts`](file:///D:/StudyOS-Project/studyos/apps/api/src/services/storage/cleanup.ts):
  - `detectOrphanedObjects()`: Compares S3 keys against active database keys.
  - **24-Hour Grace Period:** Objects uploaded within the last 24 hours are retained even if unreferenced, preventing race conditions with concurrent in-flight uploads.
  - **Dry-Run Mode:** Simulates cleanup and reports candidates without deleting.
  - **Execution Mode:** Safely deletes confirmed stale orphans with error tracking.

---

## 13. Storage Provider Configuration Audit

[`apps/api/src/services/storage/index.ts`](file:///D:/StudyOS-Project/studyos/apps/api/src/services/storage/index.ts) was enhanced to provide strict fail-closed configuration resolution:
1. **Explicit Provider Validation:** If `STORAGE_PROVIDER` is specified, it must be `'supabase'`, `'r2'`, or `'s3'`. Unsupported strings (e.g. `'unsupported_gcs'`) throw a descriptive error during initialization.
2. **Missing Configuration:** If bucket name or credentials are missing, the server fails closed with a clear error without leaking sensitive values.
3. **Template Placeholders:** [`apps/api/.env.example`](file:///D:/StudyOS-Project/studyos/apps/api/.env.example) contains documented placeholders for Supabase Storage S3 credentials.

---

## 14. Rollback and Provider Migration Design

> [!IMPORTANT]
> **CRITICAL REALISTIC ROLLBACK NOTICE:**
> Changing `STORAGE_PROVIDER` in environment variables **does NOT move existing binary files**. If 100 attachments are uploaded to Supabase Storage, switching the environment variable back to `STORAGE_PROVIDER=r2` will cause requests for those 100 attachments to return HTTP 404 unless a dual-read or object copy strategy is in place.

### Migration & Rollback Strategy
1. **Identical Object Key Convention:** Both Supabase Storage and Cloudflare R2 use `{folder}/{userId}/{timestamp}-{filename}`. Database rows require zero schema changes.
2. **Dual-Read Fallback Architecture (Recommended for Rollback):**
   - The streaming proxy attempts to fetch from the active provider (`STORAGE_PROVIDER`).
   - On `NoSuchKey` / 404, it checks the secondary fallback provider before returning 404 to the student.
3. **Object Transfer Utility:** For formal migrations, `rclone` (using standard S3-to-S3 sync) can copy objects between Cloudflare R2 and Supabase Storage with zero downtime.

---

## 15. Quota and Error Handling

| Provider Quota / Condition | Provider Behavior | StudyOS API Error Handling | Status |
| :--- | :--- | :--- | :---: |
| **1 GB Storage Limit Reached** | HTTP 400/403 Quota Exceeded | Catches error; returns `"Storage limit reached for this free tier semester"` | **PASS** |
| **5 GB Egress Limit Reached** | Throttling / HTTP 429 | Handled by API error middleware; logs warning | **PASS** |
| **Project Inactivity Pause (7 Days)**| Connection Timeout / Refused | Returns HTTP 503 Service Unavailable | **PASS WITH LIMITATIONS** |
| **Invalid S3 Credentials** | SignatureDoesNotMatch / 403 | Throws internal error without leaking secret keys | **PASS** |

---

## 16. Test Commands and Actual Results

All automated test suites executed with 100% pass rates:

```
================================================================================
PHASE 9D.2 AUTOMATED VERIFICATION RESULTS
================================================================================
1. Storage Security Audit Tests:
   Command: npx vitest run src/services/__tests__/storage-security-audit.test.ts
   Results: 1 test file passed, 26 tests passed, 0 failures

2. Storage Provider Adapter Tests:
   Command: npx vitest run src/services/__tests__/storage-provider.test.ts
   Results: 1 test file passed, 21 tests passed, 0 failures

3. Full API Vitest Suite (with local PostgreSQL 16 container):
   Command: DATABASE_URL=... TEST_DATABASE_URL=... npx vitest run --hookTimeout 30000
   Results: 24 test files passed, 254 tests passed, 0 failures

4. Full Web Vitest Suite:
   Command: cd apps/web && npx vitest run
   Results: 7 test files passed, 30 tests passed, 0 failures

5. Total Workspace Test Baseline:
   Results: 31 test files passed, 284 tests passed, 0 failures (100% PASS)

6. TypeScript Compilation Check:
   Command: tsc -p apps/api/tsconfig.json --noEmit && tsc -p apps/web/tsconfig.json --noEmit
   Results: 0 errors across entire workspace (Exit Code 0)

7. ESLint Code Quality Check:
   Command: npx eslint src/services/storage/cleanup.ts src/services/storage/index.ts ...
   Results: 0 errors, 0 warnings (Exit Code 0)

8. API Bundle Compilation:
   Command: cd apps/api && npm run build (tsup)
   Results: ESM build success in 492ms, dist/index.js 846 KiB (Exit Code 0)

9. Web Production Build:
   Command: cd apps/web && npx vite build
   Results: Built in 1m 33s, 2810 modules transformed cleanly (Exit Code 0)

10. Cloudflare Wrangler Dry-Run:
   Command: npx wrangler deploy --dry-run -c src/cloudflare-prototype/wrangler.toml
   Results: 89.93 KiB bundle generated cleanly with 0 errors (Exit Code 0)
================================================================================
```

---

## 17. Remaining Risks

1. **Supabase Inactivity Pausing:** Free-tier Supabase projects pause after 7 consecutive days of zero database queries. If a pause occurs, unpausing takes ~60–90 seconds via a single click in the dashboard.
2. **Storage Capacity ceiling (1 GB):** Sufficient for documents and coursework for ~25–50 students, but requires periodic cleanup of soft-deleted attachments.
3. **Egress Quota (5 GB/month):** If students frequently re-download large files, egress could exceed 5 GB. Aggressive browser caching mitigates this.

---

## 18. External Verification Requirements (Pending Live Deployment)

The following items cannot be verified locally and require explicit user authorization for external deployment:
1. Live latency of the Supabase S3 endpoint from Cloudflare Workers edge nodes across global regions.
2. Live bucket provisioning via Supabase Dashboard (`studyos-files`).
3. Generating live S3 credentials in the Supabase Dashboard.

---

## 19. Recommended Next Phase

- **Next Phase:** **Phase 9D.3 — Cloud Credentials Provisioning & Live Verification Preparation**.
- **Action Required from User:** Create the free Supabase project, generate S3 credentials and the PostgreSQL connection string, and supply them for live gate verification when ready.

---

## 20. Final Acceptance Verdict

| Audit Domain | Verdict |
| :--- | :--- |
| **S3 Protocol Compatibility** | **PASS** — Standard `@aws-sdk/client-s3` connects seamlessly. |
| **Cardless Free-Tier Guarantee** | **PASS** — 100% cardless; no payment details required. |
| **Multi-Tenant User Isolation** | **PASS** — Enforced server-side at the StudyOS API gateway. |
| **Path Traversal & Injection Security** | **PASS** — Null bytes, directory traversal, and special characters stripped. |
| **Signed URL & Expiration Security** | **PASS** — Short-lived 15-minute URLs; server-authorized before generation. |
| **Deletion & Orphan Cleanup** | **PASS** — Automated dry-run and grace-period detection utility implemented. |
| **Overall Phase 9D.2 Verdict** | **ACCEPTED WITH LIMITATIONS (CARDLESS SERVER-SIDE ENFORCED STORAGE GATEWAY)** |
