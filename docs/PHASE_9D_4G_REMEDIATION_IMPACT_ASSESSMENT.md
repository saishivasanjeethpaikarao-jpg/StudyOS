# Phase 9D.4G — PostgREST Public Access Remediation Planning & Impact Assessment

**Document Version:** 1.0.0  
**Repository:** `D:\StudyOS-Project\studyos`  
**Branch:** `studyos-development`  
**Base Commit:** `14a04444e4f85af43804e1b8f881b0550f809cc2` (`14a0444`)  
**Target Monthly Operating Cost:** ₹0 / month (Strict zero-cost Free Plan maintained)  
**Disposable Project Reference:** `sdydpcfttodngamwnjek`  
**Organization:** `Couple-Stars` | **Region:** `eu-west-1` (Ireland)  
**Plan Tier:** Free ($0/mo, Nano compute, zero paid add-ons)  
**Phase Status:** `READ-ONLY REMEDIATION PLAN PREPARED (ZERO MUTATIONS EXECUTED)`  

---

## 1. Executive Summary

Phase 9D.4G formulates a comprehensive, non-mutating remediation plan to eliminate the PostgREST public data exposure identified during the Phase 9D.4F audit. 

An exhaustive codebase search confirmed that StudyOS is strictly a **3-tier architecture**:
* Neither the frontend client ([`apps/web`](file:///D:/StudyOS-Project/studyos/apps/web)) nor the API client ([`packages/api-client`](file:///D:/StudyOS-Project/studyos/packages/api-client)) makes any direct calls to Supabase PostgREST (`/rest/v1/`).
* The Hono API backend ([`apps/api`](file:///D:/StudyOS-Project/studyos/apps/api)) interacts with the database exclusively via the PostgreSQL wire protocol (`DATABASE_URL`) connecting as the project superuser/owner role (`postgres`).
* Supabase Storage interacts exclusively via the S3-compatible API gateway (`@aws-sdk/client-s3`), and Supabase Auth schemas (`auth.*`) operate independently from the `public` application schema.

Consequently, **revoking `anon` and `authenticated` access from the `public` schema will break ZERO existing application features**, while completely closing the critical security loophole that allows unauthenticated internet callers to directly query or mutate the 56 application tables.

In accordance with strict safety rules, **this phase is 100% read-only. No SQL statements were executed, no permissions were modified, and no git commits were created.**

---

## 2. Codebase Investigation Findings

### 2.1 Frontend Inspection (`apps/web`)
* **Supabase Client Usage:** **0 occurrences** across all files in `apps/web/src/`.
* **Package Dependencies:** Inspection of `apps/web/package.json` confirms `@supabase/supabase-js` is **not installed**.
* **Transport Mechanism:** All student UI interactions route via `packages/api-client` (using `ky` HTTP client) directly to `VITE_API_URL` (the StudyOS Hono API server).
* **Finding:** The web frontend does not consume PostgREST endpoints under any circumstances.

### 2.2 Backend & Shared Client Inspection (`apps/api`, `packages/api-client`)
* **REST API Usage:** Zero backend routes or service modules call Supabase PostgREST endpoints.
* **Database Wire Protocol:** All database CRUD operations, migrations, and transactions route through `packages/database`, which utilizes `drizzle-orm` over `postgres-js` directly to the PostgreSQL pooler.
* **Object Storage Usage:** Attachment upload, retrieval, and presigned URLs route through `apps/api/src/services/storage/index.ts` connecting to `SUPABASE_STORAGE_S3_ENDPOINT` via standard AWS S3 SDK commands.
* **Finding:** The backend does not rely on PostgREST for any data persistence or query workflow.

### 2.3 Database Roles Utilized by StudyOS
* **Runtime API Connection Role:** `postgres` (connecting via Supavisor Transaction Pooler on `aws-0-eu-west-1.pooler.supabase.com:6543/postgres`).
* **Migration Runner Role:** `postgres` (connecting via Supavisor Session Pooler on `aws-0-eu-west-1.pooler.supabase.com:5432/postgres`).
* **Role Characteristics:** The `postgres` role owns the database and the `public` schema. It possesses full superuser/administrative privileges, bypassing table-level permission restrictions unless `FORCE ROW LEVEL SECURITY` is configured.
* **Client Roles Exposed to PostgREST:** `anon` (unauthenticated web visitors using `SUPABASE_PUBLISHABLE_KEY`) and `authenticated` (signed-in JWT sessions). Currently, these roles have full access granted by default.

---

## 3. Schema Separation: Application vs Managed Schemas

An inventory of all schemas confirms clean boundary separation:

| Schema Name | Governance Domain | Contents / Responsibilities | Affected by Public Remediation? |
| :--- | :---: | :--- | :---: |
| **`public`** | StudyOS Application | All 56 application tables (`users`, `tasks`, `study_sessions`, `api_keys`, `oauth_tokens`, etc.) | **YES (Target of Remediation)** |
| **`drizzle`** | Migration Engine | Migration tracking ledger (`__drizzle_migrations`) | **NO** (Isolated schema) |
| **`auth`** | Supabase GoTrue | Managed auth tables (`users`, `identities`, `sessions`, `refresh_tokens`) | **NO** (Unmodified; managed by Supabase internal daemon) |
| **`storage`** | Supabase Storage | Object metadata and buckets (`buckets`, `objects`, `s3_multipart_uploads`) | **NO** (Unmodified; managed by Storage S3 gateway) |
| **`realtime`** | Supabase Realtime | WebSocket channel subscriptions | **NO** (Unmodified) |
| **`vault`** | Supabase Vault | Encrypted secrets management | **NO** (Unmodified) |
| **`graphql`** | Supabase GraphQL | GraphQL reflection schema | **NO** (Unmodified) |

---

## 4. Deep Inspection of Default Privileges (`pg_default_acl`)

A critical finding from querying `pg_default_acl` revealed why newly created tables are automatically exposed to PostgREST:

```sql
SELECT pg_get_userbyid(defaclrole) AS grantor, nspname AS schema, defaclobjtype AS object_type, defaclacl AS privileges
FROM pg_default_acl a LEFT JOIN pg_namespace n ON n.oid = a.defaclnamespace;
```

**Observed Default Privilege Entries for Schema `public`:**
* **Grantor `postgres` (object_type `r` - tables):**  
  `{postgres=arwdDxtm/postgres, anon=arwdDxtm/postgres, authenticated=arwdDxtm/postgres, service_role=arwdDxtm/postgres}`
* **Grantor `supabase_admin` (object_type `r` - tables):**  
  `{postgres=arwdDxtm/supabase_admin, anon=arwdDxtm/supabase_admin, authenticated=arwdDxtm/supabase_admin, service_role=arwdDxtm/supabase_admin}`

### Key Takeaway for Future Migrations:
Because Supabase preconfigures default ACLs on the `public` schema, **any future `CREATE TABLE` executed by `postgres` or `supabase_admin` will automatically grant full permissions (`arwdDxtm`) to `anon` and `authenticated`!**

Therefore, a robust remediation plan cannot merely revoke permissions on existing tables; it **must also alter default privileges** for both grantor roles (`postgres` and `supabase_admin`).

---

## 5. Feature Impact & Compatibility Analysis

| Application Feature | Transport Layer | Identity / Role Used | Impact of Revoking `anon` / `authenticated` on `public` |
| :--- | :---: | :---: | :--- |
| **Student Sign-in / Register** | HTTPS -> Hono API | `postgres` (Wire) | **ZERO IMPACT** — Hono API validates and writes directly via Drizzle. |
| **Tasks & Flashcard CRUD** | HTTPS -> Hono API | `postgres` (Wire) | **ZERO IMPACT** — Database queries execute as `postgres`. |
| **Calendar Time-Blocking** | HTTPS -> Hono API | `postgres` (Wire) | **ZERO IMPACT** — Handled entirely in server-side routes. |
| **Material File Uploads** | S3 API (`storage/v1/s3`)| S3 Credentials | **ZERO IMPACT** — Storage operates on `storage` schema and S3 gateway. |
| **Presigned S3 Downloads** | S3 API -> Client | S3 Presigned URL | **ZERO IMPACT** — Direct S3 presigned URL bypasses PostgREST entirely. |
| **Drizzle Schema Migrations** | Wire (Port 5432) | `postgres` (Wire) | **ZERO IMPACT** — Drizzle connects as superuser. |
| **Direct PostgREST Queries** | HTTPS (`/rest/v1/`) | `anon` / `authenticated` | **BLOCKED (INTENDED OUTCOME)** — Unauthorized internet access returns HTTP 401/403. |

---

## 6. Supabase Auth & Storage Isolation Review

* **Supabase GoTrue Auth (`/auth/v1/*`):**  
  Supabase Auth operates entirely within the `auth` schema (`auth.users`, `auth.refresh_tokens`). The `anon` and `authenticated` roles do not possess direct table grants in `auth`; GoTrue internal services communicate over dedicated internal connections. Revoking permissions on the `public` schema has zero effect on Supabase Auth.
* **Supabase Storage Engine (`/storage/v1/*`):**  
  The storage service stores its bucket records and object manifests in schema `storage`. The S3 API gateway authenticates using HMAC access keys and maps to internal storage policies. Revoking permissions on `public.*` will not interfere with S3 object uploads or downloads.

---

## 7. Proposed Least-Privilege Remediation Plan

The proposed remediation utilizes a 3-stage defense-in-depth lockdown:

### Stage 1: Revoke Existing Permissions on All 56 Public Tables
```sql
-- Revoke all table, sequence, and routine privileges from client roles on existing public objects
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;
```

### Stage 2: Alter Default Privileges to Protect Future Migrations
```sql
-- Ensure future tables created by 'postgres' do not inherit anon/authenticated grants
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated;

-- Ensure future tables created by 'supabase_admin' do not inherit anon/authenticated grants
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated;
```

### Stage 3: (Defense-in-Depth) Enable RLS Across All 56 Tables
As a secondary layer of protection, Row Level Security can be enabled across all tables so that even if a table were accidentally granted permissions in the future, PostgreSQL would deny access by default:
```sql
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP 
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP; 
END $$;
```

---

## 8. Rollback Plan (Zero-Downtime Reversal)

If any unexpected dependency on PostgREST is discovered, the following rollback script will immediately restore Supabase's default open permissions:

```sql
-- Rollback Step 1: Restore table, sequence, and routine grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- Rollback Step 2: Restore default privileges for postgres
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- Rollback Step 3: Restore default privileges for supabase_admin
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- Rollback Step 4: Disable RLS across public tables
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP 
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY;';
    END LOOP; 
END $$;
```

---

## 9. Verification & Validation Protocol (For Execution Phase)

Once approved for execution in Phase 9D.4H, the remediation will be validated via:

1. **Pre-Check:** Re-confirm live baseline.
2. **PostgREST Lockdown Probe:**
   - Execute `GET https://sdydpcfttodngamwnjek.supabase.co/rest/v1/users?select=*` with `SUPABASE_PUBLISHABLE_KEY`.
   - **Expected Outcome:** `HTTP 401 Unauthorized` or `HTTP 403 Forbidden` (`permission denied for table users`).
3. **Backend Wire Health Check:**
   - Execute wire query `SELECT count(*) FROM users;` using `DATABASE_URL`.
   - **Expected Outcome:** Success (`count: 0`).
4. **Automated Test Suite:**
   - Run Vitest storage and API suites to confirm zero regressions.
5. **Future Table Proof Check:**
   - Create a temporary dummy table via DDL, verify its permissions in `information_schema.role_table_grants` to confirm `anon` is absent, and drop the dummy table.

---

## 10. Statement of Non-Mutation & Safe Governance

During this planning phase:
* **Remote Statements Executed:** `0` (Zero `REVOKE`, `GRANT`, `ALTER`, or `CREATE` statements run).
* **Remote Schema / Data Mutations:** `0` (Database state is 100% unchanged).
* **Billing Impact:** **₹0 / month maintained** (Free plan confirmed).
* **Git Operations:** `0` (Report created locally; uncommitted awaiting user approval).
