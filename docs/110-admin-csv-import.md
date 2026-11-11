# 58. Admin CSV import of founding businesses

Implements #329. Seeding founding businesses no longer needs manual record entry.

## What an admin can do

`/admin/import` accepts a CSV file or pasted text with the columns `trading_name`, `category` (category slug), `place` (place slug) and optionally `welsh_name` and `business_type` (`premises`, `service_area`, `online`; default `premises`).

- **Check only** validates every row and reports problems by line without saving anything.
- **Import as drafts** creates one `draft`, `unclaimed` business per valid row (with the same location draft the start-a-business flow writes). Nothing is published; admins review each through the normal review desk.
- At most 200 rows and 200 KB per import. Rows with unknown slugs, invalid types or repeated name-and-place pairs are reported and skipped; other rows still import.
- A row whose name already exists (case-insensitive) in the same place is skipped, so importing the same file twice is harmless.

## Authorisation and data

The action requires `readAdminSession()` (private admin with two-step verification; the public demo admin cannot import). It writes an `business.imported` audit entry with counts only. No schema change and no migration.

Use fictional data unless a business has agreed to be listed.
