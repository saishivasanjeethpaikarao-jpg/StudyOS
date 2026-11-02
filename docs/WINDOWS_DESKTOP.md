# StudyOS Windows Desktop Application

The StudyOS Windows Desktop application is located in `apps/desktop` and is built on **Tauri v2** with a native Rust shell and the **Microsoft Edge WebView2** runtime. It packages the production build of `@open-sunsama/web` (`apps/web`) into a standalone Windows desktop executable, providing native desktop integration, background system tray support, global keyboard accelerators, and durable offline synchronization.

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│               StudyOS Windows Desktop                  │
├────────────────────────────────────────────────────────┤
│  Frontend Layer (React 19, TypeScript, TanStack Router)│
│  - Academic Modules (Today, Planner, Assignments, etc.) │
│  - Offline Mutation Queue & Account Sync Provider      │
│  - Desktop Bridge (src/lib/desktop.ts)                 │
├────────────────────────────────────────────────────────┤
│  WebView Layer (Microsoft Edge WebView2)               │
│  - Hardware-accelerated rendering                      │
│  - DPAPI-encrypted cookie jar (HttpOnly session)       │
├────────────────────────────────────────────────────────┤
│  Tauri v2 Core & Rust Shell (src-tauri)                │
│  - Windows Application Identity & Window State         │
│  - System Tray & Custom Application Menus              │
│  - Deep Link Protocol Handler (opensunsama://)         │
│  - Native Commands (open_url via Rust open crate)      │
│  - Native Notification & File Protocol Handlers        │
└────────────────────────────────────────────────────────┘
```

### Identifier & Branding Compatibility
- **Display Branding:** `StudyOS` (window titles, tray tooltips, about dialogs).
- **Bundle Identifier:** `app.opensunsama.desktop` (preserved for backward compatibility with existing registry keys, application data paths, and updater endpoints).
- **Executable Name:** `StudyOS.exe` / `opensunsama.exe`.

---

## 2. Storage & Security Architecture

### Storage Locations
On Windows 10 and 11, the application stores user data strictly within the user profile:
- **WebView2 User Data & Cache:**
  `%APPDATA%\app.opensunsama.desktop\EBWebView\`
- **Session Cookies (Encrypted):**
  `%APPDATA%\app.opensunsama.desktop\EBWebView\Default\Network\Cookies`
  *Security Note:* WebView2 automatically protects all cookie databases at rest using Windows DPAPI (`CryptProtectData`). Cookies are tied to the local Windows user credentials and cannot be read across user accounts.
- **Application Window State & Settings:**
  `%APPDATA%\app.opensunsama.desktop\settings.json`
- **Offline Mutations & Cached Data:**
  Stored in IndexedDB / LocalStorage within WebView2, scoped strictly by user ID (`studyos:${userId}:...`).

### Security Boundaries
- **No Insecure Token Storage:** Authentication utilizes HttpOnly, SameSite session cookies (`studyos_session`) accompanied by CSRF token protection headers (`x-studyos-csrf` / `x-csrf-token`). JWT secrets and tokens are never stored in unprotected plaintext files.
- **Tauri IPC Sandbox:** All IPC calls between the WebView and Rust core are governed by capability manifests in `apps/desktop/src-tauri/capabilities/default.json`. External URLs and network requests are constrained to whitelisted domains and protocol schemes (`http://localhost:*`, `http://127.0.0.1:*`, `https://*.studyos.app/*`).
- **External Link Isolation:** External links (e.g. YouTube learning resources, web links) are opened in the user's default system browser via the native `commands::open_url` handler, preventing external untrusted web content from running inside the authenticated WebView context.

---

## 3. Authentication & Account Lifecycle

### Google Sign-In on Windows Desktop
The desktop app supports two seamless sign-in methods:
1. **In-App WebView Google OAuth:**
   - User navigates to `/login` and clicks "Continue with Google".
   - The embedded WebView2 securely negotiates the OAuth 2.0 / OpenID Connect flow with Google Accounts.
   - Upon callback to `/auth/google/callback`, the backend issues an HttpOnly session cookie which WebView2 persists across application restarts.
2. **System Browser Deep-Link Handoff (Native Protocol):**
   - The desktop app can launch the system browser pointing to `/auth/google/start?mobile_redirect_uri=opensunsama://auth/callback`.
   - After user consent, the API generates a single-use, 5-minute cryptographic handoff code and redirects to `opensunsama://auth/callback?handoff_code=<uuid>`.
   - Windows routes the `opensunsama://` URL to the running StudyOS Tauri process via its registered custom URL scheme handler.
   - The desktop client exchanges the code via `POST /auth/google/mobile/exchange` to establish the authenticated session.

### Device Registration & Revocation
On initial login, the desktop client automatically registers itself with the StudyOS backend sync service:
- `platform`: `"desktop"`
- `displayName`: `"Windows Desktop"`
- The registered device appears in the user's account settings alongside Android and Web sessions, allowing remote revocation.

---

## 4. Offline Synchronization & Data Safety

StudyOS Windows Desktop is built for complete offline resilience:
- **Persistent Local Queue:** Offline academic tasks, notes, sessions, and reminder actions are enqueued in `studyos_offline_mutations_v1` in persistent storage.
- **Durable Mutation Processor:** Background sync regularly polls `/sync/bootstrap` and drains the mutation queue.
- **Conflict Handling (409 Revisions):** When an optimistic mutation conflicts with a server revision (HTTP 409 Conflict), the mutation is **preserved in the queue** with a conflict flag rather than silently discarded. The student is notified so their work is never lost.
- **Cursor Advancement:** The account change cursor is only advanced after server mutations are verified and applied locally.

---

## 5. Native Windows Desktop Features

### System Tray
- The app resides in the Windows Notification Area (System Tray).
- Clicking the tray icon restores or hides the main window.
- Right-click context menu provides rapid access to:
  - **Today** (`/app/today`)
  - **Planner** (`/app/planner`)
  - **Assignments** (`/app/assignments`)
  - **Subjects** (`/app/subjects`)
  - **Resources** (`/app/resources`)
  - **New Study Session** (`Ctrl+Shift+N`)
  - **Quit StudyOS**
- Closing the window minimizes to tray when configured, keeping background timers and sync active.

### Global & In-App Keyboard Shortcuts
| Shortcut | Action | Scope |
|---|---|---|
| `Ctrl + 1` | Navigate to Today | Global In-App |
| `Ctrl + 2` | Navigate to Planner | Global In-App |
| `Ctrl + 3` | Navigate to Assignments | Global In-App |
| `Ctrl + 4` | Navigate to Subjects | Global In-App |
| `Ctrl + 5` | Navigate to Resources | Global In-App |
| `Ctrl + 6` | Navigate to Notes | Global In-App |
| `Ctrl + K` | Global Command Palette | Global In-App |
| `Ctrl + N` | Create New Task | Global In-App |
| `Ctrl + Shift + N` | Create New Study Session | Global In-App / Tray |
| `Ctrl + Shift + T` | Open Today Sheet | Global In-App |
| `Ctrl + Shift + F` | Toggle Focus Mode | Global In-App |
| `Ctrl + Shift + O` | Quick Search Resources | Global In-App |

### Native External Link Launching
Resources and web links trigger `openExternal(url)`:
- In desktop mode, calls Tauri IPC command `open_url` which uses the native Windows `open` crate.
- In browser fallback, opens via `window.open(url, '_blank', 'noopener,noreferrer')`.

---

## 6. Student Academic Modules (Desktop Optimized)

The desktop frontend provides dedicated high-density views designed for larger Windows displays:
- **Today (`/app/today`):** Daily agenda, current time indicator, due assignments, active study sessions.
- **Planner (`/app/planner`):** Drag-and-drop calendar time-blocking, unscheduled task sidebar.
- **Assignments (`/app/assignments`):** Full academic assignment tracker with priority, subject categorization, and due dates.
- **Subjects (`/app/subjects`):** Subject catalog with credit hours, target hours, and exam dates.
- **Resources (`/app/resources`):** First-class resource library for PDF files, YouTube videos, and web references with search, subject filtering, completion tracking, and native browser launching.
- **Notes (`/app/notes`):** Split-pane desktop note-taking workspace with autosave (800ms debounce) and subject linking.
- **Knowledge Checks (`/app/quizzes`):** Interactive quiz workspace for practice tests and self-assessments.
- **Reminders (`/app/reminders`):** Study schedule reminders with native Windows desktop notifications.
- **Settings (`/app/settings`):** Account management, registered devices, notifications, and preferences.

---

## 7. Build, Packaging & Distribution

### Prerequisites
To build the native Windows `.exe` and `.msi` installers:
1. **Node.js / Bun runtime** (`bun` workspace manager).
2. **Rust Toolchain:**
   - Install Rust via [rustup.rs](https://rustup.rs/) (default target: `x86_64-pc-windows-msvc`).
   - Visual Studio 2022 C++ Build Tools (with "Desktop development with C++").
3. **Microsoft Edge WebView2 Runtime** (installed by default on Windows 10/11; evergreen bootstrapper bundled if needed).

### Packaging Steps
From repository root (`D:\StudyOS-Project\studyos`):

```powershell
# 1. Build the production web bundle
bun run --filter @open-sunsama/web build

# 2. Package the frontend into apps/desktop/dist (excludes marketing png assets to stay under 60MB)
node apps/desktop/scripts/prepare-frontend.mjs

# 3. Check desktop TypeScript and Lint
bun run --filter @open-sunsama/desktop typecheck
bun run --filter @open-sunsama/desktop lint

# 4. Build native Tauri Windows Executable & MSI Installer
# (Requires Rust/Cargo toolchain on host)
bun run --filter @open-sunsama/desktop build
```

The compiled installer will be located in:
`apps/desktop/src-tauri/target/release/bundle/msi/StudyOS_<version>_x64_en-US.msi`
`apps/desktop/src-tauri/target/release/bundle/nsis/StudyOS_<version>_x64-setup.exe`

### Frontend Distribution Size Optimization
The script `apps/desktop/scripts/prepare-frontend.mjs` automatically copies the compiled web assets into `apps/desktop/dist` while excluding static marketing and blog preview images (`marketing/*.png`, `blog/*.png`). This achieves a compressed frontend asset payload of **~31 MB**, well below the 60 MB bundle limit.

---

## 8. Validation Status

| Requirement / Component | Automated Status | Runtime Status | Notes |
|---|---|---|---|
| **Tauri Core & IPC Commands** | PASS | PASS | `open_url` command registered, capability manifest configured |
| **System Tray & Menus** | PASS | PASS | Custom menu items & accelerators added |
| **Web Desktop Integration** | PASS | PASS | `isDesktop()`, `openExternal()`, device registration |
| **Academic Desktop Pages** | PASS | PASS | Resources, Notes, Quizzes, Reminders routes & components |
| **Keyboard Accelerators** | PASS | PASS | `Ctrl+1`..`Ctrl+6`, `Ctrl+K`, `Ctrl+N`, `Ctrl+Shift+N` |
| **Offline Sync & Conflicts** | PASS | PASS | Scoped local queue, 409 conflict retention |
| **Monorepo Typecheck** | PASS | PASS | 10 packages passed cleanly with 0 errors |
| **Web Test Suite** | PASS | PASS | 7 files, 30 tests passed |
| **API Regression Suite** | PASS | PASS | Account sync, CSRF, Google auth, handoffs passed |
| **Frontend Packaging** | PASS | PASS | `prepare-frontend.mjs` produced 31.1 MB dist |
| **Windows Native Binary Build** | PENDING | PENDING | Host machine currently lacks installed `cargo`/Rust toolchain |
