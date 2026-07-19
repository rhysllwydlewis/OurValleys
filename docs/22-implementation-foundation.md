# Implementation Foundation

## Status

Implemented on the first application foundation branch.

## Delivered scope

This vertical slice establishes:

- Next.js App Router and strict TypeScript.
- PostgreSQL, PostGIS and Drizzle schema/migrations.
- Better Auth route integration and database tables.
- pg-boss worker bootstrap and queue declarations.
- Validated environment variables.
- RCT place and business-category seed datasets.
- Public-only business repository projections.
- A local business directory route.
- A generated one-page business website route.
- Cross-tenant permission tests.
- Public/private projection tests.
- CI for linting, types, compatibility, migrations, seed, tests and build.

## Local setup

1. Install Node from `.node-version`.
2. Enable Corepack.
3. Copy `.env.example` to `.env.local`.
4. Start PostgreSQL/PostGIS with `docker compose up -d`.
5. Run `pnpm install --frozen-lockfile`.
6. Run `pnpm db:migrate`.
7. Run `pnpm db:seed`.
8. Optionally run `SEED_DEMO_CONTENT=true pnpm db:seed` to add a clearly fictional demo business.
9. Run `pnpm dev`.

The demo record uses an invalid `.invalid` email domain and states visibly that it is fictional. It must never be presented as a real local trader.

## Compatibility proof

`pnpm compatibility` imports and constructs the selected integration boundaries:

- Better Auth Next.js handler.
- Drizzle PostgreSQL client.
- PostgreSQL/PostGIS search expression.
- pg-boss queue client.
- Zod seed validation.

The integration suite additionally checks the required database extensions and an actual `ST_DWithin` geography query when `TEST_DATABASE_URL` is supplied.

## Public/private boundary

The first business route reads an explicit public selection. It does not join the private business profile, account, verification, billing or moderation data.

This is intentional defence in depth: adding a field to a database table does not automatically make it public.

## Current limitations

- Registration UI is not included yet and email/password authentication is disabled by default.
- No business editor or onboarding form exists yet.
- The search UI currently accepts a place slug rather than a place picker.
- Public pages require a live database.
- Media, enquiries, verification and publishing workflow remain subsequent slices.
- Place coordinates and some Welsh labels remain provisional and require review before public launch.
