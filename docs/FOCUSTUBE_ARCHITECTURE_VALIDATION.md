# FocusTube Architecture Validation Report

**Document Version:** 1.1.0  
**Project:** StudyOS  
**Scope:** Architecture and feasibility review of the proposed *FocusTube* feature (Timetable-Integrated Video Learning).  
**Repository Branch:** `studyos-development`  
**Status:** Audit & Validation Complete — Architecture Verified with Hardened Specifications.  
**Roadmap Impact:** **NONE** (Preserves the strict Phases 0–9 roadmap; does not modify database schema, execute migrations, or deploy code).

---

## 1. Executive Summary

FocusTube is a proposed StudyOS feature designed to bridge timetable planning with academic video consumption by attaching YouTube video lessons directly to scheduled study sessions.

This validation systematically verified every file reference, data model, and API route claimed to support FocusTube against the actual StudyOS monorepo (`studyos`).

### Key Verdict:
- **Feasibility:** **High**, but **with critical corrections to initial assumptions**.
- **Existing Foundation:** StudyOS already has rich relational foundations in `resources` (`type: 'youtube'`), `resource_links` (supporting `studySessionId`), `study_sessions`, `assignments`, and `study_notes`.
- **Primary Blockers & Risks Identified & Clarified:**
  1. *Transcript scraper assumption:* `apps/api/src/services/ai/ingestion/youtube.ts` is an AI transcript parser that throws fatal exceptions if captions are missing. It cannot be used as a general metadata extractor.
  2. *oEmbed Fallback Resilience:* YouTube oEmbed must have graceful fallbacks for video unavailability and browser CORS/offline failures, falling back to deterministic thumbnail derivation (`img.youtube.com/vi/{id}/hqdefault.jpg`).
  3. *Resource Completion vs. Session Follow-Through:* `resources.completedAt` is a global content-mastery flag on the resource row. If a video is scheduled across multiple study sessions, toggling it inside one session prematurely completes it everywhere. Session completion (`study_sessions.completedAt`) must remain distinct.
  4. *Local Scrubber Non-Sync:* Client-side playback scrubber caching (`localStorage`) prevents ₹0 cloud cost regressions and HTTP 409 conflict storms, but **does not synchronize across devices**.
  5. *Android Alarm User-Interaction Requirement:* `ACTION_SET_ALARM` is an assisted intent opening the Android Clock app; it does **not** guarantee alarm creation without explicit user confirmation.
  6. *Tauri CSP Security Hardening:* Tauri desktop CSP must **never be weakened** with permissive wildcards or `unsafe-eval` simply for embedded video playback.

---

## 2. Reusable Component Verification Table

| Claimed Reusable Component | Codebase File Reference | Verified Status | Audit Findings & Actual Behavior |
| :--- | :--- | :--- | :--- |
| **YouTube URL Normalization** | `apps/api/src/services/learning.ts` (`normalizeResourceUrl`) | **VERIFIED** | Correctly parses `youtu.be`, `youtube.com/watch?v=`, shorts, live, and embed links into canonical `https://www.youtube.com/watch?v={id}` and validates the 11-character identifier. |
| **YouTube Metadata Ingestion** | `apps/api/src/services/ai/ingestion/youtube.ts` (`extractTranscriptFromYouTube`) | **INCORRECT ASSUMPTION** | Designed exclusively for AI transcript extraction. Throws `ValidationError` if closed captions are missing or empty. Does not extract channel, duration, or thumbnails. |
| **Resource Relational Table** | `packages/database/src/schema/learning.ts` (`resources`) | **PARTIALLY REUSABLE** | Supports `type: 'youtube'`, `title`, `url`, `providerItemId` (videoId), `completedAt`, and `revision`. Lacks playback position columns (`current_seconds`, `duration_seconds`). |
| **Session Resource Linking** | `packages/database/src/schema/learning.ts` (`resource_links`) | **VERIFIED** | Supports `studySessionId` with cascade delete and enforces exclusivity (`num_nonnulls = 1`). |
| **Tenant Safety Validation** | `apps/api/src/services/learning.ts` (`validateLearningLinks`) | **VERIFIED** | Queries `study_sessions` with `eq(studySessions.userId, userId)` and `isNull(studySessions.deletedAt)`. Prevents cross-tenant session attachment. |
| **External Link Hand-off** | `apps/web/src/lib/desktop.ts` (`openExternal`) | **VERIFIED** | Bridges Tauri IPC `open_url` on desktop and falls back cleanly to `window.open` on the web. |
| **Android Alarm / Clock Integration** | `apps/expo-mobile/src/lib/alarms.ts` (`openClockAlarm`) | **VERIFIED (ASSISTED HANDOFF)** | Uses Android Intent `android.intent.action.SET_ALARM` via `Linking.openURL`. Requires user interaction; does not silently create background alarms. |
| **Notes Architecture** | `apps/web/src/components/academics/notes-page.tsx` | **PARTIALLY REUSABLE** | Currently uses plain-text `<textarea>` with `body: text("body")`. Does not yet contain interactive timestamp node parsing. |
| **Optimistic Concurrency Sync** | `apps/api/src/routes/sync.ts` | **INCOMPATIBLE WITH REAL-TIME SCRUBBING** | Uses strict `expectedRevision` optimistic locking. If video progress increments revisions every few seconds, multi-device usage will fail with `ConflictError` (409). |

