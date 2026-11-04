# Update pages, share pictures and feeds

Business updates (docs 69 and 77) are short news posts. Until now an update existed only as a list item and an `#update-<id>` anchor. Each published update now has its own page, a share picture and a place in two Atom feeds.

## What a visitor gets

- `/b/[businessSlug]/updates/[updateId]`: the full update on the business's own themed website shell, with a picture, date, newer and older neighbours of the same business, a Share button, "Report this update" and a feed link. Headlines on `/b/[slug]/updates`, the "Latest updates" block on the business page and the cards on `/updates` link here.
- `/b/[businessSlug]/updates/[updateId]/opengraph-image`: a 1200×630 share picture with the business name, headline and a short excerpt. Public text only; a generic card when the update is not public.
- `/updates/feed.xml` (all local updates) and `/b/[businessSlug]/updates/feed.xml` (one business): Atom, English only (a feed reader has no language preference), newest first, at most 20 and 30 entries. `<link rel="alternate" type="application/atom+xml">` is set on `/updates` and the business updates page, and both pages show a visible "Follow these updates in a feed reader" link.
- `Article` structured data (and a breadcrumb) on the update page. Demonstration businesses emit none and are `noindex`.

## Rules

- Only `published` updates of a `published` business are public. A draft, a removed update, an update of another business, an unknown id and a malformed id all render the same not-found page. A renamed business slug redirects permanently to the new slug, keeping the update id.
- Welsh readers see the Welsh headline and text only where both are written (the existing rule). The page tags owner text with its language.
- Feed entries are dated at publication and never in the future; demonstration entries are prefixed "[Demo]"; text is escaped and stripped of XML-illegal control characters by `src/lib/atom.ts`.
- No schema change and no new dependency. Roll-back is a plain revert: nothing stored depends on the new routes.

## Fixed on the way

`findUpdatePage` (the `?update=<id>` deep link) compared an update's JavaScript `Date` (milliseconds) with database timestamps (microseconds), so an update counted as newer than itself and the page number could be off by one at a page boundary. Both it and the new neighbour lookup now compare against the row's own stored value (`getPublicBusinessUpdate`, `after()` / `before()` in `public-updates.ts`). An integration test covers a microsecond timestamp.

## Not built

A Welsh feed, update entries in the sitemap, per-business offers and events feeds, update search ranking, comments or reactions.
