import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { guide, guideTranslation } from "@/lib/database/schema/guides";
import {
  createGuideForAdmin,
  getGuideForAdmin,
  listAllGuidesForAdmin,
  publishGuideForAdmin,
  updateGuideForAdmin,
} from "@/modules/guides/admin";
import {
  getPublicGuideBySlug,
  listPublicGuides,
  listRelatedGuideCards,
} from "@/modules/guides/public";
import {
  deleteGuideWelshForAdmin,
  getGuideWelshForAdmin,
  listWelshProgressForAdmin,
  saveGuideWelshForAdmin,
} from "@/modules/guides/welsh-admin";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const slugs = ["fixture-welsh-one", "fixture-welsh-two"] as const;

function nextYear(): string {
  return `${new Date().getUTCFullYear() + 1}-06-01`;
}

function guideInput(slug: string, overrides: Record<string, unknown> = {}) {
  return {
    title: "Independent coffee across the Valleys",
    slug,
    summary:
      "How to combine local cafés, high streets and nearby events into an afternoon out.",
    areaLabel: "Across Rhondda Cynon Taf",
    readingTime: "4 minute read",
    authorName: "OurValleys editorial team",
    reviewDueAt: nextYear(),
    sections: [
      {
        heading: "Start with a local search",
        body: "Use the business directory to explore published café profiles.",
        href: "/businesses?q=coffee",
        linkLabel: "Search coffee businesses",
      },
      {
        heading: "Pick a high street",
        body: "Walk one high street end to end and note which cafés are open.",
      },
      {
        heading: "Ask for the house blend",
        body: "Most independent cafés have a blend they are proud of: ask for it.",
        kind: "tip",
      },
    ],
    ...overrides,
  };
}

async function createPublished(slug: string) {
  const created = await createGuideForAdmin(guideInput(slug));
  if (created.status !== "created") throw new Error("create failed");
  expect(await publishGuideForAdmin(created.id)).toBe("updated");
  const english = await getGuideForAdmin(created.id);
  if (!english) throw new Error("missing guide");
  return english;
}

function completeWelsh(
  english: NonNullable<Awaited<ReturnType<typeof getGuideForAdmin>>>,
) {
  return {
    title: "Coffi annibynnol ar draws y Cymoedd",
    summary: "Sut i gyfuno caffis lleol a strydoedd mawr yn brynhawn allan.",
    areaLabel: "Ar draws Rhondda Cynon Taf",
    readingTime: "Darlleniad 4 munud",
    sponsorshipDisclosure: "",
    sections: english.sections.map((section, index) => ({
      id: section.id,
      heading: `Pennawd ${index + 1}`,
      body: `Testun Cymraeg ar gyfer adran ${index + 1}.`,
      linkLabel: section.href ? "Chwilio busnesau coffi" : "",
    })),
  };
}

