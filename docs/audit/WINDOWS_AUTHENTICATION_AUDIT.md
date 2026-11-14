# StudyOS Windows Authentication Audit

## Scope and conclusion

The current code contains a secure server-side Google OAuth foundation, but the Windows EXE end-to-end login path is not proven and the system-browser callback path is incomplete in the Tauri shell. Do not call Windows Google login fixed until a packaged EXE passes the cold-start and warm-start callback tests.

## Flow trace

| Step | Current evidence | Status |
|---|---|---|
| Open EXE | `apps/desktop/src-tauri/tauri.conf.json` packages `../dist`; Tauri v2 shell exists. | Implemented, not runtime-tested here |
| Click Google | `apps/web/src/routes/login.tsx` calls `startGoogleAuth(API_BASE_URL)`. | Implemented |
| Native dispatch | `apps/web/src/lib/native-bridge.ts` calls `StudyOSNative.startGoogleAuth` only if supplied; otherwise browser navigation. | Partial: no desktop implementation found |
| PKCE/state/nonce | `apps/api/src/routes/google-auth.ts:start` stores hashes/transaction, sets PKCE cookie, sends S256 challenge. | Implemented; API tests blocked by hook timeout |
| Google callback | API validates state transaction, verifier, Google ID token issuer/audience/email/nonce/expiry. | Implemented in code |
| Desktop callback return | `lib.rs` registers tray/menu/shortcut and commands; no deep-link URL event/plugin/listener is present. | Blocking gap |
| Handoff exchange | API has `POST /auth/google/mobile/exchange`; Expo calls it, but a desktop caller is not present in inspected files. | Implemented for mobile; missing desktop integration |
| Session restore | Web auth reads token/local profile and calls `/auth/me`; desktop docs claim HttpOnly WebView cookies. | Browser-session path exists; packaged EXE proof absent |
| Sign-out/re-login | Web auth clears token/profile/cache and notifies native bridge. | Implemented in web; desktop runtime untested |

## Root cause assessment

The primary actionable root cause is callback ownership. `tauri.conf.json` has no URL-scheme registration or deep-link plugin configuration, `src-tauri/src/lib.rs` has no URL-open event handling, and `apps/desktop/src/index.ts` exposes only `isDesktop` and `openExternal`. Therefore a system-browser OAuth flow returning to a custom URI has no demonstrated receiver. The older `docs/WINDOWS_DESKTOP.md` describes `opensunsama://` handoff support, but the current implementation evidence does not match that description.

A secondary issue is architectural ambiguity: the web app’s native bridge is written for React Native (`ReactNativeWebView`) and generic `StudyOSNative`; desktop uses Tauri IPC but does not inject an equivalent `StudyOSNative` adapter. This means desktop Google login falls back to normal WebView navigation, which may work only if Google allows the embedded flow and the configured redirect/cookies match.

## Security findings

Positive: PKCE is not disabled; state and nonce are hashed server-side; Google ID tokens are verified; client secret use is server-side; no token logging was observed in the callback catch block. `open_url` rejects non-HTTP(S)/mailto schemes.

Gap: Tauri CSP is explicitly `null` in `tauri.conf.json`. The desktop documentation claims hardened CSP, but the current config does not support that claim. Deep-link input must be parsed with exact scheme/host/path and single-use code validation.

## Required fix

1. Register the official Tauri deep-link mechanism and `studyos://auth/callback` (plus any necessary legacy alias) in the Windows bundle.
2. Subscribe to callback events before the main window is shown and handle both cold-start argv/event delivery and warm-running events.
3. Validate exact URI structure and exchange only the one-time code through the API.
4. Deliver the resulting authenticated state to the web app without exposing tokens to logs or untrusted pages.
5. Add explicit CSP and align capability/network allowlists.
6. Add automated parser tests and packaged-EXE manual tests.

## Acceptance tests

- Fresh install, cold-start custom URI, Google success, dashboard.
- Running EXE, browser callback, dashboard without duplicate windows.
- Cancelled Google flow and provider error.
- Invalid scheme/host/path/query rejected.
- Expired and replayed handoff rejected.
- Close/reopen restores session.
- Sign out removes session and re-login succeeds.
- No access/refresh token in logs or settings files.