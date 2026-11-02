# Phase 8 — Integrations & Agent Architecture

StudyOS Phase 8 establishes a unified, account-scoped integration framework connecting students with external productivity ecosystems (Google Calendar, Google Drive, Telegram), advanced AI runtimes (Hermes Agent), and the Model Context Protocol (MCP), while maintaining strict data boundaries, encryption, and student autonomy.

---

## 1. Core Principles & Security Architecture

1. **User Control & Optionality:**
   - Every integration is optional and defaults to disconnected.
   - Disconnecting or disabling an integration revokes access and deletes stored tokens without affecting core academic planning or task execution.
2. **Account Scoping & Tenant Isolation:**
   - All connection tokens, settings, links, and agent proposals belong exclusively to the authenticated `user_id`.
   - Multi-tenant boundary tests verify that User B cannot access, read, or trigger User A's connections, proposals, or automations (HTTP 404).
3. **AES-256-GCM Secret Encryption:**
   - Provider tokens, webhook secrets, and bot credentials are encrypted at rest using AES-256-GCM authenticated encryption (`apps/api/src/services/integrations/credentials.ts`).
   - Ciphertext tampering, truncated auth tags, or mismatched keys trigger immediate decryption failure.
   - API endpoints never return plaintext tokens or secrets to web/mobile clients; secrets are returned masked (e.g., `••••••••1234`).
4. **Canonical Source of Truth:**
   - The StudyOS database remains the single authoritative source of truth. External agents or calendars never silently mutate or overwrite academic entities without explicit student validation.

---

## 2. Google Calendar Integration

The Google Calendar integration bridges StudyOS planned sessions with the student's personal calendar.

- **Scope:** `https://www.googleapis.com/auth/calendar.events`
- **Session Export & Dual-Verification Ownership:**
  - Planned study sessions can be selectively or automatically exported to a dedicated or primary calendar.
  - Exported calendar events contain a persistent metadata tag in the description: `[studyos_session:${sessionId}]`.
  - Incremental updates inspect existing events using substring tag matching (`like`) and cross-reference `integration_audit_logs` for audited `external_event_id` links.
  - Ownership is verified against `calendarEvents.userId = userId` and `integrationAuditLogs.userId = userId` to ensure unrelated personal events are never deleted or modified.
- **Change & Cancellation Handling:**
  - Rescheduling a session updates the start/end time of the matching external event.
  - Deleting or cancelling a study session removes or cancels the corresponding calendar event without affecting non-StudyOS calendar entries.

---

## 3. Google Drive Integration

The Google Drive integration enables academic resource ingestion into StudyOS.

- **Scope:** `https://www.googleapis.com/auth/drive.readonly`
- **Client Isolation:**
  - The client UI (web/mobile) never directly receives or holds Google OAuth access tokens for Drive.
  - Browsing and searching folder hierarchies occurs via authenticated API proxy: `GET /integrations/google/drive/files`.
- **Safe Resource Ingestion Pipeline:**
  - Filenames are sanitized via `path.basename` and regex stripping to protect against path traversal attacks.
  - MIME types are strictly validated against `ALLOWED_ATTACHMENT_TYPES` (plus Markdown). Unsupported binaries and executables are rejected with an error.
  - Size limits (max 10 MB per file) are enforced before and during streaming.
  - Validated files are stored in StudyOS S3-compatible cloud storage, creating canonical `resources` records linked to the student's subjects and assignments.

---

## 4. Telegram Bot Integration

StudyOS connects with Telegram to deliver student notifications, study session alerts, and conversational status queries.

- **Linking Protocol & Chat Disassociation:**
  - Authenticated students generate a short-lived (15-minute) one-time cryptographic code via `POST /integrations/telegram/link-code`.
  - The student sends `/start <CODE>` to the official StudyOS Telegram bot.
  - The webhook handler verifies the code, stores the chat ID, and marks the request as consumed to prevent replay.
  - Multi-Account Protection: Linking a `chatId` automatically disassociates any previous user account linked to that same chat ID, preventing cross-account notification leakage.
- **Bot Commands:**
  - `/start [code]` — Connect StudyOS account.
  - `/today` — Overview of today's planned study sessions, assignments due, and focus targets.
  - `/assignments` — List upcoming assignments and due dates.
  - `/help` — Overview of available commands and bot features.
- **Notification Controls & Timezone-Aware Quiet Hours:**
  - Students configure preferences per notification channel.
  - Quiet hours (e.g. 22:00 to 07:00) are evaluated against the student's canonical timezone (`users.timezone`), including overnight spans across midnight.
  - Outbound alerts are suppressed during quiet periods and logged in `integration_audit_logs`.

---

## 5. Hermes Agent Integration

Hermes Agent (`hermes-agent`) is an optional external advanced reasoning runtime. StudyOS provides a secure bridge for academic workflows while enforcing a hard human-in-the-loop safety boundary.

- **Scoped Authentication:**
  - Students generate a dedicated agent bridge token via `POST /integrations/agent/tokens`.
  - Tokens use the prefix `so_agent_` followed by a cryptographically secure 256-bit random hex string.
  - Only the SHA-256 hash of the token is stored in the database.
  - The bridge tracks heartbeat timestamps, active status, and client metadata (`POST /integrations/agent/heartbeat`).
- **Approved Workflow Jobs:**
  - `academic_workload_summary`: Analyzes assignments, exams, and suggests pacing adjustments.
  - `daily_briefing`: Synthesizes today's schedule, deadlines, and knowledge checks.
  - `revision_plan_proposal`: Generates spaced-repetition revision schedules.
