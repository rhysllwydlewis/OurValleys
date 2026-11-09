# 91 — Welsh descriptions for content pictures

Status: shipped by the overhaul routine (see `docs/36-overhaul-programme-log.md`).

## What this adds

Gallery photos already had a Welsh description (doc 86). The pictures that
owners attach to **offers, events, business updates and catalogue entries**
(products, treatments, team) only had an English description, which Welsh
readers heard announced as if it were Welsh. This slice gives them the same
treatment:

- **Data.** `business_media.alt_text_cy` (added in migration 0068) is now read,
  written and bounded (300 characters, blank is null) for the `offer`, `event`,
  `update` and `catalogue` media roles. No migration.
- **Owner forms.** The shared picture fields (offers, events and updates studios
  and the operations page) and each row of the products/treatments/team section
  editor gain an optional **Description in Welsh** field, marked `lang="cy"`.
  It is prefilled with the saved Welsh text; emptying it clears it. A form that
  does not send the field leaves the stored Welsh text alone, and an English-only
  edit never touches it.
- **Public pages.** `ContentPicture` is now a server component that reads the
  visitor's language. Welsh readers get the Welsh description where written and
  the owner's English otherwise; the `<img>` carries `lang="cy"` or
  `lang="en-GB"` when it differs from the page, and no `lang` for English pages.
  This covers offer, event, update, catalogue and website-section pictures.

## Rules kept

- The English description stays canonical and required for a new picture; Welsh
  only ever adds.
- Writes go through the existing owner-scoped functions, which look the picture
  up through the owner's own item and business, so one business cannot write to
  another's picture (covered by an integration test).
- No change to authorisation logic, the reserved public projection or `/cy` URLs.

## Left for later

Captions for these pictures (they have none today), Welsh alt text on the Open
Graph image of the business page, and review of the Welsh strings by a fluent
speaker.
