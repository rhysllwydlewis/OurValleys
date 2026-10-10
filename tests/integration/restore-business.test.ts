import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMedia,
  businessMembership,
  businessPublication,
  businessSite,
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
  siteId: "00000000-0000-4000-8000-000000004105",
  managerId: "00000000-0000-4000-8000-000000004106",
  deletedCreatorId: "00000000-0000-4000-8000-000000004107",
  placeId: "00000000-0000-4000-8000-000000004108",
  locationId: "00000000-0000-4000-8000-000000004109",
  queuedKey: "business/test-restore/gallery/queued.webp",
  removedKey: "business/test-restore/gallery/removed.webp",
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
  await database.insert(user).values({
    id: fixture.managerId,
    name: "Restore Manager",
    email: "restore.manager@example.test",
    emailVerified: true,
  });
  await sql`insert into place (id, canonical_name, slug, place_type, editorial_summary)
    values (${fixture.placeId}, 'Restore Place', 'restore-place', 'town', 'Fictional place for tests.')`;
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
    // The creator's account was deleted from the live database since the
    // backup; the business only refers to it optionally.
    await database.insert(user).values({
      id: fixture.deletedCreatorId,
      name: "Deleted Creator",
      email: "deleted.creator@example.test",
      emailVerified: true,
    });
    await database.insert(business).values({
      ...businessValues(fixture.businessId, "restore-fixture"),
      createdByUserId: fixture.deletedCreatorId,
      verificationSummaryStatus: "verified",
    });
    await database.insert(businessMembership).values({
      businessId: fixture.businessId,
      userId: fixture.managerId,
      role: "manager",
      permissions: permissionsForBusinessRole("manager"),
      status: "active",
    });
    await source`insert into business_location (id, business_id, place_id, location_type, is_primary)
      values (${fixture.locationId}, ${fixture.businessId}, ${fixture.placeId}, 'service_area', true)`;
    await source`insert into opening_hours_exception (business_location_id, date, is_closed)
      values (${fixture.locationId}, current_date - 90, true),
             (${fixture.locationId}, current_date + 10, true)`;
    await source`insert into business_invitation (business_id, email, role, token, expires_at)
      values (${fixture.businessId}, 'invitee@example.test', 'viewer', 'restore-test-token', now() + interval '5 days')`;
    await source`insert into business_verification_check (business_id, check_type, evidence_note, expires_at)
      values (${fixture.businessId}, 'premises', 'fictional evidence', now() - interval '2 days')`;
    await source`insert into business_enquiry (business_id, sender_name, message, dedupe_key, retention_expires_at)
      values (${fixture.businessId}, 'Old Sender', 'expired', 'expired-1', now() - interval '1 day'),
             (${fixture.businessId}, 'New Sender', 'current', 'current-1', now() + interval '30 days')`;
    // A legacy enquiry with no expiry yet, long past its two-year ceiling.
    await source`insert into business_enquiry (business_id, sender_name, message, dedupe_key, submitted_at)
      values (${fixture.businessId}, 'Legacy Sender', 'legacy', 'legacy-1', now() - interval '30 months')`;
    await source`insert into business_activity_event (business_id, event_type, occurred_at)
      values (${fixture.businessId}, 'website_view', now() - interval '30 months')`;
    await database.insert(businessMembership).values({
      businessId: fixture.businessId,
      userId: fixture.ownerId,
      role: "owner",
      permissions: permissionsForBusinessRole("owner"),
      status: "active",
    });
    await database.insert(businessSite).values({
      id: fixture.siteId,
      businessId: fixture.businessId,
      templateKey: "classic",
      status: "published",
      platformPath: "/b/restore-fixture",
      publishedAt: new Date(),
    });
    await database.insert(businessPublication).values({
      businessId: fixture.businessId,
      businessSiteId: fixture.siteId,
      status: "published",
      publishedAt: new Date(),
    });
    await database.insert(businessMedia).values(
      [fixture.queuedKey, fixture.removedKey].map((storageKey, index) => ({
        businessId: fixture.businessId,
        role: "gallery",
        storageKey,
        altText: "A fictional photograph",
        contentType: "image/webp",
        byteSize: 1000,
        sortOrder: index,
      })),
    );
    // More rows than one insert chunk, so the batching path is exercised.
    await source`insert into business_activity_event (business_id, event_type)
      select ${fixture.businessId}, 'website_view' from generate_series(1, 1200)`;
    await database.insert(businessLifecycle).values({
      businessId: fixture.businessId,
      state: "deletion_pending",
      deletionRequestedAt: new Date(Date.now() - 40 * 86_400_000),
      deletionWarningSentAt: new Date(Date.now() - 35 * 86_400_000),
      deleteAfter: new Date(Date.now() - 5 * 86_400_000),
      autoPublishEnabled: true,
      autoPublishAt: new Date(Date.now() - 86_400_000),
    });
    await database.insert(businessSlugRedirect).values({
      businessId: fixture.businessId,
      fromSlug: "restore-fixture-old-name",
      toSlug: "restore-fixture",
    });
    await source.end({ timeout: 5 });

    target = postgres(urlFor(targetName), { max: 1 });
    // The original deletion queued both files; one was already removed from
    // storage, the other was still waiting.
    await target`insert into storage_cleanup (storage_key) values (${fixture.queuedKey})`;
    await target`insert into storage_cleanup (storage_key, deleted_at) values (${fixture.removedKey}, now())`;
  }, 120_000);

  afterAll(async () => {
    await target?.end({ timeout: 5 });
    await admin?.unsafe(`drop database if exists ${sourceName} with (force)`);
    await admin?.unsafe(`drop database if exists ${targetName} with (force)`);
    await admin?.end({ timeout: 5 });
  });

  // The manager is named as the current owner, as after a transfer since the
  // backup (which still lists the original owner).
  const base = ["--business", fixture.businessId, "--owner", fixture.managerId];

  it("refuses when the database URLs are not supplied in the environment", async () => {
    const result = await restore(base, {
      RESTORE_SOURCE_URL: "",
      RESTORE_TARGET_URL: "",
    });
    expect(result.code).toBe(1);
    expect(result.output).toContain("RESTORE_SOURCE_URL");
  });

  it("refuses an owner who is not a user in the live database", async () => {
    const result = await restore([
      "--business",
      fixture.businessId,
      "--owner",
      "00000000-0000-4000-8000-000000009999",
    ]);
    expect(result.code).toBe(1);
    expect(result.output).toContain("is not a user in the live database");
  });

  it("requires the current owner to be named", async () => {
    const result = await restore(["--business", fixture.businessId]);
    expect(result.code).toBe(1);
    expect(result.output).toContain("--owner");
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
    expect(result.output).toContain("The business is paused");
    expect(result.output).toContain("1 restored file(s) were already deleted");
    expect(result.code).toBe(0);

    // Nothing public: every status the public lookup reads is paused.
    const [statuses] = await target<
      Array<{ b: string; p: string; s: string }>
    >`select b.status as b, p.status as p, s.status as s
      from business b
      join business_publication p on p.business_id = b.id
      join business_site s on s.business_id = b.id
      where b.id = ${fixture.businessId}`;
    expect(statuses).toEqual({ b: "paused", p: "paused", s: "paused" });

    // The still-queued deletion of a restored file is cancelled; the record of
    // the one already removed is kept.
    const queue = await target<
      Array<{ storage_key: string }>
    >`select storage_key from storage_cleanup where deleted_at is null`;
    expect(queue.map((row) => row.storage_key)).not.toContain(
      fixture.queuedKey,
    );

    const events = await target<
      Array<{ n: number }>
    >`select count(*)::int as n from business_activity_event where business_id = ${fixture.businessId}`;
    // 1,200 current events restored; the 30-month-old one is past retention.
    expect(events[0]?.n).toBe(1200);

    const enquiries = await target<
      Array<{ sender_name: string }>
    >`select sender_name from business_enquiry where business_id = ${fixture.businessId}`;
    expect(enquiries.map((row) => row.sender_name)).toEqual(["New Sender"]);

    // Restored checks are withdrawn, so the stored summary is unverified.
    const [summary] = await target<
      Array<{
        verification_summary_status: string;
        created_by_user_id: string | null;
      }>
    >`select verification_summary_status, created_by_user_id from business where id = ${fixture.businessId}`;
    expect(summary?.verification_summary_status).toBe("unverified");
    // The creator's account no longer exists, so the optional link is cleared.
    expect(summary?.created_by_user_id).toBeNull();

    // The 90-day-old special day is past its grace; the future one stays.
    const days = await target<
      Array<{ n: number }>
    >`select count(*)::int as n from opening_hours_exception where business_location_id = ${fixture.locationId}`;
    expect(days[0]?.n).toBe(1);

    // An old emailed invitation link must not work after the restore.
    const invitations = await target<
      Array<{ status: string }>
    >`select status from business_invitation where business_id = ${fixture.businessId}`;
    expect(invitations).toEqual([{ status: "revoked" }]);

    // Only the owner keeps access; the manager must be invited again.
    const memberRows = await target<
      Array<{ role: string; status: string }>
    >`select role, status from business_membership where business_id = ${fixture.businessId} order by role`;
    const named = await target<
      Array<{ user_id: string; role: string; status: string }>
    >`select user_id, role, status from business_membership where business_id = ${fixture.businessId}`;
    expect(
      named.find((row) => row.user_id === fixture.managerId),
    ).toMatchObject({ role: "owner", status: "active" });
    expect(named.find((row) => row.user_id === fixture.ownerId)).toMatchObject({
      status: "removed",
    });
    expect(memberRows).toHaveLength(2);

    const restored =
      await target`select slug from business where id = ${fixture.businessId}`;
    expect(restored).toHaveLength(1);
    const members =
      await target`select 1 from business_membership where business_id = ${fixture.businessId}`;
    expect(members).toHaveLength(2);
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
    const [schedule] = await target<
      Array<{ auto_publish_enabled: boolean; auto_publish_at: Date | null }>
    >`select auto_publish_enabled, auto_publish_at from business_lifecycle where business_id = ${fixture.businessId}`;
    expect(schedule?.auto_publish_enabled).toBe(false);
    expect(schedule?.auto_publish_at).toBeNull();

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
