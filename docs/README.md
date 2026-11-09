# OurValleys Documentation

This directory is the product, delivery and governance source of truth for OurValleys.

## How to use these documents

Read them in numerical order before beginning a large implementation. The product charter explains why the platform exists; the MVP specification defines what the first release must do; the architecture and data documents explain how to keep the platform coherent; the roadmap and backlog convert the plan into buildable work; the later autonomous, experience and execution-control documents establish the current authority and intended delivery quality.

When a material decision changes, update the relevant document and record the decision in `12-decisions-risks.md` or an accepted ADR.

Where an older planning statement conflicts with a later numbered authority document, the later document governs until the conflict is reconciled. In particular, `19-autonomous-build-execution-plan.md` authorises safe reversible engineering while external validation continues, and `22-agent-execution-controls.md` governs practical workstream, branch, evidence, security and end-of-run behaviour.

## Document index

| Document                                                                                              | Purpose                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [`00-product-charter.md`](00-product-charter.md)                                                      | Vision, users, proposition, principles, scope boundaries and success definition.                                                              |
| [`01-mvp-specification.md`](01-mvp-specification.md)                                                  | Phase 1 product requirements, page catalogue and release acceptance criteria.                                                                 |
| [`02-information-architecture.md`](02-information-architecture.md)                                    | Navigation, URL structure, search model, locations, categories and content relationships.                                                     |
| [`03-user-roles-and-journeys.md`](03-user-roles-and-journeys.md)                                      | Account roles, permissions and end-to-end user journeys.                                                                                      |
| [`04-data-model.md`](04-data-model.md)                                                                | Core entities, relationships, lifecycle states and data rules.                                                                                |
| [`05-technical-architecture.md`](05-technical-architecture.md)                                        | Recommended system shape, security boundaries, infrastructure concerns and engineering standards.                                             |
| [`06-business-website-builder.md`](06-business-website-builder.md)                                    | Generated business website system, templates, customisation, publishing and domains.                                                          |
| [`07-trust-safety-privacy-legal.md`](07-trust-safety-privacy-legal.md)                                | Moderation, online safety, reviews, privacy, advertising, property boundaries and launch gates.                                               |
| [`08-content-locations-localisation.md`](08-content-locations-localisation.md)                        | Location model, content operations, bilingual readiness and launch seeding.                                                                   |
| [`09-commercial-model-and-analytics.md`](09-commercial-model-and-analytics.md)                        | Subscription logic, revenue experiments, event tracking and success measures.                                                                 |
| [`10-delivery-roadmap.md`](10-delivery-roadmap.md)                                                    | Validation, delivery phases, dependencies and release gates.                                                                                  |
| [`11-build-backlog.md`](11-build-backlog.md)                                                          | Prioritised epics, stories and acceptance criteria for autonomous implementation.                                                             |
| [`12-decisions-risks.md`](12-decisions-risks.md)                                                      | Confirmed decisions, assumptions, open questions and risk register.                                                                           |
| [`13-testing-and-quality.md`](13-testing-and-quality.md)                                              | Testing strategy, accessibility, security, performance and release checklist.                                                                 |
| [`14-agent-build-guide.md`](14-agent-build-guide.md)                                                  | Instructions for AI coding agents working in this repository.                                                                                 |
| [`15-autonomous-operating-model.md`](15-autonomous-operating-model.md)                                | Agent-led execution model, assumption policy and the limited decisions that require product-owner approval.                                   |
| [`16-autonomous-delivery-mandate.md`](16-autonomous-delivery-mandate.md)                              | Standing authority for end-to-end autonomous delivery, repeated PR review, correction, merge and post-merge verification.                     |
| [`17-main-branch-deployment-policy.md`](17-main-branch-deployment-policy.md)                          | Defines `main` as the canonical delivered and deployed branch and requires completed work to be merged and verified there.                    |
| [`18-product-experience-and-visual-design.md`](18-product-experience-and-visual-design.md)            | Premium visual direction, animated homepage, liquid-glass language, widget interactions and UI quality requirements.                          |
| [`19-autonomous-build-execution-plan.md`](19-autonomous-build-execution-plan.md)                      | Current authority, TypeScript baseline, parallel validation policy and the end-to-end implementation sequence.                                |
| [`20-build-readiness-audit.md`](20-build-readiness-audit.md)                                          | Confirms build readiness, records resolved gaps, classifies open issues and explains document precedence.                                     |
| [`21-autonomous-build-start-prompt.md`](21-autonomous-build-start-prompt.md)                          | Copy-ready instruction for starting or resuming a fully autonomous build run.                                                                 |
| [`22-agent-execution-controls.md`](22-agent-execution-controls.md)                                    | Mandatory preflight, workstream ownership, no-duplication, evidence, security, dependency, migration, UI, deployment and end-of-run controls. |
| [`23-application-scaffold-proof.md`](23-application-scaffold-proof.md)                                | Implemented application scaffold, local setup, runtime proof, validation evidence and successor boundaries.                                   |
| [`24-public-business-discovery-slice.md`](24-public-business-discovery-slice.md)                      | Canonical business model, public/private projection, fictional fixture, directory, generated page, tenant permissions and validation.         |
| [`25-premium-homepage-design-system.md`](25-premium-homepage-design-system.md)                        | Claude Design integration, premium tokens, connected homepage, accessible sign-in interaction, motion, media budgets and validation.          |
| [`26-identity-and-permission-foundation.md`](26-identity-and-permission-foundation.md)                | Fail-closed platform roles, business membership roles, permission ceilings and successor identity boundaries.                                 |
| [`27-reference-data-foundation.md`](27-reference-data-foundation.md)                                  | Provisional place/category relationships, bilingual aliases, bounded secondary categories and Stage F validation evidence.                    |
| [`28-business-onboarding-foundation.md`](28-business-onboarding-foundation.md)                        | Stable Stage G onboarding steps, deterministic progress, protected dashboard checklist and successor safety boundaries.                      |
| [`29-business-onboarding-draft-service.md`](29-business-onboarding-draft-service.md)                  | Versioned business onboarding drafts, validation, autosave conflict handling, tenant boundaries and persistence evidence.                     |
| [`30-railway-postgres-and-demo-access.md`](30-railway-postgres-and-demo-access.md)                    | Railway PostgreSQL linkage, pre-deploy preparation, readiness gating, public view-only demo access and failure handling.                      |
| [`31-onboarding-draft-persistence.md`](31-onboarding-draft-persistence.md)                            | Atomic Drizzle persistence, optimistic concurrency, privacy boundaries and successor authenticated editing work.                              |
| [`32-free-business-website-product-brief.md`](32-free-business-website-product-brief.md)              | Consolidated free-business-website product specification, decision record, delivery programme and coordinator handover (21 July 2026).       |
| [`33-development-demo-and-external-news.md`](33-development-demo-and-external-news.md)                | Public development viewer, business and admin access; WalesOnline RSS boundaries; and mandatory pre-launch removal gates.                     |
| [`34-launch-foundation-and-public-release-controls.md`](34-launch-foundation-and-public-release-controls.md) | Deployed-origin evidence, versioned RCT data, bilingual ranked discovery, release stages, indexing controls and recovery behaviour.             |
| [`24-stage-h-live-homepage-composition.md`](24-stage-h-live-homepage-composition.md) | Stage H live homepage composition from published data (shares number 24 with the discovery slice). |
| [`33-free-business-website-phases-7-12-verification.md`](33-free-business-website-phases-7-12-verification.md) | Verification evidence for free-business-website phases 7 to 12 (shares number 33). |
| [`33-stage-h-place-category-discovery.md`](33-stage-h-place-category-discovery.md) | Stage H place and category discovery pages (shares number 33). |
| [`34-founding-business-validation-pack.md`](34-founding-business-validation-pack.md) | Founding-business interview guide, evidence template and outreach preparation (shares number 34). |
| [`35-launch-content-operations-pack.md`](35-launch-content-operations-pack.md) | Privacy-safe templates for launch content, places and local facts without inventing real businesses. |
| [`36-overhaul-programme-log.md`](36-overhaul-programme-log.md) | Newest-first log of overhaul slices: what shipped, what is in progress and what is next. |
| [`37-sensitive-path-check.md`](37-sensitive-path-check.md) | The "Sensitive paths" CI check: reserved files and authorisation-helper counts that hold a merge for an owner decision. |
| [`38-owner-decision-record.md`](38-owner-decision-record.md) | Approval-gated and unresolved items (billing, domains and others) with what engineering has prepared. |
| [`39-valleys-map.md`](39-valleys-map.md) | Tile-free Valleys map at `/map` built from place coordinates. |
| [`40-business-website-sections-and-live-preview.md`](40-business-website-sections-and-live-preview.md) | Business website section library and live-preview designer. |
| [`41-business-restore-runbook.md`](41-business-restore-runbook.md) | Restoring a deleted business: what deletion removes and the rehearsed recovery steps. |
| [`42-business-directory-overhaul.md`](42-business-directory-overhaul.md) | Compact search, category rail, richer cards, numbered paging and map hand-off for `/businesses`. |
| [`43-events-agenda-overhaul.md`](43-events-agenda-overhaul.md) | The `/events` agenda: compact header, grouped days and filters. |
| [`44-places-overhaul.md`](44-places-overhaul.md) | `/places` directory and place pages. |
| [`45-search-overhaul.md`](45-search-overhaul.md) | `/search` compact page, recent searches and result tabs. |
| [`46-admin-review-desk.md`](46-admin-review-desk.md) | Admin review desk at `/admin/queue`: one prioritised list of work awaiting an admin. |
| [`47-owner-hub.md`](47-owner-hub.md) | Owner hub: dashboard navigation, next steps and simple analytics. |
| [`48-browse-pages-overhaul.md`](48-browse-pages-overhaul.md) | Offers, categories and guides browse pages. |
| [`49-homepage-overhaul.md`](49-homepage-overhaul.md) | Homepage body below the hero: bilingual content and live data blocks. |
| [`50-resident-home.md`](50-resident-home.md) | Resident home at `/account` and `/account/saved`. |
| [`51-start-your-business.md`](51-start-your-business.md) | Guided create-or-claim business journey. |
| [`52-saved-searches.md`](52-saved-searches.md) | Saved searches with new-result counts. |
| [`53-menu-builder.md`](53-menu-builder.md) | Structured menu builder: paste a menu, sections, prices and dietary labels. |
| [`54-website-templates-and-themes.md`](54-website-templates-and-themes.md) | Business website templates and themes. |
| [`55-admin-resolution-desk.md`](55-admin-resolution-desk.md) | Admin resolution desk at `/admin/tickets` for claims, conflicts and corrections. |
| [`56-owner-inbox.md`](56-owner-inbox.md) | Owner inbox for enquiries: statuses, search and replies. |
| [`57-welsh-business-content.md`](57-welsh-business-content.md) | Per-language (Welsh) business record fields and the Welsh version editor. |
| [`58-admin-csv-import.md`](58-admin-csv-import.md) | Admin CSV import of founding businesses (shares number 58). |
| [`58-owner-insights.md`](58-owner-insights.md) | Owner insights: views, visitors, search appearances and contacts (shares number 58). |
| [`59-extra-sections.md`](59-extra-sections.md) | Extra website sections: FAQ, price lists, team, areas and facilities. |
| [`60-guides-studio.md`](60-guides-studio.md) | Guides studio: editorial guides joining businesses, places and events. |
| [`61-events-calendar.md`](61-events-calendar.md) | Events month calendar view. |
| [`62-photos-studio.md`](62-photos-studio.md) | Photos studio: focus picker with live crops. |
| [`63-offers-studio.md`](63-offers-studio.md) | Offers studio: dates, status and expiry. |
| [`64-events-studio.md`](64-events-studio.md) | Events studio: status, repeats and cancellation. |
| [`65-live-opening-hours.md`](65-live-opening-hours.md) | Live open-now status and opening hours on business websites. |
| [`66-owner-corrections.md`](66-owner-corrections.md) | Visitor suggestions routed to the owner, with admin escalation for disputed items. |
| [`67-listing-health.md`](67-listing-health.md) | Owner-facing listing health and lifecycle actions. |
| [`68-split-opening-hours.md`](68-split-opening-hours.md) | Second opening window per weekday (migration `0053`). |
| [`69-business-updates.md`](69-business-updates.md) | Business updates: short timely posts on the website and the local feed. |
| [`70-share-kit.md`](70-share-kit.md) | Share kit: stable QR code and simple source counts. |
| [`71-notification-centre.md`](71-notification-centre.md) | In-site notification centre alongside email alerts. |
| [`72-following.md`](72-following.md) | Following saved businesses with in-site notices. |
| [`73-privacy-centre.md`](73-privacy-centre.md) | Privacy and notification centre at `/account/privacy`. |
| [`74-offer-pages.md`](74-offer-pages.md) | Offer pages and saved offers. |
| [`75-content-takedown.md`](75-content-takedown.md) | Reporting and taking down offers and updates. |
| [`76-local-stories.md`](76-local-stories.md) | Local stories: `/news` and story pages. |
| [`77-update-pictures-scheduling.md`](77-update-pictures-scheduling.md) | Pictures and scheduled publishing for business updates. |
| [`78-story-pictures-scheduling.md`](78-story-pictures-scheduling.md) | Pictures and scheduled publishing for local stories. |
| [`79-catalogue-entries.md`](79-catalogue-entries.md) | Catalogue entries: pictures, availability and order/book links. |
| [`80-catalogue-pages.md`](80-catalogue-pages.md) | A public page for each product, treatment and team member. |
| [`81-catalogue-index.md`](81-catalogue-index.md) | Catalogue categories and searchable catalogue page. |
| [`82-catalogue-welsh.md`](82-catalogue-welsh.md) | Welsh names and descriptions for catalogue entries. |
| [`83-catalogue-featured-sort.md`](83-catalogue-featured-sort.md) | Featured catalogue entries and sort options. |
| [`84-update-pages-and-feeds.md`](84-update-pages-and-feeds.md) | Update pages, share pictures and Atom feeds. |
| [`85-photo-gallery.md`](85-photo-gallery.md) | Photo gallery lightbox, gallery page and layouts. |
| [`86-photo-words.md`](86-photo-words.md) | Welsh photo descriptions and visible captions. |
| [`87-photo-framing.md`](87-photo-framing.md) | Photo zoom on top of the focal point. |
| [`88-follow-a-business.md`](88-follow-a-business.md) | Per-business feeds, calendar subscription and follow page. |
| [`89-events-week-view.md`](89-events-week-view.md) | Events week view, next-date jump and period calendar feeds. |
| [`90-lean-pages.md`](90-lean-pages.md) | Message catalogue and CSS removed from every page, with a performance budget. |
| [`91-welsh-picture-descriptions.md`](91-welsh-picture-descriptions.md) | Welsh descriptions for offer, event, update and catalogue pictures. |

