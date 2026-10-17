import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { foldedMatch } from "@/modules/search/folded-sql";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

async function matches(
  value: string,
  query: string,
  fuzzy = false,
): Promise<boolean> {
  const rows = await getDatabase().execute<{ hit: boolean }>(
    sql`select ${foldedMatch(sql`${value}::text`, query, { fuzzy })} as hit`,
  );
  return rows[0]?.hit === true;
}

describeDatabase("foldedMatch against PostgreSQL", () => {
  afterAll(async () => {
    await closeDatabase();
  });

  it("ignores accents and case in both directions", async () => {
    expect(await matches("Café Night", "cafe")).toBe(true);
    expect(await matches("Cafe Night", "CAFÉ")).toBe(true);
    expect(await matches("Noson yn y Rhôndda", "rhondda")).toBe(true);
  });

  it("matches literally, not as wildcards", async () => {
    expect(await matches("Summer fair", "%")).toBe(false);
    expect(await matches("50% off", "50%")).toBe(true);
  });

  it("tolerates a typo only when fuzzy", async () => {
    expect(await matches("Bakery open morning", "bakry")).toBe(false);
    expect(await matches("Bakery", "bakry", true)).toBe(true);
    expect(await matches("Plumbing", "bakry", true)).toBe(false);
  });
});
