# 40. Business website section library and live-preview designer

Implements `docs/32` §7–9 (WP-04, WP-05, WP-06, WP-07): the generated business website is one page built from one configurable section library.

## Section library

Ten sections can be shown or hidden, reordered and given an approved layout. Navigation is derived from the visible order, so there is no separate menu.

| Section       | Layouts          | Appears when                        |
| ------------- | ---------------- | ----------------------------------- |
| About         | split, stacked   | there is a description or summary   |
| Services      | cards, list      | at least one service                |
| Gallery       | grid, feature    | at least one gallery picture        |
| Location      | panel, statement | a public location is shown          |
| Hours         | list, compact    | regular hours or special days exist |
| Contact       | panel, buttons   | at least one public contact method  |
| Offers        | cards, list      | at least one active offer           |
| Events        | cards, timeline  | at least one upcoming event         |
| Menu          | columns, compact | menu groups or a menu document      |
| Accessibility | chips, list      | at least one declared attribute     |

The last five are the **operation sections**. They previously sat below the configurable blocks in a different visual language and could not be moved or hidden. They now use the same card, type and template styling (`--business-*` tokens, so the three templates and four accents apply to them) and are placed by the owner's saved order.

Closure notices (temporarily or permanently closed) always show above the page. Category feature sections and reviews stay after the configurable sections. Share and save are one quiet strip, not two stray widgets.

## Storage and compatibility

No migration. `business_appearance` already stores `hidden_sections`, `section_order` and `section_layouts` as text arrays.

- `normalizeAppearance` appends any section missing from a stored order in canonical order, so every existing business gets the five new sections after hours, which is where they already appeared. Nothing moves on the live site when this ships.
- Stored layouts are read per section. An older row with five layouts, or one unknown value, keeps every other choice and takes the standard layout for the rest. (Before, one unknown value discarded all layouts.)
- **Rollback caveat.** The previous code validated `hidden_sections` and `section_order` against only the five original ids. A business that saves the designer after this release stores ten ids, and reverted code would treat that row as invalid and show the default appearance (the layouts column alone is tolerated). Before reverting, remove the new ids from saved rows:
  `update business_appearance set section_order = array(select s from unnest(section_order) s where s in ('about','services','gallery','location','hours')), hidden_sections = array(select s from unnest(hidden_sections) s where s in ('about','services','gallery','location','hours'));`
  Rolling forward needs nothing.

## Live preview

The website designer shows the real private preview next to the form. Choices that are not yet saved are sent in the preview address (`template`, `accent`, `hide`, `order`, `layouts`, `frame=1`). `applyAppearanceDraft` checks every value against the approved lists on its own and keeps the saved value for anything unrecognised, so a hand-edited address cannot produce an unapproved style or break the page. Clicks in the preview are not counted as visitor activity, and form-based contact buttons are left out for a business that has no public address yet. The preview route keeps its existing server-side membership check (`view` permission); nothing is written. Move controls (up and down buttons with announcements) need scripts; saving without scripts still keeps the current order.

## Section headings and intros (English and Welsh)

Every section has an optional owner-written **heading** (up to 60 characters) and **intro** (up to 280), each in English and Welsh, edited under "Your own words for this section" on each designer row and shown in the live preview as you type.

- **Plain text only.** Control characters and line breaks are removed, white space collapses and each field is cut to its limit on save and again on read. Text is rendered as escaped text; no markup or HTML is accepted.
- **Fallback.** A reader sees the text in their own language; if only the other language was written, that text is shown instead and carries its own `lang` attribute, so a Welsh page never passes English off as Welsh. A box left empty means the standard wording.
- **Location** uses the heading in place of its small label and the intro in place of its note (its large heading stays the public location text). Navigation labels stay standard so menus are consistent.
- **Storage (no migration).** The copy lives in the existing `business_appearance.section_layouts` text array as `copy.<section>.<heading|intro>.<en|cy>:<text>` entries (at most 40). Layout readers split at the first colon and look up only known section ids, so the previous release ignores them and a revert needs no clean-up. A dedicated `jsonb` column would be cleaner; adding one needs a migration, which also needs the exact applied-migration count in `.github/workflows/standard-postgres.yml` raised, a CI file this routine may not edit. That is a follow-up for a session that can.
- **Audit.** Saving records which sections have their own wording, not the wording itself.

## Category-led starting designs

A business that has never saved a design (no `business_appearance` row) gets a starting template, accent, section order and layouts chosen from its category variant instead of one order for everyone: hospitality leads with About then Menu (warm, bracken), trades with Services then Contact (bold, slate blue), wellbeing, retail (pictures first), professional, community (events first) and a general default that equals the long-standing one. Every section remains available. Saving the designer stores the owner's own choice, and nothing changes for a business that already saved one. "Reset to the suggested design" returns to the category start and keeps the owner's wording. The designer says so while the starting design is still unsaved.

## Not in this slice

New templates or accents, a dedicated column for section copy, Welsh versions of the profile's own summary and services, crop controls, custom domains, and Welsh for the generated website's own wording.
