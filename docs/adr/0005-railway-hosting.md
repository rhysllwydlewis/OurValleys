# ADR-0005: Railway managed hosting baseline

- **Status:** Accepted with review gates
- **Date:** 2026-07-19
- **Owners:** OurValleys product and engineering agents
- **Related backlog items:** OV-005, Phase 1A

## Context

The platform needs managed deployment for a Next.js web application, a background worker and PostgreSQL/PostGIS. The product owner already understands Railway through another project, which reduces setup friction, but familiarity alone is not enough: backup, networking, logs, migration and recovery behaviour must be explicit.

## Decision drivers

- Low operational burden.
- Separate staging and production environments.
- Managed PostgreSQL connectivity and private networking.
- Support for web and continuously running worker services.
- Pre-deploy database migrations.
- Central logs, metrics and environment-variable management.
- A realistic route to backup and restore.

## Options considered

### Railway

**Advantages**

- Straightforward Next.js, PostgreSQL and worker deployment.
- Private service networking and internal DNS.
- Pre-deploy commands support migration-before-release workflows.
- Existing product-owner familiarity.
- Logs, metrics and environment separation are available in one platform.

**Disadvantages**

- Platform-specific configuration creates some provider coupling.
- Cost and resource behaviour must be measured rather than assumed.
- Database restoration and regional availability need operational testing.

### Vercel plus a separate database and worker host

**Advantages**

- Strong Next.js deployment experience and edge integration.

**Disadvantages**

- Adds more providers and a separate worker-operating model.
- Cross-provider networking, billing and observability are more fragmented.

### Self-managed virtual machines

Rejected for the first release because patching, orchestration and recovery would consume time without creating user value.

## Decision

Use **Railway** as the initial managed application platform for:

- Next.js web service.
- Dedicated background worker service.
- Managed PostgreSQL/PostGIS service.
- Staging and production environments.

Hosting rules:

- Use private Railway networking for service-to-database communication.
- Use a pre-deploy command for committed migrations.
- Keep web and worker deployments independently scalable.
- Configure health checks, restart behaviour and structured logs.
- Pin runtime and package-manager versions.
- Keep object storage and transactional email behind provider interfaces so they can move independently.
- Production secrets must not be copied into local or preview environments.
- Provider backups are necessary but not sufficient; restoration must be exercised and documented.

## Consequences

### Positive

- One managed platform covers the main application, worker and database needs.
- Existing familiarity reduces avoidable deployment experimentation.
- Private networking limits public database exposure.

### Negative or accepted trade-offs

- Railway becomes a significant operational dependency.
- Scaling and cost assumptions remain provisional until load and pilot data exist.
- A later provider move will require deployment and database-transfer work.

### Required follow-up

- Record the selected region and data-processing implications before production.
- Configure staging and production separately.
- Create infrastructure and deployment documentation in the repository.
- Test migration failure behaviour and rollback.
- Test database backup restoration into a non-production environment.
- Add cost alerts and a monthly resource review.

## Security, privacy and safety effects

- Database services should not be publicly exposed unless a specific controlled operational need exists.
- Environment variables and deployment access require least privilege.
- Logs must redact secrets, authentication tokens, enquiry contents and private address data.
- Production access changes and manual database actions require records.

## Validation

Before public launch demonstrate:

- Deployment from the repository into staging.
- Successful private database connection.
- Pre-deploy migration and failed-migration stop behaviour.
- Independent worker deployment.
- Health and error monitoring.
- Backup restoration into a fresh non-production database.
- A documented response to platform or regional failure.

## Revisit trigger

Reconsider when measured cost, availability, region, database limits, custom-domain scale or operational constraints materially fail the project’s requirements, or before committing to an architecture that cannot be moved through normal container and PostgreSQL export paths.

## References

- https://docs.railway.com/guides/nextjs
- https://docs.railway.com/guides/private-networking
- https://docs.railway.com/guides/postgresql
- https://docs.railway.com/guides/backups
- https://docs.railway.com/guides/logs
- `../05-technical-architecture.md`
- `../13-testing-and-quality.md`
