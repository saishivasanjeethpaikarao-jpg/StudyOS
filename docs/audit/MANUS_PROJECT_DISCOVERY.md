# StudyOS Project Discovery

**Audit date:** 2026-11-07  
**Repository:** `D:\StudyOS-Project\studyos`  
**Branch / HEAD:** `studyos-development` / `68cb745` (`v1.0.20`)  
**Scope:** repository discovery only; no source changes were made by this audit.

## Executive finding

StudyOS is an existing Bun monorepo whose primary application is a React 19 + TypeScript + Vite web app. The backend is a Hono/TypeScript API using Drizzle ORM and PostgreSQL. Windows is a Tauri v2/Rust shell packaging the web build in Microsoft Edge WebView2. Android is an Expo SDK 54/React Native shell that now loads the production website in `react-native-webview` and exposes a small JavaScript-to-native bridge.

The working tree was not clean before the audit. Existing changes were preserved. The modified set includes `apps/api/src/routes/google-auth.ts`, many web authentication/bridge files, Expo routes/configuration/alarm files, release scripts, and new Expo/WebView/notification/test files. These are user changes and must be reviewed before any implementation commit.

## Repository structure and stack

| Area | Evidence | Finding |
|---|---|---|
| Package manager | root `package.json`, `bun.lock` | Bun `1.4.2`; workspaces are `apps/*`, `packages/*`, and `mcp`. |
| Orchestration | `turbo.json` | Turborepo tasks for build, test, lint, typecheck, database, and platform builds. |
| Web | `apps/web/package.json` | React 19, Vite 6, TanStack Router/Query, TypeScript, Vitest. |
| API | `apps/api/package.json` | Hono/TypeScript API, Vitest, Drizzle-backed services. |
| Database | `packages/database` | Drizzle ORM/Kit, PostgreSQL drivers, SQL migrations and snapshots. |
| Shared code | `packages/api-client`, `types`, `utils` | Shared API client, domain types, validation/date/error utilities, sync tests. |
| Windows | `apps/desktop` | Tauri v2 Rust shell, WebView2 frontend, tray, notifications, shortcuts, store. |
| Android | `apps/expo-mobile` | Expo Router, React Native 0.81, WebView, Secure Store, notifications, deep-link scheme. |
| Legacy mobile | `apps/mobile` | Separate Tauri mobile workspace remains present and referenced by the root workspace/tasks. It is not the selected Expo Android shell. |
| Integrations | API routes/services and `mcp` | Google Auth/Calendar/Drive, Telegram, AI providers, Web Push, email, MCP/Hermes-related tooling, FocusTube/YouTube. |

## Current architecture

The web app is the shared feature and business UI. It obtains API access through `apps/web/src/lib/api.ts`, stores the web token/session state through the auth layer, and exposes optional native actions through `apps/web/src/lib/native-bridge.ts`. The desktop shell packages the built web output; its native Rust commands are registered in `apps/desktop/src-tauri/src/lib.rs`. The Expo shell boots `StudyOSWebShell` from `apps/expo-mobile/app/_layout.tsx`, seeds the web app with a Secure Store token, handles `studyos://auth/callback`, and translates typed-enough message names into Clock/notification/auth actions.

The backend Google flow in `apps/api/src/routes/google-auth.ts` uses a database transaction record, state/nonce hashes, PKCE S256, Google token exchange, ID-token verification, and an optional mobile handoff code. The web browser flow returns to the configured web origin. The mobile flow returns to `studyos://auth/callback` and exchanges a one-time code.

## Roadmap evidence

`StudyOS_A_to_Z_Master_Spec/24_BUILD_ROADMAP.md` contains Phases 0–9 plus a Phase 10 labelled Release. This conflicts with the supplied mission, which is binding for this task: Phase 9 is Production Release and no Phase 10 may be created. The implementation plan in this audit maps work into the existing 0–9 scope and recommends correcting the roadmap document’s label before release governance.

## Existing audit claims versus current evidence

The older `docs/audit/PHASE_9_RELEASE_READINESS.md` claims 98/100 readiness, 256/256 API tests, 30/30 web tests, and a passing monorepo typecheck. Those claims are dated 2026-11-05 and baseline an older commit. Current execution on the working tree produced 31/31 web tests, but the API suite failed with an OAuth hook timeout and reported 112 skipped database-backed tests; full typecheck failed because `expo-notifications` could not be resolved in the Expo package. The old report must therefore not be treated as current release evidence.

## Discovery limitations

No authenticated live web, Google, Android-device, Windows-installer, or production-backend test was performed in this audit. No release artifact was present under the local Android output paths. CI workflow definitions were inspected, but a GitHub run was not executed here. Findings marked “implemented” mean code/configuration exists, not that a live platform flow is verified.