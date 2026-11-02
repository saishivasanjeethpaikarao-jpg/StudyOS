# Phase 8 — Integrations & Agent Architecture

StudyOS Phase 8 establishes a unified, account-scoped integration framework connecting students with external ecosystems (Google Calendar, Google Drive, Telegram), advanced AI runtimes (Hermes Agent), and the Model Context Protocol (MCP), while maintaining strict data boundaries, encryption, and student autonomy.

---

## 1. Core Principles & Security Architecture

1. **User Control & Optionality:**
   - Every integration is optional and defaults to disconnected.
   - Disconnecting or disabling an integration revokes access and deletes stored tokens without affecting core academic planning or task execution.
2. **Account Scoping & Tenant Isolation:**
   - All connection tokens, settings, links, and agent proposals belong exclusively to the authenticated `user_id`.
   - Multi-tenant boundary tests verify that User B cannot access, read, or trigger User A's connections, proposals, or automations.
3. **AES-256-GCM Secret Encryption:**
   - Provider tokens, webhook secrets, and bot credentials are encrypted at rest using AES-256-GCM authenticated encryption (`apps/api/src/services/integrations/credentials.ts`).
   - Ciphertext tampering, truncated auth tags, or mismatched keys trigger immediate decryption failure.
   - API endpoints never return plaintext tokens or secrets to web/mobile clients; secrets are returned masked (e.g., `••••••••1234`).
4. **Canonical Source of Truth:**
   - StudyOS database remains the single authoritative source of truth. External agents or calendars never silently mutate or overwrite academic entities without explicit student validation.

---

## 2. Google Calendar Integration

The Google Calendar integration bridges StudyOS planned sessions with the student's personal calendar.

- **Scope:** `https://www.googleapis.com/auth/calendar.events`
- **Session Export:**
  - Planned study sessions can be selectively or automatically exported to a dedicated or primary calendar.
  - Exported calendar events contain a persistent metadata tag in the description: `[studyos_session:${sessionId}]`.
  - Incremental updates inspect existing events by tag or `external_event_id` to prevent duplicate events.
- **Change & Cancellation Handling:**
  - Rescheduling a session updates the start/end time of the matching external event.
  - Deleting a study session removes or cancels the corresponding calendar event without affecting non-StudyOS calendar entries.
- **Protection of Third-Party Events:**
  - StudyOS never modifies or overwrites personal, meeting, or university calendar events that do not originate from StudyOS.

---

## 3. Google Drive Integration

The Google Drive integration enables seamless academic resource ingestion into StudyOS.

- **Scope:** `https://www.googleapis.com/auth/drive.readonly`
- **Client Isolation:**
  - The client UI (web/mobile) never directly receives or holds Google OAuth access tokens for Drive.
  - Browsing and searching folder hierarchies occurs via authenticated API proxy: `GET /integrations/google/drive/files`.
- **Safe Resource Ingestion Pipeline:**
  - Files selected for import are fetched server-side from Google Drive via streaming.
  - Size limits (max 50 MB) and MIME types (PDF, Markdown, text, document) are validated before persisting.
  - Validated files are stored in StudyOS S3-compatible cloud storage, creating canonical `resources` records linked to the student's subjects and assignments.

---

## 4. Telegram Bot Integration

StudyOS connects with Telegram to deliver student notifications, study session alerts, and conversational status queries.

- **Linking Protocol:**
  - Authenticated students generate a short-lived (15-minute) one-time cryptographic code via `POST /integrations/telegram/link-code`.
  - The student sends `/start <CODE>` to the official StudyOS Telegram bot.
  - The webhook handler (`POST /integrations/telegram/webhook`) verifies the code, stores the chat ID, and establishes the link. Account usernames alone are never trusted for linking.
- **Bot Commands:**
  - `/start [code]` — Connect StudyOS account.
  - `/today` — Overview of today's planned study sessions, assignments due, and focus targets.
  - `/assignments` — List upcoming assignments and due dates.
  - `/help` — Overview of available commands and bot features.
