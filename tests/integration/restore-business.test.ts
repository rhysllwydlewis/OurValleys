import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMembership,
  category,
} from "@/lib/database/schema/business";
import {
  businessLifecycle,
  businessSlugRedirect,
} from "@/lib/database/schema/business-operations";
import { permissionsForBusinessRole } from "@/modules/identity/access-policy";

const run = promisify(execFile);
const testUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testUrl ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000004101",
  businessId: "00000000-0000-4000-8000-000000004102",
  ownerId: "00000000-0000-4000-8000-000000004103",
  otherBusinessId: "00000000-0000-4000-8000-000000004104",
} as const;

const suffix = `${process.pid}_${Date.now()}`;
const sourceName = `restore_source_${suffix}`;
const targetName = `restore_target_${suffix}`;

function urlFor(name: string): string {
  const url = new URL(testUrl as string);
  url.pathname = `/${name}`;
  return url.toString();
}

async function seedShared(url: string) {
  const sql = postgres(url, { max: 1 });
  const database = drizzle(sql);
  await database.insert(user).values({
    id: fixture.ownerId,
    name: "Restore Owner",
    email: "restore.owner@example.test",
    emailVerified: true,
  });
  await database.insert(category).values({
    id: fixture.categoryId,
    name: "Restore fixtures",
    slug: "restore-fixtures",
    description: "Fictional category used only by automated tests.",
  });
  await sql.end({ timeout: 5 });
}

function businessValues(id: string, slug: string) {
  return {
    id,
    tradingName: slug,
    slug,
    summary: "A fictional business used only by restore tests.",
    description: "A fictional business used only by restore tests.",
    primaryCategoryId: fixture.categoryId,
    businessType: "service_area" as const,
    status: "published" as const,
    createdByUserId: fixture.ownerId,
  };
}

async function restore(args: string[], env: Record<string, string> = {}) {
  try {
    const { stdout, stderr } = await run(
      process.execPath,
      ["--import", "tsx", "scripts/restore-business.ts", ...args],
      {
        env: {
          ...process.env,
          RESTORE_SOURCE_URL: urlFor(sourceName),
          RESTORE_TARGET_URL: urlFor(targetName),
          ...env,
        },
      },
    );
    return { code: 0, output: `${stdout}${stderr}` };
  } catch (error) {
    const failure = error as {
      code?: number;
      stdout?: string;
      stderr?: string;
    };
    return {
      code: failure.code ?? 1,
      output: `${failure.stdout ?? ""}${failure.stderr ?? ""}`,
    };
  }
}

