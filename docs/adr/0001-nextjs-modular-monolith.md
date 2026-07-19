# ADR-0001: Next.js TypeScript modular monolith

- **Status:** Accepted
- **Date:** 2026-07-19
- **Owners:** OurValleys product and engineering agents
- **Related backlog items:** OV-005, Phase 1A

## Context

OurValleys needs public search-friendly pages, authenticated dashboards, administration, forms, background work and a generated business-site renderer. The project will be vibe coded heavily and should minimise infrastructure and duplicated patterns while the product is still being validated.

## Decision drivers

- Strong server-rendering and metadata support for public local content.
- One language and repository across public pages, dashboards and APIs.
- Good support for incremental vertical slices and automated testing.
- Low operational complexity for an initially small team.
- Compatibility with managed Node hosting and a separate worker process.
- Clear module boundaries without premature distributed systems.

## Options considered

### Next.js App Router modular monolith

**Advantages**

- Combines public rendering, server-side application logic and dashboards.
- Current official defaults include TypeScript, App Router, Tailwind and ESLint.
- Server Components reduce unnecessary client JavaScript when used carefully.
- One deployable application is easier to operate and understand.

**Disadvantages**

- Server and client boundaries require discipline.
- Long-running jobs must not execute inside request handlers.
- A poorly structured monolith can become tightly coupled.

### Separate frontend and API services

**Advantages**

- Strong deployment separation.
- Different clients can consume the API independently.

**Disadvantages**

- Duplicates contracts, authentication integration and operational work early.
- Creates more deployments and failure modes before the product is proven.

### Microservices

Rejected because the platform has no current scale or organisational requirement that justifies distributed data, networking and deployment complexity.

## Decision

Use a **TypeScript Next.js App Router modular monolith** in one repository.

- Use **Node.js 24 LTS** as the initial runtime baseline.
- Use `pnpm` with a committed lockfile.
- Keep application code under `src/`.
- Organise domain modules around capabilities such as identity, businesses, places, events, enquiries, media, publishing, search and administration.
- Keep domain rules outside React components and route handlers.
- Use server-side services for protected operations.
- Run background jobs in a separate worker process from the same repository.
- Do not create independently deployed microservices without a later ADR.

## Consequences

### Positive

- A coding agent can trace a feature through UI, service, data and tests in one repository.
- Public and authenticated experiences can share components and validation safely.
- Deployment and local development remain comparatively simple.

### Negative or accepted trade-offs

- Module boundaries rely on repository conventions and tests rather than network isolation.
- Care is required to prevent server-only code entering browser bundles.
- The web application cannot be used for unbounded background processing.

### Required follow-up

- Scaffold explicit module folders and dependency rules.
- Add CI checks for lint, typecheck, tests and production build.
- Add an architecture test or lint rule preventing forbidden cross-module imports once module boundaries exist.

## Security, privacy and safety effects

- Server-side authorisation remains mandatory for all protected actions.
- Public response projections must not expose private ORM records.
- Administrative routes must be protected independently of navigation visibility.
- Background work uses a dedicated worker identity and least-privilege configuration.

## Validation

The first scaffold must demonstrate:

- A public server-rendered page.
- A protected server-side route.
- A database-backed vertical slice.
- A separate worker entry point.
- Successful lint, typecheck, unit test and production build commands.

## Revisit trigger

Reconsider only when a measured deployment, scaling, security or organisational constraint cannot be solved cleanly within the modular monolith, or when another client requires a stable independently operated API.

## References

- https://nextjs.org/docs/app
- https://nextjs.org/docs/app/getting-started/installation
- https://nodejs.org/en/about/previous-releases
- `../05-technical-architecture.md`
- `../14-agent-build-guide.md`
