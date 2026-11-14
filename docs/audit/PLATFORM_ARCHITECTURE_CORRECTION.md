# StudyOS Platform Architecture Correction

## Decision

Keep the existing web app as the canonical UI and business-logic surface. Keep Android as a minimal Expo/React Native shell around that UI. Keep Windows as a Tauri shell around the built web app. Do not create separate platform databases, account systems, or duplicated academic business logic.

## Target architecture

```text
Web React app
  ├─ API client + auth/session + offline sync
  ├─ browser capability adapters
  └─ typed StudyOS native capability adapter
       ├─ Expo WebView message boundary -> Android native services
       └─ Tauri commands/events -> Windows native services

Hono API + Drizzle/PostgreSQL
  ├─ browser OAuth session
  ├─ mobile/desktop one-time handoff
  ├─ user-scoped data and revisions
  └─ integrations
```

## Windows correction

Add the official Tauri deep-link capability/plugin appropriate for Tauri v2 and register the production scheme(s) explicitly in the Windows bundle. On startup and while running, subscribe to URL-open events. Accept only `studyos://auth/callback` (and only a deliberately retained legacy alias if required). Parse the one-time handoff code, reject duplicate/expired/malformed values, exchange it through the API, seed the web session, and navigate to `/app`. Keep PKCE, state, nonce, ID-token verification, and client secrets server-side. Store the resulting web session through the existing WebView cookie/session mechanism; do not write access or refresh tokens to plaintext files.

Add Rust/TypeScript tests for scheme/path/parameter allowlists and a Windows manual test matrix: cold-start callback, warm callback, browser cancellation, expired code, restart, sign-out, and re-login.

Set an explicit production CSP in `tauri.conf.json`, preserving required API/WebSocket/YouTube sources and rejecting arbitrary frames/scripts. Reconcile the capability manifest with actual allowed network origins.

## Android correction

Retain `StudyOSWebShell`. Replace the ad hoc message object with a versioned protocol such as `{version: 1, type, requestId, payload}`. Validate every message with a Zod/schema guard, enforce trusted origin and expected payload ranges, and return success/failure results to the page. Do not expose arbitrary native commands.

Restrict navigation to the exact StudyOS web origin, API origin where required, the explicitly required Google auth origins, `about:blank`/internal data only when justified, and the registered callback scheme. Remove `mixedContentMode="always"`; use HTTPS-only behavior in production. Do not use a wildcard WebView origin whitelist.

Use Secure Store only for the short-lived/session token material already required by the mobile architecture. Clear it and clear web storage on sign-out/account switch. Handle app foreground/background and reload bootstrap deterministically.

## Native capabilities

Required Android bridge capabilities are limited to:

- Google browser handoff start and callback completion.
- Secure token set/clear.
- Local scheduled notifications: permission, schedule, update/cancel, and result.
- Clock intents: open Clock, request alarm, request timer; report `opened`, `unsupported`, `invalid`, and never imply persistence unless verified.
- Deep-link routing and lifecycle signals.

The bridge must not provide arbitrary URL opening, arbitrary JavaScript evaluation, shell commands, database access, or unrestricted external-origin access.

## Notification and alarm semantics

Server/Web Push/Telegram notifications are separate from local Android notifications. A local notification is scheduled on-device and may work offline. A system Clock alarm is an Android intent handoff; it is not proof that an alarm exists unless the Clock app confirms it. StudyOS should persist the study session first, request a local reminder when permitted, then optionally open Clock with `EXTRA_SKIP_UI=false` for user confirmation. UI copy must distinguish “Clock opened/requested” from “notification scheduled.”

## Phase mapping under the binding Phase 0–9 scope

- Phase 0: discovery, architecture decisions, provenance, and audit evidence.
- Phase 1: preserve the existing academic web domain/features.
- Phase 2: shared API, token/session, offline queue, 409 conflict preservation, multi-device sync.
- Phase 3: Android WebView shell, bridge, notifications, Clock intents, lifecycle/deep links.
- Phase 4: deployment/configuration/secrets/migration verification.
- Phase 5: Telegram integration verification.
- Phase 6: Google/Drive/YouTube/resource integration verification.
- Phase 7: AI provider integration verification.
- Phase 8: Hermes/MCP bridge verification.
- Phase 9: final focus/polish plus production release gate, per the supplied mission.

The repository’s separate Phase 10 release label conflicts with the mission and must not be used to expand scope.