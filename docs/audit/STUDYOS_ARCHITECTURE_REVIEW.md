# StudyOS — Architecture & Engineering Review

**Document Version:** 1.0.0  
**Audit Date:** November 5, 2026  
**Auditor:** Antigravity Engineering  
**Scope:** Architecture analysis, application boundaries, data access patterns, event pipelines, and scalability evaluation.

---

## 1. Monorepo Structure & Application Boundaries

StudyOS uses a Turborepo monorepo orchestrated with Bun (`bun@1.4.2`).

```text
StudyOS Monorepo
├── apps/
│   ├── api/            # Hono REST API + WebSockets on Node.js/Bun
│   ├── desktop/        # Tauri v2 wrapper for Windows desktop (.exe / .msi)
│   ├── expo-mobile/    # React Native / Expo app for Android
│   ├── mobile/         # [DEAD CODE] Inherited Tauri mobile experiment
│   └── web/            # React 19 + TanStack Router/Query frontend
├── packages/
│   ├── api-client/     # Universal typed API client with 401 retry loop
│   ├── database/       # Drizzle ORM schemas, pool management, migrations
│   ├── types/          # Shared domain models and TypeScript contracts
│   └── utils/          # Pure utility helpers, validation, and error classes
└── mcp/                # Model Context Protocol server for AI connectors
```

### Architectural Strengths
- **Clean Shared Packages:** Domain types (`packages/types`) and database schemas (`packages/database`) are centralized.
- **Universal API Client:** `@open-sunsama/api-client` encapsulates token injection, 401 token refresh loops, and mobile sync queues, consumed by Web, Desktop, and Mobile.
- **Strict Dependency Graph:** Shared packages avoid circular references; utilities remain purely functional without runtime side effects.

### Architectural Bottlenecks & Weaknesses
- **Dual Runtime Complexity:** The backend exists in two forms:
  1. A production Node.js/Bun container service running with `pg-boss` and Redis pub/sub.
  2. A Cloudflare Worker prototype (`apps/api/src/cloudflare-prototype/`) relying on Hyperdrive.
  Maintaining compatibility across both runtimes creates code branches and test skips.
- **Abandoned Package Clutter:** `apps/mobile` remains configured in `bun.lock`, creating confusion with `apps/expo-mobile`.

---

## 2. Database Architecture & Tenant Isolation

### 2.1 Multi-Tenant Isolation Model
- **Mechanism:** Application-enforced tenant filtering. Every academic and task entity links directly to `userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" })`.
- **Query Hardening:** Database routes in `apps/api/src/routes/` systematically include `eq(table.userId, userId)` in `WHERE` clauses.
- **Cascade Deletes:** Account deletion (`DELETE FROM users WHERE id = $1`) cascades cleanly across all 56 database tables without orphan records.
- **Composite Ownership Constraints:** Tables like `resource_links` and `study_sessions` enforce composite foreign keys (`[assignment_id, user_id] -> assignments(id, user_id)`) to prevent cross-tenant object assignment.

### 2.2 Concurrency & Locking Pattern
- Every mutatable entity incorporates a `revision: integer("revision").notNull().default(1)`.
- Updates require `eq(table.revision, expectedRevision)` and execute `revision: sql`${table.revision} + 1``.
- This prevents silent last-write-wins overwrites during concurrent edits.

---

## 3. Data Access & Synchronization Pipeline

StudyOS employs an event-driven sync pipeline:

```text
[ Client Mutation ]
       │
       ▼
1. Optimistic Local Update
       │
       ▼
2. Persistent Offline Queue (localStorage)
       │
       ▼
3. Batch Sync API Call (POST /sync/batch)
       │
       ├──► 4. Check Idempotency (sync_mutation_receipts)
       ├──► 5. Verify Revision (expectedRevision == db.revision)
       ├──► 6. Commit Database Mutation (revision + 1)
       │
       ▼
7. Broadcast WebSocket Event (publishEvent -> Redis -> WS)
       │
       ▼
8. Connected Clients Invalidate Query Cache (TanStack Query)
```

### Bottleneck: Revision Conflict Resolution
While server-side conflict detection is strict, the client engine lacks an automated or interactive conflict resolver when HTTP 409 occurs. Failed mutations remain queued in local storage indefinitely.

---

## 4. Background Processing & Scalability

### 4.1 Task Rollover & Recurring Generation
- Handled by `pg-boss` background jobs in Node.js/Bun runtime:
  - `user-batch-rollover`: Evaluates unfinished daily tasks at midnight in the user's timezone.
  - `recurring-task-generation`: Spawns next instances of recurring series.
- **Grace Period Protection:** Server health check (`/health`) includes a 5-minute grace period on startup, preventing orchestration platforms (Railway/Docker) from prematurely terminating containers while `pg-boss` initializes.

### 4.2 Storage Architecture
- Files are strictly prohibited from PostgreSQL.
- File bytes reside in S3-compatible cloud storage (Cloudflare R2 or AWS S3).
- Private study materials are streamed via an authenticated API proxy (`GET /resources/:id/file`), preventing direct public URL leakage.

---

## 5. Architectural Recommendations

1. **Prune Dead Workspaces:** Remove `apps/mobile` from `workspaces` in root `package.json` to eliminate dead code and build noise.
2. **Resolve Drizzle Migration Metadata:** Update `_journal.json` to record migrations 0012 and 0013, preventing schema drift on `drizzle-kit generate`.
3. **Formalize Client Conflict UI:** Add a standard "Conflict Resolution" sheet in `apps/web` allowing students to choose between "Keep Server Version" or "Force Overwrite".
4. **Standardize Branding Scopes:** Progressively rename monorepo workspace packages from `@open-sunsama/*` to `@studyos/*` across all internal imports.
