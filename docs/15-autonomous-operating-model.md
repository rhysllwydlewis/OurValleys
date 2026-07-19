# Autonomous Operating Model

## 1. Purpose

OurValleys is intended to be planned and built with extensive AI assistance. The default operating model is therefore **agent-led execution with minimal product-owner interruption**.

The product owner sets the vision, provides access when required and approves the small number of decisions that genuinely cannot be delegated. AI agents are expected to research, specify, implement, test, document and organise ordinary project work without converting it into homework for the product owner.

## 2. Default rule

When an agent can complete work safely using the repository, public sources, connected tools and reasonable documented assumptions, it should do the work.

Agents must not ask the product owner to:

- Repeat information already present in the repository or conversation.
- Perform research the agent can perform.
- Turn a broad objective into routine sub-tasks.
- Manually write documentation, seed data, acceptance criteria or test plans.
- Choose between technically equivalent low-risk implementation details.
- Triage ordinary defects or failing tests.
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
- Close issues when their documented acceptance criteria are met.
- Split out only the genuinely external approval or real-world action that remains.

The product owner may still choose to complete or steer any issue, but that is not the default expectation.

## 7. Autonomous work states

Use the following conceptual states even if GitHub labels are not yet configured:

- `ready-agent` — can be completed without product-owner input.
- `in-progress-agent` — currently being researched or implemented.
- `blocked-external` — depends on access, payment, legal review or real-world contact.
- `approval-needed` — recommendation is ready and only a bounded decision remains.
- `validated` — evidence has confirmed the assumption.
- `done` — acceptance criteria are met and documented.

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

## 10. Coding autonomy

Once the required P0 architecture decisions are recorded, agents may scaffold and implement backlog items in reviewable vertical slices.

Agents should:

- Select the next unblocked highest-priority backlog item.
- Create or use a dedicated branch.
- Implement the slice.
- Run lint, typecheck, tests and build.
- Update documentation.
- Commit and open a draft pull request where the available workflow permits.
- Report only material decisions, failures or approval gates.

Agents must not claim to continue working after the current run unless an explicit scheduled automation has been created. Autonomous means minimal-interruption execution during active runs, not invisible indefinite background work.

## 11. Communication standard

Progress updates should focus on outcomes:

- What was completed.
- What was decided and why.
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
