# StudyOS Development

StudyOS is a student-first planning and study execution product. It currently builds incrementally on the inherited Open Sunsama foundation so working task, calendar, web and desktop behavior can be preserved while StudyOS capabilities are added in reviewable phases.

## Workspace

- Workspace: `D:\StudyOS-Project`
- Main repository: `D:\StudyOS-Project\studyos`
- Development branch: `studyos-development`
- Required tools: Bun 1.4.2, Docker with Compose and Git
- Product specifications: `D:\StudyOS-Project\StudyOS_A_to_Z_Master_Spec`
- Optional Hermes checkout: `D:\StudyOS-Project\hermes-agent`

Hermes is an external, optional advanced-agent runtime. The StudyOS planner must continue to work without it, and normal StudyOS development does not require starting or modifying Hermes.

## Local startup

From `D:\StudyOS-Project\studyos`:

```powershell
docker compose up -d postgres
bun run dev:local
```

`dev:local` uses the development-only Compose credentials and PostgreSQL at `localhost:5431`. It applies the existing migrations, starts the API and web development servers, and disables Redis, email workers, rollover, recurring workers, calendar sync, cloud storage and OAuth provider credentials.

| Service    | Address                  |
| ---------- | ------------------------ |
| PostgreSQL | `localhost:5431`         |
| Web        | `http://localhost:3000`  |
| API        | `http://localhost:3001`  |
| WebSocket  | `ws://localhost:3001/ws` |

Use `DEV_DATABASE_URL` only when intentionally selecting another development database. Authorized upstream maintainers can explicitly select the inherited Railway development database with `DEV_DATABASE_SOURCE=railway`; it is never the StudyOS default.

Stop the API and web processes with `Ctrl+C`. Stop PostgreSQL without deleting its data volume:

```powershell
docker compose stop postgres
```

## Safety rules

- Make StudyOS changes on `studyos-development`, never directly on `main`.
- Do not commit API keys, passwords, provider tokens or `.env` files.
- Do not edit or replace `packages/database/drizzle/0000_baseline.sql`. Future schema work must use forward migrations.
- Preserve existing `@open-sunsama/*` package names, table names and API routes until an explicit compatibility migration is approved.
- Review [`UPSTREAM_PROVENANCE.md`](UPSTREAM_PROVENANCE.md) before distribution or licensing decisions.

## Branding and compatibility

StudyOS is the user-facing product name. Keep inherited package names, import paths, database identifiers, migration history, application identifiers and upstream URLs unchanged until each has an explicit compatibility migration. Preserve upstream license, attribution and provenance records; a visual rebrand does not transfer authorship or distribution rights.

## Current phase boundary

- Phase 0 — Development Foundation: COMPLETE
- Phase 1 — StudyOS Foundation: COMPLETE
- Phase 2 — Study Planning Engine: COMPLETE
- Phase 3 — Resources & Productivity: COMPLETE
- Phase 4 — Accounts & Cloud Sync: COMPLETE
- Phase 5 — Android App: IMPLEMENTATION COMPLETE (real-device acceptance pending)
- Phase 6 — Windows Desktop: IMPLEMENTATION COMPLETE (native Windows runtime acceptance pending)
- Phase 7 — AI Study Planner: COMPLETE (multi-provider AI router, AES-256-GCM secret storage, PDF/YouTube/notes ingestion pipeline, candidate-validated quiz generation, deterministic planning assistant integration, and contextual learning assistant)
- Phase 8 — Integrations & Agent: COMPLETE (unified integration architecture, AES-256-GCM encrypted credentials, Google Calendar export with idempotency, Google Drive secure file ingestion, Telegram bot linking and quiet hours, Hermes Agent bridge with proposal confirmation gate, 17 MCP academic tools, and productivity automations)
- Phase 9 — Production Release: NOT STARTED
