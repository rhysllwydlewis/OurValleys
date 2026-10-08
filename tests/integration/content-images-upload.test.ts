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
import { businessOffer } from "@/lib/database/schema/business-operations";
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
import {
  listBusinessOffers,
  saveBusinessEvent,
  saveBusinessOffer,
} from "@/modules/businesses/content-features";

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

  async function fillToLimit(kind: "offer" | "event") {
    await getDatabase()
      .insert(businessMedia)
      .values(
        Array.from({ length: contentImageLimits[kind] }, (_, index) => ({
          id: `00000000-0000-4000-8000-${kind === "offer" ? "0d1" : "0d2"}${String(index).padStart(9, "0")}`,
          businessId: fixture.businessId,
          role: kind,
          storageKey: `fixture/full-${kind}-${index}.webp`,
          altText: "Fixture picture",
          contentType: "image/webp",
          byteSize: 10,
        })),
      );
  }

  it("lets an owner at the limit replace a picture that the replacement will retire", async () => {
    await fillToLimit("offer");
    const firstId = "00000000-0000-4000-8000-0d1000000000";
    await saveBusinessOffer({
      businessId: fixture.businessId,
      offer: {
        title: "Fictional full-allowance offer",
        description: "A fictional offer used only by automated tests.",
        status: "active",
        sortOrder: 0,
      },
      imageMediaId: firstId,
    });

    // At the limit, a new picture is refused...
    expect((await upload()).status).toBe("limit");
    // ...but replacing the one this offer uses is allowed, because it nets out.
    const replaced = await upload({ replacingMediaId: firstId });
    expect(replaced.status).toBe("saved");
  });

  it("does not let a shared picture be used to exceed the limit", async () => {
    await fillToLimit("event");
    const sharedId = "00000000-0000-4000-8000-0d2000000000";
    // One picture shared by the two dates of a repeating event.
    await saveBusinessEvent({
      businessId: fixture.businessId,
      event: {
        title: "Fictional shared-picture event",
        description: "A fictional event used only by automated tests.",
        startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        status: "active",
        repeat: { frequency: "weekly", occurrences: 2 },
      },
      imageMediaId: sharedId,
    });
    // Replacing it for one date would not retire it (the other date keeps it),
    // so it must still count and the upload is refused.
    expect(
      (await upload({ kind: "event", replacingMediaId: sharedId })).status,
    ).toBe("limit");
  });

  it("ignores a replacingMediaId that is not this business's active picture", async () => {
    await fillToLimit("offer");
    expect(
      (
        await upload({
          replacingMediaId: "00000000-0000-4000-8000-000000000dfe",
        })
      ).status,
    ).toBe("limit");
  });

  it("retires the picture that is really being replaced when another save is in flight", async () => {
    const original = await upload();
    const concurrent = await upload();
    const replacement = await upload();
    if (
      original.status !== "saved" ||
      concurrent.status !== "saved" ||
      replacement.status !== "saved"
    ) {
      throw new Error("upload failed");
    }
    const offerInput = {
      title: "Fictional racing offer",
      description: "A fictional offer used only by automated tests.",
      status: "active" as const,
      sortOrder: 0,
    };
    await saveBusinessOffer({
      businessId: fixture.businessId,
      offer: offerInput,
      imageMediaId: original.mediaId,
    });
    const [created] = await listBusinessOffers(fixture.businessId);
    const database = getDatabase();

    // A concurrent save has locked the offer and switched it to `concurrent`,
    // but has not committed yet.
    let release!: () => void;
    const hold = new Promise<void>((resolve) => (release = resolve));
    let locked!: () => void;
    const gotLock = new Promise<void>((resolve) => (locked = resolve));
    const concurrentSave = database.transaction(async (transaction) => {
      await transaction
        .select({ id: businessOffer.id })
        .from(businessOffer)
        .where(eq(businessOffer.id, created!.id))
        .for("update");
      await transaction
        .update(businessOffer)
        .set({ imageMediaId: concurrent.mediaId })
        .where(eq(businessOffer.id, created!.id));
      locked();
      await hold;
    });
    await gotLock;

    const ourSave = saveBusinessOffer({
      businessId: fixture.businessId,
      offer: { ...offerInput, id: created!.id },
      imageMediaId: replacement.mediaId,
    });
    // Our save must wait for the lock, not read the stale previous picture.
    await new Promise((resolve) => setTimeout(resolve, 300));
    release();
    await concurrentSave;
    await expect(ourSave).resolves.toBe("saved");

    const [offer] = await listBusinessOffers(fixture.businessId);
    expect(offer?.image?.id).toBe(replacement.mediaId);
    const status = async (id: string) => {
      const [row] = await database
        .select({ status: businessMedia.status })
        .from(businessMedia)
        .where(eq(businessMedia.id, id));
      return row?.status;
    };
    // The picture our save replaced was `concurrent`, so it is the one retired.
    // Reading the stale `original` would have left `concurrent` stranded.
    await expect(status(concurrent.mediaId)).resolves.toBe("removed");
    await expect(status(replacement.mediaId)).resolves.toBe("active");
  });
});
