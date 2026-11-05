# StudyOS — Final Remaining Issues & Operational Advisory
**Audit Date:** 2026-11-05  
**Target Repository:** `D:\StudyOS-Project\studyos`  
**Git Branch:** `studyos-development`  
**Phase Target:** Phase 9 (Production Release Readiness)  
**Status:** **ZERO CRITICAL / RELEASE-BLOCKING BUGS REMAIN**

---

## 1. Overview

Following the successful remediation and automated verification of blockers BUG-01 through BUG-08, there are **0 release-blocking software bugs** remaining in the codebase.

The items cataloged below represent operational prerequisites, third-party credentials configuration, and deferred feature roadmaps. None of these prevent building, staging, or executing release candidate builds.

---

## 2. Issues & Operational Prerequisites Register

### ADVISORY-01: Production Telegram Bot Token Configuration
- **Severity:** Operational / Low
- **Category:** Environment Configuration
- **Description:** The Telegram bot endpoints and webhook listeners are fully implemented and verified via automated test suites. However, connecting to live Telegram users requires setting `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, and `TELEGRAM_WEBHOOK_SECRET` in the production environment.
- **Impact:** Telegram bot commands and deep linking operate in synthetic test mode until live credentials from `@BotFather` are provided.
- **Recommended Action:** Provide bot credentials in production `.env` upon deployment.

---

### ADVISORY-02: VAPID Web Push Keys Generation for Production
- **Severity:** Operational / Low
- **Category:** Environment Configuration
- **Description:** Web Push notifications utilize the W3C Push API with VAPID authentication. Test suites execute against mock endpoints. Production deployments require generating a unique VAPID keypair via `web-push generate-vapid-keys`.
- **Impact:** Browser push subscriptions will fail on production domains without valid VAPID keys.
- **Recommended Action:** Run `npx web-push generate-vapid-keys` and set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` on the production server.

---

### ADVISORY-03: Vitest Database Connection Pool Concurrency on Windows
- **Severity:** Low / Test Environment Only
- **Category:** Test Harness Performance
- **Description:** When running all 25 test suites concurrently against a local PostgreSQL instance running inside Docker on Windows, high connection contention can cause multi-query sequential integration tests (such as `study-sessions.test.ts`) to approach Vitest's default 5,000ms timeout.
- **Impact:** Zero impact on production runtime or client builds. Affects only local development test execution if parallel worker count is unconstrained.
- **Recommended Action:** In CI and test scripts, pass `--testTimeout=15000` or configure `testTimeout: 15000` in `vitest.config.ts`.

---

### ADVISORY-04: FocusTube Architectural Deferral
- **Severity:** Advisory / Product Scope
- **Category:** Feature Roadmap
- **Description:** As established in `docs/FOCUSTUBE_ARCHITECTURE_VALIDATION.md`, the proposed FocusTube feature is architecturally validated (YouTube oEmbed, session association, CSP compliance) but strictly deferred to post-Phase 9 to preserve the immutable Phase 0–9 roadmap boundary.
- **Impact:** FocusTube is not included in the Phase 9 production release binary.
- **Recommended Action:** Maintain deferral. Implement post-Phase 9 as a modular plugin.
