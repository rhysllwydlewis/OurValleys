import { and, eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Only the storage boundary is faked: validation, limits, ownership checks,
// reference counting and the database rows are the real code under test.
const stored = new Map<string, number>();
vi.mock("@/lib/media-storage", () => ({
  isMediaStorageConfigured: () => true,
  publicMediaUrl: (key: string) => `https://media.test/${key}`,
  putMediaObject: async (key: string, bytes: Buffer) => {
    stored.set(key, bytes.byteLength);
  },
  deleteMediaObject: async (key: string) => {
    stored.delete(key);
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
  listCategorySections,
  removeCategorySection,
  saveCategorySection,
} from "@/modules/businesses/content-features";
import { saveSectionWithPictures } from "@/modules/businesses/extra-section-pictures";
import {
  maxExtraSections,
  maxPicturesPerSection,
  parseExtraSectionForm,
} from "@/modules/businesses/extra-sections-model";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  ownerId: "00000000-0000-4000-8000-000000003601",
  categoryId: "00000000-0000-4000-8000-000000003602",
  businessA: "00000000-0000-4000-8000-000000003603",
  businessB: "00000000-0000-4000-8000-000000003604",
} as const;

function png(): Buffer {
  const bytes = Buffer.alloc(32);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(800, 16);
  bytes.writeUInt32BE(600, 20);
  bytes[24] = 8;
  bytes[25] = 6;
  return bytes;
}

const file = () =>
  new File([new Uint8Array(png())], "a.png", { type: "image/png" });

type Row = {
  title: string;
  meta?: string;
  keep?: string;
  alt?: string;
  /** Sent as the Welsh description field; omitted entirely when no row sets it. */
  altCy?: string;
  remove?: boolean;
  availability?: string;
  url?: string;
};

/** Builds what the server action reads, the same way the real form does. */
function formOf(type: string, rows: Row[]) {
  const fields: Record<string, string[]> = {
    entryTitle: rows.map((r) => r.title),
    entryDescription: rows.map(() => ""),
    entryMeta: rows.map((r) => r.meta ?? ""),
    entryImageId: rows.map((r) => r.keep ?? ""),
    entryImageAlt: rows.map((r) => r.alt ?? ""),
    entryAvailability: rows.map((r) => r.availability ?? "available"),
    entryUrl: rows.map((r) => r.url ?? ""),
    removeImageRow: rows.flatMap((r, i) => (r.remove ? [String(i)] : [])),
    ...(rows.some((r) => r.altCy !== undefined)
      ? { entryImageAltCy: rows.map((r) => r.altCy ?? "") }
      : {}),
  };
  const scalars: Record<string, string> = { sectionType: type, title: "Shop" };
  return {
    get: (name: string) => scalars[name] ?? fields[name]?.[0] ?? null,
    getAll: (name: string) => fields[name] ?? [],
  };
}

function parsed(type: string, rows: Row[]) {
  const result = parseExtraSectionForm(formOf(type, rows));
  if (!result.ok) throw new Error(`form refused: ${result.problem}`);
  return result;
}

async function mediaRows(businessId: string) {
  return getDatabase()
    .select()
    .from(businessMedia)
    .where(
      and(
        eq(businessMedia.businessId, businessId),
        eq(businessMedia.role, "catalogue"),
      ),
    );
}

const activeCount = async (businessId: string) =>
  (await mediaRows(businessId)).filter((r) => r.status === "active").length;

describeDatabase("catalogue entry pictures", () => {
  beforeEach(async () => {
    stored.clear();
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.ownerId,
      name: "Catalogue Owner",
      email: "catalogue.owner@example.test",
      emailVerified: true,
    });
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Catalogue fixtures",
      slug: "catalogue-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values(
      [fixture.businessA, fixture.businessB].map((id, index) => ({
        id,
        tradingName: `Fixture Catalogue ${index === 0 ? "A" : "B"}`,
        slug: `fixture-catalogue-${index === 0 ? "a" : "b"}`,
        summary: "Fictional business.",
        description: "Fictional business used only by automated tests.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area" as const,
        status: "published" as const,
        createdByUserId: fixture.ownerId,
      })),
    );
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(business).where(eq(business.id, fixture.businessA));
    await database.delete(business).where(eq(business.id, fixture.businessB));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.ownerId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  const create = (
    businessId: string,
    rows: Row[],
    files: Array<File | null>,
    type = "products",
  ) =>
    saveSectionWithPictures({
      businessId,
      sectionId: undefined,
      parsed: parsed(type, rows),
      files,
    });

  /** Builds a section one new picture per save, as the editor requires. */
  async function seed(
    rows: Row[] = [{ title: "Candle", alt: "A soy candle" }],
  ) {
    const first = await create(fixture.businessA, [rows[0]!], [file()]);
    expect(first.outcome).toBe("saved");
    let [section] = await listCategorySections(fixture.businessA);
    for (let count = 2; count <= rows.length; count += 1) {
      const kept = section!.entries.map((entry, index) => ({
        ...rows[index]!,
        keep: entry.imageMediaId!,
        alt: "",
      }));
      const result = await saveSectionWithPictures({
        businessId: fixture.businessA,
        sectionId: section!.id,
        parsed: parsed("products", [...kept, rows[count - 1]!]),
        files: [...kept.map(() => null), file()],
      });
      expect(result.outcome).toBe("saved");
      [section] = await listCategorySections(fixture.businessA);
    }
    return section!;
  }

  it("stores a picture, link and stock state on an entry and shows them", async () => {
    const result = await create(
      fixture.businessA,
      [
        {
          title: "Candle",
          meta: "£8",
          alt: "A soy candle in a jar",
          availability: "limited",
          url: "https://shop.example.co.uk/candle",
        },
        { title: "Soap" },
      ],
      [file(), null],
    );
    expect(result.outcome).toBe("saved");

    const [section] = await listCategorySections(fixture.businessA, true);
    const [candle, soap] = section!.entries;
    expect(candle).toMatchObject({
      title: "Candle",
      availability: "limited",
      url: "https://shop.example.co.uk/candle",
      image: { altText: "A soy candle in a jar" },
    });
    expect(candle!.image!.url).toMatch(
      new RegExp(
        `^https://media.test/business/${fixture.businessA}/catalogue/`,
      ),
    );
    expect(soap!.image).toBeUndefined();
    expect(await activeCount(fixture.businessA)).toBe(1);
    expect(stored.size).toBe(1);
  });

  it("keeps a picture on edit, updates its description and releases a replaced one", async () => {
    const section = await seed([
      { title: "Candle", alt: "A soy candle" },
      { title: "Soap", alt: "A bar of soap" },
    ]);
    const [candle, soap] = section.entries;

    const result = await saveSectionWithPictures({
      businessId: fixture.businessA,
      sectionId: section.id,
      parsed: parsed("products", [
        {
          title: "Candle",
          keep: candle!.imageMediaId!,
          alt: "A lit soy candle",
        },
        { title: "Soap", keep: soap!.imageMediaId!, alt: "New soap photo" },
      ]),
      files: [null, file()],
    });
    expect(result.outcome).toBe("saved");

    const [after] = await listCategorySections(fixture.businessA);
    expect(after!.entries[0]!.imageMediaId).toBe(candle!.imageMediaId);
    expect(after!.entries[0]!.image!.altText).toBe("A lit soy candle");
    expect(after!.entries[1]!.imageMediaId).not.toBe(soap!.imageMediaId);

    // The replaced picture is retired and its file is deleted.
    const rows = await mediaRows(fixture.businessA);
    expect(rows.find((r) => r.id === soap!.imageMediaId)?.status).toBe(
      "removed",
    );
    expect(await activeCount(fixture.businessA)).toBe(2);
    expect(stored.size).toBe(2);
  });

  it("stores a Welsh description with a new picture, changes it on edit, and clears it only when sent empty", async () => {
    const created = await create(
      fixture.businessA,
      [{ title: "Candle", alt: "A soy candle", altCy: "Cannwyll soia" }],
      [file()],
    );
    expect(created.outcome).toBe("saved");
    const [section] = await listCategorySections(fixture.businessA, true);
    const entry = section!.entries[0]!;
    expect(entry.image).toMatchObject({
      altText: "A soy candle",
      altTextCy: "Cannwyll soia",
    });

    const edit = (row: Row) =>
      saveSectionWithPictures({
        businessId: fixture.businessA,
        sectionId: section!.id,
        parsed: parsed("products", [row]),
        files: [null],
      });
    const read = async () =>
      (await listCategorySections(fixture.businessA, true))[0]!.entries[0]!
        .image;

    // A form that sends no Welsh field leaves the Welsh text alone.
    await edit({ title: "Candle", keep: entry.imageMediaId! });
    expect((await read())?.altTextCy).toBe("Cannwyll soia");

    // A Welsh-only edit changes just the Welsh text.
    await edit({
      title: "Candle",
      keep: entry.imageMediaId!,
      altCy: "Cannwyll soia mewn jar",
    });
    expect(await read()).toMatchObject({
      altText: "A soy candle",
      altTextCy: "Cannwyll soia mewn jar",
    });

    // An empty Welsh field clears it.
    await edit({ title: "Candle", keep: entry.imageMediaId!, altCy: "" });
    expect((await read())?.altTextCy).toBeNull();
  });

  it("removes a picture when asked and when its row is dropped", async () => {
    const section = await seed([
      { title: "Candle", alt: "A soy candle" },
      { title: "Soap", alt: "A bar of soap" },
    ]);
    const [candle, soap] = section.entries;
    const result = await saveSectionWithPictures({
      businessId: fixture.businessA,
      sectionId: section.id,
      parsed: parsed("products", [
        { title: "Candle", keep: candle!.imageMediaId!, remove: true },
      ]),
      files: [],
    });
    expect(result.outcome).toBe("saved");
    const [after] = await listCategorySections(fixture.businessA);
    expect(after!.entries).toHaveLength(1);
    expect(after!.entries[0]!.image).toBeUndefined();
    expect(await activeCount(fixture.businessA)).toBe(0);
    expect(stored.size).toBe(0);
    const ids = (await mediaRows(fixture.businessA)).map((r) => r.id);
    expect(ids).toEqual(
      expect.arrayContaining([candle!.imageMediaId, soap!.imageMediaId]),
    );
  });

  it("ignores a keep id the section does not already show (tampered form)", async () => {
    const other = await seed([{ title: "Candle", alt: "A soy candle" }]);
    const foreignId = other.entries[0]!.imageMediaId!;

    // Same business, different section: must not borrow the picture.
    const result = await create(
      fixture.businessA,
      [{ title: "Tea", keep: foreignId }],
      [null],
    );
    expect(result.outcome).toBe("saved");
    const sections = await listCategorySections(fixture.businessA);
    const tea = sections.find((s) => s.entries[0]!.title === "Tea")!;
    expect(tea.entries[0]!.imageMediaId).toBeUndefined();

    // Another business: same.
    const stolen = await create(
      fixture.businessB,
      [{ title: "Tea", keep: foreignId }],
      [null],
    );
    expect(stolen.outcome).toBe("saved");
    const [theirs] = await listCategorySections(fixture.businessB);
    expect(theirs!.entries[0]!.imageMediaId).toBeUndefined();
    expect(await activeCount(fixture.businessA)).toBe(1);
  });

  it("refuses to store another business's picture id at the data layer", async () => {
    const section = await seed();
    const foreignId = section.entries[0]!.imageMediaId!;
    await expect(
      saveCategorySection({
        businessId: fixture.businessB,
        section: {
          sectionType: "products",
          title: "Sneaky",
          entries: [
            { title: "Candle", description: "", imageMediaId: foreignId },
          ],
          status: "active",
        },
      }),
    ).resolves.toBe("invalid");
    await expect(listCategorySections(fixture.businessB)).resolves.toEqual([]);
  });

  it("cannot edit a section of another business", async () => {
    const section = await seed();
    const result = await saveSectionWithPictures({
      businessId: fixture.businessB,
      sectionId: section.id,
      parsed: parsed("products", [{ title: "Hijack" }]),
      files: [],
    });
    expect(result.outcome).toBe("not_found");
    const [still] = await listCategorySections(fixture.businessA);
    expect(still!.entries[0]!.title).toBe("Candle");
  });

  it("stores nothing for a picture without a description or on a nameless row", async () => {
    const noAlt = await create(
      fixture.businessA,
      [{ title: "Candle" }],
      [file()],
    );
    expect(noAlt).toEqual({ outcome: "picture-invalid", row: 1 });

    const nameless = await create(
      fixture.businessA,
      [{ title: "Candle" }, { title: "" }],
      [null, file()],
    );
    expect(nameless).toEqual({ outcome: "picture-row", row: 2 });

    // A type with no pictures refuses an upload instead of dropping it.
    const faq = await create(
      fixture.businessA,
      [{ title: "Why?" }],
      [file()],
      "faq",
    );
    expect(faq.outcome).toBe("picture-row");

    expect(await mediaRows(fixture.businessA)).toHaveLength(0);
    expect(stored.size).toBe(0);
    await expect(listCategorySections(fixture.businessA)).resolves.toEqual([]);
  });

  it("rejects a file that is not an image", async () => {
    const result = await create(
      fixture.businessA,
      [{ title: "Candle", alt: "A candle" }],
      [new File(["<script>alert(1)</script>"], "x.png", { type: "image/png" })],
    );
    expect(result.outcome).toBe("picture-invalid");
    expect(stored.size).toBe(0);
  });

  it("gives the upload back when the section itself cannot be saved", async () => {
    for (let index = 0; index < maxExtraSections; index += 1) {
      await expect(
        saveCategorySection({
          businessId: fixture.businessA,
          section: {
            sectionType: "faq",
            title: `Section ${index}`,
            entries: [{ title: "Q?", description: "A." }],
            status: "active",
          },
        }),
      ).resolves.toBe("saved");
    }
    const result = await create(
      fixture.businessA,
      [{ title: "Candle", alt: "A soy candle" }],
      [file()],
    );
    expect(result.outcome).toBe("limit");
    expect(await activeCount(fixture.businessA)).toBe(0);
    expect(stored.size).toBe(0);
  });

  it("limits how many pictures one section can carry", async () => {
    const database = getDatabase();
    const ids = Array.from(
      { length: maxPicturesPerSection + 1 },
      (_, i) => `00000000-0000-4000-8000-0000000b${String(i).padStart(4, "0")}`,
    );
    await database.insert(businessMedia).values(
      ids.map((id, i) => ({
        id,
        businessId: fixture.businessA,
        role: "catalogue",
        storageKey: `business/${fixture.businessA}/catalogue/seed-${i}.png`,
        altText: "A thing",
        contentType: "image/png",
        byteSize: 10,
      })),
    );
    await expect(
      saveCategorySection({
        businessId: fixture.businessA,
        section: {
          sectionType: "products",
          title: "Shop",
          entries: ids.map((id, i) => ({
            title: `Item ${i}`,
            description: "",
            imageMediaId: id,
          })),
          status: "active",
        },
      }),
    ).resolves.toBe("saved");
    const [section] = await listCategorySections(fixture.businessA);
    const result = await saveSectionWithPictures({
      businessId: fixture.businessA,
      sectionId: section!.id,
      parsed: parsed(
        "products",
        section!.entries.map((entry) => ({
          title: entry.title,
          keep: entry.imageMediaId!,
        })),
      ),
      files: [],
    });
    expect(result.outcome).toBe("picture-too-many");
  });

  it("takes one new picture per save so the request stays inside the body limit", async () => {
    const result = await create(
      fixture.businessA,
      [
        { title: "Candle", alt: "A soy candle" },
        { title: "Soap", alt: "A bar of soap" },
      ],
      [file(), file()],
    );
    expect(result.outcome).toBe("picture-multiple");
    expect(await mediaRows(fixture.businessA)).toHaveLength(0);
    expect(stored.size).toBe(0);
    await expect(listCategorySections(fixture.businessA)).resolves.toEqual([]);
  });

  it("retires what each of two overlapping saves displaced", async () => {
    const section = await seed([{ title: "Candle", alt: "A soy candle" }]);
    const original = section.entries[0]!.imageMediaId!;
    const edit = () =>
      saveSectionWithPictures({
        businessId: fixture.businessA,
        sectionId: section.id,
        parsed: parsed("products", [
          { title: "Candle", keep: original, alt: "A new photo" },
        ]),
        files: [file()],
      });
    // Both read the same original before either writes.
    const results = await Promise.all([edit(), edit()]);
    // The later save may be refused when the earlier one already retired the
    // original it still holds (that is the point of the media lock).
    for (const result of results) {
      expect(["saved", "invalid"]).toContain(result.outcome);
    }
    expect(results.some((result) => result.outcome === "saved")).toBe(true);
    // Exactly one picture is still referenced and active; nothing is orphaned.
    expect(await activeCount(fixture.businessA)).toBe(1);
    expect(stored.size).toBe(1);
  });

  it("retires a section's pictures when the section is deleted", async () => {
    const section = await seed([
      { title: "Candle", alt: "A soy candle" },
      { title: "Soap", alt: "A bar of soap" },
    ]);
    expect(await activeCount(fixture.businessA)).toBe(2);
    await expect(
      removeCategorySection(fixture.businessA, section.id),
    ).resolves.toBe("removed");
    expect(await activeCount(fixture.businessA)).toBe(0);
    expect(stored.size).toBe(0);
  });

  it("does not retire a picture another business's section deletion touches", async () => {
    const section = await seed();
    await expect(
      removeCategorySection(fixture.businessB, section.id),
    ).resolves.toBe("not_found");
    expect(await activeCount(fixture.businessA)).toBe(1);
  });

  it("refuses to save a picture another tab has just retired", async () => {
    const section = await seed();
    const mediaId = section.entries[0]!.imageMediaId!;
    await getDatabase()
      .update(businessMedia)
      .set({ status: "removed" })
      .where(eq(businessMedia.id, mediaId));
    await expect(
      saveCategorySection({
        businessId: fixture.businessA,
        section: {
          id: section.id,
          sectionType: "products",
          title: "Shop",
          entries: [
            { title: "Candle", description: "", imageMediaId: mediaId },
          ],
          status: "active",
        },
      }),
    ).resolves.toBe("invalid");
  });

  it("shows no picture when its media has been retired", async () => {
    const section = await seed();
    await getDatabase()
      .update(businessMedia)
      .set({ status: "removed" })
      .where(eq(businessMedia.id, section.entries[0]!.imageMediaId!));
    const [after] = await listCategorySections(fixture.businessA, true);
    expect(after!.entries[0]!.title).toBe("Candle");
    expect(after!.entries[0]!.image).toBeUndefined();

    // Saving again from the editor drops the dead id instead of failing.
    const result = await saveSectionWithPictures({
      businessId: fixture.businessA,
      sectionId: section.id,
      parsed: parsed("products", [
        { title: "Candle", keep: section.entries[0]!.imageMediaId! },
      ]),
      files: [null],
    });
    expect(result.outcome).toBe("saved");
  });
});
