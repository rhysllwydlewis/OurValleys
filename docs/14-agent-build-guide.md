# AI Agent Build Guide

## 1. Purpose

This repository will likely be developed heavily through AI-assisted coding. This guide tells coding agents how to work safely and predictably on OurValleys.

The documentation in `docs/` is the current product source of truth. Agents must not invent features that conflict with it.

## 2. Before changing code

1. Read `README.md`.
2. Read the relevant product document.
3. Identify the exact backlog item in `11-build-backlog.md`.
4. Inspect existing code, tests, migrations and conventions.
5. State the intended vertical slice.
6. Identify permission, privacy, moderation and data implications.
7. Check whether the requested feature is deferred.

If a feature is deferred, do not quietly implement it. Record the scope conflict for the project owner.

## 3. Core product constraints

Agents must preserve these rules:

- One canonical business record powers the business site and discovery profile.
- Public and private business data are separate.
- Residents can browse without an account.
- Business-owned actions require server-side membership checks.
- Paid status never equals verification.
- Sponsored content is labelled.
- Arbitrary business JavaScript and unsafe HTML are prohibited.
- Marketplace, reviews, open forum, property and held payments are not Phase 1 features.
- Bilingual data support must not be designed out.
- Accessibility is a requirement, not a later enhancement.

## 4. Work in vertical slices

Bad task:

> Build the whole business system.

Good slice:

> Add the Business and BusinessMembership database models, migration, validation schemas and permission-focused integration tests. Do not add UI yet.

Another good slice:

> Add the first onboarding step for business name, primary category and public summary using the existing create-business service. Include autosave, accessible validation and tests.

A slice should:

- Solve one coherent part of a user journey.
- Be reviewable.
- Leave the repository buildable.
- Include tests.
- Update documentation where behaviour changes.

## 5. Do not guess existing architecture

Before writing code:

- Search for existing models and services.
- Reuse established validation and permission helpers.
- Check route and naming conventions.
- Inspect similar tests.
- Avoid creating a second way to solve the same problem.

If the repository has not yet selected a stack, do not scaffold one without an accepted architecture decision.

## 6. Data rules

- Use stable IDs internally.
- Do not expose ORM or database objects directly to public responses.
- Use explicit public projections.
- Never place private address, legal identity, billing, verification evidence or moderation notes in public serializers.
- Add database constraints for critical integrity rules.
- Use transactions for ownership, publication, claim and entitlement state changes.
- Add retention fields where the product document requires them.
- Migrations must be committed and tested.

## 7. Permission rules

For every protected operation answer:

1. Who may perform it?
2. On which business or resource?
3. What happens if the role changes during a session?
4. What audit record is required?
5. What negative test proves another tenant cannot perform it?

Do not rely on:

- Hidden UI.
- Client-side role checks.
- User-supplied business IDs.
- Guess-resistant URLs.

## 8. Public/private boundary checklist

Before completing a business-related change verify that it does not expose:

- Private home address.
- Account-only email.
- Verification documents.
- Legal name marked private.
- Internal notes.
- Billing identifiers.
- Draft content.
- Enquiry sender details.

## 9. UI rules

- Use existing design-system components.
- Build semantic HTML first.
- Ensure keyboard access.
- Provide visible focus.
- Connect labels, descriptions and errors to form fields.
- Support long names and Welsh characters.
- Include empty, loading, success and error states.
- Do not create decorative complexity that harms performance or clarity.
- Generated business templates must stay within guarded theme tokens.

## 10. Form rules

- Validate on the server.
- Reuse shared schemas where suitable.
- Preserve entered values after recoverable errors.
- Explain errors in plain language.
- Do not collect fields not required by the current journey.
- Make public visibility clear.
- Rate-limit abuse-sensitive forms.
- Do not send sensitive form content to analytics.

## 11. Content rules

- Never invent business facts.
- AI-generated business wording remains draft until owner approval.
- Do not copy competitor or publisher content.
- Preserve content-type and sponsorship labels.
- Include review or expiry state for time-sensitive content.
- Store language state explicitly.

