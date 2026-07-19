# AGENTS.md

## Operating mode

Work autonomously by default.

The repository owner is the product owner, not the default implementer, tester, code reviewer or merger. Do not turn routine research, planning, coding, testing, documentation, issue triage, pull-request review, merge decisions or reversible technical choices into tasks for them.

Read these first:

1. `README.md`
2. `docs/00-product-charter.md`
3. `docs/01-mvp-specification.md`
4. The relevant feature documents
5. `docs/14-agent-build-guide.md`
6. `docs/15-autonomous-operating-model.md`
7. `docs/16-autonomous-delivery-mandate.md`
8. `docs/17-main-branch-deployment-policy.md`
9. `docs/18-product-experience-and-visual-design.md`
10. `docs/19-autonomous-build-execution-plan.md`

Later numbered documents record newer authority where an older planning statement conflicts with them. In particular, safe reversible implementation is authorised to proceed in parallel with external validation under `docs/19-autonomous-build-execution-plan.md`.

## Default behaviour

- Inspect the current repository, issues, roadmap, backlog and merged state before deciding the next action.
- Select the highest-priority unblocked work item.
- Research current facts using authoritative sources where needed.
- Make safe reversible assumptions and record them.
- Use the accepted strict TypeScript Next.js architecture.
- Preserve the premium animated and widget-based experience direction.
- Deliver coherent, reviewable vertical slices.
- Use a short-lived working branch where appropriate and target the pull request to `main`.
- Add or update tests.
- Run lint, typecheck, tests and build where available.
- Render and inspect user-interface work at desktop, tablet and mobile sizes.
- Test reduced motion, keyboard operation, loading, empty and failure states.
- Update documentation and the issue.
- Create or update the pull request.
- Review the complete diff independently at least twice using different perspectives.
- Correct findings, improve tests and re-run validation.
- Perform further review passes whenever material defects or higher-risk boundaries are involved.
- Investigate false positives, false negatives, flaky checks and environmental failures rather than accepting appearances.
- Merge routine completed work into `main` when checks and evidence support it and no genuine approval gate applies.
- Confirm `main` contains the intended change.
- Verify the deployment triggered from `main` and affected runtime health where tools permit.
- Continue to the next highest-priority unblocked action during the active run.
- Do not assign routine work to the repository owner.
- Do not ask for confirmation when a safe default exists.

Opening a pull request is not completion and must not be treated as a routine handover to the product owner. Work that exists only on a feature or agent branch is not delivered. Follow the full lifecycle in `docs/16-autonomous-delivery-mandate.md` and the `main` branch rules in `docs/17-main-branch-deployment-policy.md`.

## Build authority

- The product owner has authorised the full Phase 1 platform to be built now.
- External validation, brand confirmation, local seed research and governance work continue in parallel.
- Those workstreams do not block safe reversible engineering unless a specific change cannot be made honestly without the missing evidence.
- Use fictional representative data for development and demonstrations; never invent real business facts.
- The first implementation priority is the scaffold compatibility proof in issue `#4`, followed by CI, the design system and the animated homepage.
- Continue beyond the first scaffold or homepage until the Phase 1 product is production-ready or only a genuine external approval gate remains.

## Product experience

- The public product must feel premium, modern, local and trustworthy rather than like a generic directory or council portal.
- The homepage should be animated and scroll-responsive while remaining immediately searchable, fast and accessible.
- Use selective liquid-glass surfaces for navigation, search, dialogs, sheets and suitable widgets.
- Use accessible contextual widgets where they improve flow, including a login dialog on larger screens and a mobile sheet where appropriate.
- Critical widget journeys require dedicated route or resilient fallbacks.
- Support reduced motion and constrained mobile devices.
- Do not remove or substantially dilute this direction merely because a generic template is faster to implement.

## Main branch and deployment

- `main` is the canonical integration, release and deployment branch.
- Completed application, configuration and documentation work must be merged into `main`.
- Short-lived branches are temporary workspaces for implementation and review, not alternate releases.
- Do not describe branch-only work as complete, delivered or deployed.
- Do not leave a routine merge-ready pull request open and move on as though its work were finished.
- After merge, verify the expected change is present on `main` and check the deployment from `main` where connected.
- If deployment fails, own the follow-up fix through review and merge into `main`.

## Escalate only for genuine approval gates

Escalate when work requires:

- Money or a paid contract.
- A domain purchase or transfer.
- Credentials or access not already available.
- External messages sent in the owner’s name.
- A legally binding commitment.
- Final legal or regulatory sign-off.
- Identity documents.
- Public launch or a major public announcement.
- An irreversible destructive action without a tested recovery path.
- Acceptance of materially increased privacy, security, moderation or financial risk.

When escalation is required, complete all possible preparation, provide a recommendation and ask for a bounded yes/no decision rather than assigning an open-ended task.

## Non-negotiable product constraints

- One canonical business record powers discovery and the generated website.
- Public and private business data remain separate.
- Protected actions require server-side authorisation and tenant-isolation tests.
- Paid status never equals verification.
- Sponsored content is labelled.
- Arbitrary user JavaScript and unsafe HTML are prohibited.
- Accessibility and bilingual readiness are first-class requirements.
- Marketplace, reviews, open forum, property and held payments remain deferred until their release gates are met.

## Completion report

State:

- What changed.
- Which independent review passes were performed.
- Defects or weaknesses found and corrected.
- Tests and checks run.
- Visual and interaction states inspected where applicable.
- Any false positive, false negative, flaky or environmental finding investigated.
- Pull-request and merge state.
- Confirmation that the result is on `main`.
- Deployment and post-merge verification performed.
- Assumptions made.
- Remaining genuine blockers.
- The next autonomous action.

Never claim background or future work is underway unless a real scheduled automation exists.
