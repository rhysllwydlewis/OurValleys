# ADR-0002: PostgreSQL with PostGIS

- **Status:** Accepted
- **Date:** 2026-07-19
- **Owners:** OurValleys product and engineering agents
- **Related backlog items:** OV-003, OV-005, Phase 1A

## Context

OurValleys contains strongly related data: users, businesses, memberships, locations, services, publishing states, events, enquiries, verification, moderation and audit records. Geographic distance and containment are core product capabilities. Important state changes need constraints and transactions.

## Decision drivers

- Relational integrity and transactional state changes.
- Geographic point, radius and boundary queries.
- Search support without an immediate separate engine.
- Mature backup, migration and operational tooling.
- Compatibility with Railway and Drizzle.
- Ability to isolate public projections from private records.

## Options considered

### PostgreSQL with PostGIS

**Advantages**

- Strong constraints, transactions and indexing.
- PostGIS supports accurate geographic data and queries.
- PostgreSQL extensions can support initial text and fuzzy search.
- One principal datastore reduces operational complexity.

**Disadvantages**

- Requires deliberate indexing and query review.
- Extension availability must be confirmed in each environment.
- Geographic data needs an agreed coordinate system and validation.

### Document database

**Advantages**

- Flexible documents and quick initial modelling.

**Disadvantages**

- Weaker fit for memberships, publication states, verification, billing and other related transactional data.
- Geographic and relational consistency would require more application logic.

### Multiple specialised databases from launch

Rejected because the current product does not justify separate transactional, search and geographic stores.

## Decision

Use **PostgreSQL as the system of record**, with **PostGIS** enabled for geographic functions.

Initial database extensions should include:

- `postgis` for geometry and distance queries.
- `pg_trgm` for controlled fuzzy matching.
- `unaccent` for normalised search where supported and tested.

Geographic conventions:

- Store canonical public coordinates as `geometry(Point, 4326)` unless a specific use case requires another type.
- Store precise private addresses separately from public map points.
- Use PostGIS geography casts or appropriate projected calculations for distance in metres.
- Never expose a home-based business’s private location through query precision or public APIs.

Operational conventions:

- Use separate databases or isolated environments for local, test, staging and production.
- Commit and review migrations.
- Enable provider backups and perform documented restoration exercises.
- Record the provisioned PostgreSQL major version rather than depending on an unspecified latest image.

## Consequences

### Positive

- The core product can enforce ownership, lifecycle and uniqueness rules in the database.
- Local radius search can remain within the primary datastore initially.
- Transactions can cover business creation, ownership and queued follow-up work.

### Negative or accepted trade-offs

- PostGIS and extension behaviour must be represented in local and CI environments.
- Search and geographic indexes need monitoring as data grows.
- A single database is a significant dependency and requires tested recovery.

### Required follow-up

- Add a local PostgreSQL/PostGIS development service.
- Add extension migrations and startup checks.
- Define backup retention and restoration procedure for the selected host.
- Add tests proving public location queries cannot reveal private addresses.

## Security, privacy and safety effects

- Public and private location fields must be separate and explicitly projected.
- Database credentials must be environment-specific and least privilege where practical.
- Production access and destructive operations require auditability.
- Backups contain personal data and must receive equivalent access control and retention treatment.

## Validation

The initial data prototype must demonstrate:

- Applying extensions and migrations to an empty database.
- Creating a business with public service areas and an optional private address.
- Radius search using representative RCT coordinates.
- Transaction rollback for a failed multi-record operation.
- Backup restoration into a non-production environment before public launch.

## Revisit trigger

Reconsider the single-database approach only when measured workload, isolation, legal or availability requirements cannot be met by supported PostgreSQL scaling and read patterns.

## References

- https://www.postgresql.org/docs/current/index.html
- https://postgis.net/documentation/
- https://docs.railway.com/guides/postgresql
- `../04-data-model.md`
- `../05-technical-architecture.md`