---

## 3. Deep-Dive Investigation of Architecture Questions

### 1. Does YouTube metadata extraction actually work?
* **Verdict:** **NO — for general video attachment; YES — only for transcript-assisted AI ingestion.**
* **Details:**
  `apps/api/src/services/ai/ingestion/youtube.ts` executes `fetch("https://www.youtube.com/watch?v=" + videoId)` and searches the HTML string for `ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer`.
  - If a video does not have closed captions, lines 92–95 throw:
    ```typescript
    throw new ValidationError("No transcript or closed captions available for this YouTube video. Videos without transcripts cannot be analyzed.");
    ```
  - Relying on this endpoint to attach a YouTube video to a timetable session would cause any video without English/auto captions to fail with a validation error.
  - Furthermore, scraping YouTube HTML directly from backend server IPs frequently hits YouTube consent redirects, bot walls, or HTTP 429 rate limits.
* **Correction & Graceful Fallbacks (Addressing Point 2):**
  Basic metadata (title, author, thumbnail) should be retrieved using YouTube's public oEmbed endpoint:
  ```text
  GET https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={videoId}&format=json
  ```
  - **Handling Video Unavailability:** If the video is private, deleted, or region-restricted, oEmbed returns HTTP 404/401/403.
  - **Handling Browser CORS / Offline Failures:** Browser-side fetch calls to oEmbed can fail due to ad-blockers, tracking protection, offline status, or network timeouts.
  - **Deterministic Resilience Rule:** oEmbed failure must **never block resource creation or timetable rendering**. On any failure, the system falls back immediately to:
    1. Deterministic thumbnail: `https://img.youtube.com/vi/{videoId}/hqdefault.jpg` (requires no API or JSON parsing).
    2. Fallback title: User-entered label or `YouTube Video (${videoId})`.
    3. Canonical URL: `https://www.youtube.com/watch?v=${videoId}`.

### 2. Do `resources` and `resource_links` support all required timetable operations?
* **Verdict:** **YES — at the schema and route level, with a necessary join pattern.**
* **Details:**
  - `resources` table defines `type` (`'youtube'`), `url`, `title`, `providerItemId` (the YouTube 11-char ID), and `completedAt`.
  - `resource_links` table defines foreign keys to `studySessionId`, `assignmentId`, and `subjectId`.
  - Requirement 2 mandates displaying: *Subject, Topic, Video title, Scheduled start/end time, Associated timetable entry*.
  - Because `resource_links` enforces `num_nonnulls(subjectId, assignmentId, studySessionId) = 1`, linking a video to a `studySessionId` leaves `subjectId` and `assignmentId` null on the `resource_links` row.
  - However, in StudyOS, `study_sessions` has a mandatory foreign key `assignmentId -> assignments.id`, and `assignments` has `subjectId -> subjects.id`.
  - Therefore, the timetable video card retrieves Subject and Topic via a 3-table relational traversal:
    $$\text{resource\_links} \longrightarrow \text{study\_sessions} \longrightarrow \text{assignments} \longrightarrow \text{subjects}$$

