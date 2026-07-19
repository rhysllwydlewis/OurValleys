# Application Scaffold Proof

## 1. Outcome

Issue #4 establishes the reusable production application scaffold for OurValleys without absorbing the successor public-business slice.

The scaffold includes:

- Strict TypeScript and Next.js App Router.
- Node.js 24 and pinned `pnpm` metadata.
- Reproducible dependency installation from the committed lockfile.
- PostgreSQL with PostGIS, `pg_trgm` and `unaccent`.
- Drizzle schema and a committed SQL migration.
- Better Auth with database-backed session tables and disabled-by-default unfinished sign-in methods.
- A public server-rendered homepage with a database-backed proof read.
- A protected `/account` route that authorises the session on the server and redirects unauthenticated users to `/login`.
- A separate pg-boss worker entry point and worker startup check.
- Formatting, lint, strict typecheck, compatibility, unit/integration test and production-build commands.
- Runtime health and route smoke checks in CI.

## 2. Local setup

1. Install Node.js 24.
2. Enable Corepack: `corepack enable`.
3. Copy `.env.example` to `.env.local` and generate a new random `BETTER_AUTH_SECRET` of at least 32 characters.
4. Start PostgreSQL/PostGIS: `docker compose up -d`.
5. Install exactly from the lockfile: `pnpm install --frozen-lockfile`.
6. Apply the migration: `pnpm db:migrate`.
7. Seed the repeatable proof record: `pnpm db:seed`.
8. Start the web application: `pnpm dev`.
9. In another terminal, start the worker: `pnpm worker`.

The password-free local Postgres service is a development-only convenience and its published port is restricted to `127.0.0.1`. Do not reuse trust authentication or example values for a shared or production database. The CI workflow generates its disposable authentication secret at runtime and uses trust authentication only inside the isolated disposable Postgres service.

## 3. Commands

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm compatibility`
- `pnpm audit --audit-level high`
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm worker:check`
- `pnpm test`
- `pnpm build`
- `pnpm verify`

## 4. Runtime proof

- `/` is server-rendered and displays the seeded database proof when PostgreSQL is available.
- `/api/health` reports whether the application can query PostgreSQL.
- `/account` performs server-side session lookup and redirects unauthenticated requests to `/login?next=/account`.
- `/api/auth/[...all]` exposes the Better Auth handler.
- `pnpm worker` starts the independent pg-boss worker process.

## 5. Railway deployment shape

The accepted deployment shape remains one repository with independently deployable services:

- **PostgreSQL:** provision a PostGIS-capable Railway PostgreSQL service and expose its private `DATABASE_URL` only to the application services that require it.
- **Web:** install with `pnpm install --frozen-lockfile`, run `pnpm build`, apply reviewed migrations before serving a new release, start with `pnpm start`, and use `/api/health` for the application health check.
- **Worker:** use the same repository revision, lockfile and environment contract as the web service, start with `pnpm worker`, and expose no public HTTP port.
- **Deployment order:** database service available, migration applied, web and worker released from the same compatible `main` revision, then health and affected journeys checked.
- **Recovery:** forward-fix routine application defects through a reviewed pull request; restore PostgreSQL from the platform backup process for data-loss incidents rather than relying on application rollback to reverse committed data changes.

`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` are required service configuration. Cloudflare R2, Resend and first-party analytics remain later coherent integration slices and are not falsely enabled by this scaffold.

## 6. Validation evidence

The pull-request workflow installs from the committed lockfile and verifies formatting, lint, strict TypeScript, framework and library compatibility, high-impact dependency vulnerabilities, two consecutive migration applications, two consecutive seed runs, pg-boss startup, unit and database integration tests, the production build, database health, the server-rendered homepage and denial of unauthenticated access to `/account`.

The dependency build-script allowlist is explicit in `pnpm-workspace.yaml`. CI retains read-only repository permissions, activates the pinned repository package manager through Corepack and generates its authentication secret at runtime.

## 7. Boundaries

This scaffold deliberately does not add the canonical business directory, generated business profile or full homepage experience. Those remain owned by issues #12 and #11 respectively and must reuse this foundation.

Cloudflare R2, Resend and first-party analytics remain architectural boundaries for later coherent slices; no unfinished external integration is falsely enabled in this scaffold.
