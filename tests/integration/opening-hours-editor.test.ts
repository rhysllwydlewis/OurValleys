import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessLocation,
  businessMembership,
  category,
  openingHoursException,
  openingHoursRule,
} from "@/lib/database/schema/business";
import { businessOnboardingDraft } from "@/lib/database/schema/onboarding";
import {
  businessPermissions,
  canUserAccessBusiness,
  getUserBusinessPermissions,
} from "@/modules/businesses/permissions";
import {
  MAX_UPCOMING_EXCEPTIONS,
  getOwnerOpeningHours,
  removeSpecialDay,
  saveSpecialDay,
  saveWeeklyOpeningHours,
} from "@/modules/businesses/opening-hours";
import {
  addDaysToDateString,
  londonDateString,
} from "@/modules/businesses/opening-hours-exceptions";
import { weekdayOrder } from "@/modules/businesses/opening-hours-form";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const id = (suffix: string) => `00000000-0000-4000-8000-0000000009${suffix}`;
const fixture = {
  categoryId: id("a1"),
  businessA: id("a2"),
  businessB: id("a3"),
  businessNoLocation: id("a4"),
  locationA: id("a5"),
  locationB: id("a6"),
  ownerA: id("b1"),
  editorA: id("b2"),
  viewerA: id("b3"),
  ownerB: id("b4"),
  placeId: "00000000-0000-4000-8000-000000000301",
  // Seeded, published fictional business used for the public-page check.
  seededBusinessId: "00000000-0000-4000-8000-000000000401",
  seededSlug: "cwm-coil-heating",
} as const;

const today = londonDateString(new Date());
const inDays = (days: number) => addDaysToDateString(today, days);

function week(opens: string, closes: string) {
  return weekdayOrder.map((day) =>
    day === "sunday"
      ? { day, closed: true, opensAt: null, closesAt: null }
      : { day, closed: false, opensAt: opens, closesAt: closes },
  );
}

async function insertBusiness(businessId: string, slug: string) {
  await getDatabase().insert(business).values({
    id: businessId,
    tradingName: slug,
    slug,
    summary: "A fictional business used only by hours-editor tests.",
    description: "Fictional description.",
    primaryCategoryId: fixture.categoryId,
    businessType: "sole_trader",
    status: "published",
  });
}

async function weeklyFor(locationId: string) {
  return getDatabase()
    .select()
    .from(openingHoursRule)
    .where(eq(openingHoursRule.businessLocationId, locationId));
}

async function exceptionsFor(locationId: string) {
  return getDatabase()
    .select()
    .from(openingHoursException)
    .where(eq(openingHoursException.businessLocationId, locationId));
}

