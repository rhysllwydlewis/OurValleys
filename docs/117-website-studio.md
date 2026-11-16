# 117. Website studio

Route: `/dashboard/business/[businessId]/website`. Reworks the designer from `docs/40` and `docs/54` into a studio: the controls on one side, the business's real page on the other. No migration, no change to authorisation logic, and the form posts the same fields to the same action.

## Defect fixed: the live preview was blank

The designer shows the private preview in a frame. Every response carried `Content-Security-Policy: frame-ancestors 'none'` and `X-Frame-Options: DENY`, so the browser refused to draw the frame and the owner saw an empty white box where their page should be.

One route may now be framed, and only by this site: `/dashboard/business/:businessId/preview` sends `frame-ancestors 'self'` and `X-Frame-Options: SAMEORIGIN` (`sameOriginFrameHeaders` in `src/lib/security-headers.ts`, wired as a later entry in `next.config.ts`). Every other route, including the rest of the dashboard, keeps the deny-all rule. The preview still runs its own session and membership checks; another site still cannot frame it.

In production the report-only policy also names `frame-ancestors`. Left at `'none'` it would have filed a report every time the designer drew its own preview, so on this one route the report-only policy differs in that one directive and nothing else. The unit tests pin both header sets, the report-only difference and the exact route.

## What the studio is

- **Side by side from 77rem.** Controls in a 26rem column, the preview sticky beside them at full viewport height. The page's content width is raised on this page only (`--ov-content`), so the site header, shell and footer widen together.
- **True device widths.** Desktop, tablet and phone lay the page out at 1280, 820 and 390 pixels and scale it to fit the pane, so "Desktop" is the real desktop layout rather than whatever a narrow column would trigger. Desktop and tablet sit in a browser frame, the phone in a handset.
- **No blanking.** Two frames are kept. The next version loads out of sight and takes over only once it has fully arrived: the page is streamed, so at the frame's load event its later sections are not yet in place, and the frame waits for them. It then appears at the same scroll position. Changing one section (its layout, visibility, wording or position) brings that section into view; changing the overall style keeps the reader where they are.
- **One page at a time.** A change made while a page is still arriving does not cut that page short. The arriving page finishes, sees it has been overtaken and fetches the newest choices. Putting a choice back swaps to the page that is already loaded.
- **"Open the full preview"** opens what the pane shows, unsaved choices included, in a new tab.
- **Section rows.** A switch for show and hide, the approved layouts as pills instead of a select, arrow buttons whose rows glide to their new place, and "Your own words" behind a disclosure. A hidden section is marked "Hidden" with a dashed outline; its text keeps full contrast.
- **Pickers follow the chosen colour.** Template miniatures, selected states and switches take the accent as soon as it is picked. Colours are round swatches with a tick.
- **Action bar.** Sticky at the foot of the controls: "Everything is saved" or "Unsaved changes", and Save. Closing or reloading the tab with unsaved choices asks first.
- **Narrow screens.** Below 77rem the controls take the page and the bar gains a "Live preview" button that opens the preview as a full-screen sheet (phone layout first on a phone). The rest of the page is inert while it is open, Escape closes it, and focus returns to the button. Nothing is fetched while the sheet is closed: opening it loads the current choices once. If the window is widened past 77rem while the sheet is open, the page is released.
- **Pictures.** The duplicate upload, description, focus and ordering forms are gone from this page. It shows what is in place (logo, cover, gallery) and links to the Photos studio (`docs/62`), which already does all of it better.

## Display settings

Scripted row movement honours the site's own reduced-motion setting (`docs/101-display-comfort.md`) as well as the device's, through the shared `prefersReducedMotion` helper: CSS rules cannot reach an animation started from script. The off state of a switch uses a tone with at least 3:1 against white.

## Second defect fixed: controls stale after a reset

"Reset to the suggested design" (and any save the server normalised) updated the record and the preview but left the controls showing the previous choices, because they are uncontrolled inputs that React does not reset. The form's contents are now remounted whenever the saved design changes, the action bar puts the pickers' colours back in step, and the form opts out of the browser restoring earlier unsaved choices on reload. The key is on a wrapper inside the form, not the form itself: React keeps a form that is mid-submission, which showed two forms.

## Overview page (`/dashboard/business/[businessId]`)

- **A live view of the page in the hero.** A small browser frame shows the business's own page (the private preview, drawn at desktop width and scaled to 320 by 200, and labelled "Private preview" because the latest saved draft can be ahead of the public page), with one link: "Design your website" for people who can design, "Open the preview" for everyone else. The frame is decoration: inert, out of the tab order and hidden from assistive technology. It costs one extra preview request per visit to the overview and is shown only when the draft can be read. It sits beside the title only where the title keeps room (without the sidebar from 56rem, with it from 76rem) and below it otherwise.
- **Publishing panel.** The three answers (who can see it, what happens next, safety) are three left-aligned cards instead of a right-aligned bold table.
- **Safety note.** A quiet strip with a shield, not a full-height headline section. Its wording and the hero eyebrow are in plain language ("Your business dashboard").

## Without scripts

Choosing, showing, hiding, changing layouts and saving all work: they are plain radios, checkboxes and a submit button. Reordering, the live preview, the unsaved flag and the sheet need scripts; without them the bar's preview link opens the saved preview page.

## Accessibility

Axe (WCAG 2.1 A and AA) is clean at 1440, 900 and 390 pixels, including with the sheet open. Switches are real checkboxes with the same "Show {section}" names. Layout pills are real radios in a named group. The frame that is not on show is hidden from assistive technology and from the tab order. Every transition is off under `prefers-reduced-motion`, and selected states have outlines in forced-colours mode.

## Tests

- Unit: `security-headers.test.ts` (the preview's framing headers and its exact route).
- Playwright: `account-website-designer-layout.spec.ts` now also covers the frame loading, an unsaved template and a hidden section appearing in the preview, device widths, the unsaved flag, an axe scan, save, reset returning the controls, and the phone sheet (open, Escape, focus return, no sideways scroll).

## Left as it was

The media server actions in `website/actions.ts` are no longer used by this page. They are left in place because deleting them lowers the count of authorisation-helper calls in that file, which `docs/37` reserves for an owner decision.

## Not in this slice

Drag to reorder sections, showing which sections have no content yet, per-section previews of each layout, undo. New Welsh strings are first drafts.
