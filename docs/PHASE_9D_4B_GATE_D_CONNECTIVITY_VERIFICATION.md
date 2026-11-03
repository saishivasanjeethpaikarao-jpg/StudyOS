# Phase 9D.4B — Gate D: Disposable Supabase Connectivity Verification

**Document Version:** 1.0.0  
**Repository:** `D:\StudyOS-Project\studyos`  
**Branch:** `studyos-development`  
**Starting Commit:** `6264bf81829644d539a89b9145a4497461ae0cec`  
**Target Monthly Operating Cost:** ₹0 / month (Strict zero-cost, cardless architecture)  
**Disposable Project Ref:** `sdydpcfttodngamwnjek`  
**Gate D Status:** `READ-ONLY CONNECTIVITY VERIFIED` (Public endpoints & TCP connectivity confirmed; authenticated queries & storage operations remain gated awaiting local credentials)  
**Overall Phase Status:** `ACCEPTED WITH LIMITATIONS` (Non-destructive read-only verification complete; zero cloud mutations executed)

---

## 1. Executive Summary

Phase 9D.4B — Gate D performs safe, read-only connectivity verification for the newly created disposable Supabase test project (`studyos-disposable-test` under organization `Couple-Stars` in region `ap-south-1` Mumbai). 

Following the completion of Gate A (free-tier account confirmation) and Gate B (disposable project specification), this phase verifies that the public network infrastructure, DNS resolution, TLS certificates, HTTP gateway routing, and Supavisor PostgreSQL connection poolers are healthy, accessible, and correctly responding to requests from the StudyOS runtime.

### Strict Governance & Non-Destructive Principles
1. **Zero Remote Mutations:** Zero tables created, zero schemas modified, zero migrations executed, zero storage buckets created, zero files uploaded, and zero users added.
2. **Read-Only / Network-Level Probing:** All verification was conducted strictly using DNS queries, TLS handshakes, HTTP head/pre-flight probes, and TCP socket tests.
3. **Zero Secret Leakage:** No database passwords, JWT secrets, or S3 secret keys were printed to logs, committed to Git, or requested in chat.
4. **Zero Billing Impact:** Maintained strict ₹0/month cardless operation; no paid add-ons or billing activation occurred.

---

## 2. Disposable Project Baseline

The following project parameters confirmed by the user were verified as the target for this phase:

| Parameter | Confirmed Value | Verification / Inspection Method |
| :--- | :--- | :--- |
| **Project Name** | `studyos-disposable-test` | User Dashboard |
| **Project Reference** | `sdydpcfttodngamwnjek` | Injected into DNS & Gateway routing (`sb-project-ref`) |
| **Organization** | `Couple-Stars` | Confirmed Free-tier organization |
| **Pricing Plan** | **Free Plan ($0/month)** | Zero billing, 500 MB DB cap, 1 GB storage cap |
| **Target Region** | **`ap-south-1` (Mumbai, India)** | AWS EC2 / ELB infrastructure in Mumbai |
| **Dashboard Status** | **Healthy** | Active state reported in Supabase management console |
| **Compute Type** | **Nano (Shared)** | Standard Free-tier compute instance |

---

## 3. Storage Adapter & Database Configuration Inspection

### A. S3 Storage Configuration Formats
Inspection of `apps/api/src/services/storage/index.ts` verified that StudyOS natively integrates with Supabase Storage via standard AWS S3 protocols:
- **Direct Storage Hostname:** `https://sdydpcfttodngamwnjek.storage.supabase.co/storage/v1/s3`
- **Path-Style Addressing:** `forcePathStyle: true` is strictly enforced, routing all bucket commands as `/{bucket}/{key}` rather than virtual-hosted style `{bucket}.{endpoint}`.
- **Tenant Path Isolation:** Every object key embeds the authenticated user's ID (`{folder}/{userId}/{timestamp}-{sanitizedFilename}`).
- **Required Environment Variables:**
  - `STORAGE_PROVIDER=supabase` (Public config)
  - `SUPABASE_STORAGE_S3_ENDPOINT=https://sdydpcfttodngamwnjek.storage.supabase.co/storage/v1/s3` (Public endpoint)
  - `SUPABASE_STORAGE_BUCKET=studyos-files` (or `studyos-materials`) (Public config)
  - `SUPABASE_STORAGE_REGION=ap-south-1` (Public config)
  - `SUPABASE_STORAGE_ACCESS_KEY_ID=<user-supplied-key-id>` (Secret - Server runtime only)
  - `SUPABASE_STORAGE_SECRET_ACCESS_KEY=<user-supplied-secret-key>` (Secret - Server runtime only)

