# ADR-0011: Parallel autonomous implementation while validation continues

- **Status:** Accepted
- **Date:** 2026-07-19
- **Owners:** OurValleys product owner and delivery agents
- **Related work:** OV-001 through OV-008, OV-101 onward

## Context

The original delivery documents placed external business validation before significant engineering in order to avoid investing heavily in an unproven proposition.

The repository now contains a detailed product charter, MVP specification, information architecture, data model, accepted technical ADRs, safety boundaries, testing strategy, autonomous operating model and build backlog. The product owner has explicitly directed agents to build the complete website autonomously rather than waiting for every external validation action to finish.

Several Phase 0 outcomes still depend on real people, external outreach, final domain choice, governance appointments and local-content research. Treating those dependencies as a total engineering block would leave the accepted architecture and product specification unused and would contradict the current autonomous delivery mandate.

## Options considered

### Wait for all Phase 0 exit criteria

Advantages:

- Minimises engineering before real-world evidence.
- Reduces the chance of building the wrong proposition.

Disadvantages:

- Blocks work that is reversible and already well specified.
- Makes the product owner responsible for coordinating external work before agents can demonstrate the platform.
- Prevents prototypes and working software from improving validation quality.
- Conflicts with the explicit instruction to build the website now.

### Build the entire product as though all assumptions were proven

Advantages:

- Maximum implementation speed.
- Simplifies sequencing.

Disadvantages:

- Risks hard-coding unvalidated categories, places, pricing and launch claims.
- Could create public or operational commitments before governance and evidence are ready.
- Weakens the repository’s evidence-led principles.

### Proceed with reversible implementation while keeping evidence and launch gates

Advantages:

- Allows the application, design system and core journeys to be built now.
- Produces prototypes that improve business and resident validation.
- Preserves flexibility through provisional data and configurable assumptions.
- Keeps public launch, legal, domain, outreach and material-risk decisions gated.

Disadvantages:

- Requires discipline to distinguish implementation readiness from market validation.
- Some completed features may need revision after real-user evidence.
- Agents must avoid presenting fictional demonstration data as real coverage.

## Decision

Proceed with safe, reversible autonomous Phase 1 implementation while external validation, brand confirmation, governance and launch-content work continue in parallel.

Implementation is authorised to include:

- The strict TypeScript Next.js scaffold.
- CI, testing and operational foundations.
- The premium design system and animated homepage.
- Fictional representative demonstration data.
- Authentication, permissions, data models and administration.
- Business onboarding and generated websites.
- Resident discovery, places, categories, events and guides.
- Enquiries, analytics and moderation foundations.
- Preview and production deployment preparation.

The following remain gated by evidence or product-owner approval:

- External outreach in the owner’s name.
- Final domain purchase or transfer.
- Final public brand decision where options materially differ.
- Real business claims and content without an appropriate basis.
- Public launch.
- Final specialist legal or regulatory sign-off.
- Paid commitments.
- Irreversible destructive operations or material risk acceptance.

## Implementation rules

- Use provisional configurable values for unconfirmed taxonomy, locations, wording and packages.
- Use clearly fictional data for development and demonstrations.
- Do not invent facts about real businesses or residents.
- Keep open Phase 0 issues as parallel evidence workstreams.
- Do not describe implementation completion as proof of product-market fit.
- Do not mass-publish thin or fictional local content.
- Continue to respect deferred-module release gates.
- Follow `docs/18-product-experience-and-visual-design.md` and `docs/19-autonomous-build-execution-plan.md`.

## Consequences

### Positive

- Agents can begin the production scaffold immediately.
- The product owner does not have to translate the roadmap into routine tasks.
- Working software can support more credible interviews and pilot recruitment.
- The repository has one clear execution sequence.

### Negative or accepted trade-offs

- Some implementation may be revised after evidence.
- Provisional configuration and seed data require careful labelling.
- Public-launch readiness remains separate from code completion.

## Validation

The decision remains appropriate while:

- Architecture and core journeys are reversible enough to refine.
- Agents keep evidence-dependent assumptions configurable.
- No public launch occurs before the documented release gates.
- Implementation produces useful validation assets rather than false public claims.

## Revisit trigger

Revisit if:

- Validation disproves the central generated-website or local-discovery proposition.
- Parallel implementation creates unacceptable rework or cost.
- Governance or legal evidence requires a material product boundary change.
- The product owner changes the build authority through a recorded decision.

## References

- `../00-product-charter.md`
- `../10-delivery-roadmap.md`
- `../15-autonomous-operating-model.md`
- `../16-autonomous-delivery-mandate.md`
- `../18-product-experience-and-visual-design.md`
- `../19-autonomous-build-execution-plan.md`
