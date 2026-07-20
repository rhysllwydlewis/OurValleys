# Railway PostgreSQL and Public Demo Access

## 1. Outcome

Issue #42 makes the Railway release path match the accepted OurValleys architecture and provides a safe demonstration of protected business access. Issue #46 hardens that path for Railway's standard PostgreSQL image. Issue #48 hardens private endpoint selection and transient database-start recovery. Issue #50 separates Railway process liveness from strict dependency readiness while validating runtime configuration before release.

OurValleys uses **PostgreSQL** as its single system of record. PostGIS remains the target spatial capability for future geographic columns and spatial search, but the currently implemented schema is deliberately non-spatial and can run safely on Railway's standard PostgreSQL image. The application does not use MongoDB. Drizzle migrations, Better Auth sessions, tenant memberships, publication state and future geographic search all depend on PostgreSQL constraints and transactions.

A MongoDB service in the Railway project is therefore not a compatible `DATABASE_URL` target and must not be connected to the application as a second datastore.

## 2. Required Railway services

The Railway project needs:

1. The existing OurValleys web service connected to this repository and deploying `main`.
2. A Railway PostgreSQL service named `Postgres` or another clearly identifiable name in the same Railway environment.
3. Later, before the first geometry/geography column or spatial query is introduced, a controlled upgrade to a PostGIS-capable Railway service or image.
4. Later, a separately configured worker service using the same PostgreSQL environment.

