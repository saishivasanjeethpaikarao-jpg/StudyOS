# StudyOS — Prioritized Remediation Plan

**Document Version:** 1.0.0  
**Audit Date:** November 5, 2026  
**Auditor:** Antigravity Engineering  
**Roadmap Alignment:** Strictly mapped to the existing **10-Phase Roadmap (Phases 0–9)** without creating new phases or altering milestones.

---

## 1. Remediation Strategy Overview

This remediation plan establishes the exact sequence of engineering actions required to transition StudyOS from its current audited state to a production-ready, multi-platform release.

All remediation tasks are classified by priority and mapped directly to existing roadmap phases:
- **Immediate Pre-Release Remediation (Must-Fix before Release):** 5 tasks.
- **Secondary Quality & Hardening (Should-Fix):** 4 tasks.
- **Post-Release Enhancements (Can Safely Wait):** 3 tasks.

---

## 2. Phase-by-Phase Remediation Roadmap

### Phase 0–3: Foundation, Database & Academic Testing Remediation
*Focus: Database migration metadata integrity and test harness completeness.*

1. **[REMED-01] Align Drizzle Migration Metadata (P1)**
   - **Target:** `packages/database/drizzle/meta/_journal.json`
   - **Action:** Add entries for `0012_ai_study_planner.sql` and `0013_integrations_agent.sql`. Generate snapshots `0012_snapshot.json` and `0013_snapshot.json`.
   - **Verification:** Execute `bunx drizzle-kit generate` and verify zero drift.

2. **[REMED-02] Fix Parallel Vitest Hook Timeout (P1)**
   - **Target:** `apps/api/src/lib/oauth/oauth.test.ts`
   - **Action:** Convert dynamic `beforeAll` imports into static top-level ES module imports, or configure `hookTimeout: 30000` in `apps/api/vitest.config.ts`.
   - **Verification:** `bun run test` passes reliably under full CPU load.

3. **[REMED-03] Enable PostgreSQL Runner for CI Tests (P1)**
   - **Target:** `.github/workflows/ci.yml` and `.github/workflows/release.yml`
   - **Action:** Add a PostgreSQL service container to the validation job and supply `TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/opensunsama`.
   - **Verification:** All 254 API integration tests run and pass (zero skipped tests).

---

### Phase 4: Account Sessions, Security & Sync Hardening
*Focus: Rate limiting, offline conflict resolution, and session safety.*

4. **[REMED-04] Implement Application-Level Auth Rate Limiting (P1)**
   - **Target:** `apps/api/src/index.ts` & `apps/api/src/routes/auth.ts`
   - **Action:** Attach an in-memory/Redis sliding window rate limiter to `/auth/login`, `/auth/register`, and `/auth/forgot-password` (limit 5 attempts per minute).
   - **Verification:** Test with 6 consecutive rapid requests and verify HTTP 429 response.

5. **[REMED-05] Add Conflict Discard/Resolution Action in Sync Queue (P1)**
   - **Target:** `apps/web/src/hooks/useAccountSync.tsx` & `account-sync-settings.tsx`
   - **Action:** When an offline mutation fails with HTTP 409 Conflict after 3 retries, present an explicit "Discard local change" or "Overwrite from server" button in settings.
   - **Verification:** Simulate 409 response in synthetic test; verify queue clears cleanly.

---

### Phase 5: Android Mobile Refinement
*Focus: Mobile video integration and keystore configuration.*

6. **[REMED-06] Clarify FocusTube Android Handoff & Alarm Confirmation (P2)**
   - **Target:** `apps/expo-mobile/app/(app)/resources.tsx` & `lib/alarms.ts`
   - **Action:** Ensure FocusTube cards prompt "Open on YouTube" via `Linking.openURL` and display explicit guidance: "Confirm alarm in Android Clock app".
   - **Verification:** Verify tap actions in Expo runtime.

---

### Phase 6: Windows Desktop Hardening
*Focus: IPC security and Content Security Policy.*

7. **[REMED-07] Restrict Tauri `open_url` Protocol Scheme (P2)**
   - **Target:** `apps/desktop/src-tauri/src/commands/mod.rs`
   - **Action:** Enforce that `url` begins with `https://`, `http://`, or `mailto:` before passing to `open::that(&url)`.
   - **Verification:** Add Rust unit tests verifying that `file://` and executable paths return an error.

8. **[REMED-08] Harden Production Tauri CSP (P2)**
   - **Target:** `apps/desktop/src-tauri/tauri.conf.json`
   - **Action:** Configure a strict production CSP restricting frame sources to `https://www.youtube-nocookie.com https://www.youtube.com`.
   - **Verification:** Verify desktop app builds and renders without CSP violations.

---

### Phase 7–8: Focus, Notes & Integrations Polishing
*Focus: Interactive timestamp seeking and branding cleanup.*

9. **[REMED-09] Prune Abandoned `apps/mobile` Workspace (P2)**
   - **Target:** Monorepo root `package.json` and `apps/mobile/`
   - **Action:** Deprecate and remove `apps/mobile` from `workspaces.packages`.
   - **Verification:** Verify `bun install` succeeds with zero references to `@open-sunsama/mobile`.

10. **[REMED-10] Clean Up Legacy Marketing Routes (P3)**
    - **Target:** `apps/web/src/routes/alternative.*.tsx`
    - **Action:** Replace competitor comparison pages with authentic StudyOS student feature overviews.

---

### Phase 9: Production Release Gate Resolution
*Focus: Final gate evaluation and release publishing.*

11. **[REMED-11] Execute Pre-Release Dry Run (Stage A Gate)**
    - Trigger `.github/workflows/release.yml` with `publish_release: false`.
    - Verify that Windows installer (.exe/.msi), Android QA APK, and Web builds complete successfully.
    - Confirm all 11 release invariant checks pass.

12. **[REMED-12] Production Release Approval (Stage B Gate)**
    - Verify production Android keystore secrets in repository secrets.
    - Trigger `release.yml` with `publish_release: true` under manual approval.
    - Confirm release assets, checksums, and release notes attach to one coordinated GitHub Release.
