# Business Onboarding Draft Service

## Outcome

Issue #36 advances Stage G from a static checklist to a versioned draft foundation for the first profile and location steps.

## Persistence model

`business_onboarding_draft` stores at most one draft per business. The business foreign key cascades on deletion, while the unique business index prevents duplicate draft records. The integer `version` is non-negative and supports optimistic concurrency.

Profile and location values are stored as structured JSON only after validation. They are drafts, not public projections, and completing them does not publish or verify a business.

## Validation boundaries

- Trading names and summaries are trimmed and length-limited.
- Public email addresses are validated and normalised to lowercase.
- Empty optional public fields become `null` rather than ambiguous empty strings.
- Full public-address visibility requires a public address and postcode.
- Premises require a private address and postcode even when the public view is locality-only or service-area-only.
- Public and private address fields remain separate.

## Autosave contract

Every patch includes the business identifier and the caller's expected version. A stale expected version returns a conflict with the current version; it never overwrites newer work. A patch for a different business fails closed.

A database adapter must execute the version comparison and update atomically, for example with `WHERE business_id = ? AND version = ?`, and return a conflict when no row is updated. The domain service in this slice supplies the validated and deterministic contract for that adapter.

## Checklist derivation

Only a fully validated profile or location draft marks its corresponding checklist step complete. Preview, verification and publication remain separate future gates.

## Successor work

The next slice should connect the domain contract to authenticated server actions and a transaction-safe Drizzle repository, then provide accessible profile and location forms with saving, saved, invalid and conflict states.