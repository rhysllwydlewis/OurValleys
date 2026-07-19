# OurValleys Documentation

This directory is the product, delivery and governance source of truth for OurValleys.

## How to use these documents

Read them in numerical order before beginning a large implementation. The product charter explains why the platform exists; the MVP specification defines what the first release must do; the architecture and data documents explain how to keep the platform coherent; the roadmap and backlog convert the plan into buildable work.

When a material decision changes, update the relevant document and record the decision in `12-decisions-risks.md`.

## Document index

| Document | Purpose |
| --- | --- |
| [`00-product-charter.md`](00-product-charter.md) | Vision, users, proposition, principles, scope boundaries and success definition. |
| [`01-mvp-specification.md`](01-mvp-specification.md) | Phase 1 product requirements, page catalogue and release acceptance criteria. |
| [`02-information-architecture.md`](02-information-architecture.md) | Navigation, URL structure, search model, locations, categories and content relationships. |
| [`03-user-roles-and-journeys.md`](03-user-roles-and-journeys.md) | Account roles, permissions and end-to-end user journeys. |
| [`04-data-model.md`](04-data-model.md) | Core entities, relationships, lifecycle states and data rules. |
| [`05-technical-architecture.md`](05-technical-architecture.md) | Recommended system shape, security boundaries, infrastructure concerns and engineering standards. |
| [`06-business-website-builder.md`](06-business-website-builder.md) | Generated business website system, templates, customisation, publishing and domains. |
| [`07-trust-safety-privacy-legal.md`](07-trust-safety-privacy-legal.md) | Moderation, online safety, reviews, privacy, advertising, property boundaries and launch gates. |
| [`08-content-locations-localisation.md`](08-content-locations-localisation.md) | Location model, content operations, bilingual readiness and launch seeding. |
| [`09-commercial-model-and-analytics.md`](09-commercial-model-and-analytics.md) | Subscription logic, revenue experiments, event tracking and success measures. |
| [`10-delivery-roadmap.md`](10-delivery-roadmap.md) | Validation, delivery phases, dependencies and release gates. |
| [`11-build-backlog.md`](11-build-backlog.md) | Prioritised epics, stories and acceptance criteria for vibe coding. |
| [`12-decisions-risks.md`](12-decisions-risks.md) | Confirmed decisions, assumptions, open questions and risk register. |
| [`13-testing-and-quality.md`](13-testing-and-quality.md) | Testing strategy, accessibility, security, performance and release checklist. |
| [`14-agent-build-guide.md`](14-agent-build-guide.md) | Instructions for AI coding agents working in this repository. |

## Documentation rules

1. Do not quietly expand Phase 1 scope while coding.
2. New modules must identify moderation, privacy, analytics and administration requirements.
3. Every feature needs a failure state, empty state and permission model.
4. Public claims must be supportable and advertising must be identifiable.
5. Safety-sensitive features remain disabled until their documented release gates are met.
6. The documents are living specifications, not marketing promises.

## Current product status

- Brand working name: **OurValleys**.
- Launch geography: **Rhondda Cynon Taf**.
- Initial density focus: **Rhondda**, followed by wider RCT.
- Flagship feature: **generated one-page business websites**.
- Current phase: **validation and foundation planning**.
- Technology stack: **not yet locked**.
