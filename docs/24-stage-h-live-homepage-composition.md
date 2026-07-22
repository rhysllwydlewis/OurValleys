# Stage H live homepage composition

## Before state

The homepage connected to active places and one canonical published business, but its event and guide sections remained duplicated hard-coded arrays. The front page could therefore drift from the durable public event and guide routes.

## Intended end state

The homepage is composed from the same privacy-safe public projections used by `/businesses`, `/places`, `/events` and `/guides`. It presents honest loading, unavailable and empty states, links every card to a durable destination and keeps clearly fictional demonstration labelling while launch data remains provisional.

## User value

Residents see one coherent, current discovery surface instead of static previews that can disagree with the rest of the platform.

## Delivery sequence

1. Establish one server-only homepage composition service.
2. Replace duplicated event, guide, place and featured-business arrays with composed public data.
3. Add empty and unavailable presentation paths without inventing content.
4. Add focused service and browser coverage.
5. Complete responsive, keyboard, reduced-motion, privacy and resilience review before merge.

## Current implementation state

The homepage now consumes the shared composition service for its featured business, places, events and guides. Event cards link to durable event routes, guide cards link to durable guide routes and place cards link to durable place routes. Empty and unavailable event or guide sources render honest calls to the corresponding directory instead of fictional fallback records. Dynamic destinations retain Next.js typed-route enforcement rather than weakening route safety.

## Safety boundaries

- Reuse existing public projections; never query private business or tenant fields directly.
- Preserve publication and event lifecycle filters.
- Keep fictional demonstration labelling and no unsupported availability claims.
- Fail honestly when a backing service is unavailable.
