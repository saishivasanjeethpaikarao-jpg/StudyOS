# StudyOS v1.1.0 Major Release: Mobile Clock Alarms, FocusTube & In-App Auto-Updates

### Release Information
- **Version:** `1.1.0`
- **Release Tag:** `v1.1.0`
- **Build Target:** Android Universal APK, Windows Desktop x64, Web Application

---

### Highlights & What's New in v1.1.0

1. **Native Android Alarm Integration with Study Notes:**
   - Automatically programs the Android native Clock app with the exact study topic or assignment deadline note (`AlarmClock.EXTRA_MESSAGE`, `EXTRA_TITLE`, `EXTRA_TEXT`, `android.intent.extra.alarm.MESSAGE`).
   - Alarms now explicitly state what to study (e.g. `Study: Python OOP: Classes & Instances` or `Due: Week 1 Project: Interactive CLI Unit Converter`).

2. **Smart Auto-Alarm Scheduler & Quick Alarm Bell:**
   - One-tap quick alarm bell directly embedded in the mobile top navigation bar.
   - Background auto-alarm sync that inspects your daily academic schedule and automatically sets alarms for pending tasks and 30 minutes before assignment deadlines.

3. **FocusTube Video Learning Workspace:**
   - Dedicated distraction-free YouTube video player designed for online courses and lecture recordings.
   - Synchronized rich-text note taking directly attached to lecture timestamps.

4. **Silent In-App Auto-Updates for Mobile & Desktop:**
   - Both Windows Desktop and Android mobile now feature live update checking against GitHub Releases.
   - When a new version is published, an update banner appears in-app with one-tap download and installation.

5. **Seamless StudyOS Rebranding with Dual-Persistence:**
   - Full migration of user-facing branding and client configurations to StudyOS.
   - Dual-read/write authentication token handling ensures existing sessions, auth cookies, themes, and offline data are preserved without sudden logouts.
   - Edge-to-edge Android window styling with proper notch/status-bar spacing and native AndroidX back-button navigation.

---

### Platform Packages & Release Assets

| Asset Filename | Target Platform | Description |
| :--- | :--- | :--- |
| `StudyOS.apk` | Android Mobile (Universal) | Native Android APK with Clock Alarm Bridge & FocusTube |
| `StudyOS_1.1.0.apk` | Android Mobile (Universal) | Version-tagged Android APK |
| `StudyOS_Setup.exe` | Windows Desktop (x64 NSIS) | Windows installer with background hotkey daemon |
| `StudyOS_1.1.0_x64-setup.exe` | Windows Desktop (x64 NSIS) | Version-tagged Windows installer |
| `StudyOS_1.1.0_web.zip` | Web Application | Static web bundle distribution |
| `SHA256SUMS.txt` | All Platforms | Cryptographic checksums |

---

### Cryptographic Checksums (SHA-256)
```text
8ae35a5e3f5fe8a82cf518a4d1b8296a1a1db93952f4eb27ef8062f6b8686d14  StudyOS.apk
8ae35a5e3f5fe8a82cf518a4d1b8296a1a1db93952f4eb27ef8062f6b8686d14  StudyOS_1.1.0.apk
d30e871d24b98d2d449bf7a96f37433f37f5ae499e08938edf3620cd5e0bef2c  StudyOS_Setup.exe
d30e871d24b98d2d449bf7a96f37433f37f5ae499e08938edf3620cd5e0bef2c  StudyOS_1.1.0_x64-setup.exe
19c00b08051795cce2491a18da3a2e796032158864fe786c55fb2b23136279f6  StudyOS_1.1.0_web.zip
```