describeDatabase("owner opening hours editor", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture hours editor services",
      slug: "fixture-hours-editor-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(user).values(
      [
        [fixture.ownerA, "owner-a"],
        [fixture.editorA, "editor-a"],
        [fixture.viewerA, "viewer-a"],
        [fixture.ownerB, "owner-b"],
      ].map(([userId, name]) => ({
        id: userId!,
        name: name!,
        email: `${name}@hours-editor.test`,
        emailVerified: true,
      })),
    );
    await insertBusiness(fixture.businessA, "hours-editor-a");
    await insertBusiness(fixture.businessB, "hours-editor-b");
    await insertBusiness(fixture.businessNoLocation, "hours-editor-none");
    await database.insert(businessLocation).values([
      {
        id: fixture.locationA,
        businessId: fixture.businessA,
        placeId: fixture.placeId,
        locationType: "service_area",
        isPrimary: true,
      },
      {
        id: fixture.locationB,
        businessId: fixture.businessB,
        placeId: fixture.placeId,
        locationType: "service_area",
        isPrimary: true,
      },
    ]);
    await database.insert(businessMembership).values([
      {
        businessId: fixture.businessA,
        userId: fixture.ownerA,
        role: "owner",
        permissions: Object.values(businessPermissions),
        status: "active",
      },
      {
        businessId: fixture.businessA,
        userId: fixture.editorA,
        role: "editor",
        permissions: [
          businessPermissions.view,
          businessPermissions.editProfile,
          businessPermissions.manageContacts,
          businessPermissions.manageContent,
        ],
        status: "active",
      },
      {
        businessId: fixture.businessA,
        userId: fixture.viewerA,
        role: "viewer",
        permissions: [
          businessPermissions.view,
          businessPermissions.viewAnalytics,
        ],
        status: "active",
      },
      {
        businessId: fixture.businessB,
        userId: fixture.ownerB,
        role: "owner",
        permissions: Object.values(businessPermissions),
        status: "active",
      },
    ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    const businessIds = [
      fixture.businessA,
      fixture.businessB,
      fixture.businessNoLocation,
    ];
    await database
      .delete(businessOnboardingDraft)
      .where(inArray(businessOnboardingDraft.businessId, businessIds));
    await database
      .delete(businessMembership)
      .where(inArray(businessMembership.businessId, businessIds));
    // Locations cascade to their rules and exceptions.
    await database.delete(business).where(inArray(business.id, businessIds));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database
      .delete(user)
      .where(
        inArray(user.id, [
          fixture.ownerA,
          fixture.editorA,
          fixture.viewerA,
          fixture.ownerB,
        ]),
      );
    // Anything the public-page test left on the seeded location.
    await database
      .delete(openingHoursException)
      .where(
        eq(
          openingHoursException.businessLocationId,
          "00000000-0000-4000-8000-000000000701",
        ),
      );
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("authorisation for the editor's permission", () => {
    const allowed = (userId: string, businessId: string) =>
      canUserAccessBusiness({
        userId,
        businessId,
        permission: businessPermissions.editProfile,
      });

    it("resolves several permissions in one lookup, matching the single check", async () => {
      const permissions = [
        businessPermissions.editProfile,
        businessPermissions.manageMembers,
        businessPermissions.view,
      ] as const;
      for (const [userId, businessId] of [
        [fixture.ownerA, fixture.businessA],
        [fixture.editorA, fixture.businessA],
        [fixture.viewerA, fixture.businessA],
        [fixture.ownerB, fixture.businessA],
        [fixture.ownerA, fixture.businessB],
      ] as const) {
        const batch = await getUserBusinessPermissions({
          userId,
          businessId,
          permissions,
        });
        for (const permission of permissions) {
          expect(batch[permission]).toBe(
            await canUserAccessBusiness({ userId, businessId, permission }),
          );
        }
      }
    });

    it("allows owners and editors of the business", async () => {
      expect(await allowed(fixture.ownerA, fixture.businessA)).toBe(true);
      expect(await allowed(fixture.editorA, fixture.businessA)).toBe(true);
    });

    it("denies a viewer, another business's owner and a stranger", async () => {
      expect(await allowed(fixture.viewerA, fixture.businessA)).toBe(false);
      expect(await allowed(fixture.ownerB, fixture.businessA)).toBe(false);
      expect(await allowed(fixture.ownerA, fixture.businessB)).toBe(false);
      expect(
        await allowed(id("ff"), fixture.businessA), // no such user
      ).toBe(false);
    });
  });

  describe("reading", () => {
    it("shows every weekday, treating a day with no rule as closed", async () => {
      const result = await getOwnerOpeningHours(fixture.businessA);
      expect(result.state).toBe("ready");
      if (result.state !== "ready") return;
      expect(result.hasLocation).toBe(true);
      expect(result.weekly.map((day) => day.day)).toEqual([...weekdayOrder]);
      expect(result.weekly.every((day) => day.closed)).toBe(true);
    });

    it("reports a business with no location instead of failing", async () => {
      const result = await getOwnerOpeningHours(fixture.businessNoLocation);
      expect(result).toEqual({
        state: "ready",
        hasLocation: false,
        weekly: [],
        specialDays: [],
      });
    });
  });

  describe("weekly hours", () => {
    it("saves seven rules and reads them back", async () => {
      expect(
        await saveWeeklyOpeningHours({
          businessId: fixture.businessA,
          hours: week("09:00", "17:30"),
        }),
      ).toBe("saved");
      expect(await weeklyFor(fixture.locationA)).toHaveLength(7);

      const result = await getOwnerOpeningHours(fixture.businessA);
      if (result.state !== "ready") throw new Error("expected ready");
      expect(result.weekly[0]).toEqual({
        day: "monday",
        closed: false,
        opensAt: "09:00",
        closesAt: "17:30",
      });
      expect(result.weekly[6]).toMatchObject({ day: "sunday", closed: true });

      // Saving again replaces rather than duplicates.
      expect(
        await saveWeeklyOpeningHours({
          businessId: fixture.businessA,
          hours: week("10:00", "16:00"),
        }),
      ).toBe("saved");
      const rules = await weeklyFor(fixture.locationA);
      expect(rules).toHaveLength(7);
      expect(rules.find((rule) => rule.dayOfWeek === 1)?.opensAt).toBe("10:00");
    });

    it.each([
      ["fewer than seven days", week("09:00", "17:00").slice(0, 6)],
      [
        "an open day without times",
        week("09:00", "17:00").map((day, index) =>
          index === 0 ? { ...day, opensAt: null, closesAt: null } : day,
        ),
      ],
      [
        "closing before opening",
        week("09:00", "17:00").map((day, index) =>
          index === 0 ? { ...day, opensAt: "18:00", closesAt: "09:00" } : day,
        ),
      ],
      [
        "a malformed time",
        week("09:00", "17:00").map((day, index) =>
          index === 0 ? { ...day, opensAt: "9am" } : day,
        ),
      ],
    ])("rejects %s and changes nothing", async (_name, hours) => {
      expect(
        await saveWeeklyOpeningHours({ businessId: fixture.businessA, hours }),
      ).toBe("invalid");
      expect(await weeklyFor(fixture.locationA)).toHaveLength(0);
    });

    it("refuses a business that has no location", async () => {
      expect(
        await saveWeeklyOpeningHours({
          businessId: fixture.businessNoLocation,
          hours: week("09:00", "17:00"),
        }),
      ).toBe("no_location");
    });

    it("never touches another business's hours", async () => {
      await saveWeeklyOpeningHours({
        businessId: fixture.businessB,
        hours: week("08:00", "12:00"),
      });
      await saveWeeklyOpeningHours({
        businessId: fixture.businessA,
        hours: week("13:00", "18:00"),
      });
      const b = await weeklyFor(fixture.locationB);
      expect(b).toHaveLength(7);
      expect(b.find((rule) => rule.dayOfWeek === 1)).toMatchObject({
        opensAt: "08:00",
        closesAt: "12:00",
      });
    });
  });

  describe("special days", () => {
    it("saves a closure, then replaces it for the same date", async () => {
      expect(
        await saveSpecialDay({
          businessId: fixture.businessA,
          specialDay: {
            date: inDays(3),
            closed: true,
            opensAt: null,
            closesAt: null,
            note: "Bank holiday",
          },
        }),
      ).toBe("saved");
      expect(
        await saveSpecialDay({
          businessId: fixture.businessA,
          specialDay: {
            date: inDays(3),
            closed: false,
            opensAt: "10:00",
            closesAt: "13:00",
            note: null,
          },
        }),
      ).toBe("saved");
      const rows = await exceptionsFor(fixture.locationA);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        isClosed: false,
        opensAt: "10:00",
        closesAt: "13:00",
        note: null,
      });
    });

    it.each([
      [
        "a past date",
        { date: inDays(-1), closed: true, opensAt: null, closesAt: null },
      ],
      [
        "an impossible date",
        { date: "2026-02-30", closed: true, opensAt: null, closesAt: null },
      ],
      [
        "a closed day that carries times",
        { date: inDays(2), closed: true, opensAt: "09:00", closesAt: "17:00" },
      ],
      [
        "an open day without times",
        { date: inDays(2), closed: false, opensAt: null, closesAt: null },
      ],
      [
        "closing before opening",
        { date: inDays(2), closed: false, opensAt: "17:00", closesAt: "09:00" },
      ],
      [
        "an over-long note",
        {
          date: inDays(2),
          closed: true,
          opensAt: null,
          closesAt: null,
          note: "x".repeat(121),
        },
      ],
    ])("rejects %s and writes nothing", async (_name, specialDay) => {
      expect(
        await saveSpecialDay({ businessId: fixture.businessA, specialDay }),
      ).toBe("invalid");
      expect(await exceptionsFor(fixture.locationA)).toHaveLength(0);
    });

    it("refuses a business that has no location", async () => {
      expect(
        await saveSpecialDay({
          businessId: fixture.businessNoLocation,
          specialDay: {
            date: inDays(2),
            closed: true,
            opensAt: null,
            closesAt: null,
          },
        }),
      ).toBe("no_location");
    });

    it("caps upcoming special days but still allows editing an existing one", async () => {
      await getDatabase()
        .insert(openingHoursException)
        .values(
          Array.from({ length: MAX_UPCOMING_EXCEPTIONS }, (_, index) => ({
            businessLocationId: fixture.locationA,
            date: inDays(index + 1),
            isClosed: true,
          })),
        );
      expect(
        await saveSpecialDay({
          businessId: fixture.businessA,
          specialDay: {
            date: inDays(MAX_UPCOMING_EXCEPTIONS + 5),
            closed: true,
            opensAt: null,
            closesAt: null,
          },
        }),
      ).toBe("limit");
      expect(
        await saveSpecialDay({
          businessId: fixture.businessA,
          specialDay: {
            date: inDays(1),
            closed: false,
            opensAt: "09:00",
            closesAt: "11:00",
          },
        }),
      ).toBe("saved");
    });

    it("removes only the named date from the named business", async () => {
      await saveSpecialDay({
        businessId: fixture.businessA,
        specialDay: {
          date: inDays(4),
          closed: true,
          opensAt: null,
          closesAt: null,
        },
      });
      await saveSpecialDay({
        businessId: fixture.businessB,
        specialDay: {
          date: inDays(4),
          closed: true,
          opensAt: null,
          closesAt: null,
        },
      });

      // Business B's id cannot remove business A's day, and vice versa.
      expect(
        await removeSpecialDay({
          businessId: fixture.businessNoLocation,
          date: inDays(4),
        }),
      ).toBe("not_found");
      expect(
        await removeSpecialDay({
          businessId: fixture.businessB,
          date: inDays(9),
        }),
      ).toBe("not_found");
      expect(
        await removeSpecialDay({
          businessId: fixture.businessB,
          date: inDays(4),
        }),
      ).toBe("removed");

      expect(await exceptionsFor(fixture.locationB)).toHaveLength(0);
      expect(await exceptionsFor(fixture.locationA)).toHaveLength(1);
      expect(
        await removeSpecialDay({
          businessId: fixture.businessA,
          date: "nonsense",
        }),
      ).toBe("invalid");
    });
  });

  describe("consistency with the rest of the record", () => {
    it("mirrors live edits into a draft that is still in step, so previews are not stale", async () => {
      const database = getDatabase();
      // Canonical and draft start identical, as they do right after publication.
      await saveWeeklyOpeningHours({
        businessId: fixture.businessA,
        hours: week("09:00", "17:00"),
      });
      await database.insert(businessOnboardingDraft).values({
        businessId: fixture.businessA,
        hours: week("09:00", "17:00"),
        exceptionalHours: [],
      });

      await saveWeeklyOpeningHours({
        businessId: fixture.businessA,
        hours: week("11:00", "15:00"),
      });
      await saveSpecialDay({
        businessId: fixture.businessA,
        specialDay: {
          date: inDays(6),
          closed: true,
          opensAt: null,
          closesAt: null,
          note: "Inventory",
        },
      });

      let [draft] = await database
        .select()
        .from(businessOnboardingDraft)
        .where(eq(businessOnboardingDraft.businessId, fixture.businessA));
      expect(draft?.version).toBe(2);
      expect(
        (draft?.hours as { day: string; opensAt: string | null }[])[0],
      ).toMatchObject({ day: "monday", opensAt: "11:00" });
      expect(
        (draft?.exceptionalHours as { date: string; note: string }[]).map(
          (item) => item.note,
        ),
      ).toEqual(["Inventory"]);

      await removeSpecialDay({
        businessId: fixture.businessA,
        date: inDays(6),
      });
      [draft] = await database
        .select()
        .from(businessOnboardingDraft)
        .where(eq(businessOnboardingDraft.businessId, fixture.businessA));
      expect(draft?.exceptionalHours).toEqual([]);
    });

    it("leaves hours and special days the owner staged separately in the draft untouched", async () => {
      const database = getDatabase();
      await saveWeeklyOpeningHours({
        businessId: fixture.businessA,
        hours: week("09:00", "17:00"),
      });
      const stagedHours = week("12:00", "20:00");
      const stagedDays = [
        {
          date: inDays(20),
          closed: true,
          opensAt: null,
          closesAt: null,
          note: "Staged closure",
        },
      ];
      await database.insert(businessOnboardingDraft).values({
        businessId: fixture.businessA,
        hours: stagedHours,
        exceptionalHours: stagedDays,
      });

      // Routine live corrections must not destroy the staged work.
      await saveWeeklyOpeningHours({
        businessId: fixture.businessA,
        hours: week("10:00", "16:00"),
      });
      await saveSpecialDay({
        businessId: fixture.businessA,
        specialDay: {
          date: inDays(3),
          closed: true,
          opensAt: null,
          closesAt: null,
        },
      });
      await removeSpecialDay({
        businessId: fixture.businessA,
        date: inDays(3),
      });

      const [draft] = await database
        .select()
        .from(businessOnboardingDraft)
        .where(eq(businessOnboardingDraft.businessId, fixture.businessA));
      expect(draft?.hours).toEqual(stagedHours);
      expect(draft?.exceptionalHours).toEqual(stagedDays);
      expect(draft?.version).toBe(0);

      // The live record itself was still updated.
      const rules = await weeklyFor(fixture.locationA);
      expect(rules.find((rule) => rule.dayOfWeek === 1)?.opensAt).toBe("10:00");
    });

    it("fills draft sections that were never set", async () => {
      const database = getDatabase();
      await database.insert(businessOnboardingDraft).values({
        businessId: fixture.businessA,
      });
      await saveWeeklyOpeningHours({
        businessId: fixture.businessA,
        hours: week("09:00", "17:00"),
      });
      await saveSpecialDay({
        businessId: fixture.businessA,
        specialDay: {
          date: inDays(5),
          closed: true,
          opensAt: null,
          closesAt: null,
          note: "Away",
        },
      });
      const [draft] = await database
        .select()
        .from(businessOnboardingDraft)
        .where(eq(businessOnboardingDraft.businessId, fixture.businessA));
      expect(draft?.hours).toEqual(week("09:00", "17:00"));
      expect(
        (draft?.exceptionalHours as { note: string }[]).map((d) => d.note),
      ).toEqual(["Away"]);
    });

    it("advances the business's last-updated time on every hours change", async () => {
      const database = getDatabase();
      const old = new Date("2020-01-01T00:00:00Z");
      const updatedAt = async () =>
        (
          await database
            .select({ at: business.updatedAt })
            .from(business)
            .where(eq(business.id, fixture.businessA))
        )[0]!.at;
      const reset = () =>
        database
          .update(business)
          .set({ updatedAt: old })
          .where(eq(business.id, fixture.businessA));

      await reset();
      await saveWeeklyOpeningHours({
        businessId: fixture.businessA,
        hours: week("09:00", "17:00"),
      });
      expect((await updatedAt()).getTime()).toBeGreaterThan(old.getTime());

      await reset();
      await saveSpecialDay({
        businessId: fixture.businessA,
        specialDay: {
          date: inDays(4),
          closed: true,
          opensAt: null,
          closesAt: null,
        },
      });
      expect((await updatedAt()).getTime()).toBeGreaterThan(old.getTime());

      await reset();
      await removeSpecialDay({
        businessId: fixture.businessA,
        date: inDays(4),
      });
      expect((await updatedAt()).getTime()).toBeGreaterThan(old.getTime());

      // A refused change does not touch it.
      await reset();
      await saveWeeklyOpeningHours({
        businessId: fixture.businessA,
        hours: [],
      });
      expect((await updatedAt()).getTime()).toBe(old.getTime());
    });

    it("serialises concurrent special-day saves so the limit holds", async () => {
      const database = getDatabase();
      const existing = Array.from(
        { length: MAX_UPCOMING_EXCEPTIONS - 1 },
        (_, index) => ({
          date: inDays(index + 1),
          closed: true,
          opensAt: null,
          closesAt: null,
          note: null,
        }),
      );
      await database.insert(openingHoursException).values(
        existing.map((day) => ({
          businessLocationId: fixture.locationA,
          date: day.date,
          isClosed: true,
        })),
      );
      await database.insert(businessOnboardingDraft).values({
        businessId: fixture.businessA,
        exceptionalHours: existing,
      });

      const results = await Promise.all(
        [70, 71, 72, 73].map((offset) =>
          saveSpecialDay({
            businessId: fixture.businessA,
            specialDay: {
              date: inDays(offset),
              closed: true,
              opensAt: null,
              closesAt: null,
            },
          }),
        ),
      );
      expect(results.filter((result) => result === "saved")).toHaveLength(1);
      expect(results.filter((result) => result === "limit")).toHaveLength(3);
      expect(await exceptionsFor(fixture.locationA)).toHaveLength(
        MAX_UPCOMING_EXCEPTIONS,
      );
      const [draft] = await database
        .select()
        .from(businessOnboardingDraft)
        .where(eq(businessOnboardingDraft.businessId, fixture.businessA));
      expect(draft?.exceptionalHours as unknown[]).toHaveLength(
        MAX_UPCOMING_EXCEPTIONS,
      );
    });

    it("keeps the mirrored draft complete when saves arrive at once", async () => {
      const database = getDatabase();
      await database.insert(businessOnboardingDraft).values({
        businessId: fixture.businessA,
        exceptionalHours: [],
      });
      const results = await Promise.all(
        [2, 3, 4, 5].map((offset) =>
          saveSpecialDay({
            businessId: fixture.businessA,
            specialDay: {
              date: inDays(offset),
              closed: true,
              opensAt: null,
              closesAt: null,
            },
          }),
        ),
      );
      expect(results).toEqual(["saved", "saved", "saved", "saved"]);
      const [draft] = await database
        .select()
        .from(businessOnboardingDraft)
        .where(eq(businessOnboardingDraft.businessId, fixture.businessA));
      expect(
        (draft?.exceptionalHours as { date: string }[])
          .map((day) => day.date)
          .sort(),
      ).toEqual([2, 3, 4, 5].map(inDays));
    });

    it("works for a business that has no draft at all", async () => {
      expect(
        await saveWeeklyOpeningHours({
          businessId: fixture.businessA,
          hours: week("09:00", "17:00"),
        }),
      ).toBe("saved");
    });

    it("shows a saved special day on the live public page", async () => {
      const date = inDays(2);
      expect(
        await saveSpecialDay({
          businessId: fixture.seededBusinessId,
          specialDay: {
            date,
            closed: true,
            opensAt: null,
            closesAt: null,
            note: "Staff training",
          },
        }),
      ).toBe("saved");
      const detail = await getPublishedBusinessBySlug(fixture.seededSlug);
      expect(detail.state).toBe("ready");
      if (detail.state !== "ready") return;
      expect(
        detail.business.openingExceptions.find((item) => item.date === date),
      ).toMatchObject({ display: "Closed", note: "Staff training" });
    });
  });
});
