# Autonomous Build Start Prompt

## Purpose

Use the prompt below to start a new active agent or ChatGPT coding conversation for OurValleys.

The full project authority and detail live in the repository. This prompt activates that authority; it does not replace the documentation.

## Prompt

```text
Use the connected GitHub repository `rhysllwydlewis/OurValleys` and take autonomous ownership of building the complete OurValleys Phase 1 platform.

Begin by reading and following `AGENTS.md` and the repository documentation, especially:

- `docs/00-product-charter.md`
- `docs/01-mvp-specification.md`
- `docs/13-testing-and-quality.md`
- `docs/16-autonomous-delivery-mandate.md`
- `docs/17-main-branch-deployment-policy.md`
- `docs/18-product-experience-and-visual-design.md`
- `docs/19-autonomous-build-execution-plan.md`
- `docs/20-build-readiness-audit.md`
- `docs/adr/0011-parallel-autonomous-implementation.md`

Inspect the complete current repository state, open issues, every open pull request, roadmap, backlog, ADRs and merged work before acting. Resolve existing pull requests before starting a new implementation workstream. Do not ask me to turn the objective into routine tasks or repeat information already contained in the repository.

The objective is to take OurValleys from its current planning state to a complete, credible and production-ready Phase 1 website. This is an outcome-based assignment, not a request for advice, a plan only, a mock-up, one isolated feature or one pull request.

Use the accepted technical baseline:

- Strict TypeScript.
- Next.js App Router.
- Node.js 24 LTS.
- `pnpm` with a committed lockfile.
- A modular monolith in this repository.
- PostgreSQL with PostGIS.
- Drizzle ORM and committed SQL migrations.
- Better Auth with database-backed sessions.
- Railway for the web app, worker and PostgreSQL.
- Cloudflare R2 for controlled media storage.
- Resend behind an internal email adapter.
- PostgreSQL search for Phase 1.
- pg-boss for background jobs.
- First-party privacy-minimised analytics.

Verify current compatible dependency versions from official sources during implementation, but do not reopen accepted architecture decisions without a demonstrated trigger.

Start with GitHub issue #4: complete the strict-TypeScript scaffold compatibility proof. Own it through implementation, tests, documentation, at least two meaningfully different self-review passes, correction, pull request, merge into `main` and confirmation that the result exists on `main`.

After the scaffold, continue autonomously through CI and engineering foundations, then issue #11 for the accessible premium design system and animated homepage, and continue through the remaining highest-priority unblocked Phase 1 work. Do not stop after opening or merging the first pull request. During each active run, continue to the next suitable vertical slice unless only a genuine external approval gate remains.

The intended public experience must be preserved:

- Premium, modern, local and trustworthy rather than a generic directory, template dashboard or council portal.
- An animated, scroll-responsive homepage that remains immediately searchable, fast and useful.
- No scroll-jacking and no important content available only during animation.
- Selective liquid-glass surfaces for suitable navigation, search, dialogs, sheets and widgets rather than glass everywhere.
- Accessible contextual widgets where they improve flow.
- Selecting Log in should normally open an accessible dialog on larger screens and a suitable mobile sheet on small screens, with a resilient dedicated authentication route fallback.
- Strong mobile, tablet and desktop design.
- Full reduced-motion support.
- Generated business pages that feel like credible standalone websites.
- Real visual inspection and improvement, not only passing code checks.

Use fictional representative data for development, tests and demonstrations until real content is properly sourced. Do not invent facts about real businesses, residents, events or places, and do not present fictional content as real coverage.

Treat issues #1, #2, #3, #5, #6 and #7 as parallel validation, local-data, governance, brand and content workstreams. Complete all autonomous preparation and research possible, but do not use them as a total engineering block. Preserve their real evidence and public-launch gates.

For every substantial change:

1. Select a coherent vertical slice.
2. Create or use a short-lived branch from current `main`.
3. Implement the complete intended outcome.
4. Add the strongest appropriate tests.
5. Run formatting, lint, typecheck, tests, migrations and production build as applicable.
6. Exercise the actual user journey at runtime.
7. For UI work, inspect desktop, tablet and mobile rendering, keyboard use, reduced motion, loading, empty, success and error states.
8. Open or update a pull request targeting `main`.
9. Review the complete combined diff independently at least twice using meaningfully different perspectives.
10. Attempt to find omissions, regressions, security or privacy errors, accessibility failures, weak visual quality, false positives, false negatives, flaky checks and incomplete integration.
11. Correct every material finding, improve regression coverage and repeat affected checks.
12. Perform additional review passes when defects, uncertainty or risk justify them.
13. Merge routine completed work into `main` when the evidence supports it and no genuine approval gate applies.
14. Confirm the intended result is present on `main`.
15. Verify deployment, logs, health and affected journeys after merge where connected.
16. Own any follow-up defect through another reviewed pull request into `main`.
17. Update and close the relevant issue only when its true acceptance criteria are met and the merged result is stable.
18. Inspect every open pull request before changing workstreams or ending the active run.
19. Merge each completed pull request or deliberately close each stale, superseded, conflicted or unsafe pull request with the reason and salvage path recorded.
20. Continue to the next highest-priority unblocked action only after the current workstream has no unresolved draft or routine pull request.

Opening a pull request is not completion. Branch-only work is not delivered. Draft pull requests are temporary review states, not storage for another chat or the product owner. Do not leave an unexplained draft or unattended routine pull request open when moving to another task or ending the active run. Every pull request you own must be merged or deliberately closed. Do not make me the default code reviewer, test reviewer, visual-quality reviewer or merger. Do not merely report ordinary defects or failing checks when you can investigate and correct them yourself.

Make ordinary reversible product, design and technical decisions independently using the repository, current authoritative sources and sound judgement. Record material assumptions and decisions. Do not block on minor preferences where a safe strong default exists.

Escalate only when progress genuinely requires something you cannot legitimately provide, such as new credentials or access, spending money, a domain purchase or transfer, external messages sent in my name, identity documents, a legally binding commitment, final specialist legal or regulatory sign-off, public launch approval, an irreversible destructive operation without tested recovery, or acceptance of materially increased privacy, security, moderation or financial risk.

Before escalating, complete all preparation possible and present one recommended decision, the strongest alternative, the material cost or risk difference and the smallest bounded approval required.

Do not claim invisible or indefinite background work unless an actual scheduled or persistent mechanism has been created. Maintain durable progress, decisions, checks, merged or deliberately closed PRs, blockers and the next action in the repository so another active run can continue without relying on chat history.

Begin now by inspecting the current state, confirming there are no unresolved pull requests, and taking issue #4 through the complete autonomous delivery lifecycle. Do not return only a plan; perform the work with the highest legitimate autonomy available.
```

## Continuation prompt

For a later active session, use:

```text
Continue autonomous delivery of `rhysllwydlewis/OurValleys` from the latest merged repository state under `AGENTS.md` and documents 16 through 21. Inspect and resolve every open pull request before starting new work. Resume the highest-priority unblocked outcome and own it through implementation, repeated review, correction, merge into `main` and post-merge or deployment verification. Before changing workstreams or ending the run, merge or deliberately close every pull request you own. Do not hand routine review or merging back to me.
```
