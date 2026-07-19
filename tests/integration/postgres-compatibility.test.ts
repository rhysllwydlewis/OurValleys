import { afterAll, describe, expect, it } from "vitest";
import postgres from "postgres";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const client = databaseUrl ? postgres(databaseUrl, { max: 1 }) : null;

describeDatabase("PostgreSQL compatibility", () => {
  afterAll(async () => {
    await client?.end({ timeout: 2 });
  });

  it("provides PostGIS, pg_trgm and unaccent", async () => {
    if (!client) throw new Error("TEST_DATABASE_URL is required.");
    await client.unsafe("create extension if not exists postgis");
    await client.unsafe("create extension if not exists pg_trgm");
    await client.unsafe("create extension if not exists unaccent");
    const rows = await client<{ extname: string }[]>`select extname from pg_extension where extname in ('postgis', 'pg_trgm', 'unaccent') order by extname`;
    expect(rows.map((row) => row.extname)).toEqual(["pg_trgm", "postgis", "unaccent"]);
  });

  it("can execute a geography distance expression", async () => {
    if (!client) throw new Error("TEST_DATABASE_URL is required.");
    const [result] = await client<{ within_radius: boolean }[]>`
      select ST_DWithin(
        ST_SetSRID(ST_MakePoint(-3.505, 51.659), 4326)::geography,
        ST_SetSRID(ST_MakePoint(-3.455, 51.622), 4326)::geography,
        10000
      ) as within_radius
    `;
    expect(result?.within_radius).toBe(true);
  });
});