The web service must define:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
BETTER_AUTH_SECRET=<private random value of at least 32 characters>
```

Use the actual PostgreSQL service name in the reference if it is not `Postgres`. Do not copy the resolved connection string into GitHub, documentation or chat. The Railway reference must point to the PostgreSQL service in the same project environment.

Railway supplies `RAILWAY_PUBLIC_DOMAIN` after a public domain is generated for the web service. The application derives `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` from that HTTPS domain when explicit values are absent. Explicit URL variables remain supported for staging, custom-domain or local environments.

The runtime also accepts:

- `DATABASE_PRIVATE_URL` as a protected Railway-private recovery override;
- Railway-style `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` and `PGDATABASE` when the complete set is present;
- `POSTGRES_URL` as a final compatible URL fallback.

In a detected Railway environment, database input priority is:

1. `DATABASE_PRIVATE_URL`;
2. the complete `PG*` set;
3. `DATABASE_URL`;
4. `POSTGRES_URL`.

Outside Railway, ordinary `DATABASE_URL` precedence is retained. A production Railway target resolving to localhost or another loopback address is rejected before any connection attempt.

The preferred permanent setup remains a single `DATABASE_URL=${{Postgres.DATABASE_URL}}` reference. `DATABASE_PRIVATE_URL` is only a bounded recovery option when a stale generic variable cannot immediately be removed. It must also be a protected Railway reference, never a copied secret committed to source control.

## 3. Database extension boundary

Railway's standard PostgreSQL image intentionally does not include PostGIS. The initial migration therefore treats `postgis`, `pg_trgm` and `unaccent` as optional capabilities for the current schema:

- an extension is installed when it is available and the database role may install it;
- an unavailable optional extension is reported in deployment logs without blocking the current non-spatial schema;
- migration errors unrelated to optional-extension availability still fail the deployment;
- the migration command reports whether spatial features are ready;
- no geometry-dependent feature may be merged or enabled until production PostGIS readiness is explicitly tested.

Changing the initial migration is an exceptional pre-production repair. The failed Railway database had not successfully applied the migration, and the application schema still contains no spatial type or function dependency. Future applied migrations must remain immutable and new schema changes must use a new migration.

## 4. Release sequence and health boundaries

`railway.json` defines:

```text
pre-deploy: pnpm deploy:prepare
start:      pnpm start
health:     /api/health
readiness:  /api/ready
```

`pnpm deploy:prepare` performs, in order:

1. validates the database, authentication secret and canonical service-origin configuration without logging protected values;
2. resolves and classifies the selected database configuration without logging its URL, hostname, username or password;
3. waits for initial PostgreSQL connectivity with bounded retries for recognised transient refusal and DNS failures;
4. runs committed Drizzle migrations through the application migrator, with secret-safe structured diagnostics;
5. seeds deterministic fictional data;
6. provisions the intentionally public demonstration account.

The connection wait makes six attempts with bounded exponential delays. It retries recognised transient connectivity codes including `ECONNREFUSED`, `ECONNRESET`, `ETIMEDOUT`, `EHOSTUNREACH`, `ENETUNREACH`, `EAI_AGAIN`, `ENOTFOUND` and PostgreSQL `57P03`. Authentication failures, invalid configuration and migration SQL errors remain immediate failures.

All release operations are safe to repeat. A failed validation, migration, seed or account provision exits non-zero, so Railway does not release that deployment. The previous healthy deployment remains the rollback point.

The two HTTP signals have deliberately separate responsibilities:

- `/api/health` is dependency-free process liveness. Railway uses it to confirm that the built container started, bound to the assigned port and can receive network traffic.
- `/api/ready` is strict dependency readiness. It returns `200` only when PostgreSQL is reachable and Better Auth can be constructed from valid runtime configuration; otherwise it returns `503` with bounded component states.

Railway's deployment health check must not depend on public-origin or downstream dependency construction after the same requirements have already been validated during pre-deploy preparation. Strict readiness remains part of post-deploy verification and operational monitoring.

## 5. Public demonstration account

The login route and homepage sign-in dialog disclose this intentionally public account:

```text
Email:    demo.viewer@ourvalleys.example
Password: PUBLIC-DEMO-ONLY
```

This password is demonstration content, not a private secret. It must never be reused for a real account.

The account:

- belongs to a deterministic fictional user;
- has an active `viewer` membership for the fictional `Cwm & Coil Heating` record;
- can open the protected business dashboard;
- has `business.view` only;
- cannot edit the profile, publish, manage members or gain owner permissions;
- is recreated safely by the deployment preparation command;
- has existing sessions revoked whenever its credential is reprovisioned.

The original fictional owner record remains separate and has no disclosed credential.

## 6. User journey

1. Open `/login` or the homepage sign-in dialog.
2. Select **Fill demo details**.
3. Review the visibly disclosed email and password.
4. Select **Sign in**.
5. The server-authorised `/account` page lists the fictional viewer membership.
6. Select **Open business dashboard**.
7. `/dashboard/business/00000000-0000-4000-8000-000000000401` performs a fresh server-side membership and permission check before rendering.

The helper never submits automatically. Public discovery remains available without an account.

## 7. Failure behaviour

- A MongoDB URI, malformed URL or incomplete standalone `PG*` set produces a bounded configuration error without echoing usernames, passwords or connection strings.
- A production Railway URL targeting localhost is rejected with an instruction to reference the PostgreSQL service.
- A missing PostgreSQL reference, undersized authentication secret or missing canonical origin causes pre-deploy validation to fail before release.
- Transient refusal or DNS errors are retried for a bounded period and then fail with the underlying error code.
- Migration logs identify only the chosen configuration source and endpoint class, such as `DATABASE_URL` plus `railway-private`; they do not print the endpoint itself.
- Optional extensions that are not present in the database image are reported and skipped only while the committed schema has no dependency on them.
- A database outage returns `503` from `/api/ready` while `/api/health` continues to represent whether the web process itself is alive.
- Public database-dependent views use their existing honest unavailable states.
- Permission checks remain fail-closed when the membership query fails.
- The custom migration runner emits PostgreSQL error codes, details and hints while redacting connection credentials.

An `ECONNREFUSED` that persists after all retries means the selected host and port have no reachable PostgreSQL listener. Check that:

1. the `Postgres` service is deployed and healthy in the same Railway environment as the web service;
2. the web service variable is a live `${{Postgres.DATABASE_URL}}` reference rather than localhost, MongoDB, a redacted placeholder or an expired copied value;
3. the PostgreSQL service has not been paused, removed or left with a failed deployment;
4. a recovery override, when used, is `DATABASE_PRIVATE_URL=${{Postgres.DATABASE_URL}}` and is removed after the canonical variable is corrected.

## 8. Verification

The CI contract covers:

- Railway configuration shape and liveness-path selection;
- pre-deploy runtime configuration validation;
- deployment preparation twice against disposable PostGIS;
- deployment preparation twice against standard PostgreSQL with PostGIS confirmed unavailable;
- stale generic URL versus Railway-private endpoint precedence;
- PostgreSQL URL and complete `PG*` resolution;
- Railway production loopback denial;
- bounded transient connection retry and non-retryable failure behaviour;
- explicit MongoDB denial and secret-safe errors;
- deterministic public demo provisioning;
- viewer-only permission denial for edit and publish;
- login-page and homepage-dialog interactions;
- real Better Auth sign-in;
- account-to-dashboard navigation;
- server-protected dashboard access;
- configured and unconfigured production builds;
- configured readiness and liveness checks;
- unconfigured liveness success with strict readiness failure;
- desktop, tablet, mobile, keyboard and reduced-motion regression coverage.

After merge, verify that the Railway deployment corresponds to the merged `main` commit, Railway's `/api/health` check succeeds, `/api/ready` returns `200`, `/login` displays the public demo card, and the complete sign-in journey succeeds.

Before any spatial schema work is merged, add a release gate that verifies `postgis` is installed in production and that the migration, readiness endpoint and affected query paths fail closed when it is absent.

## 9. Operational boundaries

Public registration, password recovery, email verification delivery, real business onboarding publication and production owner credentials remain separate controlled journeys. The public demonstration account is not evidence that those release gates are complete.

Do not delete an existing Railway MongoDB service until confirming no other application uses it. It is simply not part of the OurValleys architecture.
