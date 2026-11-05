# StudyOS — Verified Findings & Bug Register

**Document Version:** 1.0.0  
**Audit Date:** November 5, 2026  
**Auditor:** Antigravity Engineering  
**Scope:** Verified defects, security vulnerabilities, testing failures, and architectural weaknesses across `studyos`.

---

## Severity Classification Scale
- **P0 (Critical):** Immediate security exploit, active data loss, or total build/system breakage.
- **P1 (Major):** Broken core functionality, CI gate failure, unhandled conflict lockout, or major test gap.
- **P2 (Important):** High-impact bug, missing platform capability, or security hardening weakness.
- **P3 (Moderate):** Technical debt, confusing user experience, dead code, or bundle bloat.
- **P4 (Minor / Cosmetic):** Documentation typo, minor styling defect, or non-blocking improvement.

---

## 1. Verified Defect Register

### [BUG-01] Drizzle Migration Journal Missing Snapshots for Migrations 0012 & 0013
- **Severity:** **P1**
- **Component:** Database / Migration Tooling
- **Location:** [`packages/database/drizzle/meta/_journal.json`](file:///D:/StudyOS-Project/studyos/packages/database/drizzle/meta/_journal.json)
- **Description:** Migrations `0012_ai_study_planner.sql` and `0013_integrations_agent.sql` were added to `drizzle/` without updating `_journal.json`. Drizzle Kit tracks migrations through `_journal.json` which terminates at `0011`.
- **Evidence:** Executing `bunx drizzle-kit generate` in `packages/database` causes Drizzle Kit to treat tables `ai_provider_configs`, `agent_connections`, `telegram_settings`, and `automation_definitions` as unmigrated, generating a duplicate `0014` migration.
- **Reproduction:**
  ```powershell
  cd packages/database
  bunx drizzle-kit generate
  # Inspect newly created SQL file in drizzle/
  ```
- **User Impact:** CI jobs executing schema generation checks fail immediately. Any future schema migrations will duplicate existing tables and fail on deployment.
- **Recommended Solution:** Manually update `_journal.json` with entries for `0012` and `0013` and generate corresponding snapshot files (`0012_snapshot.json` and `0013_snapshot.json`) to align Drizzle's migration history.
- **Estimated Complexity:** Low (1 hour).

---

### [BUG-02] Vitest Parallel Hook Timeout in OAuth Unit Tests
- **Severity:** **P1**
- **Component:** API / MCP OAuth Tests
- **Location:** [`apps/api/src/lib/oauth/oauth.test.ts:21`](file:///D:/StudyOS-Project/studyos/apps/api/src/lib/oauth/oauth.test.ts#L21)
- **Description:** `beforeAll(async () => { clients = await import("./clients.js"); ... })` performs dynamic module imports of heavy cryptographic and database modules during hook setup.
- **Evidence:** Running `turbo run test` across all monorepo packages causes parallel CPU contention, exceeding Vitest's default 10,000ms hook timeout:
  ```text
  FAIL src/lib/oauth/oauth.test.ts
  Error: Hook timed out in 10000ms.
  ```
- **Reproduction:**
  ```powershell
  bun run test
  ```
- **User Impact:** Top-level CI build and release pipelines fail intermittently during monorepo test validation.
- **Recommended Solution:** Convert dynamic `await import()` in `beforeAll` into static top-level ES module imports, or configure `hookTimeout: 30000` in `apps/api/vitest.config.ts`.
- **Estimated Complexity:** Low (30 minutes).

---

### [BUG-03] 112 Database-Backed API Tests Skipped in Default CI and Local Test Runs
- **Severity:** **P1**
- **Component:** Testing / CI Pipeline
- **Location:** `apps/api/src/routes/*.test.ts` (10 test files guarded by `TEST_DATABASE_URL`)
- **Description:** 112 out of 254 tests in `apps/api` (44%) are skipped when `TEST_DATABASE_URL` is undefined. The CI workflow `release.yml` and `ci.yml:validate` do not start a PostgreSQL service container or provide `TEST_DATABASE_URL` for `bun run test`.
- **Evidence:** Monorepo test output confirms: `142 passed | 112 skipped (254)`. Suites testing account sync, academic domain, Google auth, learning resources, and study plans are never executed in CI.
- **User Impact:** Regressions in core database operations, cascading deletes, and tenant isolation can merge undetected into production branches.
- **Recommended Solution:** Configure a PostgreSQL service container in `.github/workflows/ci.yml` and `release.yml` for the test job, providing `TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/opensunsama`.
- **Estimated Complexity:** Medium (2 hours).

---

### [BUG-04] Offline Sync Queue Permanent 409 Conflict Lockout
- **Severity:** **P1**
- **Component:** Frontend State / Offline Sync
- **Location:** [`apps/web/src/hooks/useAccountSync.tsx:156-166`](file:///D:/StudyOS-Project/studyos/apps/web/src/hooks/useAccountSync.tsx#L156-L166)
- **Description:** When a queued offline mutation fails with HTTP 409 Conflict (optimistic revision mismatch), the mutation is left in `localStorage` with `attempts: attempts + 1`. On each reconnect, `flushQueuedMutations` retries the mutation with the outdated `expectedRevision`, failing with 409 repeatedly.
- **Evidence:** `apps/web/src/components/settings/account-sync-settings.tsx` displays "Sync needs attention" and lists the error, but provides no discard button, overwrite option, or diff resolution modal.
- **User Impact:** A single concurrent edit can permanently jam the client's sync engine, preventing subsequent offline changes from syncing.
- **Recommended Solution:** Implement an automatic discard/retry policy: after 3 conflict attempts, prompt the student with a "Discard local change or Overwrite" dialog, or provide an explicit "Clear conflicting item" action in sync settings.
- **Estimated Complexity:** Medium (4 hours).

---

### [BUG-05] Missing Application-Level Rate Limiting on Authentication Endpoints
- **Severity:** **P1**
- **Component:** API Security / Middleware
- **Location:** [`apps/api/src/index.ts:61-113`](file:///D:/StudyOS-Project/studyos/apps/api/src/index.ts#L61-L113)
- **Description:** `POST /auth/login`, `POST /auth/register`, and `POST /auth/forgot-password` have no rate limiting middleware applied in the Hono application stack.
- **Evidence:** Inspection of route registrations in `apps/api/src/index.ts` and `apps/api/src/routes/auth.ts` shows direct handler execution without throttling.
- **User Impact:** Vulnerability to credential stuffing, brute force password guessing, and registration flooding.
- **Recommended Solution:** Apply sliding-window IP/user rate limiting (e.g. 5 failed login attempts per minute) using Redis or memory store.
- **Estimated Complexity:** Medium (3 hours).

---

### [BUG-06] Abandoned Tauri Mobile Prototype (`apps/mobile`) Retained in Monorepo
- **Severity:** **P2**
- **Component:** Repository Architecture
- **Location:** [`apps/mobile/`](file:///D:/StudyOS-Project/studyos/apps/mobile)
- **Description:** `apps/mobile` is an abandoned Tauri v2 mobile wrapper from upstream Open-Sunsama. It conflicts with the active React Native / Expo application (`apps/expo-mobile`).
- **Evidence:** Monorepo package scripts exclude it: `--filter='!@open-sunsama/mobile'`. It adds 70+ unnecessary files and outdated documentation to the repository.
- **User Impact:** Developer confusion regarding the active mobile architecture.
- **Recommended Solution:** Safely deprecate and remove `apps/mobile/` from monorepo workspaces.
- **Estimated Complexity:** Low (1 hour).

---

### [BUG-07] Upstream Open-Sunsama Metadata in Root `package.json`
- **Severity:** **P2**
- **Component:** Branding & Repository Configuration
- **Location:** [`package.json:1-32`](file:///D:/StudyOS-Project/studyos/package.json#L1-L32)
- **Description:** Root `package.json` retains upstream repository URL, bugs URL, and homepage:
  ```json
  "repository": { "type": "git", "url": "https://github.com/ShadowWalker2014/open-sunsama.git" },
  "homepage": "https://opensunsama.com",
  "bugs": { "url": "https://github.com/ShadowWalker2014/open-sunsama/issues" }
  ```
- **User Impact:** External contributors and release tooling point to the upstream upstream repository rather than StudyOS.
- **Recommended Solution:** Update metadata to `https://github.com/saishivasanjeethpaikarao-jpg/StudyOS`.
- **Estimated Complexity:** Low (15 minutes).

---

### [BUG-08] Unvalidated URL Protocol in Tauri Desktop `open_url` Command
- **Severity:** **P2**
- **Component:** Windows Desktop / Security
- **Location:** [`apps/desktop/src-tauri/src/commands/mod.rs:14-17`](file:///D:/StudyOS-Project/studyos/apps/desktop/src-tauri/src/commands/mod.rs#L14-L17)
- **Description:** `open_url` executes `open::that(&url)` without validating the protocol scheme.
- **Evidence:** Passing non-web protocols (e.g. `file:`, `shell:`, or executable paths) triggers system handler execution.
- **User Impact:** Potential arbitrary protocol handler invocation on Windows.
- **Recommended Solution:** Enforce regex validation in Rust: allow only `https://`, `http://`, and `mailto:` schemes before invoking `open::that`.
- **Estimated Complexity:** Low (30 minutes).

---

### [BUG-09] Android Client Lacks WebView for In-App Video Playback
- **Severity:** **P2**
- **Component:** Android Mobile / FocusTube
- **Location:** [`apps/expo-mobile/package.json`](file:///D:/StudyOS-Project/studyos/apps/expo-mobile/package.json)
- **Description:** `apps/expo-mobile` does not include `react-native-webview`. It cannot render embedded YouTube players inside the app.
- **Evidence:** `package.json` dependencies only include React Native core and Expo components.
- **User Impact:** "Watch in StudyOS" fails on Android; playback must always be handed off to the external YouTube application via `Linking.openURL`.
- **Recommended Solution:** Document external handoff as the supported V1 pattern on Android, or install `react-native-webview` in Phase 5.
- **Estimated Complexity:** Medium (3 hours).

---

### [BUG-10] Legacy Commercial Comparison Routes in Web Router
- **Severity:** **P3**
- **Component:** Web Application / Product Focus
- **Location:** `apps/web/src/routes/alternative.*.tsx`
- **Description:** Commercial comparison pages for Akiflow, Motion, Reclaim, Sunsama, and Todoist from Open-Sunsama are active in the router.
- **User Impact:** Inconsistent branding and confusion for student users.
- **Recommended Solution:** Archive or redirect comparison routes to student-focused StudyOS feature overviews.
- **Estimated Complexity:** Low (1 hour).

---

### [BUG-11] Plain Text Notes Lack Interactive Timestamp Seeking
- **Severity:** **P3**
- **Component:** Academic Notes / FocusTube
- **Location:** [`apps/web/src/components/academics/notes-page.tsx:332`](file:///D:/StudyOS-Project/studyos/apps/web/src/components/academics/notes-page.tsx#L332)
- **Description:** Notes editor renders a standard `<textarea>` without markdown preview or clickable timestamp chips.
- **User Impact:** Students cannot click `[MM:SS]` markers to jump the video player to a specific timestamp while actively editing.
- **Recommended Solution:** Add a dual-mode preview or rich text mark renderer for `[MM:SS]` timestamps.
- **Estimated Complexity:** Medium (4 hours).

---

### [BUG-12] Missing Turborepo Outputs Caching in `turbo.json`
- **Severity:** **P3**
- **Component:** Build System
- **Location:** `turbo.json`
- **Description:** Turbo emits warnings during test runs: `WARNING no output files found for task @open-sunsama/api-client#test. Please check your outputs key in turbo.json`.
- **User Impact:** Cache misses and slower build times in CI.
- **Recommended Solution:** Define `"outputs": []` or `"cache": false` for test tasks in `turbo.json`.
- **Estimated Complexity:** Low (15 minutes).
