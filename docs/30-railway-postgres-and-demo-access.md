# Railway PostgreSQL and Staged Demo Access

## 1. Outcome

Issue #42 makes the Railway release path match the accepted OurValleys architecture and provides a safe demonstration of protected business access. Issue #46 hardens that path for Railway's standard PostgreSQL image. Issue #48 hardens private endpoint selection and transient database-start recovery. Issue #50 separates Railway process liveness from strict dependency readiness while validating runtime configuration before release. Issue #102 adds temporary public business-owner and administrator demonstrations outside the public release stage. Pull request #132 adds the release-stage, reference-data, search-extension and deployed-origin contracts recorded in `34-launch-foundation-and-public-release-controls.md`.

OurValleys uses **PostgreSQL** as its single system of record. PostGIS remains the target spatial capability for future geographic columns and spatial search, but the currently implemented schema is deliberately non-spatial and runs safely on Railway's standard PostgreSQL image. The application does not use MongoDB. Drizzle migrations, Better Auth sessions, tenant memberships, publication state and reference-data imports depend on PostgreSQL constraints and transactions.

A MongoDB service in the Railway project is therefore not a compatible `DATABASE_URL` target and must not be connected to the application as a second datastore.

## 2. Required Railway services and variables

The Railway project needs:

1. the OurValleys web service connected to this repository and deploying `main`;
2. a Railway PostgreSQL service named `Postgres` or another clearly identifiable name in the same environment;
3. later, before the first geometry/geography column or spatial query, a controlled upgrade to a PostGIS-capable service or image;
4. a separately configured worker service using the same PostgreSQL environment when background operations are activated.

