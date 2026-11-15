# 101. Directory "Near me"

Status: built in the 2026-11-15 overhaul cycle (see `docs/36-overhaul-programme-log.md`).

## Problem

The business directory can already narrow results to a distance from a town (`near=<place>&radius=<km>`), but only if the visitor knows and picks the nearest town from a select hidden under "More filters". Someone standing in a valley village on a phone has to work out which listed place is closest. The homepage has a "Near you" widget, but it only lists places and never reaches the directory.

## What shipped

- **A "Near me" button** in the directory search bar. Nothing happens until it is pressed. The browser reads the device position once (low accuracy, five-minute reuse, ten-second timeout) and a pure model (`src/modules/businesses/near-me.ts`) picks the nearest active town, village or neighbourhood centre, widens the radius to the smallest offered value that still reaches it (never below a radius the visitor already chose), and navigates to the directory with `near=<slug>&radius=<km>`. The visitor's other filters and sort stay; paging resets.
- **Privacy.** The position is used only inside the click handler. Only a public place slug reaches the URL and the server; the position is never sent, stored or logged. Tested by asserting no request URL contains the coordinates.
- **Public centres only.** `listPlaceCentroids` (`src/modules/reference-data/place-centroids.ts`) reads active places with a stored coordinate of a locality type (not valleys or regions), cached for an hour under the `business-directory` tag. No business, address or resident data is involved. If the read fails the button is hidden rather than breaking the directory.
- **Honest failure states** in a polite live region: permission refused, device cannot share location, timed out, and "outside the valleys" (nearest centre beyond 60km, no navigation). Each points to the "Near a place" select, which still works without JavaScript.
- **English and Welsh** strings (`dirx.nearMe*`); Welsh is first-draft pending review by a fluent speaker.

## Not changed

No schema or migration, no authorisation logic, no change to the reserved business projection, no `/cy` URLs.

## Next

The same device-position shortcut for events and offers (they have no `near` filter yet), and a "closest to you" sort on the map page.
