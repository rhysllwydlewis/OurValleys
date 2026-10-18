# 57. Welsh business content

Implements the "per-language fields on the business record" gap recorded in the bilingual slices and the first half of the bilingual-editing note in `docs/32-free-business-website-product-brief.md` (§ decisions, "field-by-field bilingual editing may follow").

## What an owner can do

A new **Welsh version** tab (`/dashboard/business/[id]/welsh`, also a tile on the overview) shows the English record beside a Welsh box for:

- the short summary (280 characters),
- the "About us" description (4,000 characters),
- each active service's name (100) and description (280),
- each draft or live offer's title (120) and description (1,000).

Blank fields keep the English. Over-long text is refused with the typed text kept (nothing is silently cut). A progress card lists what is still English and links to each field. Shared demo accounts see the page read-only.

## What Welsh visitors see

Where the owner wrote Welsh and the reader's language is Welsh:

- `/b/[slug]` shows the Welsh summary, description and service text, each tagged `lang="cy-GB"`; anything still English keeps its `en-GB` tag.
- The page's `<meta name="description">`, Open Graph and Twitter descriptions use the Welsh summary.
- Directory and search cards show the Welsh summary.
- Search (English or Welsh readers) also matches the Welsh summary, description and service text, ignoring accents like the English fields.

- The offers on `/b/[slug]` and on `/offers` show the Welsh title and description, each tagged `lang="cy-GB"` when it really is Welsh; a field left blank keeps its English and its `en-GB` tag.
- Offer search (`/offers`, site search) also matches the Welsh title and description, for English and Welsh readers.

English readers are unaffected.

## Data

Migration `0048_add_business_translation` (additive; the previous release ignores both tables):

- `business_translation(business_id, locale='cy', summary, description, updated_by_user_id)`, unique per business and locale.
- `service_translation(service_id, locale='cy', name, description)`, unique per service and locale.
- `locale` is constrained to `cy` today; widening the check is the only change a further language needs.
- Both cascade with the business or service, so closure and deletion remove the Welsh text.

The reserved public projection (`site-projection.ts`) is **not** changed: the page lays the Welsh text over the projection in the route (`applyWelshOverlay`), so the English projection contract stays exactly as it was.

Migration `0049_add_offer_translation` (additive, same shape): `offer_translation(offer_id, locale='cy', title, description)`, unique per offer and locale, cascading with the offer. The previous release ignores it. A save that leaves offers out of the form leaves existing offer text alone; offer ids that do not belong to the business being saved are ignored in both the form parser and the database transaction.

## Authorisation

Saving needs a session, a non-demo account and the existing `edit_profile` permission for that business, checked on the server in the action. Service ids in the form are only honoured when they belong to the business being saved (checked in the form parser and again in the database transaction). Audit entries record which fields changed, never the text.

## Left for later

Welsh for events, offer terms and action labels, the menu and opening-hour labels; per-language business name guidance; structured data (`JSON-LD`) in Welsh; a `/cy` URL with `hreflang`; a Welsh view in the owner preview; Welsh review by a fluent speaker (all Welsh strings are first draft).
