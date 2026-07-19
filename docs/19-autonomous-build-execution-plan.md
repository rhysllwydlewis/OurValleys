# Autonomous Build Execution Plan

## 1. Purpose

This document authorises and directs the autonomous implementation of the OurValleys Phase 1 platform.

The repository previously placed strong emphasis on completing external validation before significant engineering. The product owner has now explicitly authorised the platform to be built while validation, brand confirmation, local-data research and launch preparation continue in parallel.

This does not remove evidence, safety or public-launch gates. It changes the delivery sequence so safe, reversible engineering is no longer blocked by work that depends on interviews, external outreach, final domain selection or public launch approval.

## 2. Current build authority

Agents are authorised to:

- Scaffold the production application.
- Implement the documented Phase 1 product.
- Create fictional representative test and demonstration data.
- Build the premium visual system and animated homepage.
- Build public, resident, business and administrative journeys.
- Configure CI and preview deployment where available.
- Prepare Railway deployment using the accepted architecture.
- Make and record safe reversible product, design and technical decisions.
- Own pull requests through repeated review, correction, merge into `main` and post-merge verification.
- Continue through the next highest-priority unblocked vertical slice during each active run.

The implementation must use the accepted TypeScript architecture in `adr/0001-nextjs-modular-monolith.md` unless a later ADR records a demonstrated reason to change it.

## 3. Fixed technical baseline

The initial implementation baseline is:

- TypeScript in strict mode.
- Next.js App Router.
- Node.js 24 LTS.
- `pnpm` with a committed lockfile.
- Modular monolith in one repository.
- PostgreSQL with PostGIS, `pg_trgm` and `unaccent`.
- Drizzle ORM with committed SQL migrations.
- Better Auth with database-backed sessions.
- Railway for the web application, worker and PostgreSQL.
- Cloudflare R2 for quarantined originals and approved media derivatives.
- Resend behind an internal transactional-email adapter.
- PostgreSQL search for Phase 1.
- pg-boss for background jobs.
- First-party allowlisted analytics in PostgreSQL.

Exact compatible package versions must be verified from current official documentation during scaffolding. Do not replace accepted providers or architecture merely because another option is more familiar.

## 4. Product and experience baseline

Implementation must preserve:

- The product charter in `00-product-charter.md`.
- The Phase 1 scope in `01-mvp-specification.md`.
- The information architecture and route map.
- One canonical business record powering discovery and the generated business website.
- Public and private data separation.
- Server-side permissions and business tenant isolation.
- Mobile-first, accessible and bilingual-ready design.
- The experience direction in `18-product-experience-and-visual-design.md`.
- The autonomous quality and merge lifecycle.
- `main` as the canonical deployment branch.

The intended public experience includes:

- A premium animated homepage.
- Selective liquid-glass surfaces.
- Useful contextual widgets and panels.
- An accessible login dialog or mobile sheet with a dedicated route fallback.
- Strong local discovery and location context.
- Generated business websites that feel like credible standalone sites.

## 5. Parallel validation policy

Open Phase 0 issues remain valid evidence and launch workstreams. They must not be closed merely because implementation begins.

However, they do not block safe, reversible engineering unless the specific implementation cannot be completed honestly without the missing evidence.

### Work that may proceed now

- Application scaffold and CI.
- Design system.
- Public shell and animated homepage.
- Fictional example business sites.
- Reference-data schemas and provisional seed structures.
- Authentication and permission foundations.
- Database models and migrations.
- Generated-site renderer.
- Search architecture and representative fixtures.
- Dashboards and administrative shells.
- Accessibility, performance, security and testing infrastructure.

### Work that remains evidence-dependent

- Final category taxonomy claims.
- Final launch-town cluster.
- Real business content and pilot commitments.
- Final package pricing and willingness-to-pay conclusions.
- Final brand and canonical domain.
- Named real-world governance rota and availability.
- Public launch approval.

Use provisional, clearly labelled assumptions for the second group and design systems so those assumptions can be changed without major rework.

## 6. No invented real-world content

The autonomous build may use fictional local-style data for development, tests, screenshots and demonstration.

Fictional data must:

