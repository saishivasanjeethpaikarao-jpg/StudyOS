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

Phase 0 established the reproducible development baseline. Phase 1A introduces only the owned Subject and Assignment foundations plus safe user-facing StudyOS branding. Study sessions, resources, notes, AI providers, Telegram, Hermes integration, Android alarms, production cloud deployment and the broader navigation redesign remain deferred until explicitly approved.
