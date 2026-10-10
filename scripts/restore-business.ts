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

type ForeignKey = {
  table: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete: string;
};

type Row = Record<string, unknown>;

class DryRunComplete extends Error {}

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
  const dryRun = process.argv.includes("--dry-run");
  if (!sourceUrl || !targetUrl || !businessId) {
    fail(
      "set RESTORE_SOURCE_URL and RESTORE_TARGET_URL, then run with --business <uuid> [--reference <ticket>] [--dry-run]",
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
      if (lost.length > 0) {
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
        const inserted = await tx.unsafe(
          `insert into ${table} (${columns})
           select ${columns} from jsonb_populate_recordset(null::${table}, $1::jsonb)
           on conflict do nothing returning 1`,
          [tx.json(tableRows as never) as never],
        );
        // A row that was skipped (a slug redirect another business has since
        // taken, say) would leave the restore incomplete while looking
        // successful, so any shortfall aborts and rolls everything back.
        if (inserted.length !== tableRows.length) {
          throw new Error(
            `restore-business: ${table} has ${tableRows.length - inserted.length} of ${tableRows.length} rows that conflict with rows already in the live database; nothing was restored`,
          );
        }
        report.push([table, tableRows.length, inserted.length]);
      }

      // A business restored from an owner-requested deletion carries its old
      // deletion state and an already-due deadline; the lifecycle job would
      // delete it again within minutes. Clear the deadline and park it as
      // paused so a person decides when it goes live.
      const lifecycleCleared = await tx`
        update business_lifecycle
        set state = case when state = 'deletion_pending' then 'paused' else state end,
            paused_at = case when state = 'deletion_pending' then now() else paused_at end,
            deletion_requested_at = null,
            deletion_warning_sent_at = null,
            delete_after = null,
            updated_at = now()
        where business_id = ${businessId}
          and (state = 'deletion_pending' or delete_after is not null
               or deletion_requested_at is not null)
        returning 1`;

      await tx`
        insert into admin_audit_log (actor_user_id, action, target_type, target_id, metadata)
        values (null, 'business.restored', 'business', ${businessId},
          ${tx.json({
            tool: "db:restore-business",
            reference: reference ?? null,
            tables: report.map(([table, , count]) => [table, count]),
            deletionStateCleared: lifecycleCleared.length > 0,
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
      if (lifecycleCleared.length > 0) {
        console.info(
          "Deletion state cleared; the business is paused until someone resumes it.",
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
