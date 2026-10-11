import { and, eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMedia,
  category,
} from "@/lib/database/schema/business";
import {
  businessEvent,
  businessOffer,
} from "@/lib/database/schema/business-operations";
import {
  loadContentImages,
  updateContentImageAlt,
} from "@/modules/businesses/content-images";
import {
  listBusinessEvents,
  listBusinessOffers,
  removeBusinessEvent,
  removeBusinessOffer,
  saveBusinessEvent,
  saveBusinessOffer,
} from "@/modules/businesses/content-features";
import { listBusinessMedia } from "@/modules/businesses/media";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  userId: "00000000-0000-4000-8000-000000000c01",
  categoryId: "00000000-0000-4000-8000-000000000c02",
  businessA: "00000000-0000-4000-8000-000000000c03",
  businessB: "00000000-0000-4000-8000-000000000c04",
  offerPicture: "00000000-0000-4000-8000-000000000c11",
  offerPictureTwo: "00000000-0000-4000-8000-000000000c12",
  eventPicture: "00000000-0000-4000-8000-000000000c13",
  eventPictureTwo: "00000000-0000-4000-8000-000000000c14",
  foreignOfferPicture: "00000000-0000-4000-8000-000000000c15",
} as const;

function pictureRow(
  id: string,
  businessId: string,
  role: "offer" | "event" | "gallery",
) {
  return {
    id,
    businessId,
    role,
    storageKey: `fixture/${id}.webp`,
    altText: `Fixture picture ${id.slice(-2)}`,
    contentType: "image/webp",
    byteSize: 1000,
  };
}

const offerInput = {
  title: "Fictional free delivery",
  description: "A fictional offer used only by automated tests.",
  status: "active" as const,
  sortOrder: 0,
};

const eventInput = {
  title: "Fictional open evening",
  description: "A fictional event used only by automated tests.",
  startsAt: new Date(Date.now() + 7 * 24 * 3_600_000).toISOString(),
  status: "active" as const,
};

