# 118. Dashboard pages and website studio extras

Follows `docs/117-website-studio.md`. No migration and no change to authorisation logic.

## One header for every tool page

Each dashboard page opened differently: the overview and the designer had a hero card, ten pages had a bare heading, and Profile and "Content & offers" each had their own. They now share one compact band (`.header` in `_hub/hub.module.css`): the warm wash and valley contours of the overview hero, the eyebrow, the title, one sentence that leads with the business's name, and the page's actions on the right.

- Ten pages already used the shared class, so they change with no markup edits: Photos, Welsh version, Offers, Events, Updates, Enquiries, Suggestions, Share kit, Insights, Listing.
- **Profile** moves onto it and shows its "steps drafted" count with a small meter.
- **Content & offers** moves onto it, with its three links (preview, public page, QR code) as the header's actions and a breadcrumb like every other page.
- Printed pages drop the band's border, wash and contours.

## Defects fixed on the way

- **Side-by-side fields sat at different heights** (Public phone and Public email, Primary place and How you operate, and every other pair). The rule that spaces stacked fields also applied to the second field of a pair. Fixed in `globals.css` for every dashboard form.
- **Opening hours were unreadable on "Content & offers".** The weekly table sat in a one-third column, which cut the time fields down to a sliver. It now spans two columns.
- **Buttons stretched to several times their height** in cards that shared a row with a taller card (for example "Save event"). Cards now keep their content at the top.
- **Internal labels shown to owners.** Five sections were headed "Phase 7", "Phase 9", "Phase 10", "Phase 11" and "Phase 12". They now read "Getting in touch", "Promotions", "Page status", "Results" and "Your plan" (English and Welsh).
- **The team's role picker** was the browser's small default control; it now matches the other fields.
- **The Updates form** used unstyled browser inputs; they now match the other studios.
- **The empty state on Suggestions** was centred text in an off-centre block.
- **Your plan** listed capabilities as lower-case bullets ("qr", "basic analytics") and limits as a loose list. Capabilities are ticked chips with proper names; limits are a two-column list.

## Website studio extras

The open items from `docs/117`:

- **Drag to reorder.** Each section row has a grip. Dragging it (mouse, pen or touch) swaps the row with its neighbours as the pointer crosses their middles, and the page scrolls near its edges. The grip is pointer-only and hidden from assistive technology: the arrow buttons remain the keyboard and screen-reader way, and the result is announced the same way. The pointer is followed on the window rather than captured on the grip, because reordering moves the row in the document and that drops a capture.
- **Sections with nothing in them.** A section that is switched on but empty shows "Nothing to show here yet, so visitors will not see this section", with a link to the page where its content is added (Profile, Photos, Offers, Events, or Content & offers) when the reader may open it. The designer learns this from the preview itself after each load: an empty section is either absent from the page or drawn with a placeholder, which `GeneratedBusinessWebsite` now marks `data-empty` (previews only; the public page never draws an empty section). Sections that are switched off are not judged. On narrow screens the notes appear once the preview sheet has been opened.
- **Discard unsaved changes.** While there are unsaved choices the action bar has an undo button that puts the form, the section order, the pickers' colours and the preview back to the saved design.

## Accessibility

All fifteen dashboard pages were scanned with axe (WCAG 2.1 A and AA) at 1440 and 390 pixels with no violations, and checked for sideways overflow at 390 pixels in English and Welsh.

## Tests

- Playwright: `account-website-designer-layout.spec.ts` adds the empty-section note and its link, dragging a row by its grip, and discarding. The test is one long journey on one signed-in page (sign-in is rate limited), so it runs with the extended time limit.
- The existing specs for every dashboard page pass unchanged.

## Observed, not reproduced

During one sweep, two Welsh page loads (`/events` and `/operations`) logged a React hydration warning about mismatched text. Sixteen further loads of the same pages did not repeat it. Neither page's components are changed here, and the programme log already records the same unreproduced warning on the operations page in October.

## Not in this slice

Per-layout thumbnails in the designer, an undo history beyond "discard", restyling the long forms inside "Content & offers" section by section, and review of the Welsh strings by a fluent speaker.
