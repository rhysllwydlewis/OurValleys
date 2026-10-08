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

// Only the storage boundary is faked: the validation, the per-business limit
// and the database rows are the real code under test.
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
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMedia,
  category,
} from "@/lib/database/schema/business";
import {
  contentImageLimits,
  releaseContentImageIfUnused,
  saveContentImage,
} from "@/modules/businesses/content-images";
import { saveBusinessOffer } from "@/modules/businesses/content-features";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  userId: "00000000-0000-4000-8000-000000000d01",
  categoryId: "00000000-0000-4000-8000-000000000d02",
  businessId: "00000000-0000-4000-8000-000000000d03",
} as const;

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

describeDatabase("uploading offer and event pictures", () => {
  beforeEach(async () => {
    stored.clear();
    deleted.length = 0;
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.userId,
      name: "Upload Fixture",
      email: "content.upload.fixture@example.test",
      emailVerified: true,
    });
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture upload category",
      slug: "fixture-upload-category",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.businessId,
      tradingName: "Fixture upload business",
      slug: "fixture-upload-business",
      summary: "A fictional business used only by automated tests.",
      description: "This business exists only during automated tests.",
      primaryCategoryId: fixture.categoryId,
      businessType: "service_area",
      createdByUserId: fixture.userId,
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.userId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  const upload = (
    overrides: Partial<Parameters<typeof saveContentImage>[0]> = {},
  ) =>
    saveContentImage({
      businessId: fixture.businessId,
      kind: "offer",
      contentType: "image/png",
      bytes: createPng(800, 600),
      altText: "A tray of fresh bread",
      ...overrides,
    });

  it("stores a valid picture and creates an active media row under the business", async () => {
    const result = await upload();
    expect(result.status).toBe("saved");
    if (result.status !== "saved") return;

    const [row] = await getDatabase()
      .select()
      .from(businessMedia)
      .where(eq(businessMedia.id, result.mediaId));
    expect(row).toMatchObject({
      businessId: fixture.businessId,
      role: "offer",
      status: "active",
      altText: "A tray of fresh bread",
      contentType: "image/png",
    });
    expect(row?.storageKey).toMatch(
      new RegExp(`^business/${fixture.businessId}/offer/[0-9a-f-]+\\.png$`),
    );
    expect(stored.has(row!.storageKey)).toBe(true);
  });

  it("rejects bad files and missing descriptions before anything is stored", async () => {
    expect((await upload({ altText: "  " })).status).toBe("invalid");
    expect((await upload({ altText: "ab" })).status).toBe("invalid");
    expect((await upload({ contentType: "text/plain" })).status).toBe(
      "invalid",
    );
    expect(
      (await upload({ bytes: createPng(800, 600), contentType: "image/jpeg" }))
        .status,
    ).toBe("invalid");
    expect((await upload({ bytes: createPng(8, 8) })).status).toBe("invalid");
    expect(stored.size).toBe(0);
    const rows = await getDatabase()
      .select({ id: businessMedia.id })
      .from(businessMedia)
      .where(eq(businessMedia.businessId, fixture.businessId));
    expect(rows).toHaveLength(0);
  });

  it("stops at the per-business limit and does not leave the file behind", async () => {
    const database = getDatabase();
    await database.insert(businessMedia).values(
      Array.from({ length: contentImageLimits.offer }, (_, index) => ({
        businessId: fixture.businessId,
        role: "offer",
        storageKey: `fixture/limit-${index}.webp`,
        altText: "Fixture picture",
        contentType: "image/webp",
        byteSize: 10,
      })),
    );
    const before = stored.size;
    expect((await upload()).status).toBe("limit");
    expect(stored.size).toBe(before);
    expect(deleted).toHaveLength(1); // the file uploaded before the limit check
    // The limit is per kind: an event picture is still allowed.
    expect((await upload({ kind: "event" })).status).toBe("saved");
  });

  it("deletes the stored file when its picture is retired", async () => {
    const result = await upload();
    if (result.status !== "saved") throw new Error("upload failed");
    const [row] = await getDatabase()
      .select({ storageKey: businessMedia.storageKey })
      .from(businessMedia)
      .where(eq(businessMedia.id, result.mediaId));

    // Attached: a release is a no-op.
    await saveBusinessOffer({
      businessId: fixture.businessId,
      offer: {
        title: "Fictional bread offer",
        description: "A fictional offer used only by automated tests.",
        status: "active",
        sortOrder: 0,
      },
      imageMediaId: result.mediaId,
    });
    await releaseContentImageIfUnused({
      businessId: fixture.businessId,
      mediaId: result.mediaId,
    });
    expect(stored.has(row!.storageKey)).toBe(true);

    // An upload whose save failed is unreferenced: releasing retires it and
    // deletes the file.
    const orphan = await upload();
    if (orphan.status !== "saved") throw new Error("upload failed");
    await releaseContentImageIfUnused({
      businessId: fixture.businessId,
      mediaId: orphan.mediaId,
    });
    const [orphanRow] = await getDatabase()
      .select({ status: businessMedia.status, key: businessMedia.storageKey })
      .from(businessMedia)
      .where(eq(businessMedia.id, orphan.mediaId));
    expect(orphanRow?.status).toBe("removed");
    expect(stored.has(orphanRow!.key)).toBe(false);
  });

  it("will not retire another business's picture, whatever id it is given", async () => {
    const result = await upload();
    if (result.status !== "saved") throw new Error("upload failed");
    await releaseContentImageIfUnused({
      businessId: "00000000-0000-4000-8000-000000000dff",
      mediaId: result.mediaId,
    });
    const [row] = await getDatabase()
      .select({ status: businessMedia.status })
      .from(businessMedia)
      .where(eq(businessMedia.id, result.mediaId));
    expect(row?.status).toBe("active");
  });
});
