# StudyOS Android Development

The Android client lives in `apps/expo-mobile` and uses Expo Router, React Native, the shared `@open-sunsama/api-client`, and the Phase 4 account/sync protocol. The native package identity remains the inherited `app.opensunsama.mobile` for upgrade compatibility; the visible product name is StudyOS.

## Local Development & Setup

### Prerequisites
- Node.js / Bun runtime (`bun` is the workspace package manager).
- Docker for PostgreSQL (`docker compose up -d postgres`).
- Android SDK / platform-tools (`adb`, Android SDK 34+).
- Expo CLI (`bunx expo`).

### 1. Start Database & Backend API
From repository root:
```sh
# Start PostgreSQL container on port 5431
docker compose up -d postgres

# Start API in development mode
bun run --filter @open-sunsama/api dev
```

### 2. Start Expo Mobile App
```sh
bun run --filter @open-sunsama/expo-mobile dev
```

### 3. Network Configuration for Emulators & Physical Devices
- Set `EXPO_PUBLIC_API_URL` to the reachable backend URL:
  - **Android Emulator (default):** `http://10.0.2.2:3000` (points to host machine loopback).
  - **Physical Device:** `http://<LAN_IP>:3000` (ensure host firewall allows inbound connections on port 3000).
- Deep Link Scheme: `opensunsama://` is configured in `app.json`.

---

## Authentication & Account Lifecycle

### Single-Use Google Mobile Handoff Flow
Native Android sign-in avoids client-side Google secrets and uses a secure server-mediated PKCE/OIDC handoff:
1. Student taps "Continue with Google" in `apps/expo-mobile/app/(auth)/login.tsx`.
2. The app invokes `WebBrowser.openAuthSessionAsync(...)` targeting:
   `GET /auth/google/start?mobile_redirect_uri=opensunsama://auth/callback`
3. The server validates that `mobile_redirect_uri` matches an allowed URI (configured via `MOBILE_OAUTH_REDIRECT_URIS` or `opensunsama://auth/callback`), stores it in the OAuth session transaction, and redirects to Google Accounts.
4. Upon user approval, Google redirects back to `GET /auth/google/callback`.
5. The API detects the stored mobile redirect URI:
   - Creates a cryptographically random, single-use handoff code in `mobile_auth_handoffs` (5-minute TTL).
   - Issues an HTTP 302 redirect to `opensunsama://auth/callback?handoff_code=<uuid>`.
6. Expo captures the deep link response via `WebBrowser.openAuthSessionAsync` (or `Linking` listener).
7. The mobile client submits the code to `POST /auth/google/mobile/exchange` with `{ handoffCode }`.
8. The API validates the code atomically:
   - Deletes the code record immediately to enforce single-use replay prevention.
   - Verifies the code has not expired.
   - Returns `{ token, user }`.
9. The mobile app stores the JWT token in `expo-secure-store` under key `open_sunsama_token` and registers the Android device via `POST /sync/devices/register`.

### Account Isolation & Switching
- Local offline data in `AsyncStorage` is scoped strictly by user ID using the key template `studyos:${userId}:...`.
- On logout or account switch, the active cache is cleared from memory, preventing any cross-account data leakage.

### Environment Variables
Configure on backend (`apps/api/.env`):
- `GOOGLE_CLIENT_ID`: Google OAuth Web/Android Client ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret.
- `GOOGLE_REDIRECT_URI`: Web callback URL (e.g. `http://localhost:3000/auth/google/callback`).
- `MOBILE_OAUTH_REDIRECT_URIS`: Comma-separated allowed deep links (e.g. `opensunsama://auth/callback`).

---

## Offline Synchronization Protocol

The mobile app implements a durable local-first architecture:

1. **Persistent Local Cache:**
   - Tasks, study sessions, assignments, notes, and academic resources are stored in `AsyncStorage` under `studyos:${userId}:cache`.
   - The last synced cursor is persisted under `studyos:${userId}:cursor`.

2. **Durable Mutation Queue:**
   - When offline or when mutations fail, actions (creating tasks, completing sessions, updating assignments) are enqueued in `AsyncStorage` under `studyos:${userId}:mutation_queue`.
   - Each mutation contains `{ id, entityType, action, payload, clientMutationId, baseRevision }`.

3. **Reconciliation & Replay:**
   - When network connectivity is established or the app returns to foreground, the queue is drained via `POST /sync/mutations`.
   - On `409 Conflict` (revision mismatch), the conflict is recorded in telemetry and pruned from the queue to prevent queue deadlocks, allowing downstream pull-sync to reconcile state.

4. **Safe Cursor Advancement:**
   - Downstream changes are polled via `GET /sync/changes?sinceCursor=<cursor>&limit=50`.
   - Incoming server changes are applied to local state, React Query cache is invalidated, and **only then** is the sync cursor advanced and saved to storage.

---

## Android Clock Integration

StudyOS respects Android system platform conventions for alarms:
- System alarms are handled via Android Intent `android.intent.action.SET_ALARM` (`AlarmClock.ACTION_SET_ALARM`).
- Key extras sent:
  - `EXTRA_HOUR`: Hour in session timezone (0-23).
  - `EXTRA_MINUTES`: Minute in session timezone (0-59).
  - `EXTRA_MESSAGE`: Academic session label (e.g., `StudyOS: Calculus Problem Set`).
  - `EXTRA_SKIP_UI`: `false` so the student can review and confirm the alarm in their preferred Clock app.
- Clock app access:
  - `ACTION_SHOW_ALARMS` (`android.intent.action.SHOW_ALARMS`) allows one-tap opening of the system Clock app from Settings.
  - If no Clock app is installed or intent launching fails, the app catches the error and keeps internal StudyOS reminder notifications active without falsely claiming a system alarm was set.

---

## Validation & Build Commands

Run all verification checks before submitting PRs or native builds:

```sh
# 1. Mobile Typecheck
bun run --filter @open-sunsama/expo-mobile typecheck

# 2. Mobile Linting
bun run --filter @open-sunsama/expo-mobile lint

# 3. Android Hermes Bundle Export (Validates Metro bundling and native assets)
cd apps/expo-mobile
bunx expo export --platform android

# 4. API Authentication & Sync Tests
bun run --filter @open-sunsama/api test src/routes/google-auth.test.ts
bun run --filter @open-sunsama/api test src/routes/account-sync.test.ts

# 5. API Client Tests
bun run --filter @open-sunsama/api-client test

# 6. Monorepo Full Typecheck
bun run typecheck

# 7. Production Web Build (Regression Verification)
bun run --filter @open-sunsama/web build
```
