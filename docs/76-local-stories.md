# 76. Local stories

Status: shipped by the overhaul routine (see `docs/36-overhaul-programme-log.md`).

## What people get

- **Readers** see a "From OurValleys" block at the top of `/news` (the six newest stories, with date and place) and a page for every story at `/news/[slug]`: headline, summary, author, dates, reading time, sub-headings and paragraphs, a "Sponsored" note when an author declared one, a link to the place, share control, `NewsArticle` structured data, a canonical URL, a per-story share picture and a sitemap entry once the site is public. A site with no stories shows no block at all, so nothing looks empty.
- **Welsh readers** see the Welsh version only when headline, summary and text are all written; otherwise they get the English story with an "only available in English" note, so a page is never half and half.
- **Platform admins** get **Local news** in the admin menu (`/admin/stories`): a list with status counts, and a studio (`/admin/stories/new`, `/admin/stories/[id]`) with English, Welsh and Preview tabs, a publishing checklist, a stale-save check and confirmation before taking a live story offline.

## Rules

- Plain text only. The body is paragraphs separated by blank lines, with lines starting `## ` as sub-headings (`parseStoryBody`). Everything is rendered as React text, so markup typed by an author is shown as text and never run.
- Publishing needs at least two paragraphs and a summary that differs from the headline (re-checked on the server; the checklist is guidance). A place and a complete Welsh version are advised, not required. A published story must keep passing the blocking checks when edited.
- Only draft stories can be deleted; a live story must be moved to draft or archived first.
- Every change is admin-only (`readAdminSession` in each server action) and audited (`story.created|updated|published|reverted_to_draft|archived|deleted`).
- The public projection (`PublicStory`) carries no author account id and no unfinished Welsh text.

## Data

Migration `0064_local_stories`: table `local_story` (slug unique, English and `*_cy` Welsh columns, optional place with `on delete set null`, author name and account, optional sponsorship note, status check `draft|published|archived`, published and updated times; indexes on status and published time, and on place). Additive: the previous release ignores the table; a rollback leaves it unused. The standard-Postgres expected migration count is 65.

## Reader journey (second slice)

- **Archive** `/news/archive`: every published story newest first, grouped under UK year headings, twelve a page with "Newer stories" and "Older stories" links, and a place filter (only places that have a story; shown when there are two or more). Mangled `page` and `place` values fall back to the first page and all places (`parseStoryArchiveQuery`); a page past the end shows the last page. An unreadable database shows a plain "could not be loaded" panel, and an empty selection says so.
- **Atom feed** `/news/feed.xml` (English, newest 30, no body text, sponsored stories start their summary with "Sponsored."), advertised from `/news` and the archive.
- **More local stories** under each story: the same place first, then the newest others, never the story itself; it hides itself when there is nothing else.
- **Homepage** "Latest from the valleys" (three newest) and **place pages** "Local news about {place}" (three newest linked to that place). Both render nothing when there are no stories or the read fails.
- One `StoryCards` component renders every list, so the date, place, reading time and **Sponsored** label are always the same.
- `/news/archive` and `/news/feed.xml` are fixed addresses, so the studio refuses `archive` and `feed` as a story web address (`RESERVED_STORY_SLUGS`). The sitemap lists the archive once any story is live.
- No migration and no new authorisation: everything here is public, read-only and reads published stories only.

## Left for later

Pictures in stories, scheduling, an editor role below admin, Welsh review by a fluent speaker, `/cy` URLs, stories on the `/places` directory cards, a Welsh Atom feed.
