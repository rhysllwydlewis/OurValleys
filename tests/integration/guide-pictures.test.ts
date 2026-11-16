import { eq, like } from "drizzle-orm";
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
const storage = vi.hoisted(() => ({ configured: true, failPut: false }));
vi.mock("@/lib/media-storage", () => ({
  isMediaStorageConfigured: () => storage.configured,
  publicMediaUrl: (key: string) => `https://media.test/${key}`,
  putMediaObject: async (key: string, bytes: Buffer) => {
    if (storage.failPut) throw new Error("storage down");
    stored.set(key, bytes.byteLength);
  },
  deleteMediaObject: async (key: string) => {
    stored.delete(key);
    deleted.push(key);
  },
}));

// The data cache needs the Next runtime; here the loader runs directly.
vi.mock("next/cache", () => ({ unstable_cache: (load: unknown) => load }));

import { closeDatabase, getDatabase } from "@/lib/database/client";
import { guide } from "@/lib/database/schema/guides";
import { storageCleanup } from "@/lib/database/schema/storage-cleanup";
import { updateGuideForAdmin } from "@/modules/guides/admin";
import {
  getGuidePictureForAdmin,
  removeGuidePicture,
  saveGuidePicture,
  updateGuidePictureText,
} from "@/modules/guides/guide-picture";
import {
  getPublicGuideBySlug,
  listPublicGuides,
  listRelatedGuideCards,
} from "@/modules/guides/public";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const slug = "it-guide-picture";
const draftSlug = "it-guide-picture-draft";
const missingGuide = "00000000-0000-4000-8000-00000000dead";

