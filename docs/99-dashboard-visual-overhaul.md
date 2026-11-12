# Dashboard visual overhaul

Status: shipped, one pull request per dashboard type: owner dashboard #655, resident account #656, admin area #657. See the programme log (`docs/36-overhaul-programme-log.md`) for what has shipped.

## Why

The three signed-in areas (the business owner dashboard, the resident account and the admin area) worked, but looked like generic forms next to the premium public site (doc 18). The owner dashboard was the worst case: fifteen flat tabs in one pill bar that overflowed and clipped at every width, so owners could not see half their tools.

## Slice 1: business owner dashboard (`/dashboard/business/[id]/…`)

- **Grouped navigation.** The same fifteen links, grouped by job: Overview; _Your page_ (profile, website design, photos, Welsh version, preview); _What’s new_ (offers, events, updates, content and offers); _Customers_ (enquiries, suggestions, share); _Running the listing_ (insights, listing). Each link has a line icon (now `src/components/workspace-nav/workspace-icons.tsx`, inline SVG, no dependency, decorative and `aria-hidden`).
  - Wide screens (64rem and up): a sticky glass sidebar beside the page. Every dashboard page renders the navigation inside its own `<main>`, so the two-column grid is keyed on `main:has(> .dashboard-nav)` in `globals.css` rather than on fifteen page shells.
  - Narrow screens: a sticky glass strip that scrolls sideways, with small group labels and soft edges. A tiny client component scrolls the strip (never the page) so the current page’s link is in view.
  - Presentation only: every permitted link is still rendered, badges keep their screen-reader text, and each page still runs its own authorisation.
- **Hero.** A warm gradient and soft valley contours behind the overview and designer heroes (decorative, CSS only).
- **Manage tiles.** Icon chips, a stronger hover, and a fix for the waiting-enquiries badge, whose white text was being overridden by the muted body colour.
- **Website designer.** Beside the sidebar the designer card stays in its column instead of breaking out under the sidebar, and only splits into form and live preview when the column is wide enough.

- **Sticky positioning fixed site-wide.** `body` used `overflow-x: hidden` alongside `html`, which made `body` a scroll container that never scrolls and silently disabled every `position: sticky`: the site header, this sidebar, and the map and admin studio side panels. `overflow-x: clip` keeps sideways overflow trimmed without that. Panels whose sticky offset assumed no header now use `--ov-sticky-top`, so they stop just below the floating header.

## Accessibility

Group headings label their lists (`aria-labelledby`), the current page keeps `aria-current="page"`, focus rings are unchanged, group-label text uses the muted ink token (AA contrast), every transition is switched off under `prefers-reduced-motion`, the phone strip leaves room for focus rings, the current section keeps an outline in Windows high contrast, and the navigation is hidden in print.

## Language

New strings (navigation title and group names) are in the English and Welsh catalogues. The Welsh is a first draft and needs review by a fluent speaker.

## Shared workspace navigation

The navigation, its icons and styles live in `src/components/workspace-nav/` (`WorkspaceNav`, `workspace-icons.tsx`, `active-item-into-view.tsx`) so every signed-in area uses one pattern. Moving it also tightens the desktop sidebar slightly (items 2.4rem tall instead of 2.6rem, smaller gaps between groups) so the admin area's seventeen links fit on a laptop screen. A page opts in by rendering the navigation as a direct child of its `<main>`. Sidebar titles are deliberately words no page uses as a heading or eyebrow, so exact-text lookups and screen-reader users never meet duplicates.

## Slice 2: resident account (`/account/*`)

- **One navigation for every account page**: Overview; _Yours_ (Saved, From your businesses, Notifications with an unread badge); _Account_ (Privacy and notices, Settings). The per-page "Back to my account" buttons are gone, and their strings are removed from both catalogues.
- **Public demo accounts** get no Settings link (their settings are disabled) and no unread count.
- **One query per page.** The unread count reads only the signed-in person's own notifications, and the notifications page passes in the number it already has.
- **Settings** folds its own section list into a row while the sidebar is beside it (64–80rem), so the form keeps its width.

## Slice 3: admin area (`/admin/*`)

- **Grouped admin navigation** in the shared sidebar: Overview and Review desk (with its waiting badge); _Businesses_; _Trust and safety_; _Places and stories_; _Platform_. The read-only public admin demonstration still sees only Overview. The admin area stays English-only, like its pages. The groups live in `admin-nav-model.ts`, with a unit test for one-current-section matching (`/admin/places` versus `/admin/place-suggestions`).
- **Admin shell**: a glass header panel, stat tiles with depth and an accent edge (six to a row beside the sidebar, instead of five plus an orphan), cards and tables with shadows, a header-row tint, row hover and visible focus rings.
- **Place picture form**: its fields and file button now match the profile editor beside it (they were unstyled).
- **Site header**: for platform admins the extra Admin link wrapped the bar onto two lines on laptop widths. Link spacing now tightens only when that eleventh link is present (CSS only; the session-dependent navigation code is untouched).

## Next slices

- Per-page polish inside the account pages and admin lists.
- Welsh review of the new strings by a fluent speaker.