- Be clearly non-production.
- Avoid impersonating a real local business or resident.
- Exercise realistic RCT geography, Welsh characters, service areas and category variation.
- Include difficult states such as missing images, hidden home address, long names, cancelled events and suspended content.

Do not publish invented business facts or imply that fictional businesses are operating.

## 7. Initial execution sequence

The active agent should choose coherent vertical slices, but the following sequence establishes the default priority.

## Stage A — Repository and scaffold proof

Complete the remaining acceptance criterion in issue `#4` / OV-005.

Deliver:

- TypeScript strict Next.js application scaffold.
- `pnpm` lockfile.
- Local environment validation.
- Public server-rendered page.
- Protected server-side route.
- Database-backed proof slice.
- Separate worker entry point.
- Formatting, lint, typecheck, unit test and production build commands.
- Initial module boundaries.
- Setup documentation.

Review, merge into `main` and confirm the scaffold exists on `main`.

## Stage B — CI and engineering foundation

Deliver the Phase 1A repository foundation:

- GitHub Actions or equivalent PR checks.
- Dependency and secret checks.
- Test database workflow.
- Environment separation.
- Health endpoint.
- Structured logging and correlation identifiers.
- Error boundary and user-safe failure patterns.
- Feature-flag foundation.
- Migration and seed commands.

Do not merge a scaffold that cannot be built reproducibly from the committed lockfile.

## Stage C — Design system and application shell

Build the accessible design system and public shell using `18-product-experience-and-visual-design.md`.

Priorities:

- Tokens for colour, typography, spacing, radius, elevation and glass.
- Core form and navigation components.
- Dialog and mobile sheet primitives.
- Widget container patterns.
- Loading, empty and failure states.
- Responsive shell.
- Reduced-motion support.
- Representative component examples or tests.

## Stage D — Animated homepage vertical slice

Build a useful animated homepage, not only a visual prototype.

Include:

- Server-rendered proposition and search.
- Manual location selection.
- Animated local landscape or connected-place visual treatment.
- Search, category, event, local-business and guide blocks using representative fictional data.
- Generated-business-site demonstration.
- Resident and business calls to action.
- Accessible login widget with route fallback.
- Reduced-motion and constrained-device versions.
- Performance measurement.
- Admin-configurable block structure where proportionate.

## Stage E — Identity and permissions

Implement:

- Resident registration and sign-in.
- Email verification and recovery.
- Session management.
- Admin MFA requirement.
- Platform roles.
- Business memberships and permissions.
- Deny-by-default and cross-tenant tests.

Authentication UI should use the widget interaction model while retaining resilient full-page routes.

## Stage F — Places, categories and canonical business records

Implement the data structures and administration needed to support provisional reference data.

- Place hierarchy and aliases.
- English and Welsh names.
- Category hierarchy and synonyms.
- Canonical business record.
- Public/private projections.
- Membership and ownership.
- Status lifecycle.
- Importable provisional fictional seed data.

Keep final launch selections configurable while issues `#2` and `#3` remain under validation.

## Stage G — Business onboarding and generated websites

Implement the end-to-end flagship journey:

- Create-versus-claim check.
- Guided onboarding with autosave.
- Locations and service areas.
- Services and price guidance.
- Opening hours and exceptions.
- Media pipeline.
- Template schema.
- Universal template and priority category variants.
- Preview, publish and rollback.
- Public business route.
- Website editor.
- Business dashboard.
- Basic verification and correction reporting.

## Stage H — Resident discovery and content

Implement:

- Public search projection.
- Keyword, category and geographic search.
- Filters and zero-results handling.
- Category pages.
- Place pages with thin-content controls.
- Events.
- Guides and controlled local updates.
- Saved businesses and events.
- Homepage connection to live platform data.

## Stage I — Enquiries, analytics and operations

Implement:

- General and quotation enquiries.
- Abuse controls.
- Business inbox and notifications.
- First-party analytics events.
- Business analytics summaries.
- Moderation and report queues.
- Audit events.
- Data export and closure foundations.
- Operational dashboard.
- Recovery test and launch-readiness checks.

## Stage J — Full product refinement

Once the core Phase 1 journeys are connected:

- Perform an end-to-end product review.
- Remove placeholders that should not remain.
- Improve visual inconsistency.
- Stress test responsive states and real content shapes.
- Run accessibility and performance passes.
- Review security and tenant isolation.
- Resolve high and critical defects.
- Verify deployment from `main`.
- Prepare controlled pilot guidance.

## 8. Issue handling

Open issues are project workstreams, not reasons to stop.

During the build:

- Select the highest-priority unblocked issue or backlog slice.
- Update the relevant issue with implementation evidence.
- Close an issue only when its actual acceptance criteria are met.
- Keep externally dependent issues open with a precise remaining action.
- Do not assign issues to the product owner by default.
- Create implementation issues only when they improve durable coordination; do not turn the backlog into hundreds of tiny tickets.

Issue `#4` should be completed and closed after the scaffold compatibility proof is merged into `main`.

Issues `#1`, `#2`, `#3`, `#5`, `#6` and `#7` remain parallel validation, governance, brand and content workstreams until their evidence requirements are satisfied.

## 9. Quality and self-review

Follow `13-testing-and-quality.md` and `16-autonomous-delivery-mandate.md`.

The agent, not the non-coding product owner, is the default party responsible for:

- Determining whether tests represent the documented behaviour.
- Detecting test gaps.
- Distinguishing genuine defects from false positives, false negatives, flaky checks and environment failures.
- Performing repeated independent review passes.
- Correcting findings.
- Merging routine completed pull requests into `main`.
- Verifying the result after merge and deployment where connected.

Escalate only a genuine product decision where the repository and reasonable evidence do not establish the intended outcome.

## 10. Visual quality ownership

Do not wait for the product owner to identify ordinary visual defects.

For substantial interface work:

- Inspect rendered desktop, tablet and mobile states.
- Test primary interactions.
- Check reduced motion and keyboard use.
- Review against the experience specification.
- Correct weak spacing, hierarchy, responsiveness, contrast, motion and states.
- Repeat until further review is not finding material quality issues.

## 11. Deployment model

- Short-lived branches are implementation workspaces.
- Pull requests target `main`.
- Completed work must merge into `main`.
- `main` is the canonical delivered state.
- Production is expected to deploy from `main`.
- After each relevant merge, confirm the intended change exists on `main` and verify deployment where connected.
- A branch-only result is not complete.

## 12. Genuine approval gates

The build should stop and ask only when it genuinely requires:

- New credentials or access not already connected.
- Spending money or accepting a paid contract.
- Domain purchase or transfer.
- External outreach sent in the product owner’s name.
- Identity documents.
- A legally binding commitment.
- Final specialist legal or regulatory sign-off.
- Public launch approval.
- An irreversible destructive action without tested recovery.
- Acceptance of materially increased privacy, security, moderation or financial risk.

Complete all preparation first and present a bounded recommendation.

## 13. Completion target

The autonomous assignment is not complete when the scaffold, homepage or first set of pull requests is complete.

Continue until the Phase 1 product is production-ready under the repository definition of done, or progress depends exclusively on a genuine external approval gate.

The final result should include:

- A fully connected TypeScript application.
- Premium animated public experience.
- Accessible widget-based interactions.
- Business onboarding and generated websites.
- Resident discovery, places, events and guides.
- Enquiries and dashboards.
- Administration, permissions, moderation and audit foundations.
- Appropriate automated tests and CI.
- Current documentation.
- Merged work on `main`.
- Deployment and post-merge evidence where available.
- Honest remaining pilot, content, legal, domain or launch gates.

## 14. Reusable start instruction

A new active agent may be started with:

> Take autonomous ownership of building OurValleys under `AGENTS.md`, `docs/16-autonomous-delivery-mandate.md`, `docs/17-main-branch-deployment-policy.md`, `docs/18-product-experience-and-visual-design.md` and `docs/19-autonomous-build-execution-plan.md`. Inspect the current repository, issues, roadmap, backlog and merged state. Begin or resume the highest-priority unblocked implementation work. Use the accepted strict TypeScript Next.js architecture. Own each vertical slice through implementation, tests, rendered and adversarial self-review, correction, pull request, merge into `main` and post-merge or deployment verification. Continue to the next unblocked priority during the active run. Do not return routine research, coding, review or merging to me. Escalate only genuine external approval gates.
