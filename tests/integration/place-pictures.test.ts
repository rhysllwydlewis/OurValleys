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
import { place } from "@/lib/database/schema/business";
import { placeProfile } from "@/lib/database/schema/reference";
import {
  getPlacePicture,
  getPlacePictureForAdmin,
  listPlacePictures,
  removePlacePicture,
  savePlacePicture,
  updatePlacePictureText,
} from "@/modules/reference-data/place-picture";
import { savePlaceProfileForAdmin } from "@/modules/reference-data/place-profile";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const slug = "it-place-pic";
const missingPlace = "00000000-0000-4000-8000-00000000dead";

function createPng(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(32);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

const base = {
  alt: "Terraced houses in the rain",
  altCy: "Tai teras yn y glaw",
  credit: "A. Photographer",
  actorUserId: null,
};

describeDatabase("place pictures", () => {
  let placeId = "";

  async function clean() {
    const database = getDatabase();
    await database.delete(place).where(eq(place.slug, slug));
    stored.clear();
    deleted.length = 0;
  }

  beforeEach(async () => {
    await clean();
    const [row] = await getDatabase()
      .insert(place)
      .values({
        slug,
        canonicalName: "Picture Test Place",
        placeType: "town",
        coverageStatus: "active",
        status: "active",
        editorialSummary: "A place used by an integration test.",
      })
      .returning({ id: place.id });
    placeId = row!.id;
  });
  afterEach(clean);
  afterAll(async () => {
    await closeDatabase();
  });

  const png = () => createPng(1600, 700);

  it("creates the profile row on first upload and serves a public picture", async () => {
    const result = await savePlacePicture({
      placeId,
      contentType: "image/png",
      bytes: png(),
      ...base,
    });
    expect(result).toEqual({ status: "saved" });
    expect(stored.size).toBe(1);

    const picture = await getPlacePicture.call(null, placeId);
    expect(picture).toMatchObject({
      alt: base.alt,
      altCy: base.altCy,
      credit: base.credit,
    });
    expect(picture?.url).toMatch(
      new RegExp(`^https://media.test/places/${placeId}/.+\\.png$`),
    );
    const listed = await listPlacePictures.call(null);
    expect(listed.get(placeId)?.alt).toBe(base.alt);
  });

  it("replaces the picture and retires the previous file", async () => {
    await savePlacePicture({
      placeId,
      contentType: "image/png",
      bytes: png(),
      ...base,
    });
    const [first] = [...stored.keys()];
    await savePlacePicture({
      placeId,
      contentType: "image/png",
      bytes: png(),
      ...base,
      alt: "Second picture",
    });
    expect(stored.size).toBe(1);
    expect(stored.has(first!)).toBe(false);
    expect(deleted).toContain(first);
    const admin = await getPlacePictureForAdmin(placeId);
    expect(admin.picture?.alt).toBe("Second picture");
    expect(admin.stored).toBe(true);
  });

  it("keeps the picture when the text profile is saved", async () => {
    await savePlacePicture({
      placeId,
      contentType: "image/png",
      bytes: png(),
      ...base,
    });
    const saved = await savePlaceProfileForAdmin(
      { placeId, welshSummary: "Crynodeb", about: "About text", facts: [] },
      null,
    );
    expect(saved.status).toBe("saved");
    const [row] = await getDatabase()
      .select()
      .from(placeProfile)
      .where(eq(placeProfile.placeId, placeId));
    expect(row?.imageStorageKey).toBeTruthy();
    expect(row?.about).toBe("About text");
  });

  it("rejects a missing description, a non-image and an oversized file without storing anything", async () => {
    expect(
      (
        await savePlacePicture({
          placeId,
          contentType: "image/png",
          bytes: png(),
          ...base,
          alt: " a ",
        })
      ).status,
    ).toBe("invalid");
    expect(
      (
        await savePlacePicture({
          placeId,
          contentType: "image/png",
          bytes: Buffer.from("<script>alert(1)</script>"),
          ...base,
        })
      ).status,
    ).toBe("invalid");
    expect(
      (
        await savePlacePicture({
          placeId,
          contentType: "image/png",
          bytes: Buffer.alloc(5 * 1024 * 1024 + 1),
          ...base,
        })
      ).status,
    ).toBe("invalid");
    expect(stored.size).toBe(0);
    expect((await getPlacePictureForAdmin(placeId)).stored).toBe(false);
  });

  it("never creates an orphan row or file for an unknown or malformed place", async () => {
    for (const bad of [missingPlace, "not-a-uuid", 7, null]) {
      const result = await savePlacePicture({
        placeId: bad,
        contentType: "image/png",
        bytes: png(),
        ...base,
      });
      expect(result.status).toBe("not_found");
    }
    expect(stored.size).toBe(0);
    expect(
      (await updatePlacePictureText({ placeId: missingPlace, ...base })).status,
    ).toBe("not_found");
    expect((await removePlacePicture(missingPlace, null)).status).toBe(
      "not_found",
    );
  });

  it("edits the words only on a place that has a picture", async () => {
    // A profile row without a picture has nothing to describe.
    await savePlaceProfileForAdmin(
      { placeId, welshSummary: "Crynodeb", facts: [] },
      null,
    );
    expect((await updatePlacePictureText({ placeId, ...base })).status).toBe(
      "not_found",
    );

    await savePlacePicture({
      placeId,
      contentType: "image/png",
      bytes: png(),
      ...base,
    });
    expect(
      await updatePlacePictureText({
        placeId,
        ...base,
        alt: "Edited description",
        altCy: "",
        credit: "  ",
      }),
    ).toEqual({ status: "saved" });
    const admin = await getPlacePictureForAdmin(placeId);
    expect(admin.picture).toMatchObject({
      alt: "Edited description",
      altCy: null,
      credit: null,
    });
    expect(
      (await updatePlacePictureText({ placeId, ...base, alt: "" })).status,
    ).toBe("invalid");
  });

  it("removes the picture and its file, leaving the profile text", async () => {
    await savePlaceProfileForAdmin(
      { placeId, welshSummary: "Crynodeb", facts: [] },
      null,
    );
    await savePlacePicture({
      placeId,
      contentType: "image/png",
      bytes: png(),
      ...base,
    });
    const [key] = [...stored.keys()];
    expect(await removePlacePicture(placeId, null)).toEqual({
      status: "saved",
    });
    expect(deleted).toContain(key);
    expect((await getPlacePictureForAdmin(placeId)).stored).toBe(false);
    const [row] = await getDatabase()
      .select()
      .from(placeProfile)
      .where(eq(placeProfile.placeId, placeId));
    expect(row?.welshSummary).toBe("Crynodeb");
    expect(row?.imageAlt).toBeNull();
    // Nothing left to remove.
    expect((await removePlacePicture(placeId, null)).status).toBe("not_found");
  });

  it("does not list pictures of inactive places", async () => {
    await savePlacePicture({
      placeId,
      contentType: "image/png",
      bytes: png(),
      ...base,
    });
    await getDatabase()
      .update(place)
      .set({ status: "inactive" })
      .where(eq(place.id, placeId));
    expect((await listPlacePictures.call(null)).has(placeId)).toBe(false);
  });
});
