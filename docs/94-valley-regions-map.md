# Valley regions on the valleys map

Status: built on branch `claude/ourvalleys-overhaul-valley-regions`; see the programme log (`docs/36-overhaul-programme-log.md`) for shipping status.

## Problem

`/map` was a tile-free bubble field: every town and village was a dot, with no sign of which valley it belonged to. A visitor who knows "the Rhondda" or "the Cynon" had no way to find it, and the list under the map was one flat table.

## What was built

- **Data (no migration).** `getValleysMap` now returns, for each place, the slug of the valley that contains it (the `contains` relationship to a `valley` place, first by `sort_order`), and a `valleys` list with the number of mapped places and businesses in each. Counts are sums over the mapped places, so they agree with the bubbles and the directory; the category filter narrows them in the same way as the bubbles. No business, contact or address data is added.
- **Regions on the map.** Each valley gets a soft, dashed, tinted outline drawn behind the bubbles (`regionShape` in `src/lib/map-projection.ts`: the convex hull of a circle around each place, drawn as a smooth curve) and an italic name. These are honest groupings, not surveyed boundaries: the map still uses no tiles and no third-party service. A label is only drawn where it does not sit on a larger valley's label; the picker always lists every valley. Colours come from a stable per-valley hue.
- **Valley picker.** A row of links (`/map?valley=rhondda-fawr`, keeping `?category=`) focuses one valley: the map zooms to it (`focusViewBox`), other valleys and places fade, and a summary card lists its places with counts, "Browse businesses in {valley}" and "About {valley}". Clicking a region does the same. The URL is kept in step with `history.replaceState`, so a focused valley and place can be shared. Without JavaScript the picker is plain links that reload the page with the valley focused. On a phone the picker starts folded into one control that names the current valley.
- **Place panel and results.** A chosen place says which valley it is in (a link that focuses it), and "closest to you" results name the valley.
- **List.** Places with businesses are grouped under valley headings, each linking to the focused map, with a place and business count.
- **Welsh.** All new text has a Welsh version (first draft, to be reviewed by a fluent speaker); valley names use the Welsh name when one exists. The counts line avoids plural forms so it reads correctly in both languages.

## Accessibility

Valley regions and their labels are decorative (`aria-hidden`); the picker links, the valley card and the grouped list carry the same information. The picker is a native `details` with a visible focus ring, links have `aria-current`, motion is limited to opacity and fill transitions that are disabled under `prefers-reduced-motion`, and the focused map clips to its card so nothing spills over the page. axe scans cover `/map` and `/map?valley=rhondda-fawr` in light and dark.

## Out of scope

- Map tiles, rivers or surveyed boundaries (cost, privacy and data-licensing decisions).
- Valley pages with their own businesses and events (the valley place page already exists).
- Panning and zooming by gesture.