### 3. Is study-session linking tenant-safe?
* **Verdict:** **YES — strictly enforced at the API route and service layer.**
* **Details:**
  - In `apps/api/src/services/learning.ts` (`validateLearningLinks`), when a `studySessionId` is passed, the system executes:
    ```typescript
    const [row] = await db
      .select({ id: studySessions.id })
      .from(studySessions)
      .where(and(
        eq(studySessions.id, links.studySessionId),
        eq(studySessions.userId, userId),
        isNull(studySessions.deletedAt)
      ))
      .limit(1);
    if (!row) throw new NotFoundError("Study Session", links.studySessionId);
    ```
  - In `resource_links`, a composite foreign key `resource_links_resource_owner_fk` ensures `(resource_id, user_id)` references `resources(id, user_id)`.
  - An authenticated user cannot attach a resource to another student's study session.

### 4. Investigation of `resources.completedAt` Across Reused Study Sessions (Addressing Point 3)
* **Verdict:** **POTENTIAL DISCREPANCY DETECTED — Session completion must be decoupled from resource completion.**
* **Analysis:**
  - In StudyOS, resources are reusable academic assets. Via `resource_links`, a single 2-hour lecture video (`resourceId`) can be linked to:
    - Study Session 1 (Monday 10:00–11:00 AM — Watch Part 1)
    - Study Session 2 (Wednesday 10:00–11:00 AM — Watch Part 2)
    - Assignment A (Semester Project)
  - The `resources` table defines a single scalar column: `completedAt: timestamp("completed_at", { withTimezone: true })`.
  - **The Problem:** If finishing Study Session 1 triggers `PATCH /resources/:id` with `{ completed: true }`, `resources.completedAt` is stamped with the current time. When the student opens Study Session 2 on Wednesday, the video resource will appear as **already completed**, even though Session 2 has not started!
  - **Architectural Resolution:**
    - **Session Follow-Through:** `study_sessions.status = 'completed'` and `study_sessions.completedAt` record that the scheduled timetable block was completed. Completing a timetable session must **not** mutate `resources.completedAt`.
    - **Resource Content Mastery:** `resources.completedAt` represents overarching content completion (e.g. the student has mastered the entire video). This must remain an explicit user action on the resource itself, preserving correct behavior across multi-session schedules.

### 5. Playback Progress Synchronization & Concurrency (Addressing Point 4)
* **Verdict:** **NO CONCURRENT SYNC — Playback progress is strictly device-local.**
* **Details:**
  - StudyOS sync uses a 4-tier optimistic concurrency protocol (`expectedRevision`).
  - High-frequency playback scrubber updates cannot be routed through the server database without causing:
    1. Persistent HTTP 409 (`ConflictError`) collisions across devices.
    2. WebSocket event storms (`learning:changed`).
    3. Severe database write amplification violating the ₹0/month free tier ceiling.
  - **Documented Limitation:** Playback position is cached strictly on the client (e.g., `localStorage` key `studyos_video_pos_{videoId}`).
  - **Explicit Non-Sync Contract:**
    > **IMPORTANT:** Local playback progress **does NOT synchronize across devices**. Pausing at 14:20 on Windows desktop will **not** resume at 14:20 on mobile or web. Each device maintains its own local scrubber cache.
    > Cross-device resumption is facilitated through **Timestamped Study Notes** (clicking `[14:20]` in a synchronized note seeks the player on any device).

### 6. Can timestamped notes seek the player reliably?
* **Verdict:** **YES — via custom event bus or React state, but requires notes UI enhancement.**
* **Details:**
  - `apps/web/src/components/academics/notes-page.tsx` currently renders a plain `<textarea>` saving unparsed markdown text to `study_notes.body`.
  - A standard HTML `<textarea>` cannot render clickable hyperlinks or timestamp chips inside the active text field.
  - **Solution:**
    1. Provide a "Capture Timestamp" action button above the note editor that reads `player.getCurrentTime()` and inserts `[MM:SS]` at the text cursor.
    2. Provide a side-by-side or read-mode renderer that matches `\[(\d{1,2}:)?\d{2}:\d{2}\]` regex and binds an `onClick` callback to `player.seekTo(seconds, true)`.

