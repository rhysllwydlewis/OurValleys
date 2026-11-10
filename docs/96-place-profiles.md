# Place profiles

Status: built on branch `claude/ourvalleys-overhaul-place-profiles`; see the programme log (`docs/36-overhaul-programme-log.md`) for shipping status.

## Problem

Place pages (`/places/[slug]`) carried listings, counts and a map but only one English summary line. Nothing told a visitor what a town is _like_, and Welsh readers saw an English summary.

## What was built

- **`place_profile` table** (migration 0072, additive, one optional row per place, cascades with the place): `welsh_summary`, `about`, `about_cy`, `facts` (jsonb list), `updated_by_user_id`, timestamps. A place without a row behaves exactly as before.
- **Pure model** (`place-profile-model.ts`): zod validation (summary ≤ 500, about ≤ 3,000, up to 8 facts with label ≤ 60 and detail ≤ 240), defensive parsing of stored JSON, plain-text paragraph splitting, language fall-back (`resolvePlaceProfile`) and a completeness checklist.
- **Admin editor** at `/admin/places/[placeId]` (linked as "Profile" in the places table): Welsh summary, English and Welsh about text with counters, a fact list (add, remove, reorder, optional Welsh wording), a live preview in English or Welsh using the real public component, and a five-point completeness checklist. Saved through `savePlaceProfileAction` (platform admin only, audited as `place.profile_updated`).
- **Public place page**: the lead uses the Welsh summary for Welsh readers; an "About {place}" section and a "Good to know" panel appear only when there is something to show; metadata description and a schema.org `Place` JSON-LD block use the resolved summary.

## Language rules

Welsh readers see Welsh text where it has been written and English (marked `lang="en"`, with a short note) otherwise. English readers never see Welsh-only text swapped in. Welsh copy is a human-written field; any shipped UI Welsh is first-draft and needs review by a fluent speaker.

## Security and privacy

Public copy only; no private data. Text is rendered as text nodes (no HTML, no Markdown), so there is no injection surface. The write path calls `readAdminSession` first and refuses everyone else (tested, plus a signed-out e2e check); an unknown place id never creates an orphan row; malformed ids are "not found".

## Accessibility

Labelled fields, counters, an `aria-live` status, keyboard reorder buttons with specific names, `lang` on every Welsh or fall-back text, a `dl` for facts, and axe (WCAG 2.1 AA) scans of the editor and of a place page with a profile.

## Out of scope

Place pictures and hero art, rich text, `/cy` URLs, a public "suggest an improvement" flow for place text, seeded content (no real place facts are invented; editors write them).

## Next slice

Pictures for places, a "suggest a correction" path for place facts, a Welsh review by a fluent speaker.
