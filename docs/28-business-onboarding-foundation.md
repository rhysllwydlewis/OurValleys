# Business Onboarding Foundation

## Outcome

Issue #32 begins Stage G by replacing the protected dashboard permission-proof placeholder with a deterministic onboarding checklist. The route still performs authenticated, server-side tenant and permission checks before rendering any business controls.

## Stable step model

`src/modules/businesses/onboarding.ts` defines six ordered keys:

1. `profile`
2. `location`
3. `services`
4. `hours`
5. `preview`
6. `publish`

Progress is calculated only from these stable keys. Unknown values and duplicates are ignored, canonical ordering is preserved and the percentage cannot exceed 100%.

The model is deliberately independent of presentation and persistence so a successor slice can derive completion from canonical business data without rewriting the dashboard contract.

## Safety boundaries

- No business is published automatically.
- Preview and publication remain separate controlled states.
- Real verification is not implied by onboarding completion.
- The dashboard continues to return not found for invalid or unauthorised tenant identifiers.
- No real business data, external email, R2 upload or owner-only configuration is introduced.
- Structured data remains the source of truth; arbitrary HTML and JavaScript remain prohibited.

## Current assumption

Until canonical completion queries and autosave mutations are delivered, the dashboard begins at zero completed steps. This is an honest disabled state rather than invented progress. The pure progress model and regression tests establish the contract for connecting real persisted state.

## Successor slice

The next Stage G work should add a transaction-safe onboarding draft service and the first editable profile/location step, including validation, autosave conflict handling, membership permission checks, success and failure states, and database integration tests. Later slices retain ownership of claim review, media processing, template variants, preview, publish and rollback.
