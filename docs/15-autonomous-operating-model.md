# Autonomous Operating Model

## 1. Purpose

OurValleys is intended to be planned and built with extensive AI assistance. The default operating model is therefore **agent-led execution with minimal product-owner interruption**.

The product owner sets the vision, provides access when required and approves the small number of decisions that genuinely cannot be delegated. AI agents are expected to research, specify, implement, test, review, correct, document, merge and organise ordinary project work without converting it into homework for the product owner.

The complete delivery lifecycle is defined in `16-autonomous-delivery-mandate.md`.

## 2. Default rule

When an agent can complete work safely using the repository, public sources, connected tools and reasonable documented assumptions, it should do the work.

Agents must not ask the product owner to:

- Repeat information already present in the repository or conversation.
- Perform research the agent can perform.
- Turn a broad objective into routine sub-tasks.
- Manually write documentation, seed data, acceptance criteria or test plans.
- Choose between technically equivalent low-risk implementation details.
- Triage ordinary defects or failing tests.
- Review code they are not equipped to assess.
- Repeatedly request another agent quality pass.
- Merge routine completed pull requests.
- Maintain duplicate project trackers.
- Approve every small commit or reversible decision.

## 3. Agent responsibilities

AI agents should normally complete the following autonomously:

- Product and competitor research.
- Requirements and acceptance criteria.
- Information architecture and route design.
- Data modelling and migrations.
- Architecture option analysis and reversible technical decisions.
- Repository organisation.
- Issue creation, refinement and closure.
- Code implementation.
- Automated tests and quality checks.
- Repeated independent review of agent-created pull requests.
- Correction and improvement of findings.
- Routine merge and post-merge verification.
- Documentation updates.
- Seed-data structure and public-source research.
- Draft policies, operating procedures and review checklists.
- Accessibility, privacy and security analysis.
- CI investigation and repair.
- Dependency maintenance where changes are compatible and tested.
- Draft launch content that does not invent facts or copy protected content.

## 4. Product-owner approval gates

Escalate only when the decision requires something an agent cannot legitimately supply or when the consequence is material and difficult to reverse.

### Required approval or input

- Spending money or entering a paid contract.
- Purchasing or transferring a domain.
- Providing private credentials, API keys or access not already connected.
- Sending external messages, applications or outreach in the product owner’s name.
- Making a legally binding commitment.
- Publishing a major public announcement or launching to the public.
- Giving final legal, regulatory, tax or insurance sign-off.
- Supplying identity or verification documents.
- Selecting among materially different brand directions after evidence has been prepared.
- Approving destructive data operations without a tested recovery route.
- Accepting a material increase in privacy, security, moderation or financial risk.

### Preferred escalation format

Do not send an open-ended task. Present:

1. The recommended decision.
2. Why it is recommended.
3. The strongest alternative.
4. Cost or risk difference.
5. A simple approval request, ideally yes/no.

## 5. Assumption policy

Agents may make reasonable reversible assumptions when evidence is incomplete.

Every material assumption must be:

- Recorded in the relevant document or ADR.
- Marked as confirmed, provisional or requiring validation.
- Chosen to minimise lock-in and risk.
- Revisited when real user evidence becomes available.

Do not block progress merely because a preference has not been stated when a safe default exists.

## 6. Issue ownership

GitHub issues represent project work, not tasks assigned automatically to the product owner.

Rules:

- Leave issues unassigned unless a real human or configured agent account is actively responsible.
- Do not assign issues to the repository owner merely because they created the project.
- Use labels and issue status to show state.
- Record agent progress and evidence in the issue.
- Close issues when their documented acceptance criteria are met and the merged result is stable.
- Split out only the genuinely external approval or real-world action that remains.

The product owner may still choose to complete or steer any issue, but that is not the default expectation.

## 7. Autonomous work states

Use the following conceptual states even if GitHub labels are not yet configured:

- `ready-agent` — can be completed without product-owner input.
- `in-progress-agent` — currently being researched or implemented.
- `reviewing-agent` — implementation is complete and independent quality passes are underway.
- `merge-ready-agent` — review findings are resolved and required evidence supports merge.
- `blocked-external` — depends on access, payment, legal review or real-world contact.
- `approval-needed` — recommendation is ready and only a bounded decision remains.
- `validated` — evidence has confirmed the assumption.
- `done` — acceptance criteria are met, merged and documented.

## 8. Research and evidence

Agents should use authoritative and current sources for unstable matters such as law, platform capabilities, software support, prices and public datasets.

Research output should include:

- Source and retrieval date.
- What the evidence supports.
- Any uncertainty or licensing restriction.
- Whether the finding changes product scope or architecture.

Public-source research may prepare a target-business or content lead list, but agents must not fabricate consent, claim a business profile or publish private data without a legitimate basis.

## 9. Real-world validation

Some evidence cannot be produced from desk research alone. Business interviews, pilot commitments and usability sessions ultimately involve real people.

Agents should still complete all preparatory work:

- Identify candidate businesses from public sources.
- Prepare the outreach list in an appropriate private location.
- Draft the message, interview script and consent wording.
- Create the note-taking and scoring template.
- Prepare example business pages.
- Summarise public evidence and likely objections.
- Reduce the remaining human action to approving or sending a prepared outreach batch.

The product owner should not be asked to design the validation exercise from scratch.

## 10. Coding and pull-request autonomy

Once the required P0 architecture decisions are recorded, agents may scaffold and implement backlog items in reviewable vertical slices.

Agents should:

- Select the next unblocked highest-priority backlog item.
- Create or use a dedicated branch.
- Implement the slice.
- Run the strongest applicable lint, typecheck, test and build checks.
- Update documentation and project state.
- Commit and open or update a pull request where the available workflow permits.
- Treat the pull request as continuing work, not a handover.
- Review the complete diff independently at least twice using meaningfully different perspectives.
- Correct all material findings and improve regression coverage.
- Investigate false positives, false negatives, flaky checks and environmental failures.
- Re-run validation after every material correction.
- Perform further review passes for higher-risk or repeatedly defective changes.
- Merge routine completed work when required evidence supports it and no genuine approval gate applies.
- Verify default-branch, deployment and runtime health after merge where tools permit.
- Continue to the next highest-priority unblocked action during the active run.
- Report only material decisions, failures, evidence and approval gates.

Opening a pull request is not completion. The repository owner is not the default code reviewer or merger. Follow `16-autonomous-delivery-mandate.md` for mandatory review passes, merge authority and post-merge ownership.

Agents must not claim to continue working after the current run unless an explicit scheduled or persistent execution mechanism has been created. Autonomous means minimal-interruption execution during active runs, supported by durable repository state between runs, not fictitious invisible background work.

## 11. Communication standard

Progress updates should focus on outcomes:

- What was completed.
- What was decided and why.
- What defects were found during independent review and how they were corrected.
- What evidence supports readiness.
- What remains genuinely blocked.
- The next autonomous action.

Avoid burdening the product owner with low-level tool operations or asking for confirmation where a reversible safe default is available.

## 12. Current authority

Until changed by a recorded decision:

- OurValleys remains the working brand.
- Initial coverage remains RCT, with density built first in Rhondda.
- The free generated business website remains the flagship feature.
- Phase 1 scope remains defined in `01-mvp-specification.md`.
- Deferred modules remain behind their release gates.
- Agents are authorised to continue planning, research, documentation and reversible repository setup without further approval.
- Agents are authorised to own routine implementation pull requests through repeated review, correction, validation, merge and post-merge verification when repository permissions and protections permit.