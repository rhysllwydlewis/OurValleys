import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { localStory } from "@/lib/database/schema/local-stories";
import {
  archiveStoryForAdmin,
  createStoryForAdmin,
  deleteStoryForAdmin,
  getStoryForAdmin,
  publishStoryForAdmin,
  revertStoryToDraftForAdmin,
  updateStoryForAdmin,
} from "@/modules/stories/admin";
import {
  getPublishedStoryBySlug,
  listPublishedStories,
  listPublishedStoriesForPlace,
  listRelatedStories,
  listStoryArchivePage,
  listStoryPlaceOptions,
} from "@/modules/stories/public";
import { place } from "@/lib/database/schema/business";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const prefix = "it-story-";
const body =
  "The library reopens on Monday after a six month refit.\n\nA new reading room and a community café are included.";

function input(slug: string, overrides: Record<string, unknown> = {}) {
  return {
    title: `Story ${slug}`,
    slug: `${prefix}${slug}`,
    summary: "A short summary of the story.",
    body,
    authorName: "OurValleys team",
    ...overrides,
  };
}

async function clean() {
  const database = getDatabase();
  const rows = await database
    .select({ slug: localStory.slug })
    .from(localStory);
  for (const row of rows) {
    if (row.slug.startsWith(prefix)) {
      await database.delete(localStory).where(eq(localStory.slug, row.slug));
    }
  }
}

