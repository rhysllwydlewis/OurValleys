# Place suggestions

Status: built on branch `claude/ourvalleys-overhaul-place-suggestions`; see the programme log (`docs/36-overhaul-programme-log.md`) for shipping status.

## Problem

Place profiles (doc 96) are written only by admins. The people who live in a place know when the market day moves or a bus route changes, but had no way to say so.

## What was built

- **`place_suggestion` table** (migration 0073, additive, cascades with the place): kind (`fact`, `correction`, `welsh`, `other`), optional fact heading, message (3-500 characters; a fact's detail is capped at 240 so it fits a profile fact), status (`new`, `applied`, `dismissed`), reviewer and time. No name, email or account is stored.
- **Public form** at `/places/[slug]/suggest`, linked from every place page ("Suggest a change"): radio choice of kind, heading and detail for a fact, live character counter, success, validation, rate-limit, unknown-place and error states, English and Welsh. The page is `noindex`.
- **Admin queue** at `/admin/place-suggestions` (nav link "Place suggestions"): waiting / handled / dismissed tabs with counts, the message exactly as written (plain text), links to the public page and the profile editor, and three decisions: **Add to Good to know** (fact suggestions only), **Mark handled**, **Dismiss**.
- **Review desk**: waiting place suggestions appear in `/admin/queue` as the kind "Place suggestion" (lowest priority, 168-hour target), filterable with `?kind=place_suggestion`.
- **One-click apply**: appends the fact to the place profile (creating the profile if there is none) and marks the suggestion applied in one transaction. A full profile (8 facts) or an existing fact with the same heading refuses the apply and leaves the suggestion open, with a message telling the admin to edit the profile instead. Only `new` suggestions can be decided, so a double click or a second admin changes nothing.
- **Retention**: decided suggestions are deleted after twelve months by the existing platform retention job; waiting ones are kept.

## Security and privacy

- Public write is anonymous and rate limited (5 per hour per hashed visitor signal) with a honeypot that reports success but stores nothing. Only `active` places accept suggestions; unknown slugs return "not found" without revealing anything.
- The resolve action calls `readAdminSession` first and refuses everyone else (unit-tested, plus a signed-out e2e check). Every decision is audited (`place_suggestion.applied` / `.dismissed`).
- Nothing a visitor writes is published as written: it is rendered only as text in the admin queue, and an admin chooses whether to add a fact. Free text could contain personal details, so the form warns against it and retention removes decided rows.
- No authorisation helper, reserved file or projection was changed.

## Accessibility

Fieldset and legend for the kind, labelled fields with hints, a character counter, `role="alert"` errors, `role="status"` success, admin buttons whose names include the place, and axe (WCAG 2.1 AA) scans of the form, the admin queue and the Welsh form.

## Welsh

Form and page strings exist in Welsh as a first draft and need review by a fluent speaker. The suggestion text itself is whatever the resident wrote.

## Out of scope

Replying to the resident (no contact details are collected), place pictures, suggestions for businesses (a separate existing flow), `/cy` URLs.

## Next slice

Place pictures; a link from an applied suggestion to the profile editor with the new fact focused; Welsh review by a fluent speaker.