### 7. YouTube Embedding & Tauri CSP Security (Addressing Point 5)
* **Verdict:** **Web & Tauri: YES; Android: REQUIRES EXTERNAL HANDOFF OR WEBVIEW.**
* **Details:**
  - **Web (`apps/web`):** Works natively via the official YouTube IFrame Player API (`https://www.youtube-nocookie.com/embed/{id}?enablejsapi=1`).
  - **Android (`apps/expo-mobile`):** React Native does not support HTML `<iframe>` tags out of the box (`react-native-webview` is not in `package.json`). Android uses "Open on YouTube" via `Linking.openURL(url)` to launch the official YouTube app.
  - **Windows Desktop (`apps/desktop` via Tauri v2):**
    - Tauri on Windows uses WebView2.
    - **Security Rule: DO NOT WEAKEN TAURI CSP.** Never introduce wildcards (`*`) or `unsafe-eval` into `tauri.conf.json` to facilitate YouTube embedding.
    - If embedded in Tauri, CSP directives must be strictly and narrowly scoped:
      ```text
      frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com;
      script-src 'self' https://www.youtube.com https://s.ytimg.com;
      img-src 'self' https://img.youtube.com https://i.ytimg.com data:;
      ```
    - **Zero-Risk Alternative:** Utilizing `openExternal(url)` to open the video in the user's default OS browser completely eliminates the need to relax Tauri CSP, isolates third-party trackers, and provides maximum desktop security.

### 8. Are Android background and lifecycle restrictions handled?
* **Verdict:** **PARTIALLY — Handled for alarms, but requires player-pause guards on app backgrounding.**
* **Details:**
  - YouTube API Terms of Service (Developer Policy §II.3) strictly forbid playing audiovisual content with the screen off or in the background unless the user has YouTube Premium through the native app.
  - If an embedded player is implemented in mobile, it must attach to React Native `AppState.addEventListener('change')` to force pause whenever the app goes to `background` or `inactive`.
  - External handoff ("Open on YouTube") completely eliminates this compliance risk because playback is delegated to YouTube's official application.

### 9. Can reminders reliably trigger on each platform? (Addressing Point 1)
* **Verdict:** **YES — using the established hybrid reminder model, with documented user-interaction constraints on Android.**
* **Details:**
  - **Android (`openClockAlarm` in `apps/expo-mobile/src/lib/alarms.ts`):**
    - Uses `intent:#Intent;action=android.intent.action.SET_ALARM;...`.
    - **User-Interaction Requirement:** `ACTION_SET_ALARM` is an **assisted intent handoff**, NOT a silent background alarm scheduler. It opens the student's default Android Clock app with the alarm time and note pre-filled.
    - **The user must explicitly review and confirm/save the alarm in the Clock app.** If the user swipes away or cancels the Clock app, no alarm is created.
    - Custom OEM aggressive battery savers (e.g. Xiaomi MIUI/HyperOS, Samsung OneUI, OnePlus OxygenOS) may silence alarms if background activity is restricted. The UI must clearly advise students: *"Confirm the alarm in your Android Clock app."*
  - **Windows Desktop:** `apps/web/src/lib/desktop.ts` invokes Tauri's `show_notification` to emit native Windows Action Center notifications.
  - **Web:** Uses HTML5 `Notification.requestPermission()` with in-app banner fallback.
  - Reminders cannot wake a suspended computer from sleep if the app is closed, which matches the existing StudyOS V1 specification.