describeDatabase("local stories", () => {
  beforeEach(clean);
  afterEach(clean);
  afterAll(async () => {
    await closeDatabase();
  });

  async function create(slug: string, overrides = {}) {
    const result = await createStoryForAdmin(input(slug, overrides), null);
    if (result.status !== "created") throw new Error(result.status);
    return result;
  }

  it("creates a draft that readers cannot see", async () => {
    const { id } = await create("draft");
    expect((await getStoryForAdmin(id))?.status).toBe("draft");
    expect(await getPublishedStoryBySlug(`${prefix}draft`, "en")).toBeNull();
  });

  it("refuses a duplicate web address and invalid input", async () => {
    await create("dup");
    expect((await createStoryForAdmin(input("dup"), null)).status).toBe(
      "duplicate_slug",
    );
    const invalid = await createStoryForAdmin(
      input("bad", { body: "short" }),
      null,
    );
    expect(invalid.status).toBe("invalid");
  });

  it("refuses an unknown place with a clear message", async () => {
    const result = await createStoryForAdmin(
      input("place", { placeId: "00000000-0000-4000-8000-00000000dead" }),
      null,
    );
    expect(result).toMatchObject({ status: "invalid" });
  });

  it("publishes only a ready story and unpublishes it again", async () => {
    const weak = await create("weak", { body: `${"x".repeat(100)}` });
    expect(await publishStoryForAdmin(weak.id)).toBe("not_ready");

    const { id } = await create("live");
    expect(await publishStoryForAdmin(id)).toBe("updated");
    const live = await getPublishedStoryBySlug(`${prefix}live`, "en");
    expect(live?.title).toBe("Story live");
    expect(live).not.toHaveProperty("titleCy");
    expect(live).not.toHaveProperty("authorUserId");

    expect(await revertStoryToDraftForAdmin(id)).toBe("updated");
    expect(await getPublishedStoryBySlug(`${prefix}live`, "en")).toBeNull();
    expect(await archiveStoryForAdmin(id)).toBe("updated");
    expect(await getPublishedStoryBySlug(`${prefix}live`, "en")).toBeNull();
  });

  it("answers invalid and not_found for bad ids", async () => {
    expect(await publishStoryForAdmin("nope")).toBe("invalid");
    expect(
      await publishStoryForAdmin("00000000-0000-4000-8000-00000000dead"),
    ).toBe("not_found");
    expect(await getStoryForAdmin("nope")).toBeNull();
    expect(await getPublishedStoryBySlug("Bad Slug!", "en")).toBeNull();
  });

  it("refuses a stale save and keeps a live story above the publishing bar", async () => {
    const { id, updatedAt } = await create("stale");
    const first = await updateStoryForAdmin({
      ...input("stale", { title: "Changed headline" }),
      id,
      expectedUpdatedAt: updatedAt,
    });
    expect(first.status).toBe("updated");
    const stale = await updateStoryForAdmin({
      ...input("stale", { title: "Another change" }),
      id,
      expectedUpdatedAt: updatedAt,
    });
    expect(stale.status).toBe("conflict");

    await publishStoryForAdmin(id);
    const current = (await getStoryForAdmin(id))!;
    const renamed = await updateStoryForAdmin({
      ...input("stale", { slug: `${prefix}moved` }),
      id,
      expectedUpdatedAt: current.updatedAt.toISOString(),
    });
    expect(renamed.status).toBe("invalid");
    const weakened = await updateStoryForAdmin({
      ...input("stale", { body: "x".repeat(100) }),
      id,
      expectedUpdatedAt: current.updatedAt.toISOString(),
    });
    expect(weakened.status).toBe("invalid");
  });

  it("shows Welsh only when complete and falls back to English", async () => {
    const { id } = await create("welsh", { titleCy: "Teitl yn unig" });
    await publishStoryForAdmin(id);
    const partial = await getPublishedStoryBySlug(`${prefix}welsh`, "cy");
    expect(partial?.contentLocale).toBe("en");
    expect(partial?.title).toBe("Story welsh");

    const current = (await getStoryForAdmin(id))!;
    await updateStoryForAdmin({
      ...input("welsh", {
        titleCy: "Llyfrgell yn ailagor",
        summaryCy: "Mae'r gwaith wedi'i orffen a'r drysau'n agor.",
        bodyCy:
          "Mae'r llyfrgell yn ailagor ddydd Llun ar ôl chwe mis o waith adnewyddu.\n\nMae ystafell ddarllen newydd a chaffi cymunedol hefyd.",
      }),
      id,
      expectedUpdatedAt: current.updatedAt.toISOString(),
    });
    const complete = await getPublishedStoryBySlug(`${prefix}welsh`, "cy");
    expect(complete?.contentLocale).toBe("cy");
    expect(complete?.title).toBe("Llyfrgell yn ailagor");
    expect((await getPublishedStoryBySlug(`${prefix}welsh`, "en"))?.title).toBe(
      "Story welsh",
    );
  });

  it("lists newest published first and only deletes drafts", async () => {
    const a = await create("a");
    const b = await create("b");
    await publishStoryForAdmin(a.id);
    await new Promise((resolve) => setTimeout(resolve, 15));
    await publishStoryForAdmin(b.id);
    const list = (await listPublishedStories("en", 50)) ?? [];
    const mine = list.filter((story) => story.slug.startsWith(prefix));
    expect(mine.map((story) => story.slug)).toEqual([
      `${prefix}b`,
      `${prefix}a`,
    ]);

    expect(await deleteStoryForAdmin(a.id)).toBe("not_found");
    const c = await create("c");
    expect(await deleteStoryForAdmin(c.id)).toBe("deleted");
  });

  it("pages the archive newest first, filters by place and clamps the page", async () => {
    const [somePlace] = await getDatabase()
      .select({ id: place.id, slug: place.slug })
      .from(place)
      .limit(1);
    if (!somePlace) throw new Error("reference places missing");
    for (const slug of ["p1", "p2", "p3"]) {
      const created = await create(slug, {
        placeId: slug === "p3" ? null : somePlace.id,
      });
      await publishStoryForAdmin(created.id);
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
    const draft = await create("p-draft", { placeId: somePlace.id });
    expect(draft.id).toBeTruthy();

    const first = await listStoryArchivePage(
      "en",
      { page: 1, placeSlug: null },
      2,
    );
    expect(first?.pageSize).toBe(2);
    expect(first?.stories).toHaveLength(2);
    expect(first?.stories[0]?.slug).toBe(`${prefix}p3`);
    // Drafts never count.
    expect((first?.total ?? 0) >= 3).toBe(true);

    const clamped = await listStoryArchivePage(
      "en",
      { page: 9999, placeSlug: null },
      2,
    );
    expect(clamped?.page).toBe(Math.ceil((clamped?.total ?? 0) / 2));
    expect(clamped?.stories.length).toBeGreaterThan(0);

    const filtered = await listStoryArchivePage("en", {
      page: 1,
      placeSlug: somePlace.slug,
    });
    const mine = (filtered?.stories ?? []).filter((story) =>
      story.slug.startsWith(prefix),
    );
    expect(mine.map((story) => story.slug)).toEqual([
      `${prefix}p2`,
      `${prefix}p1`,
    ]);

    const unknown = await listStoryArchivePage("en", {
      page: 1,
      placeSlug: "no-such-place-here",
    });
    expect(unknown).toMatchObject({ total: 0, stories: [] });

    const options = await listStoryPlaceOptions();
    expect(
      options.find((option) => option.slug === somePlace.slug),
    ).toBeTruthy();
    const forPlace = await listPublishedStoriesForPlace(somePlace.id, "en", 12);
    expect(
      forPlace
        ?.filter((story) => story.slug.startsWith(prefix))
        .map((s) => s.slug),
    ).toEqual([`${prefix}p2`, `${prefix}p1`]);
  });

  it("offers related stories from the same place first and never the story itself", async () => {
    const [somePlace] = await getDatabase()
      .select({ id: place.id })
      .from(place)
      .limit(1);
    if (!somePlace) throw new Error("reference places missing");
    const a = await create("r-a", { placeId: somePlace.id });
    const b = await create("r-b", { placeId: null });
    const c = await create("r-c", { placeId: somePlace.id });
    for (const story of [a, b, c]) {
      await publishStoryForAdmin(story.id);
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
    const current = await getPublishedStoryBySlug(`${prefix}r-a`, "en");
    if (!current) throw new Error("story missing");
    const related = await listRelatedStories(current, "en", 50);
    const slugs = related.map((story) => story.slug);
    expect(slugs).not.toContain(`${prefix}r-a`);
    expect(slugs.indexOf(`${prefix}r-c`)).toBeLessThan(
      slugs.indexOf(`${prefix}r-b`),
    );
  });

  it("keeps same-place stories even when many newer ones are elsewhere", async () => {
    const [somePlace] = await getDatabase()
      .select({ id: place.id })
      .from(place)
      .limit(1);
    if (!somePlace) throw new Error("reference places missing");
    const old = await create("rp-old", { placeId: somePlace.id });
    await publishStoryForAdmin(old.id);
    const current = await create("rp-now", { placeId: somePlace.id });
    await publishStoryForAdmin(current.id);
    for (let index = 0; index < 14; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      const other = await create(`rp-other-${index}`, { placeId: null });
      await publishStoryForAdmin(other.id);
    }
    const story = await getPublishedStoryBySlug(`${prefix}rp-now`, "en");
    if (!story) throw new Error("story missing");
    const related = await listRelatedStories(story, "en", 3);
    expect(related).toHaveLength(3);
    expect(related[0]?.slug).toBe(`${prefix}rp-old`);
    expect(related.map((item) => item.slug)).not.toContain(`${prefix}rp-now`);
  });

  it("refuses to create a story at a reserved address", async () => {
    const result = await createStoryForAdmin(
      { ...input("x"), slug: "archive" },
      null,
    );
    expect(result.status).toBe("invalid");
  });
});