### B. PostgreSQL Database Connection Formats
StudyOS supports two connection formats to the Supabase database instance:
1. **Transaction Pooler (Supavisor `port 6543`):**
   - Recommended for runtime serverless Hono Workers and Cloudflare Hyperdrive.
   - URI format: `postgresql://postgres.sdydpcfttodngamwnjek:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require`
2. **Session Pooler (Supavisor `port 5432`):**
   - Used for running initial schema migrations (`npm run db:push` or Drizzle migration runner).
   - URI format: `postgresql://postgres.sdydpcfttodngamwnjek:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require`

---

## 4. Read-Only Connectivity Verification Results

### A. DNS Resolution Tests
DNS resolution was verified for all project endpoints:

```powershell
Resolve-DnsName -Name sdydpcfttodngamwnjek.supabase.co
Resolve-DnsName -Name sdydpcfttodngamwnjek.storage.supabase.co
Resolve-DnsName -Name db.sdydpcfttodngamwnjek.supabase.co
Resolve-DnsName -Name aws-0-ap-south-1.pooler.supabase.com
```

**Observed Results:**
- **REST Gateway (`sdydpcfttodngamwnjek.supabase.co`):** Resolved to Cloudflare Edge IPs `104.18.38.10` and `172.64.149.246` (TTL 300).
- **Direct Storage Gateway (`sdydpcfttodngamwnjek.storage.supabase.co`):** Resolved to Cloudflare Edge IPs `104.18.32.223` and `172.64.155.33` (TTL 300).
- **Direct Database Host (`db.sdydpcfttodngamwnjek.supabase.co`):** Resolved to IPv6 address `2a05:d018:8eb:2f01:fe38:3ed:2859:893e` (AWS Mumbai).
- **Supavisor Pooler Host (`aws-0-ap-south-1.pooler.supabase.com`):** CNAME to `pool-tcp-ap-south-1-...elb.ap-south-1.amazonaws.com`, resolving to IPv4 addresses `65.0.195.55` and `3.111.105.85`.

---

### B. HTTPS & TLS Handshake Probes
Non-destructive HTTP HEAD requests were dispatched to inspect TLS certificates and gateway headers:

1. **REST API Endpoint (`https://sdydpcfttodngamwnjek.supabase.co/rest/v1/`):**
   ```http
   HTTP/1.1 401 Unauthorized
   Date: Tue, 03 Nov 2026 11:17:43 GMT
   Content-Type: application/json;charset=UTF-8
   Server: cloudflare
   sb-error-code: UNAUTHORIZED_MISSING_API_KEY
   sb-gateway-version: 1
   sb-project-ref: sdydpcfttodngamwnjek
   CF-RAY: a54af9613a5679d5-HYD
   Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
   ```
   *Interpretation:* TLS 1.3 handshake succeeded cleanly. The Supabase Gateway verified the project reference (`sb-project-ref: sdydpcfttodngamwnjek`) and correctly returned `401 Unauthorized` due to the intentional absence of API keys.

2. **Direct Storage S3 Gateway (`https://sdydpcfttodngamwnjek.storage.supabase.co/storage/v1/s3`):**
   ```http
   HTTP/1.1 404 Not Found
   Date: Tue, 03 Nov 2026 11:17:51 GMT
   Content-Type: application/json; charset=utf-8
   Server: cloudflare
   sb-gateway-mode: direct
   sb-gateway-version: 1
   sb-project-ref: sdydpcfttodngamwnjek
   CF-Ray: a54af9927dd441e5-HYD
   Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
   ```
   *Interpretation:* The direct storage endpoint is live, verified, and correctly bound to project `sdydpcfttodngamwnjek` with `sb-gateway-mode: direct`.

---

### C. TCP Port Connectivity to Supavisor Pooler
Low-level TCP socket connections were tested against the regional pooler:

```powershell
Test-NetConnection -ComputerName aws-0-ap-south-1.pooler.supabase.com -Port 6543
Test-NetConnection -ComputerName aws-0-ap-south-1.pooler.supabase.com -Port 5432
```

**Observed Results:**
- **Port 6543 (Transaction Mode Pooler):** `TcpTestSucceeded : True` (Connected to `65.0.195.55:6543` in ~25 ms).
- **Port 5432 (Session Mode Pooler):** `TcpTestSucceeded : True` (Connected to `65.0.195.55:5432` in ~25 ms).

---

## 5. Summary of Connectivity Matrix

| Endpoint / Service | Protocol & Port | Target Address | Verification Status | Verdict |
| :--- | :--- | :--- | :---: | :---: |
| **REST API Gateway** | HTTPS / 443 | `sdydpcfttodngamwnjek.supabase.co` | HTTP 401 with `sb-project-ref` header | `PASS` |
| **Direct S3 Gateway** | HTTPS / 443 | `sdydpcfttodngamwnjek.storage.supabase.co` | HTTP 404 with `sb-gateway-mode: direct` | `PASS` |
| **Database Pooler (Tx)** | TCP / 6543 | `aws-0-ap-south-1.pooler.supabase.com` | Socket connected (`TcpTestSucceeded`) | `PASS` |
| **Database Pooler (Sess)**| TCP / 5432 | `aws-0-ap-south-1.pooler.supabase.com` | Socket connected (`TcpTestSucceeded`) | `PASS` |
| **Direct DB (IPv6)** | TCP / 5432 | `db.sdydpcfttodngamwnjek.supabase.co` | Resolved to AWS Mumbai IPv6 | `PASS` |
| **Authenticated Query** | SQL / Postgres | Database Engine | Gated (No password provided locally) | `PENDING CREDENTIALS` |
| **S3 Bucket Operations** | S3 API / 443 | Storage Engine | Gated (No S3 keys provided locally) | `PENDING CREDENTIALS` |

---

## 6. Documented Unverified Capabilities

In strict adherence to safety rules, the following capabilities were **NOT TESTED** and remain unverified at Gate D:
1. **Authenticated PostgreSQL Queries (`SELECT 1`):** No database password has been supplied locally or configured in `.env`. Authenticated SQL query execution remains unverified until Gate E.
2. **Database Schema Migrations (`drizzle-kit migrate`):** DDL execution was strictly prohibited in this phase; no tables or schemas have been created remotely.
3. **S3 Bucket Creation & ACLs:** No storage buckets have been created in the disposable project.
4. **S3 Object Upload & Download:** No files (synthetic or real) were transferred to the remote storage service.
5. **Hyperdrive Proxy Binding:** Cloudflare Hyperdrive has not yet been bound to the disposable database connection string.

---

## 7. Local Automated Testing & Integrity

All local unit and integration test suites were validated:
- **Storage Provider Unit Tests:** `src/services/__tests__/storage-provider.test.ts` (21 passed)
- **Storage Security Audit Tests:** `src/services/__tests__/storage-security-audit.test.ts` (26 passed)
- **Total Local Storage Tests:** 47 passed, 0 failed (100% pass rate)
- **Working Tree Integrity:** All pre-existing user modifications in `apps/api/docker-start.sh`, `docker-compose.yml`, and `docs/PHASE_9B_*.md` remain intact and uncommitted.

---

## 8. Final Acceptance Verdict

### Status: `ACCEPTED WITH LIMITATIONS`

**Justification:**  
The network routing, DNS resolution, TLS certificates, HTTP gateway identifiers, and Supavisor PostgreSQL pooler connectivity for disposable project `sdydpcfttodngamwnjek` have been conclusively verified using read-only techniques. The phase is accepted with the planned limitation that authenticated database queries and S3 operations remain gated awaiting local credential injection in subsequent authorized phases.

---

## 9. Next Recommended Step

- **Advance to Gate E (Local Credential Configuration & Read-Only Authentication Probe):**  
  Configure the local `.env` file with the disposable project's connection strings and S3 credentials (without committing `.env` to Git), then perform a single read-only `SELECT 1` probe to confirm authentication.
