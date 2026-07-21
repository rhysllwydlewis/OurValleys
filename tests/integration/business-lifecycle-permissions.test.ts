import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMembership,
  category,
} from "@/lib/database/schema/business";
import { changeBusinessLifecycle } from "@/modules/businesses/lifecycle-automation";
import { permissionsForBusinessRole } from "@/modules/identity/access-policy";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000002201",
  businessId: "00000000-0000-4000-8000-000000002202",
  ownerId: "00000000-0000-4000-8000-000000002203",
  managerId: "00000000-0000-4000-8000-000000002204",
} as const;

describeDatabase("business lifecycle permissions", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.ownerId,
        name: "Lifecycle Owner",
        email: "lifecycle.owner@example.test",
        emailVerified: true,
      },
      {
        id: fixture.managerId,
        name: "Lifecycle Manager",
        email: "lifecycle.manager@example.test",
        emailVerified: true,
      },
    ]);
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Lifecycle fixtures",
      slug: "lifecycle-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.businessId,
      tradingName: "Lifecycle Permission Fixture",
      slug: "lifecycle-permission-fixture",
      summary: "A fictional lifecycle test business.",
      description: "A fictional lifecycle test business used only by tests.",
      primaryCategoryId: fixture.categoryId,
      businessType: "service_area",
      status: "published",
      createdByUserId: fixture.ownerId,
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
    await database.delete(user).where(eq(user.id, fixture.ownerId));
    await database.delete(user).where(eq(user.id, fixture.managerId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("allows managers to pause but reserves permanent deletion controls for owners", async () => {
    await expect(
      changeBusinessLifecycle({
        businessId: fixture.businessId,
        actorUserId: fixture.managerId,
        action: "pause",
      }),
    ).resolves.toBe("updated");

    await expect(
      changeBusinessLifecycle({
        businessId: fixture.businessId,
        actorUserId: fixture.managerId,
        action: "request_deletion",
      }),
    ).resolves.toBe("forbidden");

    await expect(
      changeBusinessLifecycle({
        businessId: fixture.businessId,
        actorUserId: fixture.ownerId,
        action: "request_deletion",
      }),
    ).resolves.toBe("updated");

    await expect(
      changeBusinessLifecycle({
        businessId: fixture.businessId,
        actorUserId: fixture.ownerId,
        action: "cancel_deletion",
      }),
    ).resolves.toBe("updated");
  });
});
