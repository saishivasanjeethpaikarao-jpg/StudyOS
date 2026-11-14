# StudyOS Platform Failure Analysis

**Audit date:** 2026-11-07  
**Current baseline:** `studyos-development` at `68cb745` / `v1.0.20`

## Executive verdict

The Android direction is technically viable and is already partly implemented as a website WebView shell. It is not release-ready because the current working tree fails Expo typecheck and the native behavior has not been validated on an Android device. The Windows login failure is not repaired by the current repository evidence: the API/web OAuth flow is implemented, but the Tauri shell has no visible deep-link registration or callback event handling, and the desktop Rust entrypoint registers no OAuth callback command/listener.

## Windows failure

**Files:** `apps/desktop/src-tauri/tauri.conf.json`, `apps/desktop/src-tauri/src/lib.rs`, `apps/web/src/lib/native-bridge.ts`, `apps/api/src/routes/google-auth.ts`.

**Actual behavior:** the web login button calls `startGoogleAuth()`. In a native environment the web bridge emits `START_GOOGLE_AUTH`; the current Expo shell validates and opens the browser. The desktop bridge has only `open_url` and desktop detection. Tauri configuration contains no deep-link plugin, URL-scheme registration, or callback listener. Rust setup only creates tray/menu/shortcuts. The API can store a mobile redirect and return a custom-scheme handoff, but there is no demonstrated Windows receiver/exchanger.

**Root cause:** the desktop implementation and the documented deep-link design are out of sync. The browser OAuth callback can work inside a WebView if cookies survive, but the advertised system-browser handoff cannot complete in this Tauri shell. A redirect/callback loss therefore remains the most likely root cause of the reported EXE login failure; exact production failure requires a live EXE trace.

**Security status:** `open_url` in `commands/mod.rs` restricts schemes to `http`, `https`, and `mailto`, which addresses BUG-08’s obvious protocol-injection path. `tauri.conf.json` still has `"csp": null`, so the desktop CSP hardening claim in prior reports is unsupported.

## Android failures and risks

**Files:** `apps/expo-mobile/src/components/StudyOSWebShell.tsx`, `apps/expo-mobile/src/lib/alarms.ts`, `apps/expo-mobile/src/lib/notifications.ts`, `apps/expo-mobile/app.json`.

1. The shell is now a production-site WebView and no longer duplicates the web UI. This is the correct direction.
2. `expo-notifications` is declared in `package.json` and configured in `app.json`, but the current typecheck reports `TS2307 Cannot find module 'expo-notifications'` in `src/lib/notifications.ts`; the installed workspace resolution is inconsistent with the manifest/lockfile.
3. `originWhitelist={['https://*', 'http://*', 'about:*']}` is broader than the `isAllowedNavigation()` predicate. The predicate rejects non-HTTPS external URLs, but the WebView configuration itself does not express a trusted-origin allowlist. This must be narrowed.
4. `mixedContentMode="always"` weakens WebView transport policy and is unnecessary for the production HTTPS app.
5. `SET_ALARM` calls Android `SET_ALARM` with `EXTRA_SKIP_UI=true`, while the project documentation says the user should review/confirm (`false`). The app reports “Study alarm set in Clock” after an intent returns, although an intent result only proves that a Clock activity accepted/opened the request—not that a system alarm was persisted.
6. There is no device/runtime evidence for permission prompts, Android lifecycle, restart, keyboard, back behavior, notification delivery, or deep-link behavior.

## Cross-cutting failures

- The repository contains uncommitted implementation work. Any fix must be rebased against that work, not overwrite it.
- The API test harness still has the known OAuth dynamic-import hook timeout. This blocks a trustworthy API regression result.
- Database-backed API tests are skipped when the expected environment is unavailable; the current run reported 112 skipped tests.
- Prior release documents claim success against older commits and must be versioned/re-run.

## Recommended order

1. Fix Expo dependency/install/typecheck resolution and add bridge schema/type validation tests.
2. Implement and test a real Tauri deep-link receiver, callback parser, one-time handoff exchange, and session restoration.
3. Harden Android trusted origins, remove mixed content, align alarm confirmation/result wording, and add lifecycle tests.
4. Repair the OAuth test harness and run DB-backed tests against a synthetic Postgres database.
5. Build/install each native artifact and execute manual login/restart/sign-out/re-login tests before Phase 9 release approval.