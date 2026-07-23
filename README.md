# OurValleys

OurValleys is an independent local discovery and business platform for Rhondda Cynon Taf, designed to connect residents, businesses, community organisations, events and useful local information through one shared location-based system.

The flagship product is a generated one-page website for every participating local business. A business maintains one structured profile, and the same information powers its website, directory presence, search results, town pages, offers, events and future platform modules.

> **Current status:** autonomous Phase 1 implementation is active. The application scaffold, first fictional business discovery/generated-site slice, premium search-first homepage, Railway PostgreSQL release preparation, public development demonstrations and attributed external-news route are implemented for validation. External validation, brand confirmation, governance and launch-content work continue in parallel with successor product slices.

## Technical baseline

The accepted initial architecture is:

- Strict TypeScript.
- Next.js App Router.
- Node.js 24 LTS.
- `pnpm` with a committed lockfile.
- Modular monolith.
- PostgreSQL with PostGIS.
- Drizzle migrations.
- Better Auth.
- Railway hosting, Cloudflare R2 media, Resend email and pg-boss jobs.

See [`docs/adr/0001-nextjs-modular-monolith.md`](docs/adr/0001-nextjs-modular-monolith.md) and the remaining accepted ADRs.

## Application scaffold

The repository contains the public server-rendered application, database and migration proof, database-backed authentication boundary, protected server route, separate worker process, environment validation, repeatable seed, committed lockfile and read-only CI validation. Local setup and verification are recorded in [`docs/23-application-scaffold-proof.md`](docs/23-application-scaffold-proof.md).

## First connected product slice

A canonical fictional business record powers both `/businesses` discovery and `/b/cwm-coil-heating`. The slice includes an explicit public/private data boundary, services, location visibility, opening hours, publication state, membership-based tenant access and responsive/keyboard validation. It is documented in [`docs/24-public-business-discovery-slice.md`](docs/24-public-business-discovery-slice.md).

No real business is represented, verified or invited by this fixture.

## Premium homepage

The public homepage now provides server-rendered search, manual location choice, responsive discovery modules, selective liquid glass, progressive animation, a reduced-motion equivalent and an accessible sign-in dialog/mobile sheet with a dedicated route fallback. Its generated-site demonstration reuses the same canonical business record as the directory and public business page.

The supplied Claude Design export was used as a visual source of truth and rebuilt as production Next.js components rather than importing its prototype runtime. Implementation and validation decisions are recorded in [`docs/25-premium-homepage-design-system.md`](docs/25-premium-homepage-design-system.md).

## Railway database and development demonstration access

OurValleys uses PostgreSQL/PostGIS, not MongoDB. Railway releases validate runtime configuration, run committed migrations, load deterministic fictional seed data and provision the public development demonstrations before startup. Railway uses `/api/health` for dependency-free process liveness, while `/api/ready` remains the strict database-and-authentication readiness signal for post-deploy verification and monitoring.

The full sign-in route clearly discloses three intentionally public, fictional development accounts:

| Demonstration  | Email                            | Password               | Access                                                |
| -------------- | -------------------------------- | ---------------------- | ----------------------------------------------------- |
| Viewer         | `demo.viewer@ourvalleys.example` | `PUBLIC-DEMO-ONLY`     | View one fictional business dashboard                 |
| Business owner | `demo.owner@ourvalleys.example`  | `PUBLIC-BUSINESS-DEMO` | Edit and publish only that seeded fictional business  |
| Platform admin | `demo.admin@ourvalleys.example`  | `PUBLIC-ADMIN-DEMO`    | Inspect a sanitised read-only administration overview |

The public business owner is a dedicated account with exactly one restricted business membership; private operations, media, account settings, claims and additional business creation are disabled. The public administrator sees only a sanitised overview and cannot read private admin records or mutate platform state. Public demo sessions are non-persistent, and the elevated demonstrations **must be removed before public launch**.

These credentials require no additional Railway environment variables because `pnpm deploy:prepare` provisions them through `pnpm auth:provision-demo`. Railway setup, release ordering and failure behaviour are documented in [`docs/30-railway-postgres-and-demo-access.md`](docs/30-railway-postgres-and-demo-access.md); the privileged-account removal gate is documented in [`docs/33-development-demo-and-external-news.md`](docs/33-development-demo-and-external-news.md).

## External news demonstration

`/news` reads the product-owner supplied WalesOnline News RSS feed and displays source-attributed headlines, publication times, outbound article links and optional story images explicitly supplied by the feed. It does not render article bodies or feed descriptions, does not persist publisher content, and falls back to generated editorial artwork when no accepted image is available.

This is consistent with the product boundary against automated copying or rewriting of third-party news. Publisher rights and production-use terms remain a launch gate. The feed, parsing, source-validation and attribution decisions are recorded in [`docs/33-development-demo-and-external-news.md`](docs/33-development-demo-and-external-news.md).

## Product experience

OurValleys should feel premium, modern, local and trustworthy rather than like a generic directory or council portal.

The current experience direction includes:

- An animated, scroll-responsive homepage that remains immediately searchable and fast.
- Selective liquid-glass surfaces for navigation, search, dialogs, sheets and useful widgets.
- Contextual widget interactions, including an accessible login dialog or mobile sheet with a dedicated route fallback.
- Strong responsive, reduced-motion and accessibility behaviour.
- Generated business pages that feel like credible standalone websites.

