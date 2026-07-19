# Build Readiness Documentation Audit

## 1. Purpose

This audit records whether the OurValleys repository contains enough product, technical, design, quality and operating information for an autonomous agent to begin and continue building the complete Phase 1 website safely and without routine product-owner intervention.

Audit date: **19 July 2026**.

Final controls pass: **19 July 2026**.

## 2. Audit conclusion

The repository is ready for autonomous implementation.

It contains:

- Product vision, scope and success measures.
- Detailed Phase 1 requirements, routes, roles and journeys.
- Core data model and generated business website specification.
- Accepted strict TypeScript technical architecture.
- Trust, privacy, security, moderation and legal launch gates.
- Content, location, bilingual and analytics requirements.
- Delivery roadmap and prioritised backlog.
- Testing, accessibility, performance and security standards.
- Autonomous product, engineering, quality, pull-request and merge authority.
- `main` branch and deployment policy.
- Premium product experience, animated homepage, liquid-glass and widget direction.
- Explicit implementation sequence.
- Mandatory repository preflight and no-duplication controls.
- Security, dependency, migration, UI, evidence and end-of-run execution rules.
- A copy-ready start prompt.

The remaining unknowns are external validation, final public brand and domain, authoritative local content, named launch governance, specialist review and public-launch approval. They do not block safe reversible engineering.

## 3. Current repository reality

At the time of this final pass:

- `main` is still documentation-led and does not yet contain `package.json` or the production application scaffold.
- Issue `#4` is the canonical first engineering outcome.
- Closed PR `#13` contains historical foundation work that may be inspected and selectively salvaged, but it must not be reopened or merged unchanged.
- Issue `#12` is the successor public-business vertical slice after issue `#4`; it must not duplicate the scaffold.
- Issue `#11` owns the premium design system and animated homepage after the scaffold and engineering foundation.
- The CI bootstrap exists on `main` and has been aligned with `pnpm`, reproducible lockfile installation, runtime-generated test secrets and password-free disposable Postgres authentication.
- There should be no unexplained draft or unattended routine pull request when a run ends.

## 4. Documents establishing current authority

Use the following order when wording conflicts:

1. Explicit product-owner instruction recorded in the repository.
2. Accepted later ADR.
3. `AGENTS.md`.
4. Later numbered standing authority document.
5. Earlier planning or recommendation document.

For the active build:

- ADR-0011 authorises implementation while external validation continues.
- Documents 16 and 17 define end-to-end delivery, merge and deployment ownership.
- Document 18 defines the product experience.
- Document 19 defines the implementation sequence.
- This audit records readiness and current reality.
- Document 21 supplies the reusable start prompt.
- Document 22 governs repository preflight, workstream ownership, duplication prevention, evidence, security, dependencies, migrations, UI review, deployment and end-of-run state.

Do not use an older planning sentence to recreate a coding freeze or transfer routine technical review back to the product owner.

## 5. Gaps resolved

### 5.1 Visual and interaction direction

Resolved by document 18, which defines:

- Premium modern local character.
- Animated scroll-responsive homepage.
- Selective liquid-glass surfaces.
- Accessible widget interaction patterns.
- Login dialog and mobile-sheet behaviour with route fallback.
- Responsive and reduced-motion requirements.
- Visual review and anti-patterns.

### 5.2 Authority to build while validation remains open

Resolved by ADR-0011 and document 19. Safe reversible implementation proceeds now while evidence-dependent and launch-dependent work continues in parallel.

### 5.3 Practical implementation sequence

Resolved by document 19. Issue `#4` is the first engineering action, followed by engineering foundations, the first public-business vertical slice, the design system and animated homepage, then the connected Phase 1 journeys.

### 5.4 Pull requests left as handovers

Resolved by `AGENTS.md`, documents 16, 17, 21 and 22. Every agent-owned pull request must be merged or deliberately closed before changing workstreams or ending the run, except for a precisely recorded genuine approval gate.

### 5.5 Duplicate and overlapping autonomous work

Resolved by document 22. Agents must inspect current and historical repository state, use one canonical owning issue, prefer one active implementation pull request per logical workstream, close superseded work before replacement, and reconcile current `main` before final review.

### 5.6 Weak or ambiguous validation evidence

Resolved by document 22. Agents must record the actual commands, CI results, runtime journeys, visual states, migration checks, scanner findings, merge state and post-merge or deployment evidence that apply.

### 5.7 CI package-manager and test-secret mismatch

Resolved in the CI bootstrap. The accepted package manager is `pnpm`; installation must use the committed lockfile. Disposable authentication secrets are generated at runtime, and disposable Postgres uses trust authentication rather than a hard-coded password.

### 5.8 Conflicting implementation issues

Issue `#4` owns the scaffold compatibility proof. Issue `#12` owns the subsequent first canonical business discovery and generated-profile slice. Agents must not implement both as competing scaffolds.

## 6. Open issue classification

### Issue #1 — founding-business validation

Valid parallel evidence workstream. It does not block fictional prototypes, scaffolding, onboarding implementation or the generated-site renderer. It remains required before claims of validated demand or pilot commitments.

### Issue #2 — RCT place hierarchy

Valid parallel local-data workstream. It does not block schemas, import tooling, administration or representative fixtures. Authoritative coverage and launch clusters still require local sense-checking.

### Issue #3 — category taxonomy

Valid parallel taxonomy workstream. It does not block configurable schemas, synonyms or provisional seed data. Launch taxonomy claims remain evidence-dependent.

### Issue #4 — TypeScript scaffold proof

**First autonomous engineering priority.** Complete, review, merge into `main`, verify and close before treating the scaffold as delivered.

### Issue #5 — governance and compliance readiness

Valid launch and operational-readiness workstream. It does not block implementation of privacy, security, moderation, accessibility and audit controls. Named real-world owners and specialist review remain launch gates.

### Issue #6 — brand, domain and proposition

Valid brand and launch workstream. The working OurValleys name and documented product experience are sufficient for reversible implementation.

### Issue #7 — launch seed content

Valid content-readiness workstream. It does not block schemas, importers, templates or clearly fictional development data.

### Issue #11 — premium design system and animated homepage

Major experience implementation after the scaffold and engineering foundation.

### Issue #12 — first public business vertical slice

Successor to issue `#4`, not a duplicate scaffold. It should connect the canonical business record to public discovery and a generated business page after the reusable foundation is on `main`.

## 7. Start readiness checklist

A new autonomous run may begin because:

- [x] GitHub repository and `main` are accessible.
- [x] Product and Phase 1 requirements are documented.
- [x] Strict TypeScript architecture is accepted.
- [x] Product experience is documented.
- [x] Autonomous execution, review, merge and deployment authority are documented.
- [x] Mandatory preflight and no-duplication rules are documented.
- [x] CI bootstrap matches the accepted package manager and secret-handling approach.
- [x] The first scaffold issue is clear.
- [x] Successor issue ownership is clear.
- [x] Validation issues are classified as parallel rather than total blockers.
- [ ] Any new external credentials required by a selected later slice are available, or that slice uses safe local/test substitutes.

The unchecked item is conditional and does not delay issue `#4`.

## 8. Recommended first action

Perform the mandatory preflight, confirm there are no unresolved pull requests, inspect closed PR `#13` only for salvageable source material, and complete issue `#4` on a clean branch from current `main`.

Use `pnpm`, commit the lockfile, run the complete applicable validation, investigate scanner findings, perform at least two distinct review passes, merge into `main`, confirm the scaffold on `main`, close issue `#4`, and then continue to the successor engineering work without handing routine review or merging to the product owner.
