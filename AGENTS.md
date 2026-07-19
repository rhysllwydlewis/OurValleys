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
11. `docs/20-build-readiness-audit.md`
12. `docs/21-autonomous-build-start-prompt.md`
13. `docs/22-agent-execution-controls.md`

Later numbered documents record newer authority where an older planning statement conflicts with them. Safe reversible implementation is authorised to proceed in parallel with external validation under `docs/19-autonomous-build-execution-plan.md`. The practical repository controls in document 22 govern routine execution.

## Mandatory preflight

Before starting or resuming implementation:

- Inspect current `main`, open issues, every open pull request, recent merged and deliberately closed pull requests, and visible active branches.
- Resolve or deliberately account for existing pull requests before starting a new implementation workstream.
- Check whether the intended outcome already exists in code, a closed pull request, a stale branch, an issue or the backlog.
- Identify one canonical owning issue or outcome and avoid duplicate implementation paths.
- Start the working branch from current `main`.
- Reconcile newer documentation, decisions and security findings before salvaging older work.

Do not recreate work merely because it is not on `main`. Inspect it, salvage what remains valid, and rebuild the outcome cleanly where necessary.

## Default behaviour

- Select the highest-priority unblocked work item.
- Research unstable facts using current authoritative sources where needed.
- Make safe reversible assumptions and record them.
- Use the accepted strict TypeScript Next.js architecture.
- Use `pnpm` and a committed lockfile consistently in local instructions and CI.
- Preserve the premium animated and widget-based experience direction.
- Deliver coherent, reviewable vertical slices.
- Prefer one active implementation pull request for one logical workstream.
- Use a short-lived working branch from current `main` and target the pull request to `main`.
- Add or update meaningful tests, including denial and failure paths.
- Run formatting, lint, typecheck, tests, migrations and production build where applicable.
- Exercise affected user journeys at runtime.
- Render and inspect user-interface work at desktop, tablet and mobile sizes.
- Test reduced motion, keyboard operation, loading, empty, validation, success and failure states.
- Update documentation and the owning issue in the same change.
- Create or update the pull request.
- Review the complete combined diff independently at least twice using different perspectives.
- Correct findings, improve tests and re-run validation.
- Perform further review passes whenever material defects or higher-risk boundaries are involved.
- Investigate false positives, false negatives, flaky checks and environmental failures rather than accepting appearances.
- Merge routine completed work into `main` when checks and evidence support it and no genuine approval gate applies.
- Confirm `main` contains the intended change.
- Verify the deployment triggered from `main` and affected runtime health where tools permit.
- Continue to the next highest-priority unblocked action only after every pull request owned by the current work is resolved.
- Do not assign routine work to the repository owner.
- Do not ask for confirmation when a safe strong default exists.

Opening a pull request is not completion and must not be treated as a routine handover to the product owner. Work that exists only on a feature or agent branch is not delivered. Follow the full lifecycle in documents 16, 17 and 22.

## No duplicate or stranded work

- Draft pull requests are temporary review states, not storage or handover states.
- Before starting another implementation workstream, changing focus or ending an active run, inspect every open pull request in the repository.
- Every pull request owned by the current agent or workstream must be either merged into `main` or deliberately closed before moving on.
- Do not leave a draft or ordinary routine pull request open for another chat, the product owner or an unspecified future agent to discover and resolve.
- A pull request may remain open only when a genuine external approval gate prevents both safe merge and honest closure. Record the exact gate, completed evidence and bounded decision required.
- When implementation becomes stale, conflicted, superseded or unsafe, close the pull request promptly and record the salvage path and canonical successor.
- Do not create a replacement pull request until the superseded pull request is closed.
- Do not create overlapping branches that change the same schema, route, architecture or product journey without explicit coordination and independently mergeable boundaries.
- At the end of every active run, the expected state is zero unexplained drafts and zero unattended routine pull requests.

## Security and supply-chain behaviour

- Never commit real credentials, tokens, private keys, personal data or production connection strings.
- Generate disposable test secrets at runtime or use secure secret mechanisms; do not hard-code realistic credential patterns in workflows or fixtures.
- Treat scanner findings as evidence to investigate and resolve, not noise to dismiss.
- Keep workflow permissions and application privileges at the minimum required level.
- Use reproducible lockfile-based installs.
- Verify new dependencies from current authoritative sources and justify their maintenance, licence, bundle and security cost.
- Do not disable checks, weaken assertions or relax security merely to make CI pass.
- Redact secrets, private data and sensitive identifiers from logs, issues, screenshots and pull requests.

## Build authority

- The product owner has authorised the full Phase 1 platform to be built now.
- External validation, brand confirmation, local seed research and governance work continue in parallel.
- Those workstreams do not block safe reversible engineering unless a specific change cannot be completed honestly without missing evidence.
- Use fictional representative data for development and demonstrations; never invent real business facts.
- The first implementation priority is the scaffold compatibility proof in issue `#4`.
- Issue `#12` is the successor public-business vertical slice and must not duplicate the scaffold owned by issue `#4`.
- After the scaffold and engineering foundation, proceed through issue `#11` and the remaining Phase 1 sequence.
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
- Re-read current `main` before final review when it has advanced during the work.
- After merge, verify the expected change is present on `main` and check the deployment from `main` where connected.
- If deployment fails, own the follow-up fix through review and merge into `main`.
- Remove temporary branches after merge where tooling and policy permit.

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

When escalation is required, complete all possible preparation, provide a recommendation and ask for a bounded decision rather than assigning an open-ended task.

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
- Commands, tests and checks run and their outcomes.
- Visual and interaction states inspected where applicable.
- Any false positive, false negative, flaky or environmental finding investigated.
- Pull-request and merge or closure state for every pull request touched during the run.
- Confirmation that there are no unexplained drafts or unattended routine pull requests.
- Confirmation that the delivered result is on `main`.
- Deployment and post-merge verification performed.
- Assumptions made.
- Remaining genuine blockers.
- The next autonomous action.

Never claim background or future work is underway unless a real scheduled automation exists.
