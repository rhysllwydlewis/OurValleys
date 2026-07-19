# Technical Architecture

## 1. Status

This document recommends a starting architecture. It is not permission to begin coding before the validation tasks and stack decision record are completed.

## 2. Recommended baseline

For a small team or AI-assisted development workflow, use a **modular monolith** rather than microservices.

Recommended shape:

- TypeScript application.
- Next.js App Router for public pages, dashboards and server routes.
- PostgreSQL as the primary database.
- PostGIS for distance and geographic queries.
- A type-safe database access layer and migrations.
- S3-compatible object storage for user media.
- Managed email provider.
- Managed payment provider when subscriptions launch.
- Background job processing for email, image processing, indexing and scheduled work.
- PostgreSQL full-text search initially, with a dedicated search service only when evidence shows it is needed.
- Railway or an equivalent managed deployment platform, subject to a documented final hosting decision.

Why this baseline:

- The product is highly relational: users, memberships, businesses, places, categories, events, claims and permissions.
- Geographic radius and nearest-result queries are central.
- One deployable application is simpler to operate and debug during the early stages.
- Server-rendered public pages support performance, accessibility and discoverability.
- Shared application boundaries can still be kept modular without distributing the system.

## 3. Current official capability checks

As checked in July 2026:

- Next.js documents the App Router as its current application router and provides guidance for multi-tenant applications, metadata, route handlers, deployment and observability.
- PostgreSQL includes native full-text search.
- PostGIS supports indexed distance filtering such as `ST_DWithin` for geometry and geography values.
- Railway documents managed PostgreSQL and S3-compatible object storage as available platform capabilities.

These observations support the recommendation but do not lock versions. Exact supported versions must be confirmed when implementation begins.

## 4. Logical modules

Keep each module independently understandable even though it runs in one application.

```text
Identity and access
Businesses and memberships
Generated websites
Locations and categories
Search and discovery
Events
Editorial content
Enquiries and notifications
Media
Verification and claims
Moderation and reporting
Subscriptions and entitlements
Analytics
Administration
```

Each module should own:

- Its domain rules.
- Its data access methods.
- Its service functions.
- Its validation schemas.
- Its permission checks.
- Its event definitions.
- Its tests.

Avoid importing database tables directly throughout UI components.

## 5. Suggested repository structure

Framework details may change, but an equivalent separation should be preserved.

```text
src/
  app/
    (public)/
    (account)/
    dashboard/
    admin/
    api/
  modules/
    auth/
    businesses/
    business-sites/
    locations/
    categories/
    search/
    events/
    content/
    enquiries/
    media/
    verification/
    moderation/
    billing/
    analytics/
  components/
    ui/
    forms/
    public/
    dashboard/
    admin/
  lib/
    database/
    permissions/
    validation/
    security/
    email/
    storage/
    observability/
  jobs/
  tests/
    unit/
    integration/
    e2e/
```

Do not turn `lib` or `utils` into an unowned dumping ground.

## 6. Rendering model

### Public discovery pages

Prefer server rendering or static generation with controlled revalidation for:

- Business websites.
- Town pages.
- Category pages.
- Event pages.
- Guides.

### Dashboards

Use authenticated server-side data loading with client components only where interactivity requires them.

### Preview

Draft previews must:

- Require authorised signed access.
- Be excluded from indexing.
- Clearly indicate preview state.
- Never expose private verification fields.

## 7. Multi-tenancy model

OurValleys is multi-tenant at the business level.

Requirements:

- Every business-owned query must include an authorised business membership context.
- Do not trust a business identifier sent by the browser without checking membership.
- Background jobs must carry explicit tenant identifiers.
- Cache keys must include tenant and publication state where applicable.
- Media ownership must be verified before attachment or deletion.
- Custom-domain routing must resolve to one active published business site.

The database may be shared across tenants initially. Separate databases per business would be unnecessary and operationally expensive.

## 8. Database approach

### PostgreSQL

Use migrations committed to the repository. Production schema changes should be reviewed and reversible where practical.

### PostGIS

Use geographic types for location-aware search rather than hand-written postcode distance approximations.

Potential use cases:

- Businesses within a radius.
- Events near a location.
- Nearest town or venue.
- Service-area matching.

### Constraints

Enforce important rules in both application logic and the database where appropriate:

- Unique slugs.
- Valid state values.
- Foreign-key integrity.
- One active custom-domain assignment.
- Event time validity.
- Membership uniqueness.

### Transactions

Use transactions for:

- Ownership transfers.
- Claim approval.
- Publishing a revision and updating the current pointer.
- Subscription entitlement changes.
- Moderation actions involving several records.

## 9. Search strategy

### Phase 1

Use PostgreSQL full-text search, trigram or equivalent similarity support, structured filters and PostGIS distance queries.

Create a search projection containing only public, approved fields.

### Dedicated search service trigger

Introduce a separate search engine only when one or more are demonstrated:

- Search latency cannot meet targets after indexing and query optimisation.
- Typo tolerance and ranking requirements become too complex.
- Cross-entity faceting becomes operationally difficult.
- Search traffic needs independent scaling.

A dedicated search service adds synchronisation, recovery and privacy complexity and should not be adopted merely because it appears more advanced.

## 10. Media architecture

- Upload directly or through short-lived signed upload instructions.
- Store originals in private or controlled object storage.
- Validate file type from content, not filename alone.
- Limit file size and dimensions.
- Remove metadata such as unnecessary location information from public derivatives.
- Generate optimised image variants asynchronously.
- Scan or quarantine unsupported files.
- Store ownership, rights basis, credit and alt text.
- Deliver public media through controlled URLs or CDN.
- Never allow uploaded SVG, HTML or scripts to execute without strict sanitisation and a documented need.

