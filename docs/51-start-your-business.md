# 51. Start your business: a guided create-or-claim journey

Status: shipped by the overhaul routine (see `docs/36-overhaul-programme-log.md`). Covers WP-02 of
`docs/32-free-business-website-product-brief.md`: a verified user searches for likely matches, can claim an
existing business or continue with a distinct one, and receives an attached draft.

## What changed

- `/account/new-business` is a four-step guided form (name, what it does, where, how customers reach you) with a
  progress indicator, a category picker (filterable pills instead of a 24-item select), reach cards, and a live
  **starter-website preview** beside it (sticky on desktop, below the form on phones) plus a "what you get, free"
  panel.
- **Live "is it already listed?"** runs while the name is typed (400 ms debounce, stale answers discarded), matching
  accent-, case-, punctuation- and "Ltd"-insensitively, on the English _and_ Welsh trading name, tolerating a typo.
  Matches offer **Claim this business** and **View listing**. A same-name or very-similar match must be answered with
  "None of these is mine" before creating; a merely "possible" match is shown but never blocks. The server repeats the
  check on submit, so skipping the UI cannot skip the question.
- Unverified accounts see an explanation and a link to account settings instead of a form that fails on submit; the
  server returns a distinct `unverified` status.
- `/claim/[businessId]` gains a business summary, a three-step "what happens next", sign-in or register prompts for
  signed-out visitors, field hints and a "start a separate listing" exit. The claim action itself is unchanged.
- All new strings are in `src/lib/i18n/messages/startx.ts` (EN and first-draft CY).

## How it is built

| Piece                    | File                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| Pure name matching       | `src/modules/businesses/start-journey.ts` (`businessNameSimilarity`, `rankSimilarBusinesses`) |
| Progress and preview     | same file (`startProgress`, `starterPreview`, `previewInitials`)                              |
| Candidate query          | `findSimilarPublishedBusinesses` in `src/modules/businesses/creation.ts`                      |
| Live check server action | `findSimilarBusinessesAction` in `src/app/account/new-business/actions.ts`                    |
| UI                       | `src/components/start-business/`                                                              |

The preview calls the same `resolveCategoryVariant` and `defaultAppearanceForVariant` the live website uses, so it
never promises a template or section order the owner will not receive.

## Data and privacy

- No schema change and no migration. The candidate query uses the existing `pg_trgm` and `ourvalleys_unaccent`
  objects, reads only published businesses and returns only public fields (name, Welsh name, slug, place, category).
- The live check is available only to a signed-in, verified, non-demo account and is limited to 40 requests a minute
  per account (in-memory, per instance), so it cannot be used to enumerate the directory.
- Wildcard characters in the name are escaped and treated as text.

## Tests

- Unit: `src/modules/businesses/start-journey.test.ts` (matching, ranking, progress, preview, initials).
- Integration (real Postgres): `tests/integration/business-creation.test.ts` (typo, accents, Welsh name, drafts never
  surface, wildcards).
- Playwright: `tests/e2e/account-business-start.spec.ts` (live check, preview, duplicate gate, claim page, Welsh,
  axe scans). Named to run before specs that change the shared account's password.

## Left for later

Saved drafts of the form across reloads, address-based duplicate hints, a "claim" status tracker for the claimant,
map-based place selection, Welsh review by a fluent speaker.
