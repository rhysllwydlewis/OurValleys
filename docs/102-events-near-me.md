# 102. Events "Near me"

Status: in progress in the 2026-11-15 overhaul cycle (see `docs/36-overhaul-programme-log.md`).

## Problem

`/events` can be narrowed by place name, but a visitor standing in a village has to work out which listed place contains an event. The directory already has a distance filter and a "Near me" button (doc 101); events had neither.

## What ships

- `near=<place slug>&radius=<3|8|15|30>` on `/events`, parsed with the directory's radius rules. The filter keeps events hosted by a business whose place centre is within the radius of the chosen place's centre (`src/modules/reference-data/place-distance.ts`). Distances are between public locality centres, never addresses. An unknown or inactive origin disables the filter instead of emptying the page.
- A "Distance" panel (near and within selects, works without JavaScript) and the "Near me" button, generalised from the directory control with a `scope` prop. The device position is used only in the click handler; only a public place slug reaches the URL.
- A removable chip, an empty-state sentence naming the radius, and the filter carried through the day strip (cache key includes it), month and week views, the `.ics` feed and saved event searches (canonical query, description and live count).
- English and Welsh strings (`eventsNear.*`); Welsh is first-draft pending review by a fluent speaker.

## Not changed

No schema or migration, no authorisation logic, no change to the reserved business projection, no `/cy` URLs.

## Next

The same filter for offers.
