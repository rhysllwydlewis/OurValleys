# AGENTS.md

## Operating mode

Work autonomously by default.

The repository owner is the product owner, not the default implementer. Do not turn routine research, planning, coding, testing, documentation, issue triage or reversible technical choices into tasks for them.

Read these first:

1. `README.md`
2. `docs/00-product-charter.md`
3. `docs/01-mvp-specification.md`
4. The relevant feature documents
5. `docs/14-agent-build-guide.md`
6. `docs/15-autonomous-operating-model.md`

## Default behaviour

- Select the highest-priority unblocked work item.
- Research current facts using authoritative sources where needed.
- Make safe reversible assumptions and record them.
- Deliver one reviewable vertical slice.
- Add or update tests.
- Run lint, typecheck, tests and build where available.
- Update documentation and the issue.
- Do not assign the work to the repository owner.
- Do not ask for confirmation when a safe default exists.

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

When escalation is required, provide a recommendation and ask for a bounded yes/no decision rather than assigning an open-ended task.

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
- Tests and checks run.
- Assumptions made.
- Remaining genuine blockers.
- The next autonomous action.

Never claim background or future work is underway unless a real scheduled automation exists.
