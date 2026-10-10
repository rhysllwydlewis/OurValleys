# 41. Restoring a deleted business

Status: rehearsed on 10 October 2026 (see section 5). Owner: engineering.

## 1. What deletion removes, and what it cannot bring back

Deleting a business (the owner-requested deletion path in `docs/38`, or an admin deletion) removes one `business` row. Twenty-eight foreign keys cascade from it, so the whole tree of 34 tables goes with it: profile, location, hours, services, menus, offers, events, enquiries, memberships, invitations, publication and lifecycle records, activity events, tickets, saved items and the rest.

Two things behave differently:

- **A ticket of another business that refers to this one** (`business_ticket.related_business_id`) survives, with the link cleared.
- **Stored files** (pictures, menu documents) are not in the database. The keys of every file are written to the `storage_cleanup` queue in the same transaction as the delete, and the worker then deletes the files from object storage. **A database restore therefore brings back rows that point at files that no longer exist**, unless the bucket itself keeps versions or backups. Decide this before enabling final deletion in production (`docs/38`).

## 2. When you can restore

A backup taken before the deletion must exist, and the live database must still be on the same migration as the backup (the tool refuses otherwise). Everything the business pointed at outside its own tree (the user accounts of its members, its category, its place) must still exist in the live database; the tool lists any that do not and refuses.

## 3. Procedure

1. **Find the business id** from the deletion's audit row, or from the pending-deletion email, or the backup.
2. **Restore the backup into a separate database.** On Railway, restore the Postgres backup to a new database or service (never over the live one). Locally, `createdb restored && pg_restore -d restored backup.dump`.
3. **Dry run.** It reads the whole tree, checks every reference, prints a per-table count and writes nothing:

   ```bash
   RESTORE_SOURCE_URL="$RESTORED_URL" RESTORE_TARGET_URL="$LIVE_URL" \
     pnpm db:restore-business --business <business-uuid> \
     --owner <current-owner-user-uuid> --reference <ticket-or-note> --dry-run
   ```

   The two URLs are passed as environment variables, not arguments, so the passwords never appear in the process list. Do not paste them into shared terminals or logs.

4. **Restore for real** (same command without `--dry-run`; stop the `OurValleys-worker` service for the minute it takes, so its file-cleanup job cannot delete a file mid-restore, then start it again). It runs in one transaction, so it either restores everything or nothing. It stops without writing anything if any row would collide with a row already in the live database (for example an old URL redirect another business has since taken). It brings the business back **paused** (business, publication and site records all, so it is not publicly visible) with any pending-deletion deadline cleared, so the 15-minute lifecycle job cannot delete it again. It also: clears every automatic-publication schedule; restores every member as **removed** except the current owner you name with `--owner` (a backup can predate a removal, a downgrade or an ownership transfer, so no access it holds is trusted; that user must exist in the live database and becomes the active owner, and everyone else is invited again after you have checked the member list); clears optional links to accounts that no longer exist; revokes pending invitations (send new ones); drops enquiries, activity events and special opening days that are past their retention period; and withdraws every restored verification check (a revocation since the backup is not in the restored data), so the business is unverified until an admin verifies it again. It takes any still-queued deletion of the restored files off the cleanup queue and tells you how many restored files were already removed from storage. It records a `business.restored` entry, with your `--reference`, in the admin audit log.
5. **Check** the business page, the owner dashboard and the member list. Resume the business when ready.
6. **Files:** if pictures or menus were deleted from object storage, the owner must upload them again.
7. **Clean up (mandatory).** The temporary database holds a full copy of production, including every user's private data. Delete it (the Railway service or `dropdb`), revoke any credentials created for it, and confirm it no longer appears in the project. Do this the same day, whether or not the restore succeeded.

The tool never overwrites. It refuses if the business already exists, leaves existing rows alone, and does not run when source and target are the same database.

## 4. If it refuses

| Message                                          | Meaning and fix                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `business … is not in the backup`                | The backup is too early. Restore an earlier-or-later backup that contains it.                    |
| `schemas differ`                                 | Live has had a migration since the backup. Restore a newer backup, or restore on a scratch copy. |
| `business … already exists in the live database` | Nothing to do, or it was already restored.                                                       |
| `rows this business points at no longer exist …` | A member's account, category or place was deleted since. Recreate or restore those first.        |

## 5. Rehearsal record (10 October 2026)

Local PostgreSQL 16, real migrations (44), the repository's fictional seed data plus extra fictional rows so that 24 of the 34 tables held data, including both composite-key tables (`resident_saved_business`, `resident_saved_event`) and a ticket of a second business that refers to the first.

1. Took a custom-format `pg_dump` (193 KB).
2. Deleted the business: every table in its tree dropped to zero rows; the other business's ticket survived with its link cleared, as predicted.
3. Restored the dump into a second database and ran the tool: dry run wrote nothing; the real run restored all 24 populated tables and re-linked the ticket.
4. Compared an order-independent content hash of every table in the tree before deletion and after restore: **all 34 tables identical**.
5. Guards checked: a second run refuses; source equal to target refuses; removing a member's user account makes the dry run refuse with `business_membership(user_id) -> auth_user: 1 missing`.

The rehearsal found and fixed two defects in the first version of the tool (double-encoded JSON, and the re-link filter missing tables that are in the tree through another key). Not rehearsed: a Railway-managed backup restore (the platform step in section 3.2), and file recovery from object storage (section 1).