See [`docs/18-product-experience-and-visual-design.md`](docs/18-product-experience-and-visual-design.md).

## Operating model

OurValleys is being developed through an **AI-agent-led workflow with minimal product-owner interruption**.

Agents should complete safe, reversible research, planning, coding, testing, visual inspection, documentation and repository work autonomously. The repository owner is not the default implementer, code reviewer or merger. Routine pull requests should be owned through repeated self-review, correction, validation, merge into `main` and post-merge verification. Input should be requested only for genuine approval gates such as expenditure, credentials, external outreach, legal sign-off, domain purchase or public launch.

`main` is the canonical integration, release and deployment branch. Short-lived branches may be used for safe implementation and review, but completed work is not delivered until it has been merged into `main` and the resulting deployment has been checked where connected.

Before writing code, agents must inspect current and historical repository state, identify one canonical owning issue, avoid duplicate implementation paths and resolve existing pull requests. At the end of a run, every routine pull request must be merged or deliberately closed.

See [`AGENTS.md`](AGENTS.md), [`docs/15-autonomous-operating-model.md`](docs/15-autonomous-operating-model.md), [`docs/16-autonomous-delivery-mandate.md`](docs/16-autonomous-delivery-mandate.md), [`docs/17-main-branch-deployment-policy.md`](docs/17-main-branch-deployment-policy.md), [`docs/18-product-experience-and-visual-design.md`](docs/18-product-experience-and-visual-design.md), [`docs/19-autonomous-build-execution-plan.md`](docs/19-autonomous-build-execution-plan.md), [`docs/20-build-readiness-audit.md`](docs/20-build-readiness-audit.md), [`docs/21-autonomous-build-start-prompt.md`](docs/21-autonomous-build-start-prompt.md) and [`docs/22-agent-execution-controls.md`](docs/22-agent-execution-controls.md).

## Product principles

- Local first.
- Enter information once and use it everywhere.
- A genuinely useful free business presence.
- Paid value rather than artificial restriction.
- Trust, accessibility and safety before rapid growth.
- Mobile-first and bilingual-ready.
- Density in RCT before wider Valleys expansion.

## Phase 1 scope

1. Resident and business accounts.
2. Business onboarding, claiming and verification.
3. Generated one-page business websites.
4. Local search and category discovery.
5. Town and village pages.
6. Events and local guides.
7. Enquiry forms, saved content and notifications.
8. Business and administration dashboards.
9. Reporting, moderation and audit foundations.
10. Basic analytics.

Marketplace, open community discussions, reviews, property listings and transactional payments are deliberately deferred until the audience, moderation processes and legal foundations are ready.

## Documentation

The project documentation is organised in [`docs/`](docs/README.md):

- Product charter and boundaries.
- MVP specification and acceptance criteria.
- Information architecture and route map.
- User roles and end-to-end journeys.
- Data model.
- Technical architecture.
- Generated business website system.
- Trust, safety, privacy and legal readiness.
- Content, locations, bilingual support and launch seeding.
- Commercial model and analytics.
- Delivery roadmap and build backlog.
- Decisions, assumptions and risks.
- Testing and quality strategy.
- AI agent build, autonomous delivery and `main` branch deployment instructions.
- Product experience, visual design, readiness audit and autonomous implementation sequence.
- A reusable autonomous build start prompt.
- Practical execution controls for preflight, workstream ownership, evidence, security, dependencies, migrations, UI and deployment.
- Application scaffold setup, runtime proof and validation evidence.
- Public business discovery, generated-profile and tenant-permission evidence.
- Premium homepage, design-system, motion, accessibility and payload evidence.
- Railway PostgreSQL release preparation and public demo-access evidence.
- Development demo-account and external-news boundaries with pre-launch gates.

## North-star measure

**Successful local connections created each month.**

Examples include a business enquiry, quotation request, booking, event registration, job application, marketplace enquiry, property enquiry, volunteer sign-up or a resident finding a useful local answer.

## Repository conventions

- Product decisions belong in the documentation before major implementation begins.
- New scope must identify the user problem, acceptance criteria and safety implications.
- Issues represent project work and should not be assigned to the repository owner by default.
- Agents should make and record safe reversible assumptions rather than blocking on minor preferences.
- Safe reversible engineering may proceed while external validation continues under the autonomous build plan.
- Inspect existing code, issues, pull requests and closed work before creating a new implementation path.
- Use one canonical owning issue and prefer one active implementation pull request per logical workstream.
- Opening a pull request is not completion; routine work should proceed through autonomous review, correction, merge into `main` and verification.
- Work that exists only on a feature or agent branch must not be described as delivered or deployed.
- Every routine pull request must be merged or deliberately closed before the agent changes workstreams or ends its run.
- Use `pnpm` with the committed lockfile consistently in local development and CI.
- Never commit real credentials or realistic hard-coded test secrets; generate disposable test values at runtime. Intentionally public demonstration values must be unmistakably labelled, fictional and least-privilege.
- User-generated content features must not launch without reporting, moderation and record-keeping controls.
- Business website content is structured data; businesses must not be given unrestricted code execution or arbitrary HTML/JavaScript.

## Disclaimer

The planning documents identify areas requiring legal, privacy, safety and accessibility review. They are product guidance and do not replace professional legal advice.
