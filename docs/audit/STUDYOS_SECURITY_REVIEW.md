# StudyOS — Security & Threat Model Review

**Document Version:** 1.0.0  
**Audit Date:** November 5, 2026  
**Auditor:** Antigravity Engineering  
**Scope:** Authentication, authorization, session management, data encryption, IPC commands, and infrastructure security.

---

## 1. Authentication & Session Management

### 1.1 Password Security
- **Hashing:** Implemented via `bcrypt` / `scrypt` with salt rounds adhering to OWASP guidelines.
- **Enforcement:** Enforces minimum 8 characters with strength validation in [`apps/api/src/validation/auth.ts`](file:///D:/StudyOS-Project/studyos/apps/api/src/validation/auth.ts).
- **Password Reset:** Generates cryptographically secure tokens via `crypto.randomBytes(32).toString('hex')` with 1-hour expiry timestamps.

### 1.2 Session Management & Tokens
- **Web Browser Sessions:** Uses 30-day session tokens stored as SHA-256 hashes in `auth_sessions`.
- **Cookie Security:** Cookies are configured with `HttpOnly: true`, `SameSite: "Lax"`, and dynamic `Secure: true` in production environments.
- **CSRF Protection:** Implements double-submit token validation (`matchesCsrfToken`) verified against the session's SHA-256 hash on all non-safe HTTP methods (POST, PUT, PATCH, DELETE).
- **Mobile/Desktop Auth:** Employs standard JWT Bearer tokens signed with a 32+ character secret, featuring automated single-retry refresh loops on HTTP 401 in `@open-sunsama/api-client`.

---

## 2. Security Vulnerabilities & Findings

### [SEC-01] Missing Rate Limiting on Authentication Routes (Severity: P1)
- **Vulnerability:** Neither `POST /auth/login`, `POST /auth/register`, nor `POST /auth/forgot-password` have rate limiting middleware applied in Hono.
- **Risk:** An attacker can perform automated brute-force attacks against user accounts or spam email delivery mechanisms.
- **Remediation:** Introduce an IP- and user-based sliding window rate limiter (e.g. max 5 login failures per 60 seconds) backed by Redis or an in-memory cache.

### [SEC-02] Unvalidated URL Protocol in Tauri Desktop IPC (Severity: P2)
- **Vulnerability:** `apps/desktop/src-tauri/src/commands/mod.rs` executes `open::that(&url)` on arbitrary string input from the web frontend without checking the protocol scheme.
- **Risk:** If an attacker executes cross-site scripting (XSS) in the webview, they could invoke `open_url("file:///...")` or local system executables.
- **Remediation:** Validate that the protocol begins strictly with `https://`, `http://`, or `mailto:` before passing to `open::that`.

### [SEC-03] Tauri CSP Configured to Null in Development (Severity: P2)
- **Vulnerability:** `apps/desktop/src-tauri/tauri.conf.json` specifies `"security": { "csp": null }`.
- **Risk:** In development or misconfigured production builds, lack of strict CSP allows external scripts or resources to load into the desktop window.
- **Remediation:** Define an explicit production CSP in `tauri.conf.json`:
  ```json
  "security": {
    "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-src https://www.youtube-nocookie.com https://www.youtube.com;"
  }
  ```

---

## 3. Data Isolation & Multi-Tenancy

- **Tenant Boundary Verification:** Every query in academic routes (`/assignments`, `/study-sessions`, `/resources`, `/quizzes`, `/notes`) checks `eq(table.userId, authenticatedUserId)`.
- **SQL Injection Defense:** Drizzle ORM uses parameterized queries exclusively. Raw SQL interpolation uses template tag parameters (`sql\`lower(${users.email}) = ${normalizedEmail}\``) which convert inputs to SQL bind variables (\$1, \$2).
- **API Key Security:** Personal access tokens use an unguessable prefix (`so_live_` / `so_test_`) with secret bytes hashed with SHA-256 prior to database persistence.
- **Integration Credentials:** External OAuth tokens (Google Calendar refresh tokens, Telegram bot tokens, AI API keys) are encrypted at rest using AES-256-GCM (`apps/api/src/services/ai/secrets.ts`) with initialization vectors and auth tags.

---

## 4. File Storage Security

- **Direct Database Storage:** Strictly prohibited; only metadata resides in PostgreSQL.
- **Private S3/R2 Buckets:** Cloudflare R2 / S3 storage keys are isolated per user (`resources/{userId}/{uuid}-{filename}`).
- **Access Control:** Files are streamed through an authenticated route (`GET /resources/:id/file`) verifying ownership before piping the object stream. Direct public bucket access is disabled.
