import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const client = databaseUrl ? postgres(databaseUrl, { max: 1 }) : null;

describeDatabase("database scaffold proof", () => {
  beforeAll(async () => {
    if (!client) throw new Error("TEST_DATABASE_URL is required.");
    await client`select 1`;
  });

  afterAll(async () => {
    await client?.end({ timeout: 5 });
  });

  it("has required PostgreSQL extensions", async () => {
    if (!client) throw new Error("TEST_DATABASE_URL is required.");
    const extensions = await client<{ extname: string }[]>`
      select extname
      from pg_extension
      where extname in ('postgis', 'pg_trgm', 'unaccent')
      order by extname
    `;

    expect(extensions.map((row) => row.extname)).toEqual([
      "pg_trgm",
      "postgis",
      "unaccent",
    ]);
  });

  it("contains the repeatable seeded proof record", async () => {
    if (!client) throw new Error("TEST_DATABASE_URL is required.");
    const rows = await client<{ proof_value: string }[]>`
      select proof_value
      from scaffold_proof
      where proof_key = 'database'
    `;

    expect(rows).toEqual([
      { proof_value: "PostgreSQL and Drizzle are connected." },
    ]);
  });
});
