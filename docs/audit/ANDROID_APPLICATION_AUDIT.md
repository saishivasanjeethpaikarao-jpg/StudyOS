# StudyOS Android Application Audit

## Current design

`apps/expo-mobile/app/_layout.tsx` now renders `StudyOSWebShell` as the sole root screen. `StudyOSWebShell.tsx` loads `https://studyos-web-8ruc.onrender.com`, restores a token from the Expo API/Secure Store layer, handles `studyos://auth/callback`, and injects a JavaScript bridge for auth, Clock, and local notification requests. This reuses the working website rather than duplicating the academic UI.

## What works in code

- Expo Router/native shell and Safe Area wrapper exist.
- Android `studyos://auth/callback` intent filter is present in `app.json`.
- Google mobile handoff is server-mediated and one-time; the native shell exchanges the code and stores the token.
- Back button delegates to WebView history when available.
- Network load errors show a retry UI.
- `expo-secure-store`, `expo-notifications`, and Clock intent code are declared/configured in source.
- `StudyOSWebShell` distinguishes invalid input, unsupported Clock, permission denied, and scheduled notification in several UI messages.

## Blocking findings

1. **Typecheck failure:** current `bunx turbo run typecheck --filter=@open-sunsama/expo-mobile...` fails at `src/lib/notifications.ts` because TypeScript cannot resolve `expo-notifications`; two callback parameters then become implicit `any`. Fix dependency installation/lockfile/workspace resolution before release.
2. **Trusted-origin policy is too broad:** WebView `originWhitelist` allows all HTTP/HTTPS origins even though `isAllowedNavigation()` intends to allow only known origins. Use an exact allowlist and keep external links outside the authenticated WebView.
3. **Mixed content is forced on:** `mixedContentMode="always"` is unsafe and unnecessary for the HTTPS production site. Remove it or use a secure restrictive mode.
4. **Alarm confirmation mismatch:** `alarms.ts` sends `SKIP_UI=true`, but project documentation requires user review (`false`). The result `opened` is treated as “alarm set,” although it only means the intent was delivered.
5. **No device evidence:** installation, Android version compatibility, Google callback, keyboard, status/navigation bars, offline recovery, notification delivery, alarm behavior, restart, and sign-out/re-login were not live-tested here.
6. **Bridge validation:** messages are JSON-parsed and dispatched by `type`, but there is no versioned schema/request ID/result protocol or explicit payload schema validation. Add one before exposing more capabilities.

## Notification model

The current local notification module schedules an Android/iOS notification after requesting permission and uses a StudyOS channel. This is a local scheduled reminder, not a server push and not a Clock alarm. Cancellation searches scheduled notifications by `studyReminderId`, which is appropriate but needs runtime verification and a startup reconciliation policy for changed/deleted reminders.

## Alarm model

`openClockAlarm()` computes hour/minute using the supplied timezone and sends `android.intent.action.SET_ALARM`; `setCountdownTimer()` sends `SET_TIMER`; `openClock()` sends `SHOW_ALARMS`. These are platform intents. The app must communicate that the Clock app was opened/requested and preserve a StudyOS local notification fallback. Do not claim exact alarm permission or persistence from the intent return alone.

## Required acceptance tests

- Fresh install: first launch, permission prompts, login, dashboard.
- OAuth: cold-start callback, warm callback, malformed/replayed/expired callback.
- Session: force close/restart, token restore, sign-out, re-login, account switch.
- WebView: only trusted StudyOS/required auth origins; no mixed content; external links open safely.
- UX: keyboard, safe areas, status/navigation bars, back button, rotation policy, foreground/background/resume.
- Notifications: permission denied/granted, future date, timer, cancellation, reboot/restore behavior.
- Clock: no Clock handler, Clock handler, explicit confirmation, timezone/DST, past time, timer.
- Offline: cached UI, mutation queue, 409 conflict retention, recovery after reconnect.
- Build: Expo export, clean prebuild, signed release APK/AAB, install and launch on a real Android API level supported by the release.