## 11. Background jobs

Suitable tasks:

- Email delivery.
- Image resizing.
- Search projection updates.
- Sitemap generation.
- Event status transitions.
- Reminder notifications.
- Domain verification.
- Analytics aggregation.
- Retention and deletion jobs.

Requirements:

- Idempotent handlers where retries are possible.
- Attempt limits and dead-letter handling.
- Structured logs with correlation identifiers.
- No unbounded retry loops.
- Administrative visibility for failed critical jobs.

## 12. Authentication and sessions

- Use a mature authentication solution rather than building password cryptography.
- Verify email before sensitive publishing or claiming actions.
- Require multi-factor authentication for administrator accounts.
- Support session revocation and device review where feasible.
- Store recovery tokens securely and with expiry.
- Re-authenticate before ownership transfer, sensitive data export or account closure.
- Rate-limit sign-in, recovery and verification endpoints.

## 13. Authorisation

Authorisation must run on the server for every protected action.

Use:

- Platform roles for staff powers.
- Business membership roles.
- Fine-grained permissions for sensitive actions.
- Explicit resource ownership checks.

Never rely on:

- Hidden buttons.
- Client-side role values.
- URL obscurity.
- Sequential identifiers alone.

## 14. API and action design

Whether implemented as route handlers, server actions or another server interface:

- Validate all input with shared schemas.
- Return typed error categories.
- Avoid exposing database errors.
- Apply permission checks close to the operation.
- Use idempotency keys for payment or duplicate-sensitive writes.
- Paginate list endpoints.
- Apply rate limits by action risk.
- Use allowlisted response fields.
- Record relevant audit actions.

## 15. Caching

Cache only with a clear invalidation rule.

- Public published pages may be cached.
- Draft previews must not enter public caches.
- Private dashboards must not be shared across users.
- Publication, suspension and correction actions must invalidate relevant pages and search projections.
- Cache keys for location results must include query and filter state.

## 16. Email and notifications

- Separate transactional and marketing purposes.
- Version templates.
- Keep sensitive information out of subject lines.
- Use signed links with expiry for sensitive actions.
- Record delivery state without copying unnecessary private message content.
- Honour suppression and notification preferences.
- Configure sender authentication before production.

## 17. Billing

When subscriptions launch:

- Use a hosted payment provider.
- Do not store full card details.
- Treat provider webhooks as untrusted input until signature verification succeeds.
- Make webhook handlers idempotent.
- Store plan versions and entitlements.
- Keep feature access based on local entitlement records synchronised from provider events.
- Provide grace states for payment failures rather than immediately destroying business content.

## 18. Observability

Required from the beginning:

- Structured application logs.
- Error tracking.
- Request correlation identifiers.
- Health checks.
- Deployment visibility.
- Database performance monitoring.
- Background job failure monitoring.
- Authentication and enquiry failure alerts.
- Audit trail for sensitive administrative actions.

Logs must avoid passwords, tokens, full enquiry text, private addresses and verification evidence.

## 19. Environments

Minimum:

- Local development.
- Preview or test environment.
- Production.

Rules:

- Separate databases and secrets.
- No production personal data copied into development by default.
- Preview deployments must not become indexable public copies.
- Destructive test tools cannot point at production.
- Production migrations need a backup and rollback consideration.

## 20. Backups and recovery

- Automated database backups.
- Object-storage durability and recovery understood.
- Encryption and access controls.
- Periodic restore tests.
- Documented recovery objectives.
- Export of critical configuration where provider-specific settings exist.
- Recovery process for accidental business-page deletion or publication errors.

A backup is not proven until restoration has been tested.

## 21. Security baseline

- Dependency scanning.
- Secret scanning.
- Static analysis.
- Branch protection when active development begins.
- Code review before production deployment.
- File upload controls.
- Content Security Policy.
- Secure headers.
- CSRF protection where relevant.
- Output encoding and sanitisation.
- Rate limits and bot controls.
- Least-privilege infrastructure credentials.
- Regular access review for administrators.
- Responsible disclosure route in `SECURITY.md`.

## 22. Deployment recommendation

A managed platform is preferable initially because it reduces infrastructure work. Railway is a reasonable candidate given the owner's existing familiarity, but it should be confirmed against:

- PostGIS support and migration control.
- Backup and restore requirements.
- Object storage.
- background workers.
- custom domains and certificates.
- preview environments.
- logs and metrics.
- predictable cost at projected traffic.
- data-processing and supplier terms.

The application should remain container-compatible enough to avoid an irreversible hosting dependency.

## 23. Architecture decision records

Create an ADR before locking:

1. Web framework.
2. Database and geospatial strategy.
3. Authentication provider.
4. Hosting platform.
5. Object storage.
6. Email provider.
7. Billing provider.
8. Search strategy.
9. Analytics platform.
10. Content editor approach.

Each ADR should state context, options, decision, consequences and revisit trigger.

## 24. Reference links

- Next.js App Router: https://nextjs.org/docs/app
- Next.js multi-tenant guide index: https://nextjs.org/docs/app/guides
- PostgreSQL full-text search: https://www.postgresql.org/docs/current/textsearch.html
- PostGIS distance filtering: https://postgis.net/documentation/tips/st-dwithin/
- Railway data and storage: https://docs.railway.com/data-storage
