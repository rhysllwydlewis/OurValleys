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

## Not in this slice

New templates or accents, per-section text editing, crop controls, custom domains, and Welsh for the generated website's own wording.
