# OurValleys

OurValleys is an independent local discovery and business platform for Rhondda Cynon Taf, designed to connect residents, businesses, community organisations, events and useful local information through one shared location-based system.

The flagship product is a generated one-page website for every participating local business. A business maintains one structured profile, and the same information powers its website, directory presence, search results, town pages, offers, events and future platform modules.

> **Current status:** the first application foundation and public business-profile vertical slice are implemented. The platform is not publicly launched and contains no approved real business listings yet.

## Application foundation

The repository now includes:

- Next.js App Router with strict TypeScript.
- PostgreSQL, PostGIS and Drizzle migrations.
- Better Auth route integration.
- pg-boss background-worker bootstrap.
- Validated RCT place and business-category seed datasets.
- A public business directory and generated business website route.
- Public/private data projections and cross-tenant permission tests.
- GitHub Actions checks for linting, types, compatibility, migrations, seeding, tests and production build.

See [`docs/17-implementation-foundation.md`](docs/17-implementation-foundation.md).

## Local development

1. Install the Node version in `.node-version`.
2. Copy `.env.example` to `.env.local`.
3. Start PostGIS with `docker compose up -d`.
4. Run `npm install`.
5. Run `npm run db:migrate` and `npm run db:seed`.
6. Run `npm run dev`.

Run `npm run verify` before proposing code changes. A fictional demo business can be added explicitly with `SEED_DEMO_CONTENT=true npm run db:seed`; it must never be presented as a real trader.

## Operating model

OurValleys is being developed through an **AI-agent-led workflow with minimal product-owner interruption**.

Agents should complete safe, reversible research, planning, coding, testing, documentation and repository work autonomously. The repository owner is not the default implementer, code reviewer or merger. Routine pull requests should be owned through repeated self-review, correction, validation, merge and post-merge verification. Input should be requested only for genuine approval gates such as expenditure, credentials, external outreach, legal sign-off, domain purchase or public launch.

See [`AGENTS.md`](AGENTS.md), [`docs/15-autonomous-operating-model.md`](docs/15-autonomous-operating-model.md) and [`docs/16-autonomous-delivery-mandate.md`](docs/16-autonomous-delivery-mandate.md).

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
- AI agent build and autonomous delivery instructions.
- Implemented-foundation notes and public-source research packs.

## North-star measure

**Successful local connections created each month.**

Examples include a business enquiry, quotation request, booking, event registration, job application, marketplace enquiry, property enquiry, volunteer sign-up or a resident finding a useful local answer.

## Repository conventions

- Product decisions belong in the documentation before major implementation begins.
- New scope must identify the user problem, acceptance criteria and safety implications.
- Issues represent project work and should not be assigned to the repository owner by default.
- Agents should make and record safe reversible assumptions rather than blocking on minor preferences.
- Opening a pull request is not completion; routine work should proceed through autonomous review, correction, merge and verification.
- User-generated content features must not launch without reporting, moderation and record-keeping controls.
- Business website content is structured data; businesses must not be given unrestricted code execution or arbitrary HTML/JavaScript.

## Disclaimer

The planning documents identify areas requiring legal, privacy, safety and accessibility review. They are product guidance and do not replace professional legal advice.
