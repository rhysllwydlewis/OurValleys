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
} from "@/modules/stories/public";

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
});