### 10. Are YouTube error codes handled correctly?
* **Verdict:** **MUST BE EXPLICITLY CODED — Specifically Error Codes 101 and 150.**
* **Details:**
  - YouTube video owners frequently disable embedding on third-party domains.
  - When embedding is disabled, YouTube's IFrame API emits `onError` with code `101` or `150`.
  - Code `100` signifies a deleted or private video; Code `2` indicates an invalid video ID parameter.
  - **Requirement:** FocusTube must intercept `101` and `150` in the `onError` listener and switch the player container to a clean fallback card:
    *"The owner of this video does not allow playback inside other apps. Click below to continue learning on YouTube."* [Open on YouTube Button].

---

## 4. Identified Incorrect Assumptions in Initial Proposal

1. **Scraping Captions for Metadata:** Assumed `apps/api/src/services/ai/ingestion/youtube.ts` could be reused for video metadata. It is an AI transcript pipeline that crashes if closed captions do not exist.
2. **ACID Revisioned Sync for Player Scrubbing:** Assumed video progress could be synchronized like ordinary StudyOS entities. High-frequency scrubber updates conflict with `expectedRevision` optimistic locking.
3. **Android IFrame Parity:** Assumed React Native could render the web iframe without additional native webview dependencies.
4. **Automatic Background Alarms on Android:** Assumed `ACTION_SET_ALARM` automatically creates an alarm without user interaction. It requires the student to interact with and confirm the alarm in their system Clock app.
5. **Coupled Resource Completion:** Assumed marking a session complete could safely update `resources.completedAt`. If a resource is reused across multiple sessions, this prematurely marks the video completed everywhere.
6. **Tauri CSP Permissiveness:** Assumed embedding YouTube is trivial in desktop without reviewing CSP security implications. Tauri CSP must remain strictly scoped without wildcards.

---

## 5. Smallest Maintainable Implementation Recommendation

To deliver FocusTube with maximum reliability, zero server costs, and no disruptions to the 10-phase roadmap:

1. **Zero-Migration Relational Reuse:**
   - Use existing `resources` (`type: 'youtube'`) and `resource_links` (`studySessionId`).
   - Track timetable completion exclusively via `study_sessions.status = 'completed'` / `study_sessions.completedAt`. Do not mutate `resources.completedAt` on timetable session completion.
   - Retrieve Subject and Topic via `study_sessions -> assignments -> subjects`.
2. **Client-Side oEmbed & Deterministic Fallbacks:**
   - Enrich title and thumbnail via YouTube's public oEmbed endpoint.
   - On oEmbed network/CORS/404 failure, fall back immediately to `https://img.youtube.com/vi/{videoId}/hqdefault.jpg` and canonical URL without blocking.
   - Cache video playback scrubber position strictly in client `localStorage` (`studyos_video_pos_{videoId}`). Document that scrubber position is device-local and does not cross-sync.
3. **Web & Tauri Player:**
   - Render a dedicated `FocusTubePlayer` modal embedding `youtube-nocookie.com/embed/{id}?enablejsapi=1`.
   - Maintain strict Tauri CSP directives (`frame-src https://www.youtube-nocookie.com https://www.youtube.com;`). Never weaken CSP with wildcards.
   - Intercept error codes 101/150 with a 1-click fallback button invoking `openExternal(url)`.
4. **Android Client:**
   - Display the scheduled FocusTube card with video title, subject, and time block.
   - Bind "Open on YouTube" to `Linking.openURL(resource.url)` (opening the native YouTube app).
   - Bind reminders to `openClockAlarm`, with UI guidance prompting the student to confirm the alarm in the Android Clock app.
5. **Timestamped Notes:**
   - Add a note toolbar button to insert `[MM:SS]` from the active video player.
   - Render regex-matched timestamp links that seek the player via `player.seekTo(seconds, true)`.

---

## 6. Architectural Conclusion

The FocusTube feature specification has been thoroughly audited and hardened against the real StudyOS codebase. The foundational data structures exist and are tenant-safe. By adopting oEmbed with deterministic thumbnail fallbacks, strictly distinguishing timetable session follow-through from resource mastery, documenting the device-local nature of playback scrubbers, acknowledging Android Clock user-interaction requirements, and preserving Tauri CSP security, FocusTube can be implemented cleanly in a future milestone without expanding backend infrastructure, violating YouTube terms of service, or altering the established 10-phase roadmap.
