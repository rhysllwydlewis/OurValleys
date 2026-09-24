import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { featureFlag, user } from "@/lib/database/schema";
import {
  createFeatureFlagForAdmin,
  isFeatureEnabled,
  listFeatureFlagsForAdmin,
  updateFeatureFlagForAdmin,
} from "@/modules/platform/feature-flags";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  key: "fixture-flag",
  actorId: "00000000-0000-4000-8000-000000001301",
} as const;

describeDatabase("feature flags", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.actorId,
      name: "Fixture Admin",
      email: "fixture-flags-admin@example.test",
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(featureFlag).where(eq(featureFlag.key, fixture.key));
    await database.delete(user).where(eq(user.id, fixture.actorId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("treats a flag that does not exist as disabled", async () => {
    expect(await isFeatureEnabled("no-such-flag")).toBe(false);
  });

  it("creates a flag disabled by default and lists it back", async () => {
    const created = await createFeatureFlagForAdmin(
      {
        key: fixture.key,
        name: "Fixture flag",
        description: "A flag created only for the integration test suite.",
      },
      fixture.actorId,
    );
    expect(created.status).toBe("created");

    expect(await isFeatureEnabled(fixture.key)).toBe(false);

    const list = await listFeatureFlagsForAdmin();
    expect(list.state).toBe("ready");
    if (list.state !== "ready") return;
    const entry = list.flags.find((flag) => flag.key === fixture.key);
    expect(entry).toMatchObject({
      key: fixture.key,
      name: "Fixture flag",
      enabled: false,
      environments: [],
    });
  });

  it("rejects a duplicate key", async () => {
    await createFeatureFlagForAdmin(
      {
        key: fixture.key,
        name: "Fixture flag",
        description: "A flag created only for the integration test suite.",
      },
      fixture.actorId,
    );

    const duplicate = await createFeatureFlagForAdmin(
      {
        key: fixture.key,
        name: "Fixture flag again",
        description: "A flag created only for the integration test suite.",
      },
      fixture.actorId,
    );
    expect(duplicate.status).toBe("duplicate_key");
  });

  it("enables a flag for every environment when none are listed", async () => {
    const created = await createFeatureFlagForAdmin(
      {
        key: fixture.key,
        name: "Fixture flag",
        description: "A flag created only for the integration test suite.",
      },
      fixture.actorId,
    );
    if (created.status !== "created") throw new Error("setup failed");

    await updateFeatureFlagForAdmin(
      {
        id: created.id,
        name: "Fixture flag",
        description: "A flag created only for the integration test suite.",
        enabled: true,
        environments: [],
      },
      fixture.actorId,
    );

    expect(await isFeatureEnabled(fixture.key)).toBe(true);
  });

  it("only enables a flag in its listed environments", async () => {
    const created = await createFeatureFlagForAdmin(
      {
        key: fixture.key,
        name: "Fixture flag",
        description: "A flag created only for the integration test suite.",
      },
      fixture.actorId,
    );
    if (created.status !== "created") throw new Error("setup failed");

    await updateFeatureFlagForAdmin(
      {
        id: created.id,
        name: "Fixture flag",
        description: "A flag created only for the integration test suite.",
        enabled: true,
        environments: ["production"],
      },
      fixture.actorId,
    );

    // The test suite runs with NODE_ENV=test, which is not in the flag's
    // environment list, so it must stay off here.
    expect(await isFeatureEnabled(fixture.key)).toBe(false);
  });

  it("keeps a flag disabled everywhere when enabled is false, even with environments listed", async () => {
    const created = await createFeatureFlagForAdmin(
      {
        key: fixture.key,
        name: "Fixture flag",
        description: "A flag created only for the integration test suite.",
      },
      fixture.actorId,
    );
    if (created.status !== "created") throw new Error("setup failed");

    await updateFeatureFlagForAdmin(
      {
        id: created.id,
        name: "Fixture flag",
        description: "A flag created only for the integration test suite.",
        enabled: false,
        environments: ["test"],
      },
      fixture.actorId,
    );

    expect(await isFeatureEnabled(fixture.key)).toBe(false);
  });
});