describeDatabase("restoring a deleted business from a backup", () => {
  let admin: postgres.Sql;
  let target: postgres.Sql;

  beforeAll(async () => {
    admin = postgres(testUrl as string, { max: 1 });
    for (const name of [sourceName, targetName]) {
      await admin.unsafe(`create database ${name}`);
      const sql = postgres(urlFor(name), { max: 1 });
      await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
      await sql.end({ timeout: 5 });
      await seedShared(urlFor(name));
    }

    // The backup still holds the business, flagged for deletion with a
    // deadline that has already passed; the live database does not.
    const source = postgres(urlFor(sourceName), { max: 1 });
    const database = drizzle(source);
    await database
      .insert(business)
      .values(businessValues(fixture.businessId, "restore-fixture"));
    await database.insert(businessMembership).values({
      businessId: fixture.businessId,
      userId: fixture.ownerId,
      role: "owner",
      permissions: permissionsForBusinessRole("owner"),
      status: "active",
    });
    await database.insert(businessLifecycle).values({
      businessId: fixture.businessId,
      state: "deletion_pending",
      deletionRequestedAt: new Date(Date.now() - 40 * 86_400_000),
      deletionWarningSentAt: new Date(Date.now() - 35 * 86_400_000),
      deleteAfter: new Date(Date.now() - 5 * 86_400_000),
    });
    await database.insert(businessSlugRedirect).values({
      businessId: fixture.businessId,
      fromSlug: "restore-fixture-old-name",
      toSlug: "restore-fixture",
    });
    await source.end({ timeout: 5 });

    target = postgres(urlFor(targetName), { max: 1 });
  }, 120_000);

  afterAll(async () => {
    await target?.end({ timeout: 5 });
    await admin?.unsafe(`drop database if exists ${sourceName} with (force)`);
    await admin?.unsafe(`drop database if exists ${targetName} with (force)`);
    await admin?.end({ timeout: 5 });
  });

  const base = ["--business", fixture.businessId];

  it("refuses when the database URLs are not supplied in the environment", async () => {
    const result = await restore(base, {
      RESTORE_SOURCE_URL: "",
      RESTORE_TARGET_URL: "",
    });
    expect(result.code).toBe(1);
    expect(result.output).toContain("RESTORE_SOURCE_URL");
  });

  it("writes nothing on a dry run", async () => {
    const result = await restore([...base, "--dry-run"]);
    expect(result.code).toBe(0);
    expect(result.output).toContain("Dry run complete");
    const rows =
      await target`select 1 from business where id = ${fixture.businessId}`;
    expect(rows).toHaveLength(0);
  });

  it("aborts without restoring anything when a row collides with live data", async () => {
    // Another business has since taken the old URL the deleted one used.
    await target`insert into business (id, trading_name, slug, summary, description, primary_category_id, business_type, status, created_by_user_id)
      values (${fixture.otherBusinessId}, 'other', 'other-business', 's', 'd', ${fixture.categoryId}, 'service_area', 'published', ${fixture.ownerId})`;
    await target`insert into business_slug_redirect (business_id, from_slug, to_slug)
      values (${fixture.otherBusinessId}, 'restore-fixture-old-name', 'other-business')`;

    const result = await restore(base);
    expect(result.code).toBe(1);
    expect(result.output).toContain("business_slug_redirect");
    expect(result.output).toContain("nothing was restored");

    const rows =
      await target`select 1 from business where id = ${fixture.businessId}`;
    expect(rows).toHaveLength(0);

    await target`delete from business_slug_redirect where business_id = ${fixture.otherBusinessId}`;
  });

  it("restores the business paused with its deletion deadline cleared, and records it", async () => {
    const result = await restore([...base, "--reference", "TEST-RESTORE-1"]);
    expect(result.output).toContain("Deletion state cleared");
    expect(result.code).toBe(0);

    const restored =
      await target`select slug from business where id = ${fixture.businessId}`;
    expect(restored).toHaveLength(1);
    const members =
      await target`select 1 from business_membership where business_id = ${fixture.businessId}`;
    expect(members).toHaveLength(1);
    const redirects =
      await target`select 1 from business_slug_redirect where business_id = ${fixture.businessId}`;
    expect(redirects).toHaveLength(1);

    const [lifecycle] = await target<
      Array<{
        state: string;
        delete_after: Date | null;
        deletion_requested_at: Date | null;
        deletion_warning_sent_at: Date | null;
        paused_at: Date | null;
      }>
    >`select state, delete_after, deletion_requested_at, deletion_warning_sent_at, paused_at
      from business_lifecycle where business_id = ${fixture.businessId}`;
    expect(lifecycle?.state).toBe("paused");
    expect(lifecycle?.delete_after).toBeNull();
    expect(lifecycle?.deletion_requested_at).toBeNull();
    expect(lifecycle?.deletion_warning_sent_at).toBeNull();
    expect(lifecycle?.paused_at).not.toBeNull();

    const [audit] = await target<
      Array<{ metadata: { reference: string } }>
    >`select metadata from admin_audit_log
      where action = 'business.restored' and target_id = ${fixture.businessId}`;
    expect(audit?.metadata.reference).toBe("TEST-RESTORE-1");
  });

  it("refuses to restore a business that already exists", async () => {
    const result = await restore(base);
    expect(result.code).toBe(1);
    expect(result.output).toContain("already exists");
  });
});
