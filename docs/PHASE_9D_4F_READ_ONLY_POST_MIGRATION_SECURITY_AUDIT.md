# Phase 9D.4F — Read-Only Post-Migration Security & Schema Audit

**Document Version:** 1.0.0  
**Repository:** `D:\StudyOS-Project\studyos`  
**Branch:** `studyos-development`  
**Reconciled Base Commit:** `14a04444e4f85af43804e1b8f881b0550f809cc2` (`14a0444`)  
**Target Monthly Operating Cost:** ₹0 / month (Strict zero-cost Free Plan maintained)  
**Disposable Project Reference:** `sdydpcfttodngamwnjek`  
**Organization:** `Couple-Stars` | **Region:** `eu-west-1` (Ireland)  
**Plan Tier:** Free ($0/mo, Nano compute, zero paid add-ons)  
**Audit Status:** `COMPLETE — CRITICAL RLS POSTGREST EXPOSURE IDENTIFIED (NO MUTATIONS PERFORMED)`  

---

## 1. Executive Summary

Phase 9D.4F executes an exhaustive, non-mutating post-migration security and schema audit of the disposable Supabase test project (`studyos-disposable-test`, ref `sdydpcfttodngamwnjek`) following the Phase 9D.4E Drizzle migrations.

The audit confirmed 100% migration ledger parity (all 14 migrations verified by hash and timestamp) and complete structural integrity across all 56 public application tables (56 PKs, 84 FKs, 14 unique constraints, 116 non-PK indexes). 

However, the audit revealed a **Critical Access Control Finding**:  
All 56 public tables currently have **Row Level Security (RLS) disabled** with default PostgreSQL privileges granting `SELECT, INSERT, UPDATE, DELETE` to the `anon` and `authenticated` roles. Because Supabase exposes the PostgREST API Gateway publicly, any client possessing the public `SUPABASE_PUBLISHABLE_KEY` can directly query and mutate public tables over HTTPS, bypassing the Node.js/Hono API backend (`apps/api`). 

In compliance with strict safety rules, **zero mutations, policy changes, or grant alterations were performed during this audit.**

---

## 2. Reconciled Repository Baseline

* **Current Branch:** `studyos-development` (Strict preservation; no branches switched)
* **Current HEAD Commit:** `14a04444e4f85af43804e1b8f881b0550f809cc2` (`14a0444`)
* **Working-Tree Integrity:** All 5 pre-existing user modifications remain strictly untouched and unstaged:
  - `apps/api/docker-start.sh`
  - `docker-compose.yml`
  - `docs/PHASE_9B_CLOUDFLARE_COMPATIBILITY.md`
  - `docs/PHASE_9B_FINAL_ACCEPTANCE.md`
  - `docs/PHASE_9B_REMEDIATION_LOG.md`
