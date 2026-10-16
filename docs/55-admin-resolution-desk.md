# Admin resolution desk (`/admin/tickets`)

Owner of the work: WP-09 and WP-10 in `docs/32-free-business-website-product-brief.md` (claims, conflicts and corrections resolved by one audited action each).

## What an admin sees

- **List** (`/admin/tickets`): tickets that need work, most pressing first (high risk, overdue, due soon, then oldest), with counts, scope tabs (Needs action, Closed, Everything) and a type filter. Tickets paused for information sit below open ones; closed ones are newest first. Unknown filter values fall back to the default view.
- **Ticket** (`/admin/tickets/[ticketId]`): the request in the reporter's words; evidence as labelled facts (anything unrecognised is kept in an "All other details" fold-out); for a correction, a table of what is public now against what is proposed, with no-op lines marked; for a web-address change, current against proposed; the claimant (name, email, whether verified, member since), the business's status, ownership and current team, and a related business for duplicates; other tickets waiting on the same business; and the ticket's history with who decided and why.
- **Decision**: radio choices with a one-line summary each, a plain list of exactly what the chosen action will change, cautions shown first (an owner already exists, the claimant's email is unverified, the claimant already has access), a required note, and a confirmation tick for decisions that change live records. A suggested decision is preselected only when the evidence points one way (a correction that differs from the public page, a valid new address, a claim on a business nobody owns); a destructive choice such as retiring a duplicate is never the default. Actions that cannot work (no signed-in claimant, no structured correction, no valid address) are shown disabled with the reason.

## Rules and boundaries

- The only code that changes records is still `resolveBusinessTicket` (`src/modules/businesses/tickets.ts`), reached through the existing `resolveTicketAction`, which requires `readAdminSession`. This slice changes none of that. The action guide in `src/modules/businesses/ticket-desk.ts` mirrors the service's allowed actions for display only; the service refuses anything the guide gets wrong.
- The page also calls `readAdminSession` before loading a ticket, because it shows people's email addresses; the shared public admin demonstration never reaches it.
- Read side lives in `src/modules/businesses/ticket-desk-data.ts`. The list reads active and closed tickets with separate queries so closed history can never push an open ticket out of view.
- No schema change. Public and private data are untouched; nothing here is exposed publicly.
- Admin screens remain English only, as the rest of `/admin`.

## Not built (next slices)

Assignment and snooze (needs a column), bulk actions, an in-product message to the reporter when more information is requested (an external message, so it needs a decision on sending), overdue digests, and corrections for fields beyond phone, email, summary and description.