describeDatabase("pictures on offers and events", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.userId,
      name: "Content Image Fixture",
      email: "content.image.fixture@example.test",
      emailVerified: true,
    });
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture picture category",
      slug: "fixture-picture-category",
      description: "Fictional category used only by automated tests.",
    });
    for (const [id, slug] of [
      [fixture.businessA, "fixture-picture-a"],
      [fixture.businessB, "fixture-picture-b"],
    ] as const) {
      await database.insert(business).values({
        id,
        tradingName: `Fixture ${slug}`,
        slug,
        summary: "A fictional business used only by automated tests.",
        description: "This business exists only during automated tests.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area",
        createdByUserId: fixture.userId,
      });
    }
    await database
      .insert(businessMedia)
      .values([
        pictureRow(fixture.offerPicture, fixture.businessA, "offer"),
        pictureRow(fixture.offerPictureTwo, fixture.businessA, "offer"),
        pictureRow(fixture.eventPicture, fixture.businessA, "event"),
        pictureRow(fixture.eventPictureTwo, fixture.businessA, "event"),
        pictureRow(fixture.foreignOfferPicture, fixture.businessB, "offer"),
      ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    for (const id of [fixture.businessA, fixture.businessB]) {
      await database.delete(business).where(eq(business.id, id));
    }
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.userId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  async function mediaStatus(id: string) {
    const [row] = await getDatabase()
      .select({ status: businessMedia.status })
      .from(businessMedia)
      .where(eq(businessMedia.id, id));
    return row?.status;
  }

  it("attaches an offer picture and shows it in the owner and public views", async () => {
    await expect(
      saveBusinessOffer({
        businessId: fixture.businessA,
        offer: offerInput,
        imageMediaId: fixture.offerPicture,
      }),
    ).resolves.toBe("saved");

    const [offer] = await listBusinessOffers(fixture.businessA);
    expect(offer?.image).toMatchObject({
      id: fixture.offerPicture,
      altText: "Fixture picture 11",
    });
    expect(offer?.image?.url).toContain(`fixture/${fixture.offerPicture}.webp`);
  });

  it("edits a picture's description without replacing it, within the business only", async () => {
    await saveBusinessOffer({
      businessId: fixture.businessA,
      offer: offerInput,
      imageMediaId: fixture.offerPicture,
    });
    const [offer] = await listBusinessOffers(fixture.businessA);
    const input = {
      businessId: fixture.businessA,
      kind: "offer" as const,
      itemId: offer!.id,
    };

    await expect(
      updateContentImageAlt({ ...input, altText: "  " }),
    ).resolves.toBe("invalid");
    await expect(
      updateContentImageAlt({ ...input, altText: "ab" }),
    ).resolves.toBe("invalid");
    await expect(
      updateContentImageAlt({
        ...input,
        businessId: fixture.businessB,
        altText: "A new description",
      }),
    ).resolves.toBe("none");
    await expect(
      updateContentImageAlt({ ...input, altText: "A new description" }),
    ).resolves.toBe("saved");

    const [after] = await listBusinessOffers(fixture.businessA);
    expect(after?.image).toMatchObject({
      id: fixture.offerPicture,
      altText: "A new description",
    });
  });

  it("refuses a picture that belongs to another business or is the wrong kind", async () => {
    for (const imageMediaId of [
      fixture.foreignOfferPicture, // another tenant's picture
      fixture.eventPicture, // right business, wrong kind
      "00000000-0000-4000-8000-000000000cff", // does not exist
    ]) {
      await expect(
        saveBusinessOffer({
          businessId: fixture.businessA,
          offer: offerInput,
          imageMediaId,
        }),
      ).resolves.toBe("invalid");
    }
    await expect(
      saveBusinessEvent({
        businessId: fixture.businessA,
        event: eventInput,
        imageMediaId: fixture.offerPicture, // an offer picture on an event
      }),
    ).resolves.toBe("invalid");

    const offers = await getDatabase()
      .select({ id: businessOffer.id })
      .from(businessOffer)
      .where(eq(businessOffer.businessId, fixture.businessA));
    expect(offers).toHaveLength(0);
    // The other tenant's picture was never touched.
    await expect(mediaStatus(fixture.foreignOfferPicture)).resolves.toBe(
      "active",
    );
  });

  it("replaces and removes a picture, retiring the old one", async () => {
    await saveBusinessOffer({
      businessId: fixture.businessA,
      offer: offerInput,
      imageMediaId: fixture.offerPicture,
    });
    const [created] = await listBusinessOffers(fixture.businessA);

    // Saving without an image field leaves the picture alone.
    await saveBusinessOffer({
      businessId: fixture.businessA,
      offer: { ...offerInput, id: created!.id, title: "Renamed offer" },
    });
    expect((await listBusinessOffers(fixture.businessA))[0]?.image?.id).toBe(
      fixture.offerPicture,
    );
    await expect(mediaStatus(fixture.offerPicture)).resolves.toBe("active");

    // Replacing retires the previous picture.
    await saveBusinessOffer({
      businessId: fixture.businessA,
      offer: { ...offerInput, id: created!.id },
      imageMediaId: fixture.offerPictureTwo,
    });
    expect((await listBusinessOffers(fixture.businessA))[0]?.image?.id).toBe(
      fixture.offerPictureTwo,
    );
    await expect(mediaStatus(fixture.offerPicture)).resolves.toBe("removed");

    // null removes the picture.
    await saveBusinessOffer({
      businessId: fixture.businessA,
      offer: { ...offerInput, id: created!.id },
      imageMediaId: null,
    });
    expect((await listBusinessOffers(fixture.businessA))[0]?.image).toBeNull();
    await expect(mediaStatus(fixture.offerPictureTwo)).resolves.toBe("removed");
  });

  it("retires an offer's picture when the offer is deleted", async () => {
    await saveBusinessOffer({
      businessId: fixture.businessA,
      offer: offerInput,
      imageMediaId: fixture.offerPicture,
    });
    const [created] = await listBusinessOffers(fixture.businessA);
    await expect(
      removeBusinessOffer(fixture.businessA, created!.id),
    ).resolves.toBe("removed");
    await expect(mediaStatus(fixture.offerPicture)).resolves.toBe("removed");
  });

  it("shares one picture across a repeating event and retires it with the last date", async () => {
    await expect(
      saveBusinessEvent({
        businessId: fixture.businessA,
        event: {
          ...eventInput,
          repeat: { frequency: "weekly", occurrences: 3 },
        },
        imageMediaId: fixture.eventPicture,
      }),
    ).resolves.toBe("saved");

    const events = await listBusinessEvents(fixture.businessA);
    expect(events).toHaveLength(3);
    expect(
      events.every((event) => event.image?.id === fixture.eventPicture),
    ).toBe(true);

    // Deleting some dates keeps the picture for the rest.
    await removeBusinessEvent(fixture.businessA, events[0]!.id);
    await removeBusinessEvent(fixture.businessA, events[1]!.id);
    await expect(mediaStatus(fixture.eventPicture)).resolves.toBe("active");
    await removeBusinessEvent(fixture.businessA, events[2]!.id);
    await expect(mediaStatus(fixture.eventPicture)).resolves.toBe("removed");
  });

  it("editing one date of a series can change only that date's picture", async () => {
    await saveBusinessEvent({
      businessId: fixture.businessA,
      event: { ...eventInput, repeat: { frequency: "weekly", occurrences: 2 } },
      imageMediaId: fixture.eventPicture,
    });
    const [first, second] = await listBusinessEvents(fixture.businessA);
    await saveBusinessEvent({
      businessId: fixture.businessA,
      event: {
        ...eventInput,
        id: first!.id,
        startsAt: first!.startsAt.toISOString(),
      },
      imageMediaId: fixture.eventPictureTwo,
    });
    const after = await listBusinessEvents(fixture.businessA);
    expect(after.find((e) => e.id === first!.id)?.image?.id).toBe(
      fixture.eventPictureTwo,
    );
    expect(after.find((e) => e.id === second!.id)?.image?.id).toBe(
      fixture.eventPicture,
    );
    // The shared picture is still used by the second date.
    await expect(mediaStatus(fixture.eventPicture)).resolves.toBe("active");
  });

  it("keeps offer and event pictures out of the website gallery", async () => {
    await saveBusinessOffer({
      businessId: fixture.businessA,
      offer: offerInput,
      imageMediaId: fixture.offerPicture,
    });
    const media = await listBusinessMedia(fixture.businessA);
    expect(media.gallery).toHaveLength(0);
    expect(media.logo).toBeNull();
    expect(media.hero).toBeNull();
  });

  it("does not load retired pictures", async () => {
    await getDatabase()
      .update(businessMedia)
      .set({ status: "removed" })
      .where(
        and(
          eq(businessMedia.id, fixture.offerPicture),
          eq(businessMedia.businessId, fixture.businessA),
        ),
      );
    const images = await loadContentImages([
      fixture.offerPicture,
      fixture.offerPictureTwo,
    ]);
    expect([...images.keys()]).toEqual([fixture.offerPictureTwo]);
  });

  it("keeps event pictures after a database round trip of the event row", async () => {
    await saveBusinessEvent({
      businessId: fixture.businessA,
      event: eventInput,
      imageMediaId: fixture.eventPicture,
    });
    const [row] = await getDatabase()
      .select({ imageMediaId: businessEvent.imageMediaId })
      .from(businessEvent)
      .where(eq(businessEvent.businessId, fixture.businessA));
    expect(row?.imageMediaId).toBe(fixture.eventPicture);
  });

  it("indexes the picture reference columns used by every release", async () => {
    const rows = await getDatabase().execute(
      sql`select indexname from pg_indexes where indexname in ('business_offer_image_idx', 'business_event_image_idx') order by 1`,
    );
    expect(Array.from(rows).map((row) => row.indexname)).toEqual([
      "business_event_image_idx",
      "business_offer_image_idx",
    ]);
  });
});
