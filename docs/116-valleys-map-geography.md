# The valleys map, rebuilt on real geography

Status: built on branch `claude/eloquent-pasteur-0drp4i`; see the programme log (`docs/36-overhaul-programme-log.md`) for shipping status. This supersedes the drawing described in `docs/39-valleys-map.md` and `docs/94-valley-regions-map.md`; the data, privacy rules, valley picker, place panel and list in those documents are unchanged.

## Problem

`/map` drew each valley as a rounded shape around its place dots, on a blank grid. With no coast, hills or rivers there was nothing to recognise: the product owner's verdict was that it "just looks like blobs". Places were also spread to fill the canvas, so their positions were only roughly true.

## What was built

- **A real base map, with no map provider.** The coast, the council areas, hill shading, woodland, built-up areas, rivers, lakes, main roads and railways are baked from open data into two committed files: `src/data/geography/valleys-geography.json` (vector layers, about 49 KB compressed) and `public/map/valleys-relief.webp` (shading, about 200 KB). Nothing is fetched from a third party at runtime, so the privacy, cost and content-security position of the map is unchanged.
- **Light first load.** The line work travels once, in the page's script, and is drawn when the script starts; the HTML as first sent carries only the hill-shading image and the places, so `/map` stays about 15 KB compressed (the page-weight budget in `tests/e2e/performance-budget.spec.ts` is 40 KB and now also covers a place page).
- **True positions.** The map is one fixed frame of the British National Grid (72 km by 52 km, 72 m to a map unit). `src/lib/national-grid.ts` converts a place's latitude and longitude to the grid (Helmert shift plus the Ordnance Survey Transverse Mercator formulae, tested against the Ordnance Survey worked example), so every place sits where it is: on its river, between the right hills.
- **Valleys are their rivers.** Each valley record is tied to the river that defines it (the Sirhowy is split where it leaves Blaenau Gwent). The river is drawn more strongly than other water, carries the valley's name, glows when the valley is focused and can be clicked to focus it. Seventeen rivers serve the eighteen valley records.
- **Places.** A place with businesses is a numbered marker; any other town or village is a small ringed dot, as on a printed map. Names are placed so they never sit on each other, on another marker, on a valley's name or under the zoom buttons: towns and busy places are named first, and more names appear as the map is zoomed.
- **Moving around.** Zoom buttons, Ctrl or Cmd with the wheel, a two-finger pinch, and dragging. Arrow keys move the map and plus and minus zoom it when focus is on the map. A plain wheel or a vertical swipe still scrolls the page. Choosing a valley glides the map to frame it; choosing a place that is off screen brings it into view. Reduced motion jumps instead of gliding.
- **Phones.** A phone gets a taller map that opens on the middle of the Valleys at a readable size and is dragged sideways for the rest, instead of the whole area squeezed into a strip. A place or valley linked to directly is always on screen.
- **"You are here".** After "Use my location", a blue dot marks the visitor's position when it is inside the map. As before, the position stays in the browser.
- **Page.** A shorter introduction so the map starts higher, the valley picker beside the map on wide screens (above it on narrow ones), a map key, and the grouped list of places set out in columns.

- **Place pages.** The small map on a place page (`docs/95-place-minimap.md`) is now a piece of the same map: the hill shading, the valley's river highlighted, neighbouring valleys' rivers, and the valley's places at their true positions with names placed so they do not overlap. It is still server-rendered and works without JavaScript. Only the rivers that cross the view are sent, so a place page grows by a few kilobytes.
- **No dead space.** On wide screens the title, introduction and filters sit beside the valley picker rather than above an empty right-hand column, so the map starts higher up the page.

## Data and licence

All sources are published under the Open Government Licence v3.0, which allows this use with attribution. The attribution line is shown under the map in both languages.

| Layer                                       | Source                                                          |
| ------------------------------------------- | --------------------------------------------------------------- |
| Rivers and their names                      | OS Open Rivers                                                  |
| Hill shading                                | OS Terrain 50                                                   |
| Woodland, buildings, lakes, roads, railways | OS VectorMap District (tiles SN, SO, SS, ST)                    |
| Coast and council areas                     | ONS Local Authority Districts (December 2024) Boundaries UK BGC |

Required wording: "Contains OS data © Crown copyright and database right 2026" and "Source: Office for National Statistics licensed under the Open Government Licence v3.0".

## Rebuilding the geography

`scripts/geography/build_valleys_geography.py` is the whole pipeline; its header lists the downloads and the three Python packages it needs (numpy, Pillow, pyshp). It is run by hand when the frame, the styling of the relief or the valley-to-river table changes; it is not part of the build or of CI, and the app depends only on the two committed files. The relief image is flattened onto the map's land and sea colours, which are set in both the script and `valleys-map.module.css` and must be changed together. A unit test fails if a seeded valley has no river or a seeded place falls outside the frame.

## Accessibility

The base map, rivers, valley names and context names are decorative (`aria-hidden`); the valley picker, the valley card, the place panel and the list carry the same information. Places remain `role="button"` with a spoken name and count; places outside the current view leave the tab order, except the one holding focus. Zoom buttons are real buttons with names and disabled states. The page works without JavaScript through the list. axe scans cover the page with a place and with a valley chosen.

## Out of scope

- Street-level detail, routing and per-business pins (unchanged from `docs/39-valleys-map.md`).
- Road numbers and railway stations.
- A dark variant of the relief image (the site has one light theme).
- Welsh strings are first-draft and need review by a fluent speaker.