describeDatabase("Welsh guides", () => {
  beforeEach(async () => {
    const database = getDatabase();
    for (const slug of slugs) {
      await database.delete(guide).where(eq(guide.slug, slug));
    }
  });
  afterEach(async () => {
    const database = getDatabase();
    for (const slug of slugs) {
      await database.delete(guide).where(eq(guide.slug, slug));
    }
  });
  afterAll(async () => {
    await closeDatabase();
  });

  it("saves a partial Welsh draft, which Welsh readers do not see", async () => {
    const english = await createPublished(slugs[0]);
    const saved = await saveGuideWelshForAdmin({
      guideId: english.id,
      expectedUpdatedAt: null,
      englishUpdatedAt: english.updatedAt.toISOString(),
      fields: { title: "Coffi annibynnol ar draws y Cymoedd" },
    });
    expect(saved.status).toBe("saved");
    if (saved.status !== "saved") return;
    expect(saved.progress.complete).toBe(false);

    const asWelsh = await getPublicGuideBySlug(slugs[0], "cy");
    expect(asWelsh?.contentLocale).toBe("en");
    expect(asWelsh?.title).toBe(english.title);
  });

  it("shows a complete Welsh version to Welsh readers only", async () => {
    const english = await createPublished(slugs[0]);
    const saved = await saveGuideWelshForAdmin({
      guideId: english.id,
      expectedUpdatedAt: null,
      englishUpdatedAt: english.updatedAt.toISOString(),
      fields: completeWelsh(english),
    });
    expect(saved).toMatchObject({ status: "saved" });

    const asWelsh = await getPublicGuideBySlug(slugs[0], "cy");
    expect(asWelsh?.contentLocale).toBe("cy");
    expect(asWelsh?.title).toBe("Coffi annibynnol ar draws y Cymoedd");
    expect(asWelsh?.sections[0]?.heading).toBe("Pennawd 1");
    // The link and section kind come from the English guide.
    expect(asWelsh?.sections[0]?.href).toBe("/businesses?q=coffee");
    expect(asWelsh?.sections[2]?.kind).toBe("tip");

    const asEnglish = await getPublicGuideBySlug(slugs[0], "en");
    expect(asEnglish?.contentLocale).toBe("en");
    expect(asEnglish?.title).toBe(english.title);
    const defaultLocale = await getPublicGuideBySlug(slugs[0]);
    expect(defaultLocale?.title).toBe(english.title);

    const list = await listPublicGuides("cy");
    expect(
      list.guides.find((item) => item.slug === slugs[0])?.contentLocale,
    ).toBe("cy");
    const englishList = await listPublicGuides("en");
    expect(
      englishList.guides.find((item) => item.slug === slugs[0])?.title,
    ).toBe(english.title);
  });

  it("falls back to English again when the English gains a section", async () => {
    const english = await createPublished(slugs[0]);
    await saveGuideWelshForAdmin({
      guideId: english.id,
      expectedUpdatedAt: null,
      englishUpdatedAt: english.updatedAt.toISOString(),
      fields: completeWelsh(english),
    });
    // The live guide must keep three sections, so add a fourth.
    const updated = await updateGuideForAdmin({
      ...guideInput(slugs[0]),
      id: english.id,
      expectedUpdatedAt: english.updatedAt.toISOString(),
      sections: [
        ...english.sections,
        {
          heading: "A fourth stop",
          body: "Finish with a walk by the river before you head home.",
        },
      ],
    });
    expect(updated.status).toBe("updated");

    const asWelsh = await getPublicGuideBySlug(slugs[0], "cy");
    expect(asWelsh?.contentLocale).toBe("en");

    const view = await getGuideWelshForAdmin(english.id);
    expect(view?.englishChangedSince).toBe(true);
    expect(view?.progress.complete).toBe(false);
    expect(view?.welsh.sections).toHaveLength(4);
    expect(view?.progress.missing.map((field) => field.label)).toEqual([
      "Section 4 heading",
      "Section 4 text",
    ]);
  });

  it("refuses a save when the Welsh changed under the editor", async () => {
    const english = await createPublished(slugs[0]);
    const first = await saveGuideWelshForAdmin({
      guideId: english.id,
      expectedUpdatedAt: null,
      englishUpdatedAt: english.updatedAt.toISOString(),
      fields: { title: "Teitl cyntaf" },
    });
    if (first.status !== "saved") throw new Error("save failed");

    // A second editor that also thinks no Welsh exists.
    const racing = await saveGuideWelshForAdmin({
      guideId: english.id,
      expectedUpdatedAt: null,
      englishUpdatedAt: english.updatedAt.toISOString(),
      fields: { title: "Teitl arall" },
    });
    expect(racing.status).toBe("conflict");

    const stale = await saveGuideWelshForAdmin({
      guideId: english.id,
      expectedUpdatedAt: new Date(Date.now() - 60_000).toISOString(),
      englishUpdatedAt: english.updatedAt.toISOString(),
      fields: { title: "Teitl hen" },
    });
    expect(stale.status).toBe("conflict");

    const ok = await saveGuideWelshForAdmin({
      guideId: english.id,
      expectedUpdatedAt: first.updatedAt,
      englishUpdatedAt: english.updatedAt.toISOString(),
      fields: { title: "Teitl newydd" },
    });
    expect(ok.status).toBe("saved");
    const view = await getGuideWelshForAdmin(english.id);
    expect(view?.welsh.title).toBe("Teitl newydd");
  });

  it("refuses a save made against an out-of-date English guide", async () => {
    const english = await createPublished(slugs[0]);
    const result = await saveGuideWelshForAdmin({
      guideId: english.id,
      expectedUpdatedAt: null,
      englishUpdatedAt: new Date(
        english.updatedAt.getTime() - 5000,
      ).toISOString(),
      fields: { title: "Teitl" },
    });
    expect(result.status).toBe("english_changed");
    expect(await getGuideWelshForAdmin(english.id)).toMatchObject({
      welshUpdatedAt: null,
    });
  });

  it("rejects invalid input, unknown guides and over-long text", async () => {
    const english = await createPublished(slugs[0]);
    expect(
      await saveGuideWelshForAdmin({
        guideId: "not-a-uuid",
        expectedUpdatedAt: null,
        englishUpdatedAt: english.updatedAt.toISOString(),
        fields: {},
      }),
    ).toMatchObject({ status: "invalid" });
    expect(
      await saveGuideWelshForAdmin({
        guideId: english.id,
        expectedUpdatedAt: null,
        englishUpdatedAt: english.updatedAt.toISOString(),
        fields: { title: "x".repeat(200) },
      }),
    ).toMatchObject({ status: "invalid" });
    expect(
      await saveGuideWelshForAdmin({
        guideId: "00000000-0000-4000-8000-0000000009ff",
        expectedUpdatedAt: null,
        englishUpdatedAt: english.updatedAt.toISOString(),
        fields: {},
      }),
    ).toMatchObject({ status: "not_found" });
    expect(await getGuideWelshForAdmin("nope")).toBeNull();
  });

  it("drops Welsh for sections that are not in the English guide", async () => {
    const english = await createPublished(slugs[0]);
    const fields = completeWelsh(english);
    await saveGuideWelshForAdmin({
      guideId: english.id,
      expectedUpdatedAt: null,
      englishUpdatedAt: english.updatedAt.toISOString(),
      fields: {
        ...fields,
        sections: [
          ...fields.sections,
          { id: "orphan", heading: "x", body: "y", linkLabel: "" },
        ],
      },
    });
    const database = getDatabase();
    const [row] = await database
      .select()
      .from(guideTranslation)
      .where(eq(guideTranslation.guideId, english.id));
    expect((row?.sections as unknown[]).length).toBe(3);
  });

  it("removes the Welsh version and cascades with the guide", async () => {
    const english = await createPublished(slugs[0]);
    await saveGuideWelshForAdmin({
      guideId: english.id,
      expectedUpdatedAt: null,
      englishUpdatedAt: english.updatedAt.toISOString(),
      fields: completeWelsh(english),
    });
    expect(await deleteGuideWelshForAdmin(english.id)).toBe("deleted");
    expect(await deleteGuideWelshForAdmin(english.id)).toBe("not_found");
    expect(await deleteGuideWelshForAdmin("nope")).toBe("invalid");
    expect((await getPublicGuideBySlug(slugs[0], "cy"))?.contentLocale).toBe(
      "en",
    );

    await saveGuideWelshForAdmin({
      guideId: english.id,
      expectedUpdatedAt: null,
      englishUpdatedAt: english.updatedAt.toISOString(),
      fields: { title: "Teitl" },
    });
    const database = getDatabase();
    await database.delete(guide).where(eq(guide.id, english.id));
    const left = await database
      .select({ id: guideTranslation.id })
      .from(guideTranslation)
      .where(eq(guideTranslation.guideId, english.id));
    expect(left).toHaveLength(0);
  });

  it("uses Welsh text on related cards, with the right language per card", async () => {
    const one = await createPublished(slugs[0]);
    const two = await createPublished(slugs[1]);
    await saveGuideWelshForAdmin({
      guideId: two.id,
      expectedUpdatedAt: null,
      englishUpdatedAt: two.updatedAt.toISOString(),
      fields: completeWelsh(two),
    });
    const cards = await listRelatedGuideCards(
      { slug: one.slug, area: one.areaLabel, placeId: null },
      3,
      "cy",
    );
    const card = cards.find((item) => item.slug === slugs[1]);
    expect(card?.contentLocale).toBe("cy");
    expect(card?.title).toBe("Coffi annibynnol ar draws y Cymoedd");
    const english = await listRelatedGuideCards(
      { slug: one.slug, area: one.areaLabel, placeId: null },
      3,
      "en",
    );
    expect(english.find((item) => item.slug === slugs[1])?.title).toBe(
      two.title,
    );
  });

  it("reports Welsh progress for the studio list", async () => {
    const one = await createPublished(slugs[0]);
    const two = await createPublished(slugs[1]);
    await saveGuideWelshForAdmin({
      guideId: two.id,
      expectedUpdatedAt: null,
      englishUpdatedAt: two.updatedAt.toISOString(),
      fields: completeWelsh(two),
    });
    const list = await listAllGuidesForAdmin();
    if (list.state !== "ready") throw new Error("expected ready");
    const progress = await listWelshProgressForAdmin(list.guides);
    expect(progress.get(one.id)?.done).toBe(0);
    expect(progress.get(two.id)?.complete).toBe(true);
  });
});