* **Local Migration Files:** Verified present in [`packages/database/drizzle/`](file:///D:/StudyOS-Project/studyos/packages/database/drizzle) (`0000_baseline.sql` through `0013_integrations_agent.sql`).

---

## 3. Migration Consistency & Ledger Verification

The remote migration ledger in schema `drizzle` table `__drizzle_migrations` was queried directly via the PostgreSQL wire pooler and compared against local migration journal [`packages/database/drizzle/meta/_journal.json`](file:///D:/StudyOS-Project/studyos/packages/database/drizzle/meta/_journal.json):

| Ledger ID | Migration Tag | Journal Timestamp (`when`) | Remote Ledger Timestamp | Remote SHA-256 Hash | Parity Status |
| :---: | :--- | :---: | :---: | :--- | :---: |
| `1` | `0000_baseline` | 1789703241518 | 1789703241518 | `0e4a9eb9430b5d8b...fe06a4` | `EXACT MATCH` |
| `2` | `0001_giant_morlocks` | 1790576641403 | 1790576641403 | `9f4b42c3052cde12...e940c6` | `EXACT MATCH` |
| `3` | `0002_silly_menace` | 1790835810506 | 1790835810506 | `3b0064fc7ec59e66...56306f` | `EXACT MATCH` |
| `4` | `0003_abnormal_black_knight` | 1790867723871 | 1790867723871 | `eca5586bc4dc6ccf...02d9c7` | `EXACT MATCH` |
| `5` | `0004_sticky_eternity` | 1790869816196 | 1790869816196 | `00623aa34439329e...59cc75` | `EXACT MATCH` |
| `6` | `0005_polite_colossus` | 1793361454006 | 1793361454006 | `ddff1212743a71c2...d27dfa` | `EXACT MATCH` |
| `7` | `0006_chemical_morgan_stark` | 1793362043395 | 1793362043395 | `cf3f228f828a8dda...1468b9` | `EXACT MATCH` |
| `8` | `0007_sync_journal_cascade_fix` | 1793362043396 | 1793362043396 | `100d688943d47559...7b5be6` | `EXACT MATCH` |
| `9` | `0008_secret_toucan` | 1793362043397 | 1793362043397 | `b6a140233623f575...3522431` | `EXACT MATCH` |
| `10` | `0009_quiet_answer_journal` | 1793362043398 | 1793362043398 | `7eadb95d59d545e4...8ea52b` | `EXACT MATCH` |
| `11` | `0010_task_revisions` | 1793595105289 | 1793595105289 | `d514b4051a1ee37b...343aa9` | `EXACT MATCH` |
| `12` | `0011_mixed_thundra` | 1793603004576 | 1793603004576 | `51774da3850a1973...d3249e` | `EXACT MATCH` |
| `13` | `0012_ai_study_planner` | 1793618000000 | 1793618000000 | `a20814148ddf4999...f8a85a` | `EXACT MATCH` |
| `14` | `0013_integrations_agent` | 1793628000000 | 1793628000000 | `2700b85748d9cfae...25da8d` | `EXACT MATCH` |

* **Total Local Migration Count:** 14
* **Total Remote Migration Count:** 14
* **Discrepancy:** `0` (Zero hash drift, zero timestamp skew, zero unrecorded migrations).

---

## 4. Schema Structure & Relational Integrity Audit

A comprehensive inspection of `information_schema` and `pg_catalog` across the `public` schema yielded:

| Structural Metric | Expected | Observed | Status |
| :--- | :---: | :---: | :---: |
| **Total Public Tables** | 56 | **56** | `PASS` |
| **Tables with Primary Keys** | 56 | **56** (100%) | `PASS` |
| **Tables Lacking Primary Keys** | 0 | **0** (`[]`) | `PASS` |
| **Foreign Key Constraints** | 84 | **84** | `PASS` |
| **Unique Constraints** | 14 | **14** | `PASS` |
| **Non-Primary Key Indexes** | 116 | **116** | `PASS` |

### Key Integrity Highlights
1. **Primary Keys:** Every application table enforces a UUID primary key default `gen_random_uuid()`.
2. **Cascading Referencing:** Delete cascade and set-null rules are properly wired on user-owned entities (`tasks`, `study_sessions`, `calendar_events`, `idea_boards`, `attachments`).
3. **Index Coverage:** Foreign keys and frequent filter paths (`user_id`, `created_at`, `sync_status`, `is_active`) have dedicated B-tree indexes, ensuring scalable query performance on Nano compute.

---

## 5. Row Level Security & Access Control Audit (CRITICAL FINDINGS)

> [!CAUTION]
> **CRITICAL SECURITY FINDING: RLS IS DISABLED ACROSS ALL 56 APPLICATION TABLES**
>
> 1. **RLS Status (`pg_class.relrowsecurity`):**
>    - Tables with RLS Enabled: **0 / 56**
>    - Tables with RLS Disabled: **56 / 56**
> 2. **PostgreSQL Policies (`pg_policies`):**
>    - Total Policies Configured: **0**
> 3. **Role Table Grants (`information_schema.role_table_grants`):**
>    - Default Supabase grants assign full privileges (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`) on all 56 public tables to:
>      - `anon` (Unauthenticated callers using the public publishable key)
>      - `authenticated` (Signed-in Supabase Auth users)
>      - `service_role` (Privileged backend key)

### Live Exploitation Demonstration (Read-Only Probe)
An anonymous HTTP GET query was dispatched to the public PostgREST gateway:
```http
GET https://sdydpcfttodngamwnjek.supabase.co/rest/v1/users?select=*
apikey: [REDACTED_PUBLISHABLE_KEY]
Authorization: Bearer [REDACTED_PUBLISHABLE_KEY]
```
* **Observed Response:** `HTTP 200 OK` (Returned `[]` rows).
* **Security Risk:** Because the table is empty, zero student records were leaked. However, because `anon` has full query access, **any data inserted into this database in the future would be readable and writable by anyone possessing the client-side publishable key.**

### High-Risk Sensitive Tables Affected
The following highly sensitive tables currently have **zero access isolation** at the database layer:
* **Authentication & Credentials:** `api_keys`, `oauth_tokens`, `oauth_clients`, `oauth_authorization_codes`, `oauth_states`, `auth_sessions`, `user_identities`.
* **External Integrations:** `integration_connections`, `calendar_accounts`, `telegram_settings`, `telegram_link_requests`.
* **Student Data:** `users`, `tasks`, `study_notes`, `study_sessions`, `assignments`, `attachments`, `push_subscriptions`.

### Architectural Root Cause
StudyOS is architecturally designed as a **3-tier application**:
- The student browser talks exclusively to the Hono/Node.js backend (`apps/api`).
- The Hono backend connects directly via PostgreSQL wire (`DATABASE_URL`) as the privileged `postgres` user, executing application-level authorization and tenant filtering in middleware.
- Standard Drizzle migrations create tables without issuing `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
- However, Supabase automatically activates and exposes PostgREST (`/rest/v1/`) on all projects by default.

### Recommended Remediation Strategy (For Subsequent Phase)
Two clean remediation paths exist:
* **Remediation Option 1 (Recommended for 3-Tier Backend):**  
  Revoke public schema access from the Supabase client roles:
  ```sql
  REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
  REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
  REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;
  ```
  *Benefit:* Immediately seals the public PostgREST API gateway from unauthorized access while allowing `apps/api` (connecting over wire as `postgres`) to operate with zero disruption.
* **Remediation Option 2 (Defense-in-Depth RLS):**  
  Enable RLS on all 56 tables and define restrictive policies:
  ```sql
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  -- repeated for all 56 tables
  ```

---

## 6. Storage Security Audit (`studyos-files`)

A read-only inspection of the Supabase Storage service confirmed:

* **Bucket Name:** `studyos-files`
* **Visibility:** `public: false` (**Strictly Private**).
* **Object Count:** `0` (Zero objects or student files stored).
* **Security Assessment:** S3 gateway rejects unauthorized anonymous requests. File access requires either signed URLs generated by the API server or privileged S3 credentials.

---

## 7. Separation of Facts: Verified vs Inferred

| Audit Dimension | Fact Source | Verification Method | Status |
| :--- | :---: | :--- | :---: |
| **Git Baseline & HEAD** | Verified | Command: `git rev-parse HEAD`, `git status` | `PASS` (`14a0444`) |
| **Migration Parity (14/14)** | Verified | Command: Direct query to `drizzle.__drizzle_migrations` | `PASS` (100% hash match) |
| **Public Table Count (56)** | Verified | Command: Direct query to `information_schema.tables` | `PASS` (56 tables) |
| **Primary Key Coverage (100%)**| Verified | Command: Direct query to `table_constraints` | `PASS` (56/56 tables) |
| **RLS Status = Disabled** | Verified | Command: Direct query to `pg_class.relrowsecurity` | `CRITICAL RISK` (0/56 enabled) |
| **Anon PostgREST Permissiveness**| Verified | Command: Live HTTPS probe to `/rest/v1/users` | `CONFIRMED` (HTTP 200) |
| **Bucket Privacy = Private** | Verified | Command: Direct API GET to `/storage/v1/bucket` | `PASS` (`public: false`) |
| **Bucket Object Count = 0** | Verified | Command: Direct API POST to `/object/list` | `PASS` (0 objects) |
| **Free Tier Integrity ($0/mo)** | Verified | Read-only check | `PASS` (No paid add-ons) |

---

## 8. Summary of Remote Mutations & Billing Status

During this Phase 9D.4F audit:
* **Remote Schemas Created/Altered:** `0`
* **Remote Tables Created/Modified/Dropped:** `0`
* **Remote Policies Created/Modified/Dropped:** `0` (Audit only; no policies altered)
* **Remote Role Grants Altered:** `0` (Grants retained as observed)
* **Remote Records Inserted/Updated/Deleted:** `0`
* **Remote Files / Storage Objects Uploaded/Deleted:** `0`
* **Billing Changes / Paid Upgrades:** `NONE` (Strict ₹0/month Free Tier preserved)
* **Git Commits or Pushes:** `NONE` (Report left uncommitted for user review)

---

## 9. Blockers & Recommended Next Steps

1. **Gate Blocker for Production Data:** No real student data should be written to this database until the public PostgREST API gateway exposure is remediated (by either revoking `anon`/`authenticated` grants on `public` schema or enabling RLS).
2. **Next Action (Phase 9D.4G):** Prepare and review the RLS & PostgREST lockdown script before running synthetic end-to-end user and storage flows.
