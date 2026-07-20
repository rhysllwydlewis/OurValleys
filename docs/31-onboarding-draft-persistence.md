# Onboarding Draft Persistence

## Outcome

Issue #44 connects the validated Stage G onboarding draft contract to PostgreSQL through a server-only Drizzle repository.

## Persistence boundary

- A canonical business must exist before a draft can be created.
- At most one draft row exists per business.
- Domain validation runs before profile or location JSON is written.
- The update predicate includes both `business_id` and the caller's expected `version`.
- A stale save returns the current version and never overwrites newer work.
- Missing businesses fail closed.

## Privacy and publication

Draft profile and location values remain private onboarding state. Saving a draft does not publish, verify or project private address fields into public business data.

## Successor work

The next independently reviewable slice should expose this repository only through authenticated server actions that re-check active business membership and edit permissions, then add accessible profile and location forms with saving, saved, validation-error and conflict states.