- **Notification Controls & Quiet Hours:**
  - Students configure preferences per notification channel (study session reminders, assignment alerts, daily briefings).
  - Quiet hours (e.g. 22:00 to 07:00 in student's timezone) are strictly honored. Outbound alerts are suppressed during quiet periods.
  - Idempotency deduplication ensures a student never receives duplicate alerts for the same academic event.

---

## 5. Hermes Agent Integration

Hermes Agent (`hermes-agent`) is an optional external advanced reasoning runtime. StudyOS provides a secure bridge for academic workflows while enforcing a hard human-in-the-loop safety boundary.

- **Scoped Authentication:**
  - Students generate a dedicated agent bridge token via `POST /integrations/agent/tokens`.
  - Tokens use the prefix `so_agent_` followed by a cryptographically secure 256-bit random hex string.
  - Only the SHA-256 hash of the token is stored in the database.
  - The bridge tracks heartbeat timestamps, active status, and client metadata (`POST /integrations/agent/heartbeat`).
- **Approved Workflow Jobs:**
  - `academic_workload_summary`: Analyzes current assignments, exam timelines, and suggests pacing adjustments.
  - `daily_briefing`: Synthesizes today's schedule, high-priority tasks, and knowledge checks into a consolidated briefing.
  - `revision_plan_proposal`: Generates spaced-repetition revision schedules ahead of upcoming deadlines.
- **Proposal Confirmation Gate (Zero Direct Writes):**
  - **Hermes Agent has zero direct write or delete permissions on StudyOS academic data.**
  - When an agent workflow suggests actions (e.g., creating study sessions, updating assignment status, creating notes), it creates a draft proposal in `agent_proposals` with status `pending_approval`.
  - The student inspects the proposal in the StudyOS UI and explicitly clicks **Approve & Apply** or **Reject** (`POST /integrations/agent/proposals/:id/confirm`).
  - Only upon explicit student approval does StudyOS execute the proposed change against the canonical database.

---

## 6. Model Context Protocol (MCP) Expansion

StudyOS provides 17 academic tools via `@open-sunsama/mcp` conforming to the Model Context Protocol standard:

### Read Operations (8 Tools)
1. `list_subjects`: Retrieve enrolled subjects with color tags and metadata.
2. `list_assignments`: List assignments filtered by subject, status, or date range.
3. `get_assignment`: Fetch detailed assignment record with rubrics, milestones, and notes.
4. `list_study_sessions`: List scheduled and completed study sessions.
5. `get_today_schedule`: Get today's complete timeline (sessions, due tasks, calendar events).
6. `list_resources`: Retrieve attached study materials, PDFs, notes, and links.
7. `search_resources`: Full-text search across academic resources and syllabus documents.
8. `get_study_progress`: Aggregate completion rates, study hours, and streak metrics.

### Propose Operations (4 Tools)
9. `suggest_study_plan`: Propose an optimized study plan for an assignment without committing changes.
10. `prepare_reminder`: Draft a contextual reminder for student review.
11. `prepare_assignment_update`: Draft proposed changes to assignment priority, estimated hours, or status.
12. `prepare_daily_briefing`: Generate a daily briefing draft for student review.

### Write Operations (4 Tools — Authorized)
13. `create_reminder`: Create a reminder with explicit student authorization.
14. `update_assignment`: Update an assignment with validated parameter constraints.
15. `create_note`: Create a learning note or session summary.
16. `create_study_session`: Schedule a new study session within the student's calendar.

---

## 7. Productivity Automations Engine

StudyOS automations execute scheduled or event-driven student routines reliably.

- **Workflow Types:**
  - `daily_briefing`: Sent every morning at configured time (e.g., 08:00).
  - `upcoming_assignment_reminder`: Proactive notice for assignments due in 24h / 48h.
  - `study_session_reminder`: Alert 15 minutes prior to scheduled study session.
  - `weekly_progress_summary`: Weekly digest of hours studied, assignments submitted, and streak.
- **Multi-Channel Dispatch:**
  - Channels: `in_app`, `telegram`, `webhook`.
  - Failed deliveries record error messages in `automation_execution_logs`.
- **Deduplication & Reliability:**
  - `automation_execution_logs` stores run timestamps, status (`success` / `failed`), and execution durations.
  - Retries avoid re-sending identical notifications within the same time window.

---

## 8. Verification & Acceptance Status

| Component | Status | Notes |
| :--- | :--- | :--- |
| **Integrations Types & Schema** | **PASS** | Strict TypeScript interfaces and PostgreSQL migrations (`0013_integrations_agent.sql`). |
| **Credential Encryption (AES-256-GCM)** | **PASS** | Roundtrip encryption, tampered ciphertext rejection, secret masking verified by unit tests. |
| **Google Calendar Service** | **PASS** (Unit/Mock) | Export logic, update handling, idempotency tags tested. Real Google OAuth requires client credentials. |
| **Google Drive Service** | **PASS** (Unit/Mock) | Readonly browsing, secure proxying, S3 ingestion pipeline tested. |
| **Telegram Bot Service** | **PASS** (Unit/Mock) | 15-min linking code, webhook processing, quiet hours filtering, idempotency verified. |
| **Hermes Bridge & Gate** | **PASS** | Scoped tokens (`so_agent_...`), SHA-256 hashing, proposal approval gate tested against live DB. |
| **Productivity Automations** | **PASS** | CRUD, scheduling, multi-channel dispatch, execution logging verified against live DB. |
| **MCP Academic Tools (17 tools)** | **PASS** | `@open-sunsama/mcp` compiles cleanly with full Zod schemas for read, propose, and write operations. |
| **Web UI Integration Settings** | **PASS** | Modern settings panel with connection cards, modals, Telegram controls, Hermes proposal review, automations manager. |
| **Multi-Tenant Isolation** | **PASS** | Verified that User B cannot access User A's connections, proposals, or automations (HTTP 404). |
| **Live Provider Verification** | **PENDING** | Live Google OAuth / Telegram Bot tokens require deployment-specific production credentials. |
