# ADR-0003: Drizzle ORM and reviewed SQL migrations

- **Status:** Accepted
- **Date:** 2026-07-19
- **Owners:** OurValleys product and engineering agents
- **Related backlog items:** OV-005, Phase 1A

## Context

The application needs type-safe database access without hiding PostgreSQL features such as transactions, constraints, full-text search and PostGIS. AI coding agents also need migrations that can be inspected rather than opaque schema changes applied directly to production.

## Decision drivers

- TypeScript-first schemas and query results.
- Direct access to PostgreSQL and extension-specific SQL.
- Reviewable migrations committed with code.
- Support for transactions and test databases.
- Low runtime abstraction and predictable queries.

## Options considered

### Drizzle ORM and Drizzle Kit

**Advantages**

- TypeScript schemas closely represent SQL tables.
- Supports PostgreSQL drivers and custom SQL where necessary.
- Supports PostGIS geometry types.
- Generated SQL migrations remain visible and reviewable.

**Disadvantages**

- Some complex PostGIS or search queries will use explicit SQL.
- Agents must avoid scattering raw SQL without shared repository helpers.

### Prisma

**Advantages**

- Mature tooling and broad adoption.
- Accessible schema language.

**Disadvantages**

- Adds a different schema language and greater abstraction from PostgreSQL-specific behaviour.
- Extension-heavy queries would still require raw SQL or workarounds.

### Hand-written SQL only

**Advantages**

- Maximum database control.

**Disadvantages**

- More repetitive mapping and weaker default type inference for routine application work.

## Decision

Use **Drizzle ORM** for schema definitions and routine database access, with **Drizzle Kit-generated SQL migrations committed to the repository**.

Rules:

- Production schema changes use committed migrations; never use an unreviewed schema push against production.
- Generated SQL must be reviewed for locks, destructive changes, defaults, indexes and data backfills.
- Complex PostGIS, full-text and reporting queries may use parameterised SQL through shared repositories.
- Database models must not be returned directly from public routes.
- Migrations and application deployment are separate steps; migrations run in the hosting pre-deploy phase.
- A migration must include a forward-fix or rollback plan for material risk.

## Consequences

### Positive

- Schema and application types remain close together.
- SQL behaviour remains visible to reviewers and agents.
- PostgreSQL-specific capabilities are not designed away.

### Negative or accepted trade-offs

- The project must maintain discipline around migration review.
- Some advanced queries will not use the highest-level query API.

### Required follow-up

- Establish naming, timestamp and migration-folder conventions.
- Add migration checks to CI.
- Add integration tests against real PostgreSQL/PostGIS, not an in-memory substitute.
- Document the production migration and recovery command once hosting is scaffolded.

## Security, privacy and safety effects

- Public projections and permission-scoped repositories remain explicit.
- Migrations adding personal data require purpose, visibility and retention review.
- Destructive production migrations require backup evidence and a recovery plan.

## Validation

The scaffold must prove:

- Empty-database migration.
- Representative upgrade migration with existing fixtures.
- PostGIS field and index creation.
- Transactional operation and rollback.
- CI detection of schema drift.

## Revisit trigger

Reconsider only if Drizzle cannot support a required stable PostgreSQL feature without unsafe or excessive custom infrastructure, or maintenance evidence materially favours another approach.

## References

- https://orm.drizzle.team/docs/get-started-postgresql
- https://orm.drizzle.team/docs/extensions/pg
- https://orm.drizzle.team/docs/column-types/pg
- `../04-data-model.md`
- `../13-testing-and-quality.md`
