/**
 * Restores one deleted business from a restored backup into the live database.
 *
 * Deleting a business removes its whole tree of rows (profile, content,
 * enquiries, hours, memberships and so on) through foreign-key cascades. This
 * copies that tree back from a database restored from a backup taken before the
 * deletion, then re-attaches the rows that survived deletion with their link
 * cleared. It never overwrites: a business that already exists in the live
 * database is refused, and rows that already exist are left alone.
 *
 *   RESTORE_SOURCE_URL=<restored-backup-url> RESTORE_TARGET_URL=<live-url> \
 *     pnpm db:restore-business --business <business-uuid> \
 *     [--reference <ticket>] [--dry-run]
 *
 * The two database URLs are read from the environment, never from arguments,
 * because arguments are readable by other users of the machine while the
 * command runs. Run it with --dry-run first. See docs/41-business-restore-runbook.md.
 */
import postgres, { type Sql } from "postgres";
import { permissionsForBusinessRole } from "../src/modules/identity/access-policy";

type ForeignKey = {
  table: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete: string;
};

type Row = Record<string, unknown>;

class DryRunComplete extends Error {}

const INSERT_CHUNK = 500;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function fail(message: string): never {
  console.error(`restore-business: ${message}`);
  process.exit(1);
}

/** Table names come from regclass::text, which is already quoted where needed. */
function quoted(column: string): string {
  return `"${column.replaceAll('"', '""')}"`;
}

async function loadForeignKeys(sql: Sql): Promise<ForeignKey[]> {
  const rows = await sql<
    Array<{
      tbl: string;
      ref: string;
      cols: string[];
      refcols: string[];
      del: string;
    }>
  >`
    select
      c.conrelid::regclass::text as tbl,
      c.confrelid::regclass::text as ref,
      (select array_agg(a.attname order by k.ord)
         from unnest(c.conkey) with ordinality k(attnum, ord)
         join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as cols,
      (select array_agg(a.attname order by k.ord)
         from unnest(c.confkey) with ordinality k(attnum, ord)
         join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.attnum) as refcols,
      c.confdeltype::text as del
    from pg_constraint c
    where c.contype = 'f' and c.connamespace = 'public'::regnamespace
  `;
  return rows.map((row) => ({
    table: row.tbl,
    columns: row.cols,
    referencedTable: row.ref,
    referencedColumns: row.refcols,
    onDelete: row.del,
  }));
}

async function primaryKey(sql: Sql, table: string): Promise<string[]> {
  const rows = await sql<Array<{ name: string }>>`
    select a.attname as name
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
    where i.indrelid = ${table}::regclass and i.indisprimary
    order by array_position(i.indkey::int2[], a.attnum)
  `;
  return rows.map((row) => row.name);
}

async function insertableColumns(sql: Sql, table: string): Promise<string[]> {
  const rows = await sql<Array<{ name: string }>>`
    select attname as name from pg_attribute
    where attrelid = ${table}::regclass and attnum > 0
      and not attisdropped and attgenerated = ''
    order by attnum
  `;
  return rows.map((row) => row.name);
}

/**
 * Rows of `table` whose `columns` equal one of the given key tuples, as JSON.
 * Keys are compared as text, so one query shape serves uuid, text and integer
 * keys, single or composite.
 */
async function rowsByKey(
  sql: Sql,
  table: string,
  columns: string[],
  tuples: string[][],
): Promise<Row[]> {
  if (tuples.length === 0) return [];
  const left = columns.map((c) => `t.${quoted(c)}::text`).join(", ");
  const right = columns.map((_, i) => `$${i + 1}::text[]`).join(", ");
  const params = columns.map((_, i) =>
    tuples.map((tuple) => tuple[i] as string),
  );
  const result = await sql.unsafe<Array<{ r: Row }>>(
    `select to_jsonb(t) as r from ${table} t where (${left}) in (select * from unnest(${right}))`,
    params,
  );
  return result.map((row) => row.r);
}

