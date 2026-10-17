# Owner inbox (`/dashboard/business/[businessId]/inbox`)

Delivers the inbox half of WP-08 in `docs/32-free-business-website-product-brief.md` §10.3 (business inbox, notification with dashboard link, status new/read/replied/archived/spam). Shipped as the 2026-10-17 overhaul slice; see `docs/36-overhaul-programme-log.md`.

## Why

Enquiries used to live as one long list inside the operations page: every row carried its own status select, reply box and delete button, there was no search, nothing told an owner how many messages were waiting, and opening a message never marked it read.

## What an owner gets

- A dedicated **Enquiries** tab with an unread badge on every dashboard page.
- Mailboxes with counts: To do (new and read), Unread, Replied, Done (closed and archived), Spam, All.
- Search across name, email, phone and message (literal match; `%` and `_` are escaped) and a type filter (enquiry, quote, callback).
- A list and reading pane on desktop; on a phone the list and the open enquiry take turns, with a back link.
- Opening an unread enquiry marks it read (a server action, so prefetching a link never does).
- Reply by email with kind-specific starting templates in English or Welsh. A template only fills the box; the owner edits and presses send. The reply text is still never stored (unchanged privacy rule from `replyToBusinessEnquiry`).
- One-click mark read/unread, done, archive, spam and "not spam"; bulk versions of the same for ticked rows; delete behind a confirmation.
- The notification email to owners and managers, the owner hub's "enquiries waiting" step and the operations page now link here. The operations page keeps its older inbox section with an "Open the full inbox" link.

## Rules

- **Authorisation.** The page and every action check `business.manage_enquiries` for the business with `canUserAccessBusiness` and refuse the shared public demo accounts (`canUseBusinessOperationsTools`). The proxy does not cover this route, so the page authorises itself. A member without the permission is redirected to the dashboard; a non-member gets 404 from the dashboard layout.
- **Tenant isolation.** Every query and update is scoped to the business id in the route. Ids from another business simply do not match and are skipped.
- **State is never trusted from the form.** Post-action redirects rebuild the address from validated mailbox, type, search, page and enquiry fields (`parseInboxQuery` / `buildInboxHref`); there is no free-form return path.
- **Bulk.** At most 50 ids; `replied` cannot be set in bulk (only a sent reply sets it) and a replied enquiry is never moved back to new or read. Retention expiry is recomputed per row exactly as for a single change (spam 30 days, done/archived one year, otherwise 24 months from receipt). One audit entry per bulk action records the count, not the contents.
- **Audit.** Status changes, replies, deletes and bulk changes are audited without message or reply text.
- **No schema change.** No migration.

## Code map

- `src/modules/businesses/inbox-model.ts` – pure rules (mailboxes, query parsing, hrefs, bulk statuses, templates, display helpers).
- `src/modules/businesses/inbox.ts` – list, counts, single read, mark-read and bulk status (one transaction).
- `src/app/dashboard/business/[businessId]/inbox/` – page, actions, select-all, mark-read, reply composer, styles.
- `src/lib/i18n/messages/inbox.ts` – English and first-draft Welsh.

## Tests

`src/modules/businesses/inbox-model.test.ts` (unit), `tests/integration/business-inbox.test.ts` (Postgres: counts, tenant scoping, literal search, paging, mark-read, bulk with retention and skips), `tests/e2e/account-owner-inbox.spec.ts` (sign-in redirect, non-member denial, read-on-open and badge, template, search, bulk archive, nothing-selected, not-spam, delete, axe at desktop and 390px, phone pane switching, Welsh).

## Not done

Assignment between team members, saved replies the owner writes, attachments, conversation threads (replies are not stored by design), push or digest notifications about stale enquiries beyond the existing owner digest, Welsh review by a fluent speaker.
