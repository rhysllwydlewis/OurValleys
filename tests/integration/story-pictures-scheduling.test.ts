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

// Only the storage boundary is faked; validation, locking and rows are real.
const stored = new Map<string, number>();
const deleted: string[] = [];
vi.mock("@/lib/media-storage", () => ({
  isMediaStorageConfigured: () => true,
  publicMediaUrl: (key: string) => `https://media.test/${key}`,
  putMediaObject: async (key: string, bytes: Buffer) => {
    stored.set(key, bytes.byteLength);
  },
  deleteMediaObject: async (key: string) => {
    stored.delete(key);
    deleted.push(key);
  },
}));

import { closeDatabase, getDatabase } from "@/lib/database/client";
import { localStory } from "@/lib/database/schema/local-stories";
import {
  createStoryForAdmin,
  deleteStoryForAdmin,
  getStoryForAdmin,
  publishStoryForAdmin,
  scheduleStoryForAdmin,
  updateStoryForAdmin,
} from "@/modules/stories/admin";
import {
  removeStoryPicture,
  setStoryPicture,
  setStoryPictureAlt,
} from "@/modules/stories/pictures";
import {
  getPublishedStoryBySlug,
  listPublishedStories,
} from "@/modules/stories/public";
import { publishDueStories } from "@/modules/stories/scheduling";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const prefix = "it-sched-";
const body =
  "The library reopens on Monday after a six month refit.\n\nA new reading room and a community café are included.";

function createPng(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(32);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes[24] = 8;
  bytes[25] = 6;
  return bytes;
}

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

const hour = 3_600_000;

