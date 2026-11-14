# StudyOS Integration Verification Matrix

**Audit date:** 2026-11-07  
**Evidence rule:** code presence is not live verification; statuses below distinguish implemented, tested, skipped, and blocked.

| Integration | Evidence | Current classification | What is verified / missing |
|---|---|---|---|
| Google Authentication | `apps/api/src/routes/google-auth.ts`; web login/native bridge; Expo handoff | PARTIALLY IMPLEMENTED / UNIT TEST BLOCKED | PKCE/state/nonce/ID-token checks and mobile handoff exist. Current API run failed at OAuth `beforeAll` timeout; DB-backed Google tests were skipped. Windows callback receiver is missing in inspected Tauri code. |
| PostgreSQL/Drizzle | `packages/database`, migrations, API routes | IMPLEMENTED / NOT CURRENTLY FULLY VERIFIED | Schema/migration machinery and prior reports exist. Current API run skipped DB-backed tests; no fresh migration run was executed in this audit. |
| Offline sync | `packages/api-client/src/mobile-sync.test.ts`, web queue tests, account sync | UNIT-TESTED | Web suite passed 31/31, including offline queue/conflict tests. Device-level offline behavior not live-tested. |
| Auth rate limiting | API middleware tests | UNIT-TESTED | Rate-limit tests passed in the API run. In-memory/process-local limits should not be described as distributed protection. |
| Google Calendar | API calendar routes/watch service/tests | IMPLEMENTED / PRIOR TEST EVIDENCE | Existing tests and service are present; no live Google credential/webhook test in this audit. |
| Google Drive/storage | storage provider/security tests | UNIT-TESTED / CONFIGURATION DEPENDENT | Existing storage tests passed in the API run. Provider credentials and production tenant behavior not live-tested. |
| YouTube/FocusTube | web FocusTube components and architecture docs | PARTIALLY IMPLEMENTED | UI/integration references exist; no live YouTube playback/device test here. |
| AI providers | `apps/api/src/services/ai`, tests/docs | UNIT-TESTED / CREDENTIAL DEPENDENT | AI unit tests passed in current API run. Provider credentials, quotas, and live fallback behavior not tested. |
| Web Push | API push routes/service worker tests | IMPLEMENTED / UNIT-TESTED | PWA tests passed as part of 31 web tests. VAPID production delivery not live-tested. |
| Email | API email service/auth routes | PARTIALLY IMPLEMENTED / CONFIGURATION DEPENDENT | Code/tests/docs exist; provider delivery and verified sender were not tested. |
| Telegram Bot | integration routes/services/docs | PARTIALLY IMPLEMENTED / MOCKED OR TESTED LOCALLY | Integration tests ran with many skips; no real Telegram webhook/chat ownership test was performed. Do not call live working. |
| Hermes/MCP | `mcp`, API MCP routes/docs | IMPLEMENTED / TYPECHECKED | MCP package typecheck was successful. External client OAuth and production tool calls were not live-tested. |
| Android local notifications | Expo `src/lib/notifications.ts` | BLOCKED | Source/configuration exists, but Expo typecheck fails to resolve `expo-notifications`; no device delivery test. |
| Android Clock alarms | Expo `src/lib/alarms.ts` | IMPLEMENTED / NOT LIVE-VERIFIED | Intent code exists; current `SKIP_UI=true` conflicts with documented confirmation behavior and “opened” is not proof of persisted alarm. |
| Windows Tauri shell | `apps/desktop/src-tauri` | PARTIALLY IMPLEMENTED | Desktop typecheck passed. Native installer/runtime and OAuth callback were not tested. CSP is null despite prior hardening claims. |

## Current test ledger

- Web: **PASS**, 8 files / 31 tests.
- API: **FAIL**, 14 files passed, 1 suite failed at OAuth hook timeout; 144 tests passed, 112 skipped.
- Full typecheck: **FAIL**, Expo `TS2307` for `expo-notifications` plus implicit-any errors; other native packages completed successfully.
- Android release build/install: **NOT RUN / BLOCKED**, no local release APK outputs were present.
- Windows packaged build/login: **NOT RUN / BLOCKED**, no packaged runtime test was performed.
- Live Google/Telegram/Calendar/Drive/AI/email/Push: **NOT RUN**.

## Verification policy

Move an integration to LIVE-TESTED only after a synthetic or dedicated test account performs the real redirect/webhook/provider action without exposing secrets. Keep credentials out of reports and never use real student data.