- **Proposal Confirmation Gate (Zero Direct Writes):**
  - **Hermes Agent has zero direct write or delete permissions on StudyOS academic data.**
  - Agent workflows stage draft proposals in `agent_proposals` with status `pending_approval`.
  - Proposals older than 7 days automatically expire and cannot be confirmed.
  - The student inspects the proposal in the StudyOS UI and explicitly clicks **Approve & Apply** or **Reject** (`POST /integrations/agent/proposals/:id/confirm`), requiring student session JWT authentication (agent tokens cannot approve proposals).
  - Approved actions execute `create_session`, `create_reminder`, `create_note`, or `update_assignment` with ownership checks.

---

## 6. Model Context Protocol (MCP) Expansion

StudyOS provides **17 academic tools** via `@open-sunsama/mcp` conforming to the Model Context Protocol standard:

### Read Operations (9 Tools)
1. `list_subjects`: Retrieve enrolled subjects with color tags and metadata.
2. `list_assignments`: List assignments filtered by subject, status, or date range.
3. `get_assignment`: Fetch detailed assignment record with rubrics, milestones, and notes.
4. `list_study_sessions`: List scheduled and completed study sessions.
5. `get_today_schedule`: Get today's complete timeline (sessions, due tasks, calendar events).
6. `list_resources`: Retrieve attached study materials, PDFs, notes, and links.
7. `search_resources`: Full-text search across academic resources and syllabus documents.
8. `list_notes`: List student study notes and updated dates.
9. `get_study_progress`: Aggregate completion rates, study hours, and streak metrics.

### Propose Operations (4 Tools)
10. `suggest_study_plan`: Propose an optimized study plan for an assignment without committing changes.
11. `prepare_reminder`: Draft a contextual reminder for student review.
12. `prepare_assignment_update`: Draft proposed changes to assignment priority, estimated hours, or status.
13. `prepare_daily_briefing`: Generate a daily briefing draft for student review.

### Write Operations (4 Tools — Authorized)
14. `create_reminder`: Create a reminder with explicit student authorization.
15. `update_assignment`: Update an assignment with validated parameter constraints.
16. `create_note`: Create a learning note or session summary.
17. `create_study_session`: Schedule a new study session within the student's calendar.

*(Note on 16 vs 17 discrepancy: An initial summary report inadvertently omitted `list_notes` from the read list; the codebase defines and registers all 17 tools above).*

---

## 7. Productivity Automations Engine & Scheduler

StudyOS automations execute scheduled or event-driven student routines reliably.

- **Workflow Types:**
  - `daily_briefing`: Sent every morning at configured time (e.g., 08:00).
  - `assignment_due_reminder`: Proactive notice for upcoming assignments.
  - `session_reminder`: Alert prior to scheduled study session.
  - `weekly_progress_summary`: Weekly digest of hours studied and streak.
- **Multi-Channel Dispatch:**
  - Channels: `in_app`, `telegram`, `webhook`.
- **Durable Scheduling & Execution:**
  - Evaluated periodically via `processScheduledAutomations()` in `AutomationsService`.
  - Registered with PG Boss worker queue `JOBS.AUTOMATION_SCHEDULE_CHECK` on `* * * * *` cron in `apps/api/src/workers/automations/index.ts`.
  - Can also be evaluated on-demand via `POST /integrations/automations/tick` or manual run endpoint `POST /integrations/automations/:id/run`.
  - Checks student's timezone and skips automations that have already run on the current calendar day.

---

## 8. Verification & Acceptance Status

| Component | Status | Notes |
| :--- | :--- | :--- |
| **Integrations Types & Schema** | **PASS** | Strict TypeScript interfaces and PostgreSQL migrations (`0013_integrations_agent.sql`). |
| **Credential Encryption (AES-256-GCM)** | **PASS** | Roundtrip encryption, tampered ciphertext rejection, secret masking verified by unit tests. |
| **Google Calendar Service** | **PASS WITH LIMITATIONS** | Dual-verification ownership, substring tag matching, export logic tested against Postgres. Real Google OAuth requires live deployment credentials. |
| **Google Drive Service** | **PASS WITH LIMITATIONS** | MIME validation, path traversal sanitization, S3 upload pipeline tested. Live Drive queries require user OAuth token. |
| **Telegram Bot Service** | **PASS WITH LIMITATIONS** | 15-min linking code, chat disassociation, timezone-aware quiet hours tested against Postgres. Outbound delivery to Telegram requires live bot token. |
| **Hermes Bridge & Gate** | **PASS** | Scoped tokens (`so_agent_...`), SHA-256 hashing, `create_session` confirmation, 7-day expiration verified. |
| **Productivity Automations** | **PASS** | CRUD, timezone scheduling, pg-boss worker, deduplication tested against Postgres. |
| **MCP Academic Tools (17 tools)** | **PASS** | `@open-sunsama/mcp` compiles cleanly (`bun run build` exit code 0) with all 17 tools registered. |
| **Web UI Integration Settings** | **PASS** | Settings panel with connection cards, modals, Telegram controls, Hermes proposal review, automations manager. |
| **Multi-Tenant Isolation** | **PASS** | User B cannot access User A's connections, proposals, or automations (HTTP 404). |
| **Live Provider Verification** | **PENDING** | Live Google OAuth / Telegram Bot tokens require deployment-specific production credentials. |
