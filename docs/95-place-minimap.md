# Place mini-map and valley at a glance

Status: built on branch `claude/ourvalleys-overhaul-place-minimap`; see the programme log (`docs/36-overhaul-programme-log.md`) for shipping status.

## Problem

Place pages (`/places/[slug]`) listed businesses, offers and events but gave no sense of where a town sits in its valley or how its neighbours compare. The valleys map (doc 94) is a separate page that a visitor has to find.

## What was built

- **Mini-map on every place page in a valley** (`PlaceMiniMap`). A tile-free SVG: the soft valley outline (`regionShape`), the valley's places as dots sized by business count, the current place highlighted with a ring and every dot linking to its own page. Server-rendered, so it works without JavaScript. Hit targets are enlarged (transparent circle) for touch.
- **Valley at a glance.** Beside the map: the valley's places ranked by business count with proportional bars, the valley's most common categories (linking to the filtered directory) and a link to the focused valley on `/map`. On a valley page the panel is titled "{valley} at a glance" and there is no "you are here" marker.
- **Pure builders** (`src/lib/place-minimap.ts`): `resolveValleySlug`, `buildPlaceMiniMap`, `buildValleyGlance`, unit tested. Data comes from the existing `getValleysMap()` payload (public locality centroids and aggregate counts only), so nothing new is exposed and no migration is needed. Places outside any valley, or without coordinates, simply show no mini-map.
- **Welsh.** All strings have a first-draft Welsh version (to be reviewed by a fluent speaker); valley and place names use the Welsh name when one exists. The summary line avoids plural forms.

## Accessibility

The SVG is a `group` with a label; each dot is a link with an accessible name stating the count; the current place has `aria-current="page"`. The ranked list carries the same information as the map. The outline is decorative. Motion is limited to a colour transition, disabled under `prefers-reduced-motion`. axe scans cover the valley and town pages.

## Out of scope

Map tiles, surveyed boundaries, panning/zooming, per-valley editorial content.
