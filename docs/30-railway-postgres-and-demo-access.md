# Railway PostgreSQL and Public Demo Access

## 1. Outcome

Issue #42 makes the Railway release path match the accepted OurValleys architecture and provides a safe demonstration of protected business access.

OurValleys uses **PostgreSQL with PostGIS** as its single system of record. The application does not use MongoDB. Drizzle migrations, Better Auth sessions, tenant memberships, publication state and future geographic search all depend on PostgreSQL constraints and transactions.

A MongoDB service in the Railway project is therefore not a compatible `DATABASE_URL` target and must not be connected to the application as a second datastore.

## 2. Required Railway services

The Railway project needs:

1. The existing OurValleys web service connected to this repository and deploying `main`.
2. A Railway PostgreSQL service named `Postgres` or another clearly identifiable name.
3. Later, a separately configured worker service using the same PostgreSQL environment.

The web service must define:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
BETTER_AUTH_SECRET=<private random value of at least 32 characters>
```

Use the actual PostgreSQL service name in the reference if it is not `Postgres`. Do not copy the resolved connection string into GitHub, documentation or chat.

Railway supplies `RAILWAY_PUBLIC_DOMAIN` after a public domain is generated for the web service. The application derives `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` from that HTTPS domain when explicit values are absent. Explicit URL variables remain supported for staging, custom-domain or local environments.

The runtime also accepts Railway-style `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` and `PGDATABASE` only when the complete set is present. A PostgreSQL URL is preferred because it creates an explicit service dependency in Railway.

## 3. Release sequence

`railway.json` now defines:

```text
pre-deploy: pnpm deploy:prepare
start:      pnpm start
health:     /api/ready
```

`pnpm deploy:prepare` performs, in order:

1. committed Drizzle migrations;
2. deterministic fictional seed data;
3. provisioning of the intentionally public demonstration account.

All three operations are safe to repeat. A failed migration, seed or account provision exits non-zero, so Railway does not release that deployment. The previous healthy deployment remains the rollback point.

`/api/ready` requires the PostgreSQL connection and authentication configuration to be usable. `/api/health` remains a liveness endpoint for process diagnosis but is not sufficient for traffic routing.

## 4. Public demonstration account

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

## 5. User journey

1. Open `/login` or the homepage sign-in dialog.
2. Select **Fill demo details**.
3. Review the visibly disclosed email and password.
4. Select **Sign in**.
5. The server-authorised `/account` page lists the fictional viewer membership.
6. Select **Open business dashboard**.
7. `/dashboard/business/00000000-0000-4000-8000-000000000401` performs a fresh server-side membership and permission check before rendering.

The helper never submits automatically. Public discovery remains available without an account.

## 6. Failure behaviour

- A MongoDB URI, malformed URL or incomplete `PG*` set produces a bounded configuration error without echoing usernames, passwords or connection strings.
- A missing PostgreSQL reference causes pre-deploy preparation to fail before release.
- Missing authentication secret or public origin causes readiness to remain unavailable.
- A database outage returns `503` from `/api/ready` and public database-dependent views use their existing honest unavailable states.
- Permission checks remain fail-closed when the membership query fails.

## 7. Verification

The CI contract covers:

- Railway configuration shape;
- deployment preparation twice against disposable PostGIS;
- PostgreSQL URL and `PG*` resolution;
- explicit MongoDB denial and secret-safe errors;
- deterministic public demo provisioning;
- viewer-only permission denial for edit and publish;
- login-page and homepage-dialog interactions;
- real Better Auth sign-in;
- account-to-dashboard navigation;
- server-protected dashboard access;
- configured and unconfigured production builds;
- runtime liveness and readiness smoke tests;
- desktop, tablet, mobile, keyboard and reduced-motion regression coverage.

After merge, verify that the Railway deployment corresponds to the merged `main` commit, `/api/ready` returns `200`, `/login` displays the public demo card, and the complete sign-in journey succeeds.

## 8. Operational boundaries

Public registration, password recovery, email verification delivery, real business onboarding publication and production owner credentials remain separate controlled journeys. The public demonstration account is not evidence that those release gates are complete.

Do not delete an existing Railway MongoDB service until confirming no other application uses it. It is simply not part of the OurValleys architecture.
