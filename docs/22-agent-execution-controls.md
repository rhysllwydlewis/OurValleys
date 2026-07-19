# Agent Execution Controls

## 1. Purpose and authority

This document tightens the practical execution rules for autonomous agents building OurValleys.

It supplements `AGENTS.md` and documents 16 through 21. Where an earlier delivery instruction is less specific, this later control governs routine repository execution.

The purpose is not to reduce autonomy. It is to prevent wasted work, duplicated implementations, stale branches, weak evidence, unsafe merges and unfinished handovers while allowing the active agent to make ordinary reversible decisions independently.

## 2. Mandatory repository preflight

Before starting or resuming implementation:

1. Read `AGENTS.md` and the relevant repository documents.
2. Inspect current `main`, open issues, open pull requests, recent merged and deliberately closed pull requests, and active branches visible through the available tools.
3. Check whether the intended outcome is already implemented, partly implemented, superseded or represented by a closed branch or pull request.
4. Identify the single issue or recorded backlog outcome that owns the work.
5. Check dependencies, accepted ADRs, genuine approval gates and likely conflicts with other active work.
6. Confirm the working branch starts from current `main`.
7. Record the chosen outcome and material assumptions in the issue or pull request when that improves continuity.

Do not begin by recreating work that already exists. Reuse or salvage verified work where appropriate, but never copy an old branch over current `main` without reconciling newer decisions, documentation and security findings.

## 3. Workstream ownership and concurrency

One outcome should have one clear active owner and one canonical implementation path.

- Prefer one active implementation pull request for a logical workstream.
- Do not create a replacement pull request until a superseded pull request is deliberately closed.
- Do not run overlapping implementation branches that edit the same architecture, schema, route or product journey unless the work is deliberately coordinated and independently mergeable.
- When parallel work is genuinely useful, define boundaries before implementation and re-check them before merge.
- Re-read current `main` before final review because another merged change may have altered assumptions.
- Resolve conflicts by preserving the newest accepted authority and the strongest verified implementation, not simply whichever branch is older or larger.

An agent may continue to a separate independent workstream only after the current workstream has no unexplained draft, unattended routine pull request or ambiguous ownership state.

## 4. Issue discipline

Issues are durable outcome records, not a substitute for judgement and not a reason to fragment the project into tiny tasks.

For implementation work:

- Use the existing owning issue where one exists.
- Refine ambiguous acceptance criteria before or during implementation without asking the product owner for routine wording.
- Record meaningful implementation evidence, review findings and the final merged state.
- Keep external-evidence issues open when their real acceptance criteria are not met.
- Close an issue only when its actual outcome is merged into `main`, verified and stable.
- Do not close an issue merely because a pull request was opened or because a partial technical foundation exists.
- When an issue is duplicate or superseded, deliberately close or retarget it and record the canonical successor.

## 5. Branch and pull-request lifecycle

The normal delivery path is a short-lived branch and pull request into `main`.

- Create the branch from current `main`.
- Keep the branch focused on one coherent outcome.
- Update from current `main` before final review when `main` has advanced materially.
- Review the complete combined diff, not only the latest commits.
- Resolve all material review, CI, security and dependency findings.
- Merge routine completed work into `main` when evidence supports it.
- Confirm the intended result exists on `main`.
- Verify deployment and affected journeys where connected.
- Remove the temporary branch where tooling and repository policy permit.

Draft pull requests are short-lived review states only. Every pull request owned by the active work must be merged or deliberately closed before the agent changes workstreams or ends the active run, except where a precisely recorded external approval gate genuinely prevents both safe merge and honest closure.

Direct commits to `main` are exceptional. Use them only for a genuine emergency or when no safe pull-request route exists. Record the exception and perform equivalent review and post-change verification.

## 6. Definition of implementation evidence

Do not rely on statements such as “this should work” or “tests pass locally” without recording the actual applicable evidence.

For each substantive change, record as applicable:

- Commands run and their outcome.
- Relevant test counts and important coverage boundaries.
- Database migration and rollback or recovery checks.
- Runtime routes or journeys exercised.
- Desktop, tablet and mobile states inspected.
- Keyboard, focus, reduced-motion and assistive-technology checks.
- Security, secret and dependency findings investigated.
- False positives, false negatives, flaky checks or environmental failures and how they were classified.
- CI result for the final pull-request head.
- Merge commit or confirmed state on `main`.
- Deployment, health and smoke-test result.

Evidence should be sufficient for another agent to understand what was actually verified without relying on chat history.

## 7. Testing behaviour

Tests must protect documented user outcomes and risk boundaries rather than merely mirror implementation details.

Agents must:

