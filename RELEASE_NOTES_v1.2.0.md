# StudyOS v1.2.0: Telegram Bot Integration, Phone Clock Alarms & Seamless In-App Auto-Updates

### 🚀 Highlights & New Features

- **📱 Deep Telegram Bot Integration**:
  - Full mobile & desktop integration with the StudyOS Telegram Bot (`@StudyOS_bot`).
  - Interactive QR code in Settings & Mobile Top Bar for instant 1-tap connection.
  - Send `/task`, `/schedule`, `/alarm`, `/focus` directly from Telegram; auto-syncs with StudyOS calendar.

- **⏰ Native Clock App & Alarm Manager**:
  - Study sessions and time blocks automatically set hardware alarms directly into your phone's Clock app (`AlarmClock.ACTION_SET_ALARM`).
  - Alarms include clear task notes (`Study: <Subject> - <Task>`).
  - Deep system integration with hardware timers and Android AlarmManager.

- **🔄 Automatic In-App Updates**:
  - In-app update banner and interactive modal prompt whenever a new release is available.
  - Direct 1-tap download & install on Android (`StudyOS.apk`) and Windows (`StudyOS_Setup.exe`).
  - Background version checking against GitHub Releases API and fallback production endpoints.

- **🔐 Seamless Cross-Platform Google Sign-in**:
  - Native system browser OAuth flow with deep linking (`studyos://auth/callback`).
  - One-time mobile handoff token exchange for instant sign-in without embedded webview security restrictions.

- **🎨 Unified Brand & Polished UI**:
  - Eliminated all legacy brand names across all templates, tutorials, and videos.
  - Updated video demonstrations and mobile layout with native back-button navigation support.

---

### 📦 Release Binaries

| Asset | Platform | Description |
|---|---|---|
| **`StudyOS.apk`** | Android 8.0+ (Universal) | Fresh v1.2.0 Android release with Telegram bot, Clock alarms & auto-updater |
| **`StudyOS_1.2.0.apk`** | Android 8.0+ (Versioned) | Version-pinned APK mirror |
| **`StudyOS_Setup.exe`** | Windows 10/11 (x64) | Desktop installer setup |
| **`StudyOS_1.2.0_x64-setup.exe`** | Windows 10/11 (x64) | Version-pinned desktop setup mirror |
| **`StudyOS_1.2.0_web.zip`** | Web / Static | Web production build bundle |
| **`SHA256SUMS.txt`** | All | Cryptographic checksums for verifying binary integrity |
