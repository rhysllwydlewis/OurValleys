# 53 — Menu builder

Delivers WP-11's structured menu (docs/32 §9.3). Status: built in the menu builder overhaul (see `docs/36-overhaul-programme-log.md`).

## What an owner can now do (operations page, `#menu`)

- **Paste a menu.** One dish per line (`Leek soup - 5.50 - with bread (v)`); a line in capitals or ending in a colon starts a section; trailing `(v)`, `(gf)` style tags become dietary labels; a bare trailing number is a price. Up to 80 lines and 12 sections at a time; it only ever adds. Lines that cannot be read are skipped, never guessed.
- **Edit in place.** Every dish and section can be edited (name, description, price, labels, availability, favourite, section, visibility). Previously items could only be added and only whole sections removed.
- **Reorder.** Move sections and dishes up or down; orders are rewritten as 0..n in one transaction under a row lock.
- **Quick toggles.** "Mark unavailable" (shown muted with "Not available today", never silently hidden) and "Make a favourite".
- **Dietary labels.** Approved set (vegetarian, vegan, gluten free, dairy free, nut free, halal, spicy) as checkboxes plus free "other labels". Old free text (`gf`, `V`, Welsh `llysieuol`) is mapped onto the approved text on save and on read so filters work. Stored text is the English label; the reader sees it in their language.
- **Prices.** `4.5` becomes `£4.50`; words (`from £5`, `market price`) are kept as typed.
- **Guidance and preview.** Counts, ordered suggestions (add prices, labels, favourites, fill empty sections) and a content preview of the public menu (default columns layout; the full-menu and uploaded-file links are not shown in it).
- Single dishes can be removed (after a confirmation); limits are 30 sections and 300 dishes per business.

## What visitors get

- The menu section on `/b/[slug]` (and the private preview) uses the same component as the full page: section jump bar (three or more sections), house favourites, dietary filter chips and "hide unavailable" (progressive enhancement: the whole menu is server-rendered and readable without scripts, the filter only toggles `hidden`), unavailable state, allergen notice stating labels come from the business.
- `/b/[slug]/menu`: a printable, shareable full menu with a sticky jump bar, a print button, a link to any uploaded menu file, canonical URL and schema.org `Menu` JSON-LD (unavailable dishes left out, prices only when one plain amount, demo records never emitted).
- English and Welsh throughout (`messages/menu.ts`, first-draft Welsh, needs review by a fluent speaker). Text the business typed is data and carries the business's language.

## Design notes

- No migration: `dietary_labels`, `available`, `featured`, `sort_order` already existed. Public reads now include unavailable dishes (previously dropped) and still exclude hidden sections.
- Pure rules live in `src/modules/businesses/menu-model.ts` (labels, price, move, paste parser, guidance, filter); service functions in `content-features.ts` (`moveMenuEntry`, `setMenuItemFlags`, `importMenuGroups`, limits); server actions in the operations `actions.ts`, all behind the existing `manageContent` check and audited as `business.menu_saved` / `business.menu_removed`.
- Every write is scoped by `business_id`; a dish cannot be saved into, moved within, toggled in or removed from another business's menu (integration-tested).
- The public projection (`site-projection.ts`) and authorisation helpers are untouched.

## Not in this slice

Item photos, per-item allergen detail (14 allergens), scheduled availability (breakfast/lunch menus), menu translation per language, QR deep link straight to the menu, structured menus for non-hospitality categories (price lists for services), drag-and-drop ordering.