The web and worker services must define:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
BETTER_AUTH_SECRET=<private random value of at least 32 characters>
OURVALLEYS_RELEASE_STAGE=development
```

Use the actual PostgreSQL service name when it is not `Postgres`. Do not copy the resolved connection string into GitHub, documentation or chat. The Railway reference must point to the PostgreSQL service in the same project environment.

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

Public release additionally requires:

```text
OURVALLEYS_RELEASE_STAGE=public
PRIVILEGED_DEMOS_REMOVED=true
POLICIES_APPROVED=true
ADMIN_MFA_READY=true
RESEND_API_KEY=<protected value>
EMAIL_FROM=<verified sender>
R2_ACCOUNT_ID=<protected value>
R2_ACCESS_KEY_ID=<protected value>
R2_SECRET_ACCESS_KEY=<protected value>
R2_BUCKET=<bucket name>
R2_PUBLIC_BASE_URL=https://<approved media origin>
```

Blank optional provider variables are treated as unconfigured outside public release. In public mode every listed provider field is required.

## 3. Database extension boundary

Railway's standard PostgreSQL image intentionally does not include PostGIS. The initial migration treats PostGIS as optional while the committed schema contains no spatial type or function dependency.

Ranked public discovery does depend on PostgreSQL's accepted `pg_trgm` and `unaccent` extensions. Migration `0012_reference_search_and_coordinates` installs both and creates the associated search indexes. The Standard PostgreSQL compatibility workflow proves these extensions are available and installed on the accepted PostgreSQL 16 image without PostGIS.

No geometry-dependent feature may be merged or enabled until production PostGIS readiness is explicitly tested. Future applied migrations remain immutable; new schema changes use new migration files.

## 4. Release sequence and health boundaries

`railway.json` defines:

```text
pre-deploy: pnpm deploy:prepare
start:      pnpm start
health:     /api/health
readiness:  /api/ready
```

`pnpm deploy:prepare` performs, in order:

1. validates database, authentication, release-stage, provider and canonical-origin configuration without logging protected values;
2. resolves and classifies the selected database configuration without logging its URL, hostname, username or password;
3. waits for initial PostgreSQL connectivity with bounded retries for recognised transient refusal and DNS failures;
4. runs committed Drizzle migrations through the application migrator with secret-safe diagnostics;
5. seeds deterministic fictional application data;
6. imports versioned place and category reference data transactionally;
7. provisions the stage-appropriate demonstration accounts.

The connection wait makes six attempts with bounded exponential delays. It retries recognised transient connectivity codes including `ECONNREFUSED`, `ECONNRESET`, `ETIMEDOUT`, `EHOSTUNREACH`, `ENETUNREACH`, `EAI_AGAIN`, `ENOTFOUND` and PostgreSQL `57P03`. Authentication failures, invalid configuration and migration SQL errors remain immediate failures.

All release operations are safe to repeat. The reference import replaces obsolete parent links for imported children and updates or removes versioned locality coordinates. A failed validation, migration, seed, import or account-provision step exits non-zero, so Railway does not release that deployment. The previous healthy deployment remains the immediate application rollback point.

The two HTTP signals have deliberately separate responsibilities:

- `/api/health` is dependency-free process liveness. Railway uses it to confirm the built container started, bound to the assigned port and can receive network traffic.
- `/api/ready` is strict dependency readiness. It returns `200` only when PostgreSQL is reachable and Better Auth can be constructed from valid runtime configuration; otherwise it returns `503` with bounded component states.

Railway's health check does not depend on public-origin or downstream dependency construction after the same requirements have already been validated during preparation. Strict readiness remains part of post-deploy verification and operational monitoring.

## 5. Demonstration-account stages

The homepage sign-in dialog discloses the least-privilege viewer account. During `development` and `private_pilot`, the full `/login` route also discloses the temporary business-owner and administrator demonstrations:

| Demonstration  | Email                              | Password               | Access                                                                       |
| -------------- | -------------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| Viewer         | `demo.viewer@ourvalleys.example` | `PUBLIC-DEMO-ONLY`     | View the fictional Cwm & Coil Heating dashboard                               |
| Business owner | `demo.owner@ourvalleys.example`  | `PUBLIC-BUSINESS-DEMO` | Edit and publish only the seeded fictional business outside public release   |
| Platform admin | `demo.admin@ourvalleys.example`  | `PUBLIC-ADMIN-DEMO`    | Inspect a sanitised read-only administration overview outside public release |

These passwords are public demonstration content, not private secrets. They must never be reused for real accounts.

The viewer:

- belongs to a deterministic fictional user;
- has an active `viewer` membership for the fictional `Cwm & Coil Heating` record;
- has `business.view` only;
- cannot edit the profile, publish or manage members.

The temporary business-owner demonstration:

- uses a dedicated identity not shared with seeded moderation examples;
- is provisioned with exactly one active membership for `Cwm & Coil Heating`;
- receives only `business.view`, `business.edit_profile` and `business.publish`;
- has accidental non-target memberships removed during provisioning;
- cannot access private operations, appearance or media management, account settings or ownership claims;
- cannot create additional business records or cross tenant boundaries.

The temporary administrator demonstration:

- is provisioned by email and granted the Better Auth `admin` role;
- sees a sanitised overview rather than live user, report, private business or audit records;
- is denied Better Auth admin APIs and every application administrator mutation.

At `public` release, only the viewer is provisioned or shown. Release preparation queries `auth_user` and fails while either privileged demonstration identity remains. The owner and administrator identities must be removed operationally, their sessions revoked and `PRIVILEGED_DEMOS_REMOVED=true` set only after independent verification.

## 6. User journeys

### Viewer in every stage

1. Open `/login` or the homepage sign-in dialog.
2. Select **Fill demo details**.
3. Review the visibly disclosed email and password.
4. Select **Sign in**.
5. The server-authorised `/account` page lists the fictional viewer membership.
6. Select **Open business dashboard**.
7. The dashboard performs a fresh server-side membership and permission check before rendering read-only controls.

### Temporary business owner outside public release

1. Open `/login`.
2. Select **Fill business demo details**.
3. Review the details and select **Sign in**.
4. The account opens the seeded Cwm & Coil Heating dashboard with bounded edit and publish capabilities.
5. `/account` exposes exactly one business dashboard and no separate moderation fixtures.

### Temporary platform administrator outside public release

1. Open `/login`.
2. Select **Fill admin demo details**.
3. Review the details and select **Sign in**.
4. The account opens a sanitised `/admin` overview; private administrator routes redirect back and all mutations fail closed.

The fill helpers never submit automatically. Public demo sessions are forced non-persistent at the authentication route boundary. Public discovery remains available without an account.

## 7. Failure behaviour

- A MongoDB URI, malformed URL or incomplete standalone `PG*` set produces a bounded configuration error without echoing usernames, passwords or connection strings.
- A production Railway URL targeting localhost is rejected with an instruction to reference the PostgreSQL service.
- A missing PostgreSQL reference, undersized authentication secret or missing canonical origin causes pre-deploy validation to fail before release.
- A public release with incomplete flags, providers or privileged demo identities fails before startup.
- Transient refusal or DNS errors are retried for a bounded period and then fail with the underlying error code.
- Migration logs identify only the chosen configuration source and endpoint class; they do not print the endpoint itself.
- A database outage returns `503` from `/api/ready` while `/api/health` continues to represent process liveness.
- Public database-dependent views use honest unavailable states.
- Permission checks remain fail-closed when the membership query fails.
- The custom migration runner emits PostgreSQL error codes, details and hints while redacting connection credentials.

An `ECONNREFUSED` that persists after all retries means the selected host and port have no reachable PostgreSQL listener. Check that:

1. the `Postgres` service is deployed and healthy in the same Railway environment as the web service;
2. the web service variable is a live `${{Postgres.DATABASE_URL}}` reference rather than localhost, MongoDB, a placeholder or an expired copied value;
3. the PostgreSQL service has not been paused, removed or left with a failed deployment;
4. a recovery override, when used, is `DATABASE_PRIVATE_URL=${{Postgres.DATABASE_URL}}` and is removed after the canonical variable is corrected.

## 8. Verification

The CI contract covers:

- Railway configuration shape and liveness-path selection;
- runtime configuration and release-stage validation;
- deployment preparation twice against disposable PostGIS;
- deployment preparation twice against standard PostgreSQL with PostGIS confirmed unavailable;
- all committed migrations, deterministic fixtures and reference-data imports;
- `pg_trgm` and `unaccent` installation;
- stale generic URL versus Railway-private endpoint precedence;
- bounded connection retry and non-retryable failures;
- secret-safe diagnostics and explicit MongoDB denial;
- development viewer, single-business owner and sanitised administrator provisioning;
- public release failure while privileged identities remain;
- viewer-only public release preparation twice after privileged identity removal;
- strict tenant and permission boundaries;
- configured and unconfigured production builds;
- readiness and liveness checks;
- desktop, tablet, mobile, keyboard and reduced-motion regression coverage.

Before merge, both CI and Standard PostgreSQL checks must pass on the final pull-request head. After merge, verify that the Railway deployment corresponds to the merged `main` commit, `/api/health` succeeds and `/api/ready` returns `200`.

For development or private pilot, verify all three intended sign-ins. For public release, run the `Production smoke` workflow against the HTTPS origin and verify the retained viewer, absence of privileged login controls, public indexing boundary and connected routes.

Before any spatial schema work is merged, add a release gate that verifies PostGIS is installed in production and that migration, readiness and affected query paths fail closed when it is absent.

## 9. Operational boundaries

Public registration, password recovery, email verification delivery, real business onboarding publication and private production owner credentials remain separate controlled journeys. Public development accounts are not evidence that those release gates are complete.

The business-owner and administrator demonstrations must be removed before public launch by following `33-development-demo-and-external-news.md`. Administrator multi-factor authentication, provider configuration, policy approval and public-launch approval remain genuine gates.

Do not delete an existing Railway MongoDB service until confirming no other application uses it. It is simply not part of the OurValleys architecture.
