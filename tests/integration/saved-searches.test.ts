import { eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const search = vi.hoisted(() => ({
  total: 4,
  state: "ready" as "ready" | "unavailable",
  complete: true,
}));

vi.mock("@/modules/search/site-search", () => ({
  searchSite: vi.fn(async (_query: string, options?: { type?: string }) =>
    search.state === "unavailable"
      ? { state: "unavailable", query: _query }
      : {
          state: "ready",
          total: search.total,
          complete: search.complete,
          counts: {
            businesses: search.total,
            offers: 0,
            events: 0,
            places: 0,
            categories: 0,
            guides: 0,
          },
          type: options?.type ?? "all",
        },
  ),
}));

const directory = vi.hoisted(() => ({ total: 6 }));

vi.mock("@/modules/businesses/public", () => ({
  listPublishedBusinesses: vi.fn(async () => ({
    state: "ready",
    businesses: [],
    page: 1,
    pageSize: 1,
    total: directory.total,
    totalPages: directory.total,
    hasPreviousPage: false,
    hasNextPage: false,
  })),
}));

import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { savedSearch } from "@/lib/database/schema/saved-search";
import { MAX_SAVED_SEARCHES } from "@/modules/residents/saved-search-model";
import {
  listSavedSearchesForUser,
  markSavedSearchSeen,
  openSavedSearchForUser,
  removeSavedSearchForUser,
  saveSearchForUser,
} from "@/modules/residents/saved-searches";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const userId = "00000000-0000-4000-8000-000000009001";
const otherUserId = "00000000-0000-4000-8000-000000009002";

describeDatabase("saved searches", () => {
  beforeEach(async () => {
    search.total = 4;
    search.state = "ready";
    search.complete = true;
    await getDatabase()
      .insert(user)
      .values([
        {
          id: userId,
          name: "Searcher",
          email: "searcher.saved@example.test",
          emailVerified: true,
        },
        {
          id: otherUserId,
          name: "Other Searcher",
          email: "searcher.other@example.test",
          emailVerified: true,
        },
      ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(user).where(eq(user.id, userId));
    await database.delete(user).where(eq(user.id, otherUserId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("saves a search once, whatever the case or accents", async () => {
    expect(await saveSearchForUser(userId, "Caffè Bach", "all")).toBe("saved");
    expect(await saveSearchForUser(userId, "  caffe   bach ", "all")).toBe(
      "already_saved",
    );
    // The same words in a different tab are a different search.
    expect(await saveSearchForUser(userId, "caffe bach", "events")).toBe(
      "saved",
    );
    const listed = await listSavedSearchesForUser(userId);
    expect(listed.searches.map((item) => item.type)).toEqual(["all", "events"]);
  });

  it("rejects searches that are too short, punctuation only or not text", async () => {
    expect(await saveSearchForUser(userId, "a", "all")).toBe("invalid");
    expect(await saveSearchForUser(userId, "%%", "all")).toBe("invalid");
    expect(await saveSearchForUser(userId, 7, "all")).toBe("invalid");
    expect(await saveSearchForUser("not-a-uuid", "bakery", "all")).toBe(
      "invalid",
    );
  });

  it("does not save when the results cannot be counted", async () => {
    search.state = "unavailable";
    expect(await saveSearchForUser(userId, "bakery", "all")).toBe(
      "unavailable",
    );
    expect((await listSavedSearchesForUser(userId)).searches).toHaveLength(0);
  });

  it("stops at the limit", async () => {
    for (let index = 0; index < MAX_SAVED_SEARCHES; index += 1) {
      expect(await saveSearchForUser(userId, `search ${index}`, "all")).toBe(
        "saved",
      );
    }
    expect(await saveSearchForUser(userId, "one too many", "all")).toBe(
      "limit",
    );
  });

  it("cannot pass the limit with parallel saves", async () => {
    const outcomes = await Promise.all(
      Array.from({ length: MAX_SAVED_SEARCHES + 5 }, (_, index) =>
        saveSearchForUser(userId, `parallel ${index}`, "all"),
      ),
    );
    expect(outcomes.filter((item) => item === "saved")).toHaveLength(
      MAX_SAVED_SEARCHES,
    );
    expect(outcomes.filter((item) => item === "limit")).toHaveLength(5);
  });

  it("counts results that return after a dip as new", async () => {
    await saveSearchForUser(userId, "bakery", "all");
    search.total = 1;
    await listSavedSearchesForUser(userId, { withCounts: true });
    search.total = 4;
    const [item] = (
      await listSavedSearchesForUser(userId, { withCounts: true })
    ).searches;
    expect(item?.newCount).toBe(3);
  });

  it("reports results added since the baseline, and none once opened", async () => {
    await saveSearchForUser(userId, "bakery", "businesses");
    search.total = 7;
    let [item] = (await listSavedSearchesForUser(userId, { withCounts: true }))
      .searches;
    expect(item?.total).toBe(7);
    expect(item?.newCount).toBe(3);

    expect(await openSavedSearchForUser(userId, item!.id)).toEqual({
      state: "ready",
      href: "/search?q=bakery&type=businesses",
    });

    [item] = (
      await listSavedSearchesForUser(userId, { withCounts: true })
    ).searches;
    expect(item?.newCount).toBe(0);

    // Fewer results than the baseline is "nothing new", never negative.
    search.total = 1;
    [item] = (
      await listSavedSearchesForUser(userId, { withCounts: true })
    ).searches;
    expect(item?.newCount).toBe(0);
  });

  it("says the count is unknown rather than zero when search is unavailable", async () => {
    await saveSearchForUser(userId, "bakery", "all");
    search.state = "unavailable";
    const [item] = (
      await listSavedSearchesForUser(userId, { withCounts: true })
    ).searches;
    expect(item?.total).toBeNull();
    expect(item?.newCount).toBeNull();
  });

  it("ignores a partial answer rather than moving the baseline", async () => {
    await saveSearchForUser(userId, "bakery", "all");
    search.complete = false;
    search.total = 0;
    const [item] = (
      await listSavedSearchesForUser(userId, { withCounts: true })
    ).searches;
    expect(item?.total).toBeNull();
    search.complete = true;
    search.total = 4;
    const [again] = (
      await listSavedSearchesForUser(userId, { withCounts: true })
    ).searches;
    expect(again?.newCount).toBe(0);
  });

  it("sets the baseline when the results page is viewed", async () => {
    await saveSearchForUser(userId, "bakery", "all");
    await markSavedSearchSeen(userId, "Bakery", "all", 9);
    search.total = 9;
    const [item] = (
      await listSavedSearchesForUser(userId, { withCounts: true })
    ).searches;
    expect(item?.newCount).toBe(0);
  });

  it("keeps one resident's searches private from another", async () => {
    await saveSearchForUser(userId, "bakery", "all");
    const [mine] = (await listSavedSearchesForUser(userId)).searches;

    expect((await listSavedSearchesForUser(otherUserId)).searches).toEqual([]);
    expect(await removeSavedSearchForUser(otherUserId, mine!.id)).toBe(
      "not_found",
    );
    expect(await openSavedSearchForUser(otherUserId, mine!.id)).toEqual({
      state: "not_found",
    });
    expect((await listSavedSearchesForUser(userId)).searches).toHaveLength(1);

    expect(await removeSavedSearchForUser(userId, mine!.id)).toBe("removed");
    expect(await removeSavedSearchForUser(userId, mine!.id)).toBe("not_found");
    expect(await removeSavedSearchForUser(userId, "nope")).toBe("invalid");
  });

  it("removes a resident's searches when the account is deleted", async () => {
    await saveSearchForUser(userId, "bakery", "all");
    await getDatabase().delete(user).where(eq(user.id, userId));
    const rows = await getDatabase()
      .select()
      .from(savedSearch)
      .where(eq(savedSearch.userId, userId));
    expect(rows).toEqual([]);
  });

  it("keeps directory filters, counts them and reports businesses added since", async () => {
    directory.total = 6;
    expect(
      await saveSearchForUser(userId, "place=treorchy&verified=1", "directory"),
    ).toBe("saved");
    expect(
      await saveSearchForUser(
        userId,
        "verified=1&place=treorchy&sort=az",
        "directory",
      ),
    ).toBe("already_saved");
    expect(await saveSearchForUser(userId, "sort=az", "directory")).toBe(
      "invalid",
    );

    directory.total = 8;
    const listed = await listSavedSearchesForUser(userId, { withCounts: true });
    const saved = listed.searches[0]!;
    expect(saved).toMatchObject({
      type: "directory",
      href: "/businesses?place=treorchy&verified=1",
      total: 8,
      newCount: 2,
    });

    const opened = await openSavedSearchForUser(userId, saved.id);
    expect(opened).toEqual({
      state: "ready",
      href: "/businesses?place=treorchy&verified=1",
    });
    const after = await listSavedSearchesForUser(userId, { withCounts: true });
    expect(after.searches[0]!.newCount).toBe(0);
  });
});