function keyTuples(rows: Row[], columns: string[]): string[][] {
  const seen = new Set<string>();
  const tuples: string[][] = [];
  for (const row of rows) {
    const values = columns.map((column) => row[column]);
    if (values.some((value) => value === null || value === undefined)) continue;
    const tuple = values.map(String);
    const key = JSON.stringify(tuple);
    if (!seen.has(key)) {
      seen.add(key);
      tuples.push(tuple);
    }
  }
  return tuples;
}

function topologicalOrder(tables: string[], keys: ForeignKey[]): string[] {
  const inTree = new Set(tables);
  const dependsOn = new Map<string, Set<string>>(
    tables.map((t) => [t, new Set<string>()]),
  );
  for (const fk of keys) {
    if (
      inTree.has(fk.table) &&
      inTree.has(fk.referencedTable) &&
      fk.table !== fk.referencedTable
    ) {
      dependsOn.get(fk.table)?.add(fk.referencedTable);
    }
  }
  const ordered: string[] = [];
  const remaining = new Set(tables);
  while (remaining.size > 0) {
    const ready = [...remaining].filter((table) =>
      [...(dependsOn.get(table) ?? [])].every(
        (parent) => !remaining.has(parent),
      ),
    );
    if (ready.length === 0)
      fail("foreign keys form a cycle; cannot order the inserts");
    for (const table of ready) {
      ordered.push(table);
      remaining.delete(table);
    }
  }
  return ordered;
}

async function newestMigration(sql: Sql): Promise<string> {
  const [row] = await sql<Array<{ newest: string }>>`
    select coalesce(max(created_at), 0)::text as newest from drizzle.__drizzle_migrations`;
  return row?.newest ?? "0";
}

