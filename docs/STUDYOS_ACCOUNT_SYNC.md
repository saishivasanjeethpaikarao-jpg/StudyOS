# StudyOS account and synchronization

Phase 4 keeps PostgreSQL and the StudyOS API as the canonical account data
store. The browser authenticates with an opaque, HTTP-only `studyos_session`
cookie. Unsafe browser requests also carry a short-lived CSRF token from
`GET /auth/csrf`; bearer tokens remain available for existing API clients and
are not used by the StudyOS web app.

## Google sign-in

Google login uses authorization-code OAuth/OIDC with state, nonce, PKCE,
issuer and audience validation, Google signature keys, expiry checks and a
verified email claim. The stable Google `sub` is stored in `user_identities`.
An existing local account is never merged by email alone. A user must already
be signed in to link Google from Account settings.

Configure the API only with deployment secrets (never commit them):

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
WEB_APP_ORIGIN=http://localhost:3000
```

Without those values the local password flow continues to work and Google
login reports that it is unavailable. A live Google provider exchange still
requires credentials and a registered redirect URI; it is not proven by local
unit tests alone.

## Devices and sync protocol

`POST /account/devices` registers an owner-scoped device. Device revocation
revokes its sessions. `POST /sync/bootstrap` creates a short-lived,
repeatable-read snapshot and returns pages plus a per-user cursor. Clients then
use `GET /sync/changes?cursor=...` for ordered upserts and tombstones. Cursors
are scoped to the authenticated account; a cursor below the retention floor
requires a new bootstrap.

`POST /sync/mutations` accepts a stable `clientMutationId`. The server stores a
request hash and response atomically with the mutation, so a retry with the
same content replays the result while reuse with different content returns a
conflict. Mutations use expected revisions and never silently overwrite a
newer row. Supported offline mutation entities are Subject, Assignment,
Study Note, Study Session, Resource metadata/links, Reminder, Focus Session and
Quiz authoring. File bytes, quiz attempts and plan confirmation still require
their canonical online endpoints.

Every user-owned change is journaled with a per-account sequence. Soft deletes
and hard deletes produce tombstones where the owner is still available. The
server retains the most recent 10,000 changes per account; an older cursor gets
a `410 BOOTSTRAP_REQUIRED` response. Parent deletion is authoritative for
cascading child rows. Private resource and attachment bytes remain in
S3-compatible storage; synchronization carries metadata and references, never
object keys or file bytes.

The web client registers one browser device, persists its cursor locally and
polls the change feed to invalidate TanStack Query caches. Subject, Assignment,
Study Session actions, resource links/metadata, Notes, Reminders, Focus
Sessions and Quiz authoring mutations made while offline are persisted in an
account-isolated browser queue, replayed with stable mutation IDs after
connectivity returns, and shown as pending in Account settings. Conflicts
remain pending for review; they are never silently overwritten. File uploads
and operations that require server-side preview validation remain online-only.
Native durable queues and local databases are deferred to the Android and
Windows phases.

## Security boundaries

All account, device, bootstrap, change-feed and mutation queries are scoped by
the authenticated user. Foreign IDs use the existing not-found behavior.
Correct-answer quiz snapshots, passwords, reset fields, storage keys and S3
object bytes are excluded from ordinary synchronization payloads. API keys,
OAuth client secrets and session tokens must remain server-side.