## 12. Search rules

- Index only public published fields.
- Exclude draft, hidden, suspended and archived content as defined.
- Keep paid placement separate and labelled.
- Respect private-address rules in geographic search.
- Add representative relevance and negative fixtures.
- Do not add a separate search service without the documented trigger and decision.

## 13. Media rules

- Validate content type, size and dimensions.
- Treat filename and browser MIME type as untrusted.
- Do not serve executable uploads inline.
- Generate safe public derivatives.
- Remove unnecessary sensitive metadata.
- Verify ownership before update or deletion.
- Store rights and alt-text information.

## 14. External integration rules

- Read official provider documentation.
- Validate environment variables at startup.
- Verify webhook signatures.
- Make retryable handlers idempotent.
- Never log tokens or full payloads containing personal data.
- Add integration boundaries so providers can be replaced.
- Provide failure states and monitoring.

## 15. Analytics rules

- Use the event dictionary in `09-commercial-model-and-analytics.md`.
- Do not create ad hoc event names without updating the dictionary.
- Send only allowlisted properties.
- Never include enquiry text, email, telephone, private address or verification evidence.
- Define what success means before instrumenting it.
- Do not present button clicks as completed sales.

## 16. Test requirements

Every change must add or update the appropriate tests.

At minimum consider:

- Unit rule test.
- Database integration test.
- Permission denial test.
- Cross-tenant test.
- Public/private response test.
- Accessibility check.
- End-to-end critical path where behaviour is user-visible.

Do not weaken assertions merely to make a build pass.

## 17. Migration requirements

Before adding a migration:

- Explain the data change.
- Consider existing data.
- Add constraints safely.
- Decide whether backfill is needed.
- Test applying to empty and representative existing schemas.
- Document destructive risk.
- Keep rollback or forward-fix plan.

## 18. Error handling

- Use expected domain errors for recoverable cases.
- Do not expose stack traces or database errors to users.
- Log a correlation identifier.
- Redact sensitive values.
- Preserve user work where possible.
- Distinguish validation, permission, conflict, rate-limit and server failure states.

## 19. Security stop conditions

Stop and flag the change if it would:

- Add arbitrary user code execution.
- Expose private verification or address data.
- Bypass server authorisation.
- Store full payment-card data.
- Disable security checks for convenience.
- Make an admin route public.
- Introduce a public upload without validation.
- Add marketplace, review, community or property functionality without release-gate approval.

## 20. Documentation updates

Update documentation when a change alters:

- Product scope.
- User journey.
- Route.
- Data entity or state.
- Permission.
- Analytics event.
- moderation process.
- legal assumption.
- architecture decision.
- operational procedure.

A code-only change that makes the documentation false is incomplete.

## 21. Pull request structure

Recommended PR body:

```markdown
## Backlog item
OV-XXX

## User problem

## Scope

## Out of scope

## Product and data changes

## Permission and privacy review

## Safety or moderation review

## Tests

## Screenshots or recordings

## Migration and deployment notes

## Documentation updated

## Remaining risks
```

## 22. Completion report

At the end of a task, state:

- What changed.
- Files and migrations added.
- Tests run and results.
- Any assumptions.
- Any incomplete requirement.
- Any new risk or follow-up.

Do not claim success if the full test suite or required checks were not run.

## 23. Agent prompt template

```text
Work on OurValleys backlog item OV-XXX only.

Read README.md and the relevant docs before changing code. Inspect the existing implementation and follow established patterns.

Deliver one reviewable vertical slice. Preserve server-side permissions, tenant isolation, public/private business data separation, accessibility and bilingual readiness. Add appropriate tests, including a negative permission or cross-tenant test for protected business actions.

Do not implement deferred modules or unrelated refactors. Do not invent business facts or add unsafe user HTML/JavaScript. Update the relevant documentation if behaviour or data changes.

Before finishing, run the repository’s lint, typecheck, tests and build commands. Report honestly what ran, what changed and what remains.
```