async function main() {
  const sourceUrl = process.env.RESTORE_SOURCE_URL?.trim();
  const targetUrl = process.env.RESTORE_TARGET_URL?.trim();
  const businessId = option("business");
  const reference = option("reference");
  const ownerId = option("owner");
  const dryRun = process.argv.includes("--dry-run");
  if (!sourceUrl || !targetUrl || !businessId || !ownerId) {
    fail(
      "set RESTORE_SOURCE_URL and RESTORE_TARGET_URL, then run with --business <uuid> --owner <user-uuid> [--reference <ticket>] [--dry-run]",
    );
  }
  if (sourceUrl === targetUrl) {
    fail(
      "RESTORE_SOURCE_URL and RESTORE_TARGET_URL are the same database; restore the backup into a separate database first",
    );
  }

  const source = postgres(sourceUrl, {
    max: 1,
    prepare: false,
    onnotice: () => {},
  });
  const target = postgres(targetUrl, {
    max: 1,
    prepare: false,
    onnotice: () => {},
  });

  try {
    const [sourceNewest, targetNewest] = [
      await newestMigration(source),
      await newestMigration(target),
    ];
    if (sourceNewest !== targetNewest) {
      fail(
        `schemas differ (backup newest migration ${sourceNewest}, live ${targetNewest}); ` +
          "restore only between databases on the same migration",
      );
    }
    if (
      (await target`select 1 from business where id = ${businessId}`).length > 0
    ) {
      fail(`business ${businessId} already exists in the live database`);
    }

    if (
      (
        await target`select 1 from auth_user where id = ${ownerId} and email_verified = true`
      ).length === 0
    ) {
      fail(
        `--owner ${ownerId} is not a user with a verified email in the live database`,
      );
    }

    const foreignKeys = await loadForeignKeys(source);
    const cascading = foreignKeys.filter(
      (fk) => fk.onDelete === "c" && fk.table !== fk.referencedTable,
    );

    const primaryKeys = new Map<string, string[]>();
    const keyColumns = async (table: string): Promise<string[]> => {
      let key = primaryKeys.get(table);
      if (!key) {
        key = await primaryKey(source, table);
        if (key.length === 0) fail(`table ${table} has no primary key`);
        primaryKeys.set(table, key);
      }
      return key;
    };
    const identity = (row: Row, columns: string[]) =>
      JSON.stringify(columns.map((c) => row[c]));

    // Walk the cascade tree from the business until no new rows appear.
    const business = await rowsByKey(
      source,
      "business",
      ["id"],
      [[businessId]],
    );
    if (business.length === 0)
      fail(
        `business ${businessId} is not in the backup; try an earlier backup`,
      );
    const rows = new Map<string, Map<string, Row>>();
    rows.set(
      "business",
      new Map(business.map((row) => [identity(row, ["id"]), row])),
    );
    let frontier = new Map<string, Row[]>([["business", business]]);
    while (frontier.size > 0) {
      const next = new Map<string, Row[]>();
      for (const fk of cascading) {
        const parents = frontier.get(fk.referencedTable);
        if (!parents) continue;
        const found = await rowsByKey(
          source,
          fk.table,
          fk.columns,
          keyTuples(parents, fk.referencedColumns),
        );
        const known = rows.get(fk.table) ?? new Map<string, Row>();
        const pk = await keyColumns(fk.table);
        const added = found.filter((row) => !known.has(identity(row, pk)));
        for (const row of added) known.set(identity(row, pk), row);
        rows.set(fk.table, known);
        if (added.length > 0)
          next.set(fk.table, [...(next.get(fk.table) ?? []), ...added]);
      }
      frontier = next;
    }

    const tables = topologicalOrder([...rows.keys()], foreignKeys);
    const tree = new Set(tables);

    // Everything the business points at outside its own tree must still exist.
    const missing: string[] = [];
    let clearedReferences = 0;
    for (const fk of foreignKeys) {
      if (!tree.has(fk.table) || tree.has(fk.referencedTable)) continue;
      const wanted = keyTuples(
        [...(rows.get(fk.table)?.values() ?? [])],
        fk.columns,
      );
      if (wanted.length === 0) continue;
      const present = await rowsByKey(
        target,
        fk.referencedTable,
        fk.referencedColumns,
        wanted,
      );
      const presentKeys = new Set(
        keyTuples(present, fk.referencedColumns).map((t) => JSON.stringify(t)),
      );
      const lost = wanted.filter(
        (tuple) => !presentKeys.has(JSON.stringify(tuple)),
      );
      if (lost.length === 0) continue;
      if (fk.onDelete === "n") {
        // The schema clears this link when the other row is deleted (a
        // member's account, say), so clear it here rather than resurrect or
        // refuse over a row that was meant to be optional.
        const gone = new Set(lost.map((tuple) => JSON.stringify(tuple)));
        for (const row of rows.get(fk.table)?.values() ?? []) {
          if (gone.has(JSON.stringify(fk.columns.map((c) => row[c])))) {
            for (const column of fk.columns) row[column] = null;
            clearedReferences += 1;
          }
        }
      } else {
        missing.push(
          `${fk.table}(${fk.columns.join(",")}) -> ${fk.referencedTable}: ${lost.length} missing`,
        );
      }
    }
    if (missing.length > 0) {
      fail(
        `rows this business points at no longer exist in the live database:\n  ${missing.join("\n  ")}`,
      );
    }

    // Rows that survived the deletion with their link to the business cleared.
    // A table can be in the tree through one key and still hold rows of other
    // businesses that merely refer to this one (a ticket's related business).
    const survivors = foreignKeys.filter(
      (fk) => fk.onDelete === "n" && tree.has(fk.referencedTable),
    );

    // Looked up before the transaction opens: the target has a single
    // connection, which the transaction holds, so a lookup made inside it
    // through the pool would wait forever.
    const columnLists = new Map<string, string>();
    for (const table of tables) {
      columnLists.set(
        table,
        (await insertableColumns(target, table)).map(quoted).join(", "),
      );
    }

    await target.begin(async (tx) => {
      const report: Array<[string, number, number]> = [];
      for (const table of tables) {
        const tableRows = [...(rows.get(table)?.values() ?? [])];
        if (tableRows.length === 0) continue;
        const columns = columnLists.get(table) as string;
        // Inserted in bounded chunks so one very busy table (activity events)
        // cannot exceed a single statement's parameter size.
        let insertedCount = 0;
        for (let from = 0; from < tableRows.length; from += INSERT_CHUNK) {
          const inserted = await tx.unsafe(
            `insert into ${table} (${columns})
             select ${columns} from jsonb_populate_recordset(null::${table}, $1::jsonb)
             on conflict do nothing returning 1`,
            [
              tx.json(
                tableRows.slice(from, from + INSERT_CHUNK) as never,
              ) as never,
            ],
          );
          insertedCount += inserted.length;
        }
        // A row that was skipped (a slug redirect another business has since
        // taken, say) would leave the restore incomplete while looking
        // successful, so any shortfall aborts and rolls everything back.
        if (insertedCount !== tableRows.length) {
          throw new Error(
            `restore-business: ${table} has ${tableRows.length - insertedCount} of ${tableRows.length} rows that conflict with rows already in the live database; nothing was restored`,
          );
        }
        report.push([table, tableRows.length, insertedCount]);
      }

      // A restored business must not go public by itself: the backup may
      // predate the deletion request, so its pages can still be published, and
      // its files may be missing. Public lookup reads the business,
      // publication and site statuses, so pause all three (as the lifecycle
      // pause does).
      const wasPublished =
        (
          await tx`select 1 from business where id = ${businessId} and status = 'published'`
        ).length > 0;
      for (const table of [
        "business",
        "business_publication",
        "business_site",
      ]) {
        await tx.unsafe(
          `update ${table} set status = 'paused', updated_at = now()
           where ${table === "business" ? "id" : "business_id"} = $1 and status = 'published'`,
          [businessId],
        );
      }

      // Lifecycle: clear a pending-deletion deadline (the lifecycle job would
      // act on it within minutes) and every automatic-publication schedule
      // (the same job could publish the site before anyone has looked at it).
      const lifecycleCleared = await tx`
        update business_lifecycle
        set state = case when state in ('deletion_pending', 'active') then 'paused' else state end,
            paused_at = case when state in ('deletion_pending', 'active') then now() else paused_at end,
            deletion_requested_at = null,
            deletion_warning_sent_at = null,
            delete_after = null,
            auto_publish_enabled = false,
            auto_publish_at = null,
            postponed_until = null,
            pre_publish_reminder_sent_at = null,
            updated_at = now()
        where business_id = ${businessId}
        returning 1`;

      // The backup may predate a removal, a downgrade or an ownership
      // transfer, so no access it grants can be trusted. The operator names
      // the current owner; that person is made the active owner (with the
      // current owner permissions) and everyone else is restored as removed,
      // to be invited again.
      const quarantined = await tx`
        update business_membership
        set status = 'removed'
        where business_id = ${businessId} and status <> 'removed' and user_id <> ${ownerId}
        returning 1`;
      await tx`
        insert into business_membership (business_id, user_id, role, permissions, status)
        values (${businessId}, ${ownerId}, 'owner', ${permissionsForBusinessRole("owner")}, 'active')
        on conflict (business_id, user_id)
        do update set role = 'owner', permissions = excluded.permissions, status = 'active'`;

      // Records the live retention jobs have purged since the backup must not
      // come back. Mirrors src/modules/platform/data-retention.ts (activity
      // events: 26 months) and the enquiry retention date.
      // Older enquiries may have no expiry yet; the live job stamps one from
      // the status and dates before purging, so do the same first. Rules
      // mirror computeEnquiryRetentionExpiry in
      // src/modules/businesses/contacts-and-enquiries.ts.
      const unstamped = await tx<
        Array<{
          id: string;
          status: string;
          submitted_at: Date;
          updated_at: Date | null;
        }>
      >`select id, status, submitted_at, updated_at from business_enquiry
        where business_id = ${businessId} and retention_expires_at is null`;
      for (const enquiry of unstamped) {
        const reference = enquiry.updated_at ?? new Date();
        let expiry: Date;
        if (enquiry.status === "spam") {
          expiry = new Date(reference.getTime() + 30 * 86_400_000);
        } else if (
          enquiry.status === "closed" ||
          enquiry.status === "archived"
        ) {
          expiry = new Date(reference.getTime() + 365 * 86_400_000);
        } else {
          expiry = new Date(enquiry.submitted_at);
          expiry.setUTCMonth(expiry.getUTCMonth() + 24);
        }
        await tx`update business_enquiry set retention_expires_at = ${expiry} where id = ${enquiry.id}`;
      }
      const expiredEnquiries = await tx`
        delete from business_enquiry
        where business_id = ${businessId}
          and retention_expires_at is not null and retention_expires_at <= now()
        returning 1`;
      // Computed exactly as the live job does (setUTCMonth), because SQL month
      // arithmetic clamps month-end dates differently.
      const activityCutoff = new Date();
      activityCutoff.setUTCMonth(activityCutoff.getUTCMonth() - 26);
      const expiredActivity = await tx`
        delete from business_activity_event
        where business_id = ${businessId}
          and occurred_at < ${activityCutoff}
        returning 1`;

      // Special opening days older than the 30-day grace are purged live, from
      // the locations and from the owner's private draft; mirror both.
      const expiredHours = await tx`
        delete from opening_hours_exception
        where business_location_id in (select id from business_location where business_id = ${businessId})
          and date < (now() at time zone 'Europe/London')::date - 30
        returning 1`;
      await tx`
        update business_onboarding_draft
        set exceptional_hours = coalesce(
              (select jsonb_agg(entry order by entry->>'date')
               from jsonb_array_elements(exceptional_hours) as entry
               where entry->>'date' >= ((now() at time zone 'Europe/London')::date - 30)::text),
              '[]'::jsonb),
            version = version + 1,
            updated_at = now()
        where business_id = ${businessId}
          and jsonb_typeof(exceptional_hours) = 'array'
          and exists (select 1 from jsonb_array_elements(exceptional_hours) as entry
                      where entry->>'date' < ((now() at time zone 'Europe/London')::date - 30)::text)`;

      // An invitation emailed before the backup may have been accepted or
      // revoked since; its link would still work, so revoke them all and have
      // the owner invite again.
      const revokedInvitations = await tx`
        update business_invitation set status = 'revoked'
        where business_id = ${businessId} and status = 'pending'
        returning 1`;

      // A check may have been revoked or expired since the backup, and the
      // revocation is not in the restored data. Withdraw every restored check
      // so nothing advertises evidence that may have been withdrawn; an admin
      // verifies the business again. The summary follows from the checks.
      const revokedChecks = await tx`
        update business_verification_check
        set status = 'revoked', revoked_at = now(),
            revoked_reason = 'Restored from a backup; verify again'
        where business_id = ${businessId} and status = 'active'
        returning 1`;
      await tx`
        update business
        set verification_summary_status = case when exists (
              select 1 from business_verification_check c
              where c.business_id = business.id and c.status = 'active'
                and (c.expires_at is null or c.expires_at > now()))
            then 'verified' else 'unverified' end
        where id = ${businessId}`;

      // Files still queued for deletion by the original deletion would be
      // removed by the cleanup job even though the restored rows use them
      // again. Take them off the queue; report any already removed.
      const cancelled = await tx`
        delete from storage_cleanup
        where deleted_at is null and storage_key in (
          select storage_key from business_media where business_id = ${businessId} and status = 'active'
          union
          select storage_key from business_document where business_id = ${businessId} and status = 'active')
        returning 1`;
      const alreadyRemoved = await tx`
        select count(*)::int as n from storage_cleanup
        where deleted_at is not null and storage_key in (
          select storage_key from business_media where business_id = ${businessId} and status = 'active'
          union
          select storage_key from business_document where business_id = ${businessId} and status = 'active')`;
      const filesGone = Number(alreadyRemoved[0]?.n ?? 0);

      await tx`
        insert into admin_audit_log (actor_user_id, action, target_type, target_id, metadata)
        values (null, 'business.restored', 'business', ${businessId},
          ${tx.json({
            tool: "db:restore-business",
            reference: reference ?? null,
            tables: report.map(([table, , count]) => [table, count]),
            pausedOnRestore: wasPublished || lifecycleCleared.length > 0,
            membersRemoved: quarantined.length,
            owner: ownerId,
            verificationChecksRevoked: revokedChecks.length,
            expiredEnquiriesDropped: expiredEnquiries.length,
            expiredActivityDropped: expiredActivity.length,
            expiredOpeningDaysDropped: expiredHours.length,
            invitationsRevoked: revokedInvitations.length,
            optionalReferencesCleared: clearedReferences,
            cleanupCancelled: cancelled.length,
            filesAlreadyRemoved: filesGone,
          } as never)})`;

      const relinked: Array<[string, number]> = [];
      for (const fk of survivors) {
        const pk = await keyColumns(fk.table);
        if (pk.length !== 1 || fk.columns.length !== 1) {
          console.warn(`not re-linking ${fk.table}: needs a single-column key`);
          continue;
        }
        const column = fk.columns[0] as string;
        const parentKeys = keyTuples(
          [...(rows.get(fk.referencedTable)?.values() ?? [])],
          fk.referencedColumns,
        );
        const wasLinked = await rowsByKey(
          source,
          fk.table,
          fk.columns,
          parentKeys,
        );
        let count = 0;
        for (const row of wasLinked) {
          const updated = await tx.unsafe(
            `update ${fk.table} set ${quoted(column)} = $1
             where ${quoted(pk[0] as string)}::text = $2 and ${quoted(column)} is null returning 1`,
            [String(row[column]), String(row[pk[0] as string])],
          );
          count += updated.length;
        }
        relinked.push([`${fk.table}.${column}`, count]);
      }

      console.info(`${dryRun ? "DRY RUN: " : ""}business ${businessId}`);
      console.info("table                              in backup   restored");
      for (const [table, found, inserted] of report) {
        console.info(
          `${table.padEnd(34)} ${String(found).padStart(9)} ${String(inserted).padStart(10)}`,
        );
      }
      for (const [name, count] of relinked) {
        if (count > 0) console.info(`re-linked ${name}: ${count}`);
      }
      if (wasPublished || lifecycleCleared.length > 0) {
        console.info(
          "The business is paused until someone resumes it; any deletion deadline was cleared.",
        );
      }
      if (quarantined.length > 0) {
        console.info(
          `${quarantined.length} other member(s) were restored as removed; invite them again once you have checked the member list. Owner: ${ownerId}.`,
        );
      }
      if (revokedChecks.length > 0) {
        console.info(
          `${revokedChecks.length} verification check(s) were withdrawn; verify the business again.`,
        );
      }
      if (clearedReferences > 0) {
        console.info(
          `Cleared ${clearedReferences} link(s) to rows that no longer exist (optional references).`,
        );
      }
      if (revokedInvitations.length > 0) {
        console.info(
          `${revokedInvitations.length} pending invitation(s) were revoked; send new ones.`,
        );
      }
      if (
        expiredEnquiries.length + expiredActivity.length + expiredHours.length >
        0
      ) {
        console.info(
          `Dropped ${expiredEnquiries.length} expired enquiries, ${expiredActivity.length} expired activity events and ${expiredHours.length} past special opening days (past retention).`,
        );
      }
      if (cancelled.length > 0) {
        console.info(
          `Cancelled ${cancelled.length} queued file deletion(s) for restored files.`,
        );
      }
      if (filesGone > 0) {
        console.info(
          `${filesGone} restored file(s) were already deleted from storage and must be uploaded again.`,
        );
      }
      console.info(
        "Stored files (pictures, menus) are not in the database; the storage cleanup queue deletes them after a deletion.",
      );
      if (dryRun) throw new DryRunComplete();
    });
  } catch (error) {
    if (error instanceof DryRunComplete)
      console.info("Dry run complete; nothing was written.");
    else throw error;
  } finally {
    await source.end({ timeout: 5 });
    await target.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