describeDatabase("local story scheduling and pictures", () => {
  beforeEach(async () => {
    stored.clear();
    deleted.length = 0;
    await clean();
  });
  afterEach(clean);
  afterAll(async () => {
    await closeDatabase();
  });

  async function create(slug: string, overrides = {}) {
    const result = await createStoryForAdmin(input(slug, overrides), null);
    if (result.status !== "created") throw new Error(result.status);
    return result;
  }

  function scheduleInput(created: { id: string; updatedAt: string }, at: Date) {
    return {
      id: created.id,
      scheduledFor: at.toISOString(),
      expectedUpdatedAt: created.updatedAt,
    };
  }

  it("schedules a draft, hides it from readers, then publishes it when due", async () => {
    const created = await create("due");
    const at = new Date(Date.now() + 2 * hour);
    expect(
      await scheduleStoryForAdmin(scheduleInput(created, at)),
    ).toMatchObject({ status: "scheduled" });

    const scheduled = await getStoryForAdmin(created.id);
    expect(scheduled?.status).toBe("scheduled");
    expect(scheduled?.scheduledFor?.toISOString()).toBe(at.toISOString());
    expect(await getPublishedStoryBySlug(`${prefix}due`, "en")).toBeNull();
    const listed = await listPublishedStories("en", 100);
    expect(listed?.some((story) => story.slug === `${prefix}due`)).toBe(false);

    // Before its time nothing happens; after it, it goes live once.
    expect(
      await publishDueStories(new Date(at.getTime() - 1000)),
    ).toMatchObject({ published: 0 });
    const later = new Date(at.getTime() + 60_000);
    expect((await publishDueStories(later)).published).toBe(1);
    expect((await publishDueStories(later)).published).toBe(0);

    const live = await getStoryForAdmin(created.id);
    expect(live?.status).toBe("published");
    expect(live?.scheduledFor).toBeNull();
    expect(live?.publishedAt?.toISOString()).toBe(later.toISOString());
    // The words did not change, so the stale-save token is untouched.
    expect(live?.updatedAt.toISOString()).toBe(created.updatedAt);
    expect(await getPublishedStoryBySlug(`${prefix}due`, "en")).not.toBeNull();
  });

  it("refuses times that are too soon, too far, or not a time", async () => {
    const created = await create("times");
    const soon = await scheduleStoryForAdmin(
      scheduleInput(created, new Date(Date.now() + 60_000)),
    );
    const far = await scheduleStoryForAdmin(
      scheduleInput(created, new Date(Date.now() + 400 * 24 * hour)),
    );
    const junk = await scheduleStoryForAdmin({
      ...scheduleInput(created, new Date()),
      scheduledFor: "tomorrow",
    });
    expect(soon.status).toBe("invalid");
    expect(far.status).toBe("invalid");
    expect(junk.status).toBe("invalid");
    expect((await getStoryForAdmin(created.id))?.status).toBe("draft");
  });

  it("will not schedule a story that is not ready, a stale version, or an unknown story", async () => {
    const thin = await create("thin", {
      body: "One single paragraph that is long enough to be accepted by the form check, with extra words added.",
    });
    const at = new Date(Date.now() + 2 * hour);
    expect((await scheduleStoryForAdmin(scheduleInput(thin, at))).status).toBe(
      "not_ready",
    );

    const created = await create("stale");
    const edited = await updateStoryForAdmin({
      ...input("stale", { title: "Story changed" }),
      id: created.id,
      expectedUpdatedAt: created.updatedAt,
    });
    expect(edited.status).toBe("updated");
    expect(
      (await scheduleStoryForAdmin(scheduleInput(created, at))).status,
    ).toBe("conflict");

    expect(
      (
        await scheduleStoryForAdmin({
          id: "00000000-0000-4000-8000-00000000dead",
          scheduledFor: at.toISOString(),
          expectedUpdatedAt: created.updatedAt,
        })
      ).status,
    ).toBe("not_found");
  });

  it("does not schedule a published story, and publishing now cancels a schedule", async () => {
    const created = await create("now");
    const at = new Date(Date.now() + 2 * hour);
    await scheduleStoryForAdmin(scheduleInput(created, at));
    expect(await publishStoryForAdmin(created.id)).toBe("updated");
    const live = await getStoryForAdmin(created.id);
    expect(live?.status).toBe("published");
    expect(live?.scheduledFor).toBeNull();
    expect(
      (await scheduleStoryForAdmin(scheduleInput(created, at))).status,
    ).toBe("not_ready");
    // The worker finds nothing left to publish.
    expect(
      (await publishDueStories(new Date(at.getTime() + hour))).published,
    ).toBe(0);
  });

  it("keeps a scheduled story above the publishing bar", async () => {
    const created = await create("bar");
    await scheduleStoryForAdmin(
      scheduleInput(created, new Date(Date.now() + 2 * hour)),
    );
    const edited = await updateStoryForAdmin({
      ...input("bar", { summary: "Story bar" }),
      id: created.id,
      expectedUpdatedAt: created.updatedAt,
    });
    expect(edited.status).toBe("invalid");
  });

  it("returns a due story that fell below the bar to draft instead of publishing it", async () => {
    const created = await create("fell");
    const at = new Date(Date.now() + 2 * hour);
    await scheduleStoryForAdmin(scheduleInput(created, at));
    // Simulate a bad row written outside the guarded editor.
    await getDatabase()
      .update(localStory)
      .set({ body: "Just one short paragraph." })
      .where(eq(localStory.id, created.id));
    const result = await publishDueStories(new Date(at.getTime() + hour));
    expect(result).toMatchObject({ published: 0, returnedToDraft: 1 });
    expect((await getStoryForAdmin(created.id))?.status).toBe("draft");
  });

  it("only deletes drafts, so a scheduled story cannot be dropped by accident", async () => {
    const created = await create("keep");
    await scheduleStoryForAdmin(
      scheduleInput(created, new Date(Date.now() + 2 * hour)),
    );
    expect(await deleteStoryForAdmin(created.id)).toBe("not_found");
  });

  it("stores a picture under a story-owned key and shows it only when published", async () => {
    const created = await create("pic");
    const saved = await setStoryPicture({
      storyId: created.id,
      contentType: "image/png",
      bytes: createPng(1200, 675),
      altText: "The refitted reading room",
    });
    expect(saved.status).toBe("saved");
    const admin = await getStoryForAdmin(created.id);
    expect(admin?.imageUrl).toMatch(
      new RegExp(`^https://media\\.test/stories/${created.id}/.+\\.png$`),
    );
    expect(admin?.imageAlt).toBe("The refitted reading room");
    expect(stored.size).toBe(1);

    await publishStoryForAdmin(created.id);
    const live = await getPublishedStoryBySlug(`${prefix}pic`, "en");
    expect(live?.image).toEqual({
      url: admin!.imageUrl,
      alt: "The refitted reading room",
    });
  });

  it("replaces and removes a picture without leaving files behind", async () => {
    const created = await create("swap");
    await setStoryPicture({
      storyId: created.id,
      contentType: "image/png",
      bytes: createPng(1200, 675),
      altText: "First picture",
    });
    const first = [...stored.keys()][0]!;
    await setStoryPicture({
      storyId: created.id,
      contentType: "image/png",
      bytes: createPng(800, 600),
      altText: "Second picture",
    });
    expect(stored.has(first)).toBe(false);
    expect(deleted).toContain(first);
    expect(stored.size).toBe(1);

    expect(
      await setStoryPictureAlt(created.id, "A clearer description"),
    ).toEqual({ status: "saved" });
    expect((await getStoryForAdmin(created.id))?.imageAlt).toBe(
      "A clearer description",
    );

    expect(await removeStoryPicture(created.id)).toEqual({ status: "removed" });
    expect(stored.size).toBe(0);
    const after = await getStoryForAdmin(created.id);
    expect(after?.imageUrl).toBeNull();
    expect(after?.imageAlt).toBe("");
    expect(await removeStoryPicture(created.id)).toEqual({
      status: "not_found",
    });
  });

  it("rejects bad pictures, missing descriptions and unknown stories without storing anything", async () => {
    const created = await create("bad");
    expect(
      (
        await setStoryPicture({
          storyId: created.id,
          contentType: "image/png",
          bytes: createPng(1200, 675),
          altText: "  ",
        })
      ).status,
    ).toBe("invalid");
    expect(
      (
        await setStoryPicture({
          storyId: created.id,
          contentType: "image/png",
          bytes: Buffer.from("not an image at all"),
          altText: "Looks fine",
        })
      ).status,
    ).toBe("invalid");
    expect(
      await setStoryPicture({
        storyId: "00000000-0000-4000-8000-00000000dead",
        contentType: "image/png",
        bytes: createPng(1200, 675),
        altText: "Looks fine",
      }),
    ).toEqual({ status: "not_found" });
    expect(
      await setStoryPicture({
        storyId: "not-a-uuid",
        contentType: "image/png",
        bytes: createPng(1200, 675),
        altText: "Looks fine",
      }),
    ).toEqual({ status: "not_found" });
    // The orphan from the unknown-story upload was cleaned up.
    expect(stored.size).toBe(0);
    expect(await setStoryPictureAlt(created.id, "No picture yet")).toEqual({
      status: "not_found",
    });
  });

  it("deleting a draft removes its picture file", async () => {
    const created = await create("gone");
    await setStoryPicture({
      storyId: created.id,
      contentType: "image/png",
      bytes: createPng(1200, 675),
      altText: "To be removed",
    });
    expect(stored.size).toBe(1);
    expect(await deleteStoryForAdmin(created.id)).toBe("deleted");
    expect(stored.size).toBe(0);
  });

  it("the database refuses a picture without a description", async () => {
    const created = await create("check");
    await expect(
      getDatabase()
        .update(localStory)
        .set({ imageKey: "stories/x/y.png", imageContentType: "image/png" })
        .where(eq(localStory.id, created.id)),
    ).rejects.toThrow();
  });
});
