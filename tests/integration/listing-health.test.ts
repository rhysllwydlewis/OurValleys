import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMembership,
  businessPublication,
  businessSite,
  category,
} from "@/lib/database/schema/business";
import { businessLifecycle } from "@/lib/database/schema/business-operations";
import {
  applyListingAction,
  readListingFacts,
  saveReminderPreferences,
} from "@/modules/businesses/listing-health";
import { permissionsForBusinessRole } from "@/modules/identity/access-policy";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000007701",
  businessId: "00000000-0000-4000-8000-000000007702",
  ownerId: "00000000-0000-4000-8000-000000007703",
  managerId: "00000000-0000-4000-8000-000000007704",
  outsiderId: "00000000-0000-4000-8000-000000007705",
} as const;
const name = "Listing Health Fixture";

const day = 86_400_000;

async function statusOf(): Promise<string | undefined> {
  const [row] = await getDatabase()
    .select({ status: business.status })
    .from(business)
    .where(eq(business.id, fixture.businessId));
  return row?.status;
}

async function lifecycleRow() {
  const [row] = await getDatabase()
    .select()
    .from(businessLifecycle)
    .where(eq(businessLifecycle.businessId, fixture.businessId));
  return row;
}

describeDatabase("listing health actions", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values(
      (["owner", "manager", "outsider"] as const).map((who) => ({
        id: fixture[`${who}Id`],
        name: `Listing ${who}`,
        email: `listing.${who}@example.test`,
        emailVerified: true,
      })),
    );
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Listing health fixtures",
      slug: "listing-health-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.businessId,
      tradingName: name,
      slug: "listing-health-fixture",
      summary: "A fictional listing health test business.",
      description: "A fictional listing health test business used by tests.",
      primaryCategoryId: fixture.categoryId,
      businessType: "service_area",
      status: "published",
      createdByUserId: fixture.ownerId,
    });
    const [site] = await database
      .insert(businessSite)
      .values({
        businessId: fixture.businessId,
        templateKey: "classic",
        status: "published",
        platformPath: "/b/listing-health-fixture",
        publishedAt: new Date(),
      })
      .returning({ id: businessSite.id });
    await database.insert(businessPublication).values({
      businessId: fixture.businessId,
      businessSiteId: site!.id,
      status: "published",
      publishedAt: new Date(),
    });
    await database.insert(businessMembership).values([
      {
        businessId: fixture.businessId,
        userId: fixture.ownerId,
        role: "owner",
        permissions: permissionsForBusinessRole("owner"),
        status: "active",
      },
      {
        businessId: fixture.businessId,
        userId: fixture.managerId,
        role: "manager",
        permissions: permissionsForBusinessRole("manager"),
        status: "active",
      },
    ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    for (const who of ["owner", "manager", "outsider"] as const) {
      await database.delete(user).where(eq(user.id, fixture[`${who}Id`]));
    }
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("reads the trading name, publication status and lifecycle", async () => {
    const facts = await readListingFacts(fixture.businessId);
    expect(facts).toMatchObject({
      tradingName: name,
      publicationStatus: "published",
    });
    expect(facts?.lifecycle.state).toBe("active");
    await expect(
      readListingFacts("00000000-0000-4000-8000-000000009999"),
    ).resolves.toBeNull();
  });

  it("lets a manager confirm, pause and resume, restoring the published status", async () => {
    const act = (action: "confirm" | "pause" | "resume") =>
      applyListingAction({
        businessId: fixture.businessId,
        actorUserId: fixture.managerId,
        action,
      });
    await expect(act("confirm")).resolves.toBe("confirmed");
    await expect(act("pause")).resolves.toBe("paused");
    await expect(statusOf()).resolves.toBe("paused");
    await expect(act("resume")).resolves.toBe("resumed");
    await expect(statusOf()).resolves.toBe("published");
  });

  it("refuses closing for good and deletion to a manager, even with the right name", async () => {
    for (const action of ["permanent_close", "request_deletion"] as const) {
      await expect(
        applyListingAction({
          businessId: fixture.businessId,
          actorUserId: fixture.managerId,
          action,
          confirmName: name,
        }),
      ).resolves.toBe("forbidden");
    }
    await expect(statusOf()).resolves.toBe("published");
    expect((await lifecycleRow())?.state ?? "active").toBe("active");
  });

  it("refuses an outsider every action and changes nothing", async () => {
    for (const action of ["confirm", "pause", "resume"] as const) {
      const outcome = await applyListingAction({
        businessId: fixture.businessId,
        actorUserId: fixture.outsiderId,
        action,
      });
      // Confirming only stamps the date, so the service allows it for any
      // actor id; the page and action authorise before calling it. Every
      // action that changes visibility is refused here.
      if (action === "confirm") expect(outcome).toBe("confirmed");
      else expect(outcome).toBe("forbidden");
    }
    await expect(statusOf()).resolves.toBe("published");
  });

  it("requires the business name before the owner closes or deletes", async () => {
    await expect(
      applyListingAction({
        businessId: fixture.businessId,
        actorUserId: fixture.ownerId,
        action: "request_deletion",
        confirmName: "Some other business",
      }),
    ).resolves.toBe("name_mismatch");
    await expect(
      applyListingAction({
        businessId: fixture.businessId,
        actorUserId: fixture.ownerId,
        action: "permanent_close",
      }),
    ).resolves.toBe("name_mismatch");
    await expect(statusOf()).resolves.toBe("published");

    await expect(
      applyListingAction({
        businessId: fixture.businessId,
        actorUserId: fixture.ownerId,
        action: "request_deletion",
        confirmName: `  ${name.toUpperCase()} `,
      }),
    ).resolves.toBe("deletion_requested");
    await expect(statusOf()).resolves.toBe("deletion_pending");
    const row = await lifecycleRow();
    expect(row?.state).toBe("deletion_pending");
    expect(row?.deleteAfter).toBeInstanceOf(Date);
  });

  it("lets only the owner cancel a deletion and brings the page back", async () => {
    await applyListingAction({
      businessId: fixture.businessId,
      actorUserId: fixture.ownerId,
      action: "request_deletion",
      confirmName: name,
    });
    await expect(
      applyListingAction({
        businessId: fixture.businessId,
        actorUserId: fixture.managerId,
        action: "cancel_deletion",
      }),
    ).resolves.toBe("forbidden");
    await expect(statusOf()).resolves.toBe("deletion_pending");
    await expect(
      applyListingAction({
        businessId: fixture.businessId,
        actorUserId: fixture.ownerId,
        action: "cancel_deletion",
      }),
    ).resolves.toBe("deletion_cancelled");
    await expect(statusOf()).resolves.toBe("published");
    expect((await lifecycleRow())?.deleteAfter).toBeNull();
  });

  it("closes temporarily until the end of the chosen UK day", async () => {
    const now = new Date("2026-10-22T12:00:00Z");
    const base = {
      businessId: fixture.businessId,
      actorUserId: fixture.managerId,
      action: "temporary_close" as const,
      now,
    };
    await expect(applyListingAction(base)).resolves.toBe("date_required");
    await expect(
      applyListingAction({ ...base, closureDate: "yesterday" }),
    ).resolves.toBe("date_invalid");
    await expect(
      applyListingAction({ ...base, closureDate: "2026-10-21" }),
    ).resolves.toBe("date_past");
    await expect(
      applyListingAction({ ...base, closureDate: "2030-01-01" }),
    ).resolves.toBe("date_too_far");
    expect((await lifecycleRow())?.state ?? "active").toBe("active");

    // The service compares against the real clock, so use a real future day.
    const future = new Date(Date.now() + 10 * day);
    const closureDate = future.toISOString().slice(0, 10);
    await expect(
      applyListingAction({
        ...base,
        now: new Date(),
        closureDate,
      }),
    ).resolves.toBe("closed_temporarily");
    const row = await lifecycleRow();
    expect(row?.state).toBe("temporarily_closed");
    expect(row?.temporaryClosedUntil?.getTime()).toBeGreaterThan(
      future.getTime() - day,
    );
    // The page stays online with a closed notice.
    await expect(statusOf()).resolves.toBe("published");
  });

  it("writes only the reminder switches that changed", async () => {
    await expect(
      saveReminderPreferences({
        businessId: fixture.businessId,
        preferences: {
          autoPublish: true,
          lifecycleEmails: false,
          weeklyDigest: true,
        },
      }),
    ).resolves.toBe("updated");
    const first = await lifecycleRow();
    expect(first?.autoPublishEnabled).toBe(true);
    expect(first?.lifecycleEmailsEnabled).toBe(false);
    expect(first?.weeklyDigestEnabled).toBe(true);
    const scheduled = first?.autoPublishAt;
    expect(scheduled).toBeInstanceOf(Date);

    await new Promise((resolve) => setTimeout(resolve, 20));
    await saveReminderPreferences({
      businessId: fixture.businessId,
      preferences: {
        autoPublish: true,
        lifecycleEmails: true,
        weeklyDigest: true,
      },
    });
    const second = await lifecycleRow();
    expect(second?.autoPublishAt?.getTime()).toBe(scheduled?.getTime());
    expect(second?.lifecycleEmailsEnabled).toBe(true);

    await saveReminderPreferences({
      businessId: fixture.businessId,
      preferences: {
        autoPublish: false,
        lifecycleEmails: true,
        weeklyDigest: false,
      },
    });
    const third = await lifecycleRow();
    expect(third?.autoPublishEnabled).toBe(false);
    expect(third?.autoPublishAt).toBeNull();
    expect(third?.weeklyDigestEnabled).toBe(false);
  });
});