## Documentation rules

1. Do not quietly expand Phase 1 scope while coding.
2. New modules must identify moderation, privacy, analytics and administration requirements.
3. Every feature needs a failure state, empty state and permission model.
4. Public claims must be supportable and advertising must be identifiable.
5. Safety-sensitive features remain disabled until their documented release gates are met.
6. The documents are living specifications, not marketing promises.
7. Agents should complete safe, reversible work autonomously and escalate only the bounded approval gates defined in `15-autonomous-operating-model.md`.
8. Opening a pull request is not completion; agents must follow the review, correction, merge and post-merge lifecycle in `16-autonomous-delivery-mandate.md`.
9. Completed work must reach `main`; branch-only work is not delivered and must not be counted as done under `17-main-branch-deployment-policy.md`.
10. Substantial UI work must follow the visual, motion, accessibility and widget standards in `18-product-experience-and-visual-design.md`.
11. Safe reversible implementation is authorised now under `19-autonomous-build-execution-plan.md`; external evidence and public launch gates remain in force.
12. Agents should use `20-build-readiness-audit.md` to understand resolved documentation conflicts and the status of open issues.
13. Use `21-autonomous-build-start-prompt.md` to initialise a new active autonomous build session without restating the whole repository in chat.
14. Follow `22-agent-execution-controls.md` before writing code and before ending a run; avoid duplicate work, use one canonical workstream, record evidence, and leave no unexplained drafts or unattended routine pull requests.
15. New numbered documents must use the next available number; do not reuse an existing document number from a closed or stale branch.

## Current product status

- Brand working name: **OurValleys**.
- Launch geography: **Rhondda Cynon Taf**.
- Initial density focus: **Rhondda**, followed by wider RCT.
- Flagship feature: **generated one-page business websites**.
- Current phase: **autonomous Phase 1 implementation on `main`; the launch foundation (`34-launch-foundation-and-public-release-controls.md`) is merged, and current delivery status is in `36-overhaul-programme-log.md`**.
- Technology stack: **accepted strict TypeScript Next.js modular monolith with PostgreSQL/PostGIS**.
- Package manager: **`pnpm` with a committed lockfile**.
- Experience direction: **premium animated homepage, selective liquid glass and accessible widget-based interaction**.
- Canonical integration and deployment branch: **`main`**.
- Operating model: **AI-agent-led with minimal product-owner interruption and mandatory clean workstream closure**.