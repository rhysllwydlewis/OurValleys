# Visitor suggestions reach the owner

Surfaces: the public report form `/report/[businessId]`, the owner's Suggestions tab `/dashboard/business/[businessId]/corrections`, the owner hub next step, and the admin ticket desk. Implements doc 32 §13.4 and WP-10 ("suggestions cannot directly overwrite content and can be accepted, rejected or escalated").

## Why

Every public correction went only to the admin ticket desk, covered only phone, email and summary, and the business never heard of it. The brief routes ordinary suggestions to the owner and only disputed or high-risk ones to admins.

## Behaviour

- The report form adds optional **opening hours** and **address / new location** notes (for "incorrect details" and "closed or moved") and says where a report goes. Notes are free text kept in the ticket evidence (`evidence.notes`); they are never applied automatically.
- Routing: `incorrect_details`, `closed_or_moved` and `other` reports are shown to the business. `inappropriate_content` and `duplicate_listing` are admin-only and never shown to the owner.
- Owner page (needs the profile permission; viewers get a not-found page): suggestions with today's value beside the proposed one, then **Apply** (writes only phone, email, summary, description), **Mark as handled** (for hours/address notes the owner updates themselves), **Decline**, or **Ask a reviewer** (raises risk to high; the owner can then no longer decide it).
- Decisions are made in one transaction on a locked ticket row, scoped to the business, only while `open` and `standard` risk. Each is recorded in `business_ticket_event` (`owner_applied`, `owner_handled`, `owner_declined`, `owner_escalated`) and the ticket's `resolved_by_user_id`. A racing double decision leaves exactly one winner.
- The reporter's email and account are never shown to the owner.
- A Suggestions tab badge and a hub step ("N visitor suggestions to review") show what is waiting.
- Admins still see every ticket on `/admin/tickets`; a ticket the owner decided is simply already resolved.

## Not changed

No migration (ticket evidence is jsonb), no authorisation helpers or permission rules, no public projection. Owners are not emailed (notification is the tab badge and hub step).

## Tests

`corrections-model.test.ts`, `owner-hub.test.ts`, `tests/integration/business-owner-corrections.test.ts` (tenant isolation, admin-only reports, escalation, double-resolve, race), `tests/e2e/account-owner-corrections.spec.ts` (journey, axe, 390px, Welsh).
