import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, category } from "@/lib/database/schema/business";
import {
  importMenuGroups,
  listBusinessMenu,
  maxMenuGroups,
  maxMenuItems,
  moveMenuEntry,
  removeMenuEntry,
  saveMenuGroup,
  saveMenuItem,
  setMenuItemFlags,
} from "@/modules/businesses/content-features";
import { parsePastedMenu } from "@/modules/businesses/menu-model";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  ownerId: "00000000-0000-4000-8000-000000002101",
  categoryId: "00000000-0000-4000-8000-000000002102",
  businessA: "00000000-0000-4000-8000-000000002103",
  businessB: "00000000-0000-4000-8000-000000002104",
} as const;

async function addGroup(businessId: string, name: string, sortOrder = 0) {
  await expect(
    saveMenuGroup({
      businessId,
      group: { name, sortOrder, status: "active" },
    }),
  ).resolves.toBe("saved");
}

async function groupIds(businessId: string) {
  return (await listBusinessMenu(businessId)).map((group) => group.id);
}

describeDatabase("business menu builder", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.ownerId,
      name: "Menu Owner",
      email: "menu.owner@example.test",
      emailVerified: true,
    });
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Menu fixtures",
      slug: "menu-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values(
      [fixture.businessA, fixture.businessB].map((id, index) => ({
        id,
        tradingName: `Fixture Menu ${index === 0 ? "A" : "B"}`,
        slug: `fixture-menu-${index === 0 ? "a" : "b"}`,
        summary: "Fictional business.",
        description: "Fictional business used only by automated tests.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area" as const,
        status: "published" as const,
        createdByUserId: fixture.ownerId,
      })),
    );
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(business).where(eq(business.id, fixture.businessA));
    await database.delete(business).where(eq(business.id, fixture.businessB));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.ownerId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("tidies prices and dietary labels on save and edits in place", async () => {
    await addGroup(fixture.businessA, "Mains");
    const [group] = await listBusinessMenu(fixture.businessA);
    await expect(
      saveMenuItem({
        businessId: fixture.businessA,
        item: {
          groupId: group!.id,
          name: "Cawl",
          description: "Lamb and leeks",
          priceDisplay: "12.5",
          dietaryLabels: ["gf", "Gluten free", "Locally sourced"],
          available: true,
          featured: false,
          sortOrder: 0,
        },
      }),
    ).resolves.toBe("saved");
    const [saved] = (await listBusinessMenu(fixture.businessA))[0]!.items;
    expect(saved).toMatchObject({
      priceDisplay: "£12.50",
      dietaryLabels: ["Gluten free", "Locally sourced"],
    });

    await expect(
      saveMenuItem({
        businessId: fixture.businessA,
        item: {
          id: saved!.id,
          groupId: group!.id,
          name: "Cawl cennin",
          priceDisplay: "from £11",
          dietaryLabels: [],
          available: false,
          featured: true,
          sortOrder: 0,
        },
      }),
    ).resolves.toBe("saved");
    const edited = (await listBusinessMenu(fixture.businessA))[0]!.items;
    expect(edited).toHaveLength(1);
    expect(edited[0]).toMatchObject({
      name: "Cawl cennin",
      priceDisplay: "from £11",
      available: false,
      featured: true,
    });
  });

  it("refuses to touch another business's groups and items", async () => {
    await addGroup(fixture.businessA, "Mains");
    await addGroup(fixture.businessB, "Drinks");
    const [groupA] = await listBusinessMenu(fixture.businessA);
    const [groupB] = await listBusinessMenu(fixture.businessB);
    await expect(
      saveMenuItem({
        businessId: fixture.businessA,
        item: {
          groupId: groupB!.id,
          name: "Smuggled dish",
          dietaryLabels: [],
          available: true,
          featured: false,
          sortOrder: 0,
        },
      }),
    ).resolves.toBe("not_found");
    await saveMenuItem({
      businessId: fixture.businessB,
      item: {
        groupId: groupB!.id,
        name: "Tea",
        dietaryLabels: [],
        available: true,
        featured: false,
        sortOrder: 0,
      },
    });
    const itemB = (await listBusinessMenu(fixture.businessB))[0]!.items[0]!;
    await expect(
      setMenuItemFlags({
        businessId: fixture.businessA,
        itemId: itemB.id,
        available: false,
      }),
    ).resolves.toBe("not_found");
    await expect(
      moveMenuEntry({
        businessId: fixture.businessA,
        itemId: itemB.id,
        direction: "up",
      }),
    ).resolves.toBe("not_found");
    await expect(
      moveMenuEntry({
        businessId: fixture.businessA,
        groupId: groupB!.id,
        direction: "up",
      }),
    ).resolves.toBe("not_found");
    await expect(
      removeMenuEntry({ businessId: fixture.businessA, itemId: itemB.id }),
    ).resolves.toBe("not_found");
    await expect(
      removeMenuEntry({ businessId: fixture.businessA, groupId: groupB!.id }),
    ).resolves.toBe("not_found");
    await expect(
      saveMenuItem({
        businessId: fixture.businessA,
        item: {
          id: itemB.id,
          groupId: groupA!.id,
          name: "Hijacked",
          dietaryLabels: [],
          available: true,
          featured: false,
          sortOrder: 0,
        },
      }),
    ).resolves.toBe("not_found");
    expect(
      (await listBusinessMenu(fixture.businessB))[0]!.items[0],
    ).toMatchObject({ name: "Tea", available: true });
  });

  it("moves groups and items one place and rewrites a clean order", async () => {
    await addGroup(fixture.businessA, "One", 5);
    await addGroup(fixture.businessA, "Two", 5);
    await addGroup(fixture.businessA, "Three", 9);
    const [one, two, three] = await listBusinessMenu(fixture.businessA);
    await expect(
      moveMenuEntry({
        businessId: fixture.businessA,
        groupId: three!.id,
        direction: "up",
      }),
    ).resolves.toBe("moved");
    let after = await listBusinessMenu(fixture.businessA);
    expect(after.map((group) => group.name)).toEqual(["One", "Three", "Two"]);
    expect(after.map((group) => group.sortOrder)).toEqual([0, 1, 2]);
    await moveMenuEntry({
      businessId: fixture.businessA,
      groupId: one!.id,
      direction: "up",
    });
    after = await listBusinessMenu(fixture.businessA);
    expect(after.map((group) => group.name)).toEqual(["One", "Three", "Two"]);
    expect(two).toBeDefined();

    for (const name of ["Soup", "Salad", "Stew"]) {
      await saveMenuItem({
        businessId: fixture.businessA,
        item: {
          groupId: one!.id,
          name,
          dietaryLabels: [],
          available: true,
          featured: false,
          sortOrder: 0,
        },
      });
    }
    const names = async () =>
      (await listBusinessMenu(fixture.businessA))[0]!.items.map(
        (item) => item.name,
      );
    expect((await names()).sort()).toEqual(["Salad", "Soup", "Stew"]);
    const items = (await listBusinessMenu(fixture.businessA))[0]!.items;
    const last = items[items.length - 1]!;
    await moveMenuEntry({
      businessId: fixture.businessA,
      itemId: last.id,
      direction: "up",
    });
    const reordered = (await listBusinessMenu(fixture.businessA))[0]!.items;
    expect(reordered.map((item) => item.sortOrder)).toEqual([0, 1, 2]);
    expect(reordered[1]!.id).toBe(last.id);
  });

  it("toggles availability and favourites, and shows unavailable dishes publicly", async () => {
    await addGroup(fixture.businessA, "Mains");
    await saveMenuGroup({
      businessId: fixture.businessA,
      group: { name: "Secret", sortOrder: 1, status: "hidden" },
    });
    const [mains, secret] = await listBusinessMenu(fixture.businessA);
    for (const [groupId, name] of [
      [mains!.id, "Pie"],
      [secret!.id, "Staff lunch"],
    ] as const) {
      await saveMenuItem({
        businessId: fixture.businessA,
        item: {
          groupId,
          name,
          dietaryLabels: [],
          available: true,
          featured: false,
          sortOrder: 0,
        },
      });
    }
    const pie = (await listBusinessMenu(fixture.businessA))[0]!.items[0]!;
    await expect(
      setMenuItemFlags({
        businessId: fixture.businessA,
        itemId: pie.id,
        available: false,
        featured: true,
      }),
    ).resolves.toBe("saved");
    await expect(
      setMenuItemFlags({ businessId: fixture.businessA, itemId: pie.id }),
    ).resolves.toBe("not_found");
    const publicMenu = await listBusinessMenu(fixture.businessA, true);
    expect(publicMenu.map((group) => group.name)).toEqual(["Mains"]);
    expect(publicMenu[0]!.items[0]).toMatchObject({
      name: "Pie",
      available: false,
      featured: true,
    });
  });

  it("imports a pasted menu after existing groups, all or nothing", async () => {
    await addGroup(fixture.businessA, "Existing", 3);
    const parsed = parsePastedMenu(
      "STARTERS\nSoup - 5.5 (v)\nBread £3\nMAINS:\nPie 11",
      "Menu",
    );
    await expect(
      importMenuGroups({
        businessId: fixture.businessA,
        groups: parsed.groups,
      }),
    ).resolves.toEqual({ outcome: "imported", groups: 2, items: 3 });
    const menu = await listBusinessMenu(fixture.businessA);
    expect(menu.map((group) => group.name)).toEqual([
      "Existing",
      "Starters",
      "Mains",
    ]);
    expect(menu[1]!.items.map((item) => item.name)).toEqual(["Soup", "Bread"]);
    expect(menu[1]!.items[0]).toMatchObject({
      priceDisplay: "£5.50",
      dietaryLabels: ["Vegetarian"],
    });
    expect(menu[0]!.items).toEqual([]);
    await expect(
      importMenuGroups({ businessId: fixture.businessB, groups: [] }),
    ).resolves.toEqual({ outcome: "invalid" });
  });

  it("enforces the group and dish limits without partial writes", async () => {
    const lines = Array.from({ length: maxMenuItems }, (_, index) => ({
      name: `Dish ${index}`,
      priceDisplay: null,
      description: null,
      dietaryLabels: [],
    }));
    await expect(
      importMenuGroups({
        businessId: fixture.businessA,
        groups: [{ name: "Everything", items: lines }],
      }),
    ).resolves.toMatchObject({ outcome: "imported", items: maxMenuItems });
    await expect(
      importMenuGroups({
        businessId: fixture.businessA,
        groups: [
          {
            name: "One more",
            items: [
              {
                name: "Extra",
                priceDisplay: null,
                description: null,
                dietaryLabels: [],
              },
            ],
          },
        ],
      }),
    ).resolves.toEqual({ outcome: "limit" });
    const [group] = await listBusinessMenu(fixture.businessA);
    await expect(
      saveMenuItem({
        businessId: fixture.businessA,
        item: {
          groupId: group!.id,
          name: "Too many",
          dietaryLabels: [],
          available: true,
          featured: false,
          sortOrder: 0,
        },
      }),
    ).resolves.toBe("limit");
    expect(await groupIds(fixture.businessA)).toHaveLength(1);

    for (let index = 1; index < maxMenuGroups; index += 1) {
      await addGroup(fixture.businessB, `Group ${index}`, index);
    }
    await addGroup(fixture.businessB, "Group last", 29);
    await expect(
      saveMenuGroup({
        businessId: fixture.businessB,
        group: { name: "Over", sortOrder: 30, status: "active" },
      }),
    ).resolves.toBe("limit");
  });

  it("removes a single dish without touching its section", async () => {
    await addGroup(fixture.businessA, "Mains");
    const [group] = await listBusinessMenu(fixture.businessA);
    for (const name of ["Pie", "Stew"]) {
      await saveMenuItem({
        businessId: fixture.businessA,
        item: {
          groupId: group!.id,
          name,
          dietaryLabels: [],
          available: true,
          featured: false,
          sortOrder: 0,
        },
      });
    }
    const [pie] = (await listBusinessMenu(fixture.businessA))[0]!.items;
    await expect(
      removeMenuEntry({ businessId: fixture.businessA, itemId: pie!.id }),
    ).resolves.toBe("removed");
    const remaining = (await listBusinessMenu(fixture.businessA))[0]!.items;
    expect(remaining).toHaveLength(1);
  });
});
