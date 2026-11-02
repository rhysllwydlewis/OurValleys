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

// Only the storage boundary is faked: validation and rows are the real code.
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
  archiveStoryForAdmin,
  createStoryForAdmin,
  deleteStoryForAdmin,
  getStoryForAdmin,
  publishStoryForAdmin,
  revertStoryToDraftForAdmin,
  scheduleStoryForAdmin,
  updateStoryForAdmin,
} from "@/modules/stories/admin";
import {
  removeStoryPicture,
  saveStoryPicture,
  updateStoryPictureAlt,
} from "@/modules/stories/picture";
import {
  getPublishedStoryBySlug,
  listPublishedStories,
} from "@/modules/stories/public";
import { publishDueStories } from "@/modules/stories/scheduling";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const prefix = "it-spic-";
const body =
  "The library reopens on Monday after a six month refit.\n\nA new reading room and a community café are included.";

function createPng(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(32);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

function futureLondonInput(minutesAhead: number): string {
  const when = new Date(Date.now() + minutesAhead * 60_000);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(when)
    .replace(" ", "T");
  return parts;
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
  stored.clear();
  deleted.length = 0;
}

describeDatabase("local story pictures and scheduling", () => {
  beforeEach(clean);
  afterEach(clean);
  afterAll(async () => {
    await closeDatabase();
  });

  async function create(slug: string, overrides = {}) {
    const result = await createStoryForAdmin(
      {
        title: `Story ${slug}`,
        slug: `${prefix}${slug}`,
        summary: "A short summary of the story.",
        body,
        authorName: "OurValleys team",
        ...overrides,
      },
      null,
    );
    if (result.status !== "created") throw new Error(result.status);
    return result.id;
  }

  async function forceDue(id: string) {
    await getDatabase()
      .update(localStory)
      .set({ scheduledFor: new Date(Date.now() - 60_000) })
      .where(eq(localStory.id, id));
  }

  describe("scheduling", () => {
    it("holds a ready draft privately until the worker publishes it", async () => {
      const id = await create("sched");
      expect(await scheduleStoryForAdmin(id, futureLondonInput(60))).toBe(
        "updated",
      );
      const scheduled = await getStoryForAdmin(id);
      expect(scheduled?.status).toBe("scheduled");
      expect(scheduled?.scheduledFor).toBeInstanceOf(Date);
      expect(await getPublishedStoryBySlug(`${prefix}sched`, "en")).toBeNull();
      expect(
        (await listPublishedStories("en", 100))?.some(
          (story) => story.slug === `${prefix}sched`,
        ),
      ).toBe(false);

      // Not yet due: the worker leaves it alone.
      expect((await publishDueStories()).published).toBe(0);
      expect((await getStoryForAdmin(id))?.status).toBe("scheduled");

      await forceDue(id);
      const run = await publishDueStories();
      expect(run.published).toBe(1);
      const live = await getStoryForAdmin(id);
      expect(live?.status).toBe("published");
      expect(live?.scheduledFor).toBeNull();
      expect(live?.publishedAt).toBeInstanceOf(Date);
      expect(
        await getPublishedStoryBySlug(`${prefix}sched`, "en"),
      ).not.toBeNull();
      // A second run publishes nothing twice.
      expect((await publishDueStories()).published).toBe(0);
    });

    it("refuses times that are too soon, too far, missing or invalid", async () => {
      const id = await create("bounds");
      expect(await scheduleStoryForAdmin(id, futureLondonInput(2))).toBe(
        "schedule_soon",
      );
      expect(
        await scheduleStoryForAdmin(id, futureLondonInput(60 * 24 * 120)),
      ).toBe("schedule_far");
      expect(await scheduleStoryForAdmin(id, "")).toBe("schedule_missing");
      expect(await scheduleStoryForAdmin(id, "tomorrow")).toBe(
        "schedule_invalid",
      );
      expect(await scheduleStoryForAdmin(id, 42)).toBe("schedule_invalid");
      expect((await getStoryForAdmin(id))?.status).toBe("draft");
    });

    it("refuses a story that is not ready, not found, or already live", async () => {
      const thin = await create("thin", { body: `${"x".repeat(90)}` });
      expect(await scheduleStoryForAdmin(thin, futureLondonInput(60))).toBe(
        "not_ready",
      );
      expect(
        await scheduleStoryForAdmin(
          "00000000-0000-4000-8000-0000000009ff",
          futureLondonInput(60),
        ),
      ).toBe("not_found");
      expect(await scheduleStoryForAdmin("nope", futureLondonInput(60))).toBe(
        "invalid",
      );
      const live = await create("live");
      await publishStoryForAdmin(live);
      expect(await scheduleStoryForAdmin(live, futureLondonInput(60))).toBe(
        "invalid",
      );
      const archived = await create("arch");
      await archiveStoryForAdmin(archived);
      expect(await scheduleStoryForAdmin(archived, futureLondonInput(60))).toBe(
        "invalid",
      );
    });

    it("lets an admin move the time, cancel, or publish now", async () => {
      const id = await create("flex");
      await scheduleStoryForAdmin(id, futureLondonInput(60));
      const first = (await getStoryForAdmin(id))?.scheduledFor;
      expect(await scheduleStoryForAdmin(id, futureLondonInput(180))).toBe(
        "updated",
      );
      expect(
        (await getStoryForAdmin(id))?.scheduledFor?.getTime(),
      ).toBeGreaterThan(first?.getTime() ?? 0);
      expect(await revertStoryToDraftForAdmin(id)).toBe("updated");
      const draft = await getStoryForAdmin(id);
      expect(draft?.status).toBe("draft");
      expect(draft?.scheduledFor).toBeNull();

      await scheduleStoryForAdmin(id, futureLondonInput(60));
      expect(await publishStoryForAdmin(id)).toBe("updated");
      const live = await getStoryForAdmin(id);
      expect(live?.status).toBe("published");
      expect(live?.scheduledFor).toBeNull();
    });

    it("never publishes a story an admin withdrew or archived before it was due", async () => {
      const withdrawn = await create("withdrawn");
      await scheduleStoryForAdmin(withdrawn, futureLondonInput(60));
      await forceDue(withdrawn);
      await revertStoryToDraftForAdmin(withdrawn);
      const archived = await create("archived");
      await scheduleStoryForAdmin(archived, futureLondonInput(60));
      await forceDue(archived);
      await archiveStoryForAdmin(archived);
      expect((await publishDueStories()).published).toBe(0);
      expect((await getStoryForAdmin(withdrawn))?.status).toBe("draft");
      expect((await getStoryForAdmin(archived))?.status).toBe("archived");
    });

    it("keeps a scheduled story above the publishing bar and cannot delete it", async () => {
      const id = await create("guard");
      await scheduleStoryForAdmin(id, futureLondonInput(60));
      const story = await getStoryForAdmin(id);
      const result = await updateStoryForAdmin({
        ...story,
        body: "Only one short paragraph that is long enough to pass the length check here.",
        placeId: null,
        sponsorshipDisclosure: null,
        expectedUpdatedAt: story?.updatedAt.toISOString(),
      });
      expect(result.status).toBe("invalid");
      expect(await deleteStoryForAdmin(id)).toBe("not_found");
    });

    it("sends a due story that no longer passes the bar back to draft", async () => {
      const id = await create("decayed");
      await scheduleStoryForAdmin(id, futureLondonInput(60));
      await getDatabase()
        .update(localStory)
        .set({
          body: "One paragraph only, deliberately too thin to publish as a story.",
          scheduledFor: new Date(Date.now() - 60_000),
        })
        .where(eq(localStory.id, id));
      const run = await publishDueStories();
      expect(run).toMatchObject({ published: 0, returnedToDraft: 1 });
      expect((await getStoryForAdmin(id))?.status).toBe("draft");
    });

    it("the database refuses a scheduled row with no time", async () => {
      const id = await create("check");
      await expect(
        getDatabase()
          .update(localStory)
          .set({ status: "scheduled", scheduledFor: null })
          .where(eq(localStory.id, id)),
      ).rejects.toThrow();
    });
  });

  describe("pictures", () => {
    it("stores a picture, shows it publicly with the right language of description", async () => {
      const id = await create("pic", {
        titleCy: "Stori Gymraeg newydd",
        summaryCy: "Crynodeb byr o'r stori Gymraeg.",
        bodyCy:
          "Mae'r llyfrgell yn ailagor ddydd Llun ar ôl gwaith adnewyddu chwe mis.\n\nMae ystafell ddarllen newydd a chaffi cymunedol hefyd.",
      });
      await publishStoryForAdmin(id);
      const result = await saveStoryPicture({
        storyId: id,
        contentType: "image/png",
        bytes: createPng(1200, 800),
        alt: "  The library front  ",
        altCy: "Blaen y llyfrgell",
      });
      expect(result).toEqual({ status: "saved" });
      const admin = await getStoryForAdmin(id);
      expect(admin?.image?.alt).toBe("The library front");
      expect(admin?.image?.url).toMatch(/^https:\/\/media\.test\/stories\//);
      // The storage key is never exposed on the admin projection.
      expect(JSON.stringify(admin)).not.toContain("imageStorageKey");

      const english = await getPublishedStoryBySlug(`${prefix}pic`, "en");
      expect(english?.image?.alt).toBe("The library front");
      const welsh = await getPublishedStoryBySlug(`${prefix}pic`, "cy");
      expect(welsh?.image?.alt).toBe("Blaen y llyfrgell");
    });

    it("replaces a picture and retires the old file", async () => {
      const id = await create("swap");
      await saveStoryPicture({
        storyId: id,
        contentType: "image/png",
        bytes: createPng(800, 600),
        alt: "First picture",
        altCy: "",
      });
      const [before] = await getDatabase()
        .select({ key: localStory.imageStorageKey })
        .from(localStory)
        .where(eq(localStory.id, id));
      await saveStoryPicture({
        storyId: id,
        contentType: "image/png",
        bytes: createPng(900, 600),
        alt: "Second picture",
        altCy: "",
      });
      expect(deleted).toEqual([before?.key]);
      expect(stored.size).toBe(1);
      expect((await getStoryForAdmin(id))?.image?.alt).toBe("Second picture");
    });

    it("refuses bad files and missing descriptions without keeping files", async () => {
      const id = await create("bad");
      expect(
        await saveStoryPicture({
          storyId: id,
          contentType: "image/png",
          bytes: createPng(800, 600),
          alt: "x",
          altCy: "",
        }),
      ).toMatchObject({ status: "invalid" });
      expect(
        await saveStoryPicture({
          storyId: id,
          contentType: "application/pdf",
          bytes: Buffer.from("%PDF-1.4"),
          alt: "A document",
          altCy: "",
        }),
      ).toMatchObject({ status: "invalid" });
      expect(
        await saveStoryPicture({
          storyId: id,
          contentType: "image/png",
          bytes: Buffer.alloc(0),
          alt: "Empty file",
          altCy: "",
        }),
      ).toMatchObject({ status: "invalid" });
      expect(
        await saveStoryPicture({
          storyId: "00000000-0000-4000-8000-0000000009ff",
          contentType: "image/png",
          bytes: createPng(800, 600),
          alt: "Nobody home",
          altCy: "",
        }),
      ).toEqual({ status: "not_found" });
      expect(
        await saveStoryPicture({
          storyId: "not-a-uuid",
          contentType: "image/png",
          bytes: createPng(800, 600),
          alt: "Nobody home",
          altCy: "",
        }),
      ).toEqual({ status: "not_found" });
      expect(stored.size).toBe(0);
      expect((await getStoryForAdmin(id))?.image).toBeNull();
    });

    it("edits descriptions only when a picture exists, and removes it cleanly", async () => {
      const id = await create("alt");
      expect(
        await updateStoryPictureAlt({ storyId: id, alt: "Nothing", altCy: "" }),
      ).toEqual({ status: "not_found" });
      expect(await removeStoryPicture(id)).toEqual({ status: "not_found" });
      await saveStoryPicture({
        storyId: id,
        contentType: "image/png",
        bytes: createPng(800, 600),
        alt: "Before",
        altCy: "",
      });
      expect(
        await updateStoryPictureAlt({
          storyId: id,
          alt: "After",
          altCy: "Wedyn",
        }),
      ).toEqual({ status: "saved" });
      expect(await getStoryForAdmin(id)).toMatchObject({
        image: { alt: "After", altCy: "Wedyn" },
      });
      expect(await removeStoryPicture(id)).toEqual({ status: "saved" });
      expect((await getStoryForAdmin(id))?.image).toBeNull();
      expect(stored.size).toBe(0);
    });

    it("deleting a draft deletes its picture file", async () => {
      const id = await create("gone");
      await saveStoryPicture({
        storyId: id,
        contentType: "image/png",
        bytes: createPng(800, 600),
        alt: "Doomed",
        altCy: "",
      });
      expect(stored.size).toBe(1);
      expect(await deleteStoryForAdmin(id)).toBe("deleted");
      expect(stored.size).toBe(0);
    });

    it("a story without a picture has none publicly", async () => {
      const id = await create("plain");
      await publishStoryForAdmin(id);
      expect(
        (await getPublishedStoryBySlug(`${prefix}plain`, "en"))?.image,
      ).toBeNull();
    });
  });
});
