# Business Onboarding Foundation

## Outcome

Issue #32 began Stage G by replacing the protected dashboard permission-proof placeholder with a deterministic onboarding checklist. Successor work connected transaction-safe profile, location, services, regular-hours and exceptional-hours drafts, plus the controlled publication lifecycle.

Issue #65 now owns the remaining macro outcome: complete the end-to-end draft-preview-to-publish journey without creating a second business record or exposing private-only fields.

## Stable step model

`src/modules/businesses/onboarding.ts` defines six ordered keys:

1. `profile`
2. `location`
3. `services`
4. `hours`
5. `preview`
6. `publish`

Progress is calculated only from these stable keys. Unknown values and duplicates are ignored, canonical ordering is preserved and the percentage cannot exceed 100%.

## Connected draft preview

The protected route `/dashboard/business/[businessId]/preview` renders a generated-site preview from the latest authorised onboarding draft.

The route:

- requires a valid authenticated session;
- returns not found for invalid or unauthorised business identifiers;
- uses the existing server-side business `view` permission;
- reads the same versioned onboarding draft used by the dashboard;
- shows incomplete profile, location, service and opening-hours states honestly;
- exposes only fields deliberately modelled as public draft content;
- allows viewer memberships to inspect the preview without granting edit or publish capability;
- provides a direct route back to the correct business dashboard;
- remains private and never publishes automatically; and
- includes intentional desktop, tablet, mobile, forced-colour and reduced-motion presentation.

The dashboard publication panel links to this route so preview is part of the usable business journey rather than an undiscoverable implementation detail.

## Safety boundaries

- No business is published automatically.
- Preview and publication remain separate controlled states.
- Real verification is not implied by onboarding completion.
- The dashboard and preview continue to return not found for invalid or unauthorised tenant identifiers.
- Private premises fields are not rendered in the preview.
- No real business data, external email, R2 upload or owner-only configuration is introduced.
- Structured data remains the source of truth; arbitrary HTML and JavaScript remain prohibited.

## Current status

The Stage G baseline is not yet complete. The protected preview establishes the first coherent generated-site slice. Issue #65 continues with focused route tests, completeness guidance, publication-lifecycle reconciliation and final deployment/browser verification before the macro outcome can be considered complete.
