# OurValleys Documentation

This directory is the product, delivery and governance source of truth for OurValleys.

## How to use these documents

Read them in numerical order before beginning a large implementation. The product charter explains why the platform exists; the MVP specification defines what the first release must do; the architecture and data documents explain how to keep the platform coherent; the roadmap and backlog convert the plan into buildable work; the later autonomous and experience documents establish the current execution authority and intended product quality.

When a material decision changes, update the relevant document and record the decision in `12-decisions-risks.md` or an accepted ADR.

Where an older planning statement conflicts with a later numbered authority document, the later document governs until the conflict is reconciled. In particular, `19-autonomous-build-execution-plan.md` authorises safe reversible engineering to proceed while external validation continues.

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
| [`11-build-backlog.md`](11-build-backlog.md) | Prioritised epics, stories and acceptance criteria for autonomous implementation. |
| [`12-decisions-risks.md`](12-decisions-risks.md) | Confirmed decisions, assumptions, open questions and risk register. |
| [`13-testing-and-quality.md`](13-testing-and-quality.md) | Testing strategy, accessibility, security, performance and release checklist. |
| [`14-agent-build-guide.md`](14-agent-build-guide.md) | Instructions for AI coding agents working in this repository. |
| [`15-autonomous-operating-model.md`](15-autonomous-operating-model.md) | Agent-led execution model, assumption policy and the limited decisions that require product-owner approval. |
| [`16-autonomous-delivery-mandate.md`](16-autonomous-delivery-mandate.md) | Standing authority for end-to-end autonomous delivery, repeated PR review, correction, merge and post-merge verification. |
| [`17-main-branch-deployment-policy.md`](17-main-branch-deployment-policy.md) | Defines `main` as the canonical delivered and deployed branch and requires completed work to be merged and verified there. |
| [`18-product-experience-and-visual-design.md`](18-product-experience-and-visual-design.md) | Premium visual direction, animated homepage, liquid-glass language, widget interactions and UI quality requirements. |
| [`19-autonomous-build-execution-plan.md`](19-autonomous-build-execution-plan.md) | Current authority, TypeScript baseline, parallel validation policy and the end-to-end implementation sequence. |
| [`20-build-readiness-audit.md`](20-build-readiness-audit.md) | Confirms build readiness, records resolved gaps, classifies open issues and explains document precedence. |
| [`21-autonomous-build-start-prompt.md`](21-autonomous-build-start-prompt.md) | Copy-ready instruction for starting or resuming a fully autonomous build run. |
| [`22-implementation-foundation.md`](22-implementation-foundation.md) | Implemented application stack, setup, compatibility evidence, public/private boundary and current limitations. |
| [`research/00-founding-business-candidates.md`](research/00-founding-business-candidates.md) | Public-source candidate research and safe revalidation rules for the founding-business pilot. |

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

## Current product status

- Brand working name: **OurValleys**.
- Launch geography: **Rhondda Cynon Taf**.
- Initial density focus: **Rhondda**, with a Treorchy research cluster, followed by wider RCT.
- Flagship feature: **generated one-page business websites**.
- Current phase: **autonomous Phase 1 implementation with the application foundation and first public vertical slice in progress**.
- Technology stack: **strict TypeScript Next.js modular monolith with PostgreSQL/PostGIS, Drizzle, Better Auth and pg-boss**.
- Experience direction: **premium animated homepage, selective liquid glass and accessible widget-based interaction**.
- Canonical integration and deployment branch: **`main`**.
- Operating model: **AI-agent-led with minimal product-owner interruption**.
