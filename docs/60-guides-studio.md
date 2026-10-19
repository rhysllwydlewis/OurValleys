# Guides studio

Status: shipped by the overhaul routine (2026-10-19). See `docs/36-overhaul-programme-log.md`.

## What it is

Guides are the editorial layer that joins businesses, places and events into one journey. Before this slice an admin edited a guide in one long inline form where every section had to carry a link, nothing could be previewed, publishing had no quality bar, and the public guide was a flat grid of cards. The studio replaces that with a dedicated editor and a proper article.

## Routes

- `/admin/guides` — the list: counts by status, review dates, overdue flags, quick publish, move to draft and archive with an announced result.
- `/admin/guides/new` and `/admin/guides/[guideId]` — the studio. Every action re-checks `readAdminSession`; the pages do too, so the shell layout is not the only gate.
- `/guides/[slug]` — the public article.

## The section model

Sections stay in the existing `guide.sections` jsonb (no migration). Each has a stable `id`, a `kind` (`text` or `tip`), a heading, 10 to 2,000 characters of text (a blank line starts a new paragraph), and an optional link with wording. A link must be a path on this site: `//host`, backslashes, spaces and `javascript:` are refused, which also closes a hole in the old rule (`startsWith("/")` accepted `//host`). Up to 12 sections. Sections written before ids existed get `s1`, `s2`… by position when read; saving persists them.

## Publishing checks

`assessGuideReadiness` (pure, `src/modules/guides/guide-model.ts`) drives the checklist the editor sees live and the rule the server enforces:

- Blocking: at least 3 sections, a summary of at least 40 characters, at least one onward link, a review date in the future.
- Advice only: linked place, summary short enough for search results, no very short sections, not tips alone, reading time plausible for the length.

`publishGuideForAdmin` re-checks the blockers on the saved version and answers `not_ready`; the studio's button state is guidance, not the rule. Moving to draft, archiving and restoring are never blocked.

## Editing safely

- A save carries the `updatedAt` the editor loaded; if someone else saved since, the save is refused with `conflict` and nothing is overwritten.
- Status changes leave `updatedAt` alone, so publishing never makes the editor's own next save conflict, and the public "Updated" date reflects when the words changed.
- A refused save names the section number and field ("Section 2 link must be a path on this site…").
- A blank reading time is filled from the length (200 words a minute).
- Unsaved edits trigger the browser's leave warning; the preview shows unsaved edits.

## The public article

Title, summary, area, reading time, author, published and updated dates, a labelled sponsorship disclosure, a contents list (3 or more sections; sticky beside the text on wide screens), numbered parts, a visually distinct local tip, a share control, a panel to the linked place, up to three related guides (same place, then same area, then newest), and a closing prompt. `Article` JSON-LD is added next to the existing breadcrumbs. The text around the guide follows the reader's language (EN/CY catalogue `guide-article.ts`); the guide's own words are tagged `en-GB` until a Welsh version exists.

## Not in this slice

- **Welsh versions of guides.** Needs a `guide_translation` table, and therefore a migration; the standard-Postgres workflow pins the migration count and its owner-approved bump is the only blocker. Design is ready: keyed by the stable section id so reordering never pairs Welsh with the wrong section, with per-field fallback to English.
- Images and a cover picture, scheduled publishing, assigning guides to authors with accounts, a revision history.

## Rollback note

No migration. An older release reads sections through the old schema, which requires a link on every section: a guide that has a section without a link would show as having no sections until the release is restored.