function createPng(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(32);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

const words = {
  alt: "Terraced houses in the rain",
  altCy: "Tai teras yn y glaw",
  credit: "A. Photographer",
};

const sections = [
  {
    id: "s1",
    kind: "text",
    heading: "Start here",
    body: "A section long enough to count as a real part of the guide.",
    href: "/businesses",
    linkLabel: "Search businesses",
  },
  {
    id: "s2",
    kind: "text",
    heading: "Then here",
    body: "Another section long enough to count as a real part of the guide.",
    href: "",
    linkLabel: "",
  },
  {
    id: "s3",
    kind: "text",
    heading: "And finally",
    body: "A third section, because a published guide needs at least three.",
    href: "",
    linkLabel: "",
  },
];

describeDatabase("guide pictures", () => {
  let guideId = "";
  let draftId = "";

  async function clean() {
    await getDatabase()
      .delete(guide)
      .where(like(guide.slug, `${slug}%`));
    await getDatabase()
      .delete(storageCleanup)
      .where(like(storageCleanup.storageKey, "guides/%"));
    stored.clear();
    deleted.length = 0;
    storage.configured = true;
    storage.failPut = false;
  }

  async function insertGuide(guideSlug: string, status: string) {
    const [row] = await getDatabase()
      .insert(guide)
      .values({
        slug: guideSlug,
        title: `Picture test guide (${status})`,
        summary: "A fictional guide used by an integration test of pictures.",
        areaLabel: "Test Valley",
        readingTime: "2 minute read",
        authorName: "Test editor",
        sections,
        status,
        publishedAt: status === "published" ? new Date() : null,
        reviewDueAt: new Date(Date.now() + 90 * 86_400_000),
      })
      .returning({ id: guide.id });
    return row!.id;
  }

  beforeEach(async () => {
    await clean();
    guideId = await insertGuide(slug, "published");
    draftId = await insertGuide(draftSlug, "draft");
  });
  afterEach(clean);
  afterAll(async () => {
    await closeDatabase();
  });

  const png = () => createPng(1600, 700);
  const upload = (overrides: Record<string, unknown> = {}) =>
    saveGuidePicture({
      guideId,
      contentType: "image/png",
      bytes: png(),
      ...words,
      ...overrides,
    });

  it("saves a picture and serves it on every public guide read", async () => {
    expect(await upload()).toEqual({ status: "saved" });
    expect(stored.size).toBe(1);

    const expected = {
      alt: words.alt,
      altCy: words.altCy,
      credit: words.credit,
    };
    const single = await getPublicGuideBySlug(slug);
    expect(single?.picture).toMatchObject(expected);
    expect(single?.picture?.url).toMatch(
      new RegExp(`^https://media.test/guides/${guideId}/.+\\.png$`),
    );

    const listed = await listPublicGuides();
    expect(
      listed.guides.find((item) => item.slug === slug)?.picture,
    ).toMatchObject(expected);

    for (const locale of ["en", "cy"] as const) {
      const related = await listRelatedGuideCards(
        { slug: "some-other-guide", area: "Test Valley", placeId: null },
        50,
        locale,
      );
      expect(related.find((card) => card.slug === slug)?.picture).toMatchObject(
        expected,
      );
    }
  });

  it("gives a guide without a picture a null picture, not a broken one", async () => {
    expect((await getPublicGuideBySlug(slug))?.picture).toBeNull();
    expect(await getGuidePictureForAdmin(guideId)).toEqual({
      picture: null,
      stored: false,
      storageReady: true,
    });
  });

  it("never shows the picture of an unpublished guide to the public", async () => {
    expect((await upload({ guideId: draftId })).status).toBe("saved");
    expect(await getPublicGuideBySlug(draftSlug)).toBeNull();
    expect(
      (await listPublicGuides()).guides.some((item) => item.slug === draftSlug),
    ).toBe(false);
    // The editor still sees it, to prepare the guide before publishing.
    expect((await getGuidePictureForAdmin(draftId)).picture?.alt).toBe(
      words.alt,
    );
  });

  it("replaces the picture and retires the previous file through the cleanup queue", async () => {
    await upload();
    const [first] = [...stored.keys()];
    expect((await upload({ alt: "Second picture" })).status).toBe("saved");
    expect(stored.size).toBe(1);
    expect(stored.has(first!)).toBe(false);
    expect(deleted).toContain(first);
    const admin = await getGuidePictureForAdmin(guideId);
    expect(admin.picture?.alt).toBe("Second picture");
    expect(admin.stored).toBe(true);
  });

  it("does not change the guide's text version, so an open editor can still save", async () => {
    const [before] = await getDatabase()
      .select({ updatedAt: guide.updatedAt })
      .from(guide)
      .where(eq(guide.id, guideId));
    await upload();
    await updateGuidePictureText({ guideId, ...words, alt: "Edited" });
    const [after] = await getDatabase()
      .select({ updatedAt: guide.updatedAt })
      .from(guide)
      .where(eq(guide.id, guideId));
    expect(after!.updatedAt.getTime()).toBe(before!.updatedAt.getTime());

    // The studio saves against the version it loaded before the upload.
    const saved = await updateGuideForAdmin({
      id: guideId,
      expectedUpdatedAt: before!.updatedAt.toISOString(),
      slug,
      title: "Picture test guide, edited",
      summary: "A fictional guide used by an integration test of pictures.",
      areaLabel: "Test Valley",
      readingTime: "2 minute read",
      authorName: "Test editor",
      placeId: null,
      sponsorshipDisclosure: "",
      reviewDueAt: new Date(Date.now() + 90 * 86_400_000).toISOString(),
      sections,
    });
    expect(saved.status).toBe("updated");
    // And saving the words keeps the picture.
    const guideAfter = await getPublicGuideBySlug(slug);
    expect(guideAfter?.title).toBe("Picture test guide, edited");
    expect(guideAfter?.picture?.alt).toBe("Edited");
  });

  it("rejects a missing description, a non-image, a mislabelled and an oversized file without storing anything", async () => {
    expect((await upload({ alt: " a " })).status).toBe("invalid");
    expect(
      (await upload({ bytes: Buffer.from("<script>alert(1)</script>") }))
        .status,
    ).toBe("invalid");
    expect((await upload({ contentType: "image/svg+xml" })).status).toBe(
      "invalid",
    );
    expect((await upload({ contentType: "image/jpeg" })).status).toBe(
      "invalid",
    );
    expect(
      (await upload({ bytes: Buffer.alloc(5 * 1024 * 1024 + 1) })).status,
    ).toBe("invalid");
    expect((await upload({ bytes: Buffer.alloc(0) })).status).toBe("invalid");
    expect(stored.size).toBe(0);
    expect((await getGuidePictureForAdmin(guideId)).stored).toBe(false);
  });

  it("never stores a file for an unknown or malformed guide", async () => {
    for (const bad of [missingGuide, "not-a-uuid", 7, null, undefined]) {
      expect((await upload({ guideId: bad })).status).toBe("not_found");
      expect(
        (await updateGuidePictureText({ guideId: bad, ...words })).status,
      ).toBe("not_found");
      expect((await removeGuidePicture(bad)).status).toBe("not_found");
      expect((await getGuidePictureForAdmin(bad)).stored).toBe(false);
    }
    expect(stored.size).toBe(0);
  });

  it("stays closed when storage is not configured, and keeps what is there", async () => {
    await upload();
    storage.configured = false;
    expect((await upload({ alt: "Another" })).status).toBe("disabled");
    expect(stored.size).toBe(1);
    const admin = await getGuidePictureForAdmin(guideId);
    expect(admin.storageReady).toBe(false);
    expect(admin.stored).toBe(true);
  });

  it("leaves the guide untouched when the upload itself fails", async () => {
    await upload();
    const [first] = [...stored.keys()];
    storage.failPut = true;
    expect((await upload({ alt: "Never saved" })).status).toBe("unavailable");
    expect((await getGuidePictureForAdmin(guideId)).picture?.alt).toBe(
      words.alt,
    );
    expect(stored.has(first!)).toBe(true);
  });

  it("edits the words only on a guide that has a picture", async () => {
    // Nothing to describe yet.
    expect((await updateGuidePictureText({ guideId, ...words })).status).toBe(
      "not_found",
    );
    await upload();
    expect(
      await updateGuidePictureText({
        guideId,
        alt: "  Edited   description ",
        altCy: "",
        credit: "  ",
      }),
    ).toEqual({ status: "saved" });
    expect((await getGuidePictureForAdmin(guideId)).picture).toMatchObject({
      alt: "Edited description",
      altCy: null,
      credit: null,
    });
    expect(
      (await updateGuidePictureText({ guideId, ...words, alt: "" })).status,
    ).toBe("invalid");
    // The file was not touched by a words-only edit.
    expect(stored.size).toBe(1);
    expect(deleted).toHaveLength(0);
  });

  it("removes the picture and its file, leaving the guide", async () => {
    await upload();
    const [key] = [...stored.keys()];
    expect(await removeGuidePicture(guideId)).toEqual({ status: "saved" });
    expect(deleted).toContain(key);
    expect((await getGuidePictureForAdmin(guideId)).stored).toBe(false);
    const after = await getPublicGuideBySlug(slug);
    expect(after?.picture).toBeNull();
    expect(after?.title).toContain("Picture test guide");
    const [row] = await getDatabase()
      .select()
      .from(guide)
      .where(eq(guide.id, guideId));
    expect(row).toMatchObject({
      imageStorageKey: null,
      imageAlt: null,
      imageAltCy: null,
      imageCredit: null,
      imageContentType: null,
      imageByteSize: null,
    });
    // Nothing left to remove.
    expect((await removeGuidePicture(guideId)).status).toBe("not_found");
  });

  it("keeps one guide's picture apart from another's", async () => {
    await upload();
    await upload({ guideId: draftId, alt: "The draft's picture" });
    expect(await removeGuidePicture(draftId)).toEqual({ status: "saved" });
    expect((await getGuidePictureForAdmin(guideId)).picture?.alt).toBe(
      words.alt,
    );
    expect(stored.size).toBe(1);
    expect([...stored.keys()][0]).toContain(`guides/${guideId}/`);
  });
});