- Add regression tests for genuine defects.
- Test denial paths as well as success paths.
- Test tenant isolation and public/private projection wherever relevant.
- Exercise invalid, empty, repeated and boundary inputs.
- Test failure and retry behaviour for external-service boundaries.
- Avoid mocking away the risk the test is supposed to cover.
- Investigate flaky tests rather than repeatedly rerunning them until green.
- Never weaken an assertion, disable a check or reduce coverage solely to obtain a passing pipeline.
- Verify that a passing test would fail if the protected behaviour were broken where proportionate.

For higher-risk changes, perform additional review passes beyond the mandatory two.

## 8. Security and secret handling

- Never commit real credentials, tokens, private keys, personal data or production connection strings.
- Do not use realistic hard-coded credential strings merely because they are intended for tests.
- Generate disposable secrets at runtime or use secure repository/environment secret mechanisms.
- Treat every scanner finding as evidence requiring investigation.
- Do not dismiss a finding as a false positive without understanding the matched value, its provenance and its potential reuse.
- Use least-privilege permissions for workflows, applications, database roles and integrations.
- Redact secrets and personal data from logs, fixtures, screenshots, issues and pull requests.
- Keep unfinished authentication methods disabled by default.
- Do not expose internal errors, stack traces or private identifiers to public users.

A security-sensitive pull request must not merge with an unexplained scanner finding or unresolved high-impact threat boundary.

## 9. Dependencies and supply chain

- Use the accepted package manager: `pnpm` with a committed lockfile.
- CI and local documentation must use the same package-manager workflow.
- Install reproducibly with the committed lockfile.
- Verify new dependency versions and compatibility from current authoritative sources.
- Prefer maintained dependencies with clear ownership and a justified role.
- Avoid adding a package for trivial functionality that can be implemented safely and clearly in the repository.
- Review transitive risk, licence implications and client-bundle impact where material.
- Remove abandoned or duplicate dependencies and integrations.
- Do not change accepted providers or architecture solely because another option is more familiar.
- Record an ADR when a demonstrated technical trigger requires a material architecture change.

## 10. Data, migrations and background work

- Every schema change must use a committed reviewed migration.
- Migrations must be safe for the existing expected data state and deployment order.
- Destructive or irreversible changes require a tested recovery or rollback approach and explicit escalation when the risk is material.
- Use transactions where partial completion would leave invalid state.
- Make jobs idempotent where retries are possible.
- Define retry limits, failure recording and dead-letter or operational recovery behaviour where relevant.
- Seed data must be deterministic, clearly fictional or properly sourced, and safe to rerun.
- Never imply that provisional or fictional records are verified real businesses.

## 11. User-interface and visual quality

A code-complete interface is not complete until rendered and exercised.

For substantive UI work:

- Inspect real rendered pages at representative desktop, tablet and mobile sizes.
- Verify long text, missing media, empty content, loading, success, validation and failure states.
- Verify keyboard operation, focus order, focus trapping, escape behaviour and route fallbacks for dialogs and sheets.
- Verify reduced-motion behaviour and constrained-device fallbacks.
- Check contrast, readability, hit targets and content hierarchy.
- Check that animation never blocks search, navigation or important content.
- Check that selective liquid glass remains readable and degrades gracefully.
- Correct ordinary visual defects without waiting for the product owner to identify them.

Screenshots or visual-test artifacts should be captured where the environment supports them and where they provide useful evidence.

## 12. Deployment and operational readiness

Before merging a deployment-affecting change:

- Confirm required environment variables and service dependencies are documented.
- Confirm migrations, build commands, worker commands and health checks are consistent with the accepted Railway shape.
- Confirm the change has a safe deployment order.
- Identify rollback or forward-fix behaviour for material failures.

After merge where deployment is connected:

- Confirm the deployment corresponds to the merged `main` commit.
- Inspect build and runtime logs.
- Check health endpoints and the affected user journey.
- Verify worker and database behaviour where changed.
- Own any follow-up defect through another reviewed pull request into `main`.

Do not call a change deployed merely because it was merged.

## 13. Documentation and reality

Documentation, issues, code, CI and deployed behaviour must describe the same system.

- Update documentation in the same pull request as the behaviour it describes.
- Do not claim a feature is implemented until it is on `main`.
- Do not leave obsolete setup commands, package-manager instructions, document numbering or architecture status behind.
- Reconcile contradictions rather than relying indefinitely on precedence notes.
- Use the next available document number for new numbered documents.
- Update the decision and risk register for material choices or newly identified risks.

## 14. End-of-run repository state

Before ending an active run:

1. Inspect all open pull requests.
2. Merge or deliberately close every pull request owned by the current work.
3. Confirm there are no unexplained drafts or unattended routine pull requests.
4. Confirm completed work is present on `main`.
5. Confirm relevant issues and documentation match the merged state.
6. Record any genuine external blocker precisely.
7. Record the next highest-priority action.
8. Do not claim continuing background work unless a real persistent mechanism exists.

The expected default end state is a clean repository with completed work merged, unsafe or superseded work closed, evidence recorded, and no routine action transferred to the product owner.
