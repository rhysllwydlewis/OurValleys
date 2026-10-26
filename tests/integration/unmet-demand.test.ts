import { like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { searchZeroResult } from "@/lib/database/schema/business-operations";
import { listUnmetDemand } from "@/modules/platform/unmet-demand";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const PREFIX = "zz-unmet-demand";
const DAY_MS = 24 * 60 * 60 * 1000;

describeDatabase("listUnmetDemand", () => {
  const now = new Date();

  beforeAll(async () => {
    await getDatabase()
      .delete(searchZeroResult)
      .where(like(searchZeroResult.queryText, `${PREFIX}%`));
    await getDatabase()
      .insert(searchZeroResult)
      .values([
        {
          queryText: `${PREFIX} Bakery`,
          occurredAt: new Date(now.getTime() - DAY_MS),
        },
        {
          queryText: `  ${PREFIX}   bakery `,
          occurredAt: new Date(now.getTime() - 2 * DAY_MS),
        },
        {
          queryText: `${PREFIX} bakery`,
          placeSlug: "pontypridd",
          occurredAt: now,
        },
        {
          queryText: `${PREFIX} old`,
          occurredAt: new Date(now.getTime() - 60 * DAY_MS),
        },
      ]);
  });

  afterAll(async () => {
    await getDatabase()
      .delete(searchZeroResult)
      .where(like(searchZeroResult.queryText, `${PREFIX}%`));
    await closeDatabase();
  });

  it("merges wording that differs only by case and spacing, per filter set", async () => {
    const rows = (await listUnmetDemand(30, now)).filter((row) =>
      row.queryText?.startsWith(PREFIX),
    );
    const plain = rows.find((row) => row.placeSlug === null);
    const placed = rows.find((row) => row.placeSlug === "pontypridd");

    expect(plain).toMatchObject({
      queryText: `${PREFIX} bakery`,
      occurrences: 2,
    });
    expect(placed?.occurrences).toBe(1);
  });

  it("leaves out searches older than the window", async () => {
    const short = await listUnmetDemand(7, now);
    const wide = await listUnmetDemand(90, now);

    expect(short.some((row) => row.queryText === `${PREFIX} old`)).toBe(false);
    expect(wide.some((row) => row.queryText === `${PREFIX} old`)).toBe(true);
  });
});
