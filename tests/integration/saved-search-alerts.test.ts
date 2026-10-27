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
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { notification } from "@/lib/database/schema/notification";
import { savedSearch } from "@/lib/database/schema/saved-search";
import {
  applyUnsubscribe,
  createUnsubscribeToken,
} from "@/lib/notification-unsubscribe";
import { runSavedSearchAlerts } from "@/modules/residents/saved-search-alerts";
import { setSavedSearchAlertForUser } from "@/modules/residents/saved-searches";

const sent = vi.hoisted(() => [] as Array<{ to: string; text: string }>);
const totals = vi.hoisted(() => ({ value: 5 }));
vi.mock("@/lib/email", () => ({
  sendTransactionalEmail: async (message: { to: string; text: string }) => {
    sent.push(message);
  },
}));
vi.mock("@/modules/search/site-search", () => ({
  searchSite: async () => ({
    state: "ready",
    complete: true,
    total: totals.value,
    counts: {},
  }),
}));

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  optedInId: "00000000-0000-4000-8000-000000004201",
  otherId: "00000000-0000-4000-8000-000000004202",
  bannedId: "00000000-0000-4000-8000-000000004203",
  searchId: "00000000-0000-4000-8000-000000004211",
  otherSearchId: "00000000-0000-4000-8000-000000004212",
  bannedSearchId: "00000000-0000-4000-8000-000000004213",
} as const;

describeDatabase("saved-search alerts", () => {
  beforeEach(async () => {
    sent.length = 0;
    totals.value = 5;
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.optedInId,
        name: "Alert Resident",
        email: "alert.in@example.test",
        emailVerified: true,
      },
      {
        id: fixture.otherId,
        name: "Other Resident",
        email: "alert.other@example.test",
        emailVerified: true,
      },
      {
        id: fixture.bannedId,
        name: "Banned Resident",
        email: "alert.banned@example.test",
        emailVerified: true,
        banned: true,
      },
    ]);
    const row = (id: string, userId: string) => ({
      id,
      userId,
      query: "bakery",
      queryKey: "bakery",
      type: "all",
      lastSeenTotal: 5,
    });
    await database
      .insert(savedSearch)
      .values([
        row(fixture.searchId, fixture.optedInId),
        row(fixture.otherSearchId, fixture.otherId),
        row(fixture.bannedSearchId, fixture.bannedId),
      ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    for (const id of [fixture.optedInId, fixture.otherId, fixture.bannedId]) {
      await database.delete(user).where(eq(user.id, id));
    }
  });

  afterAll(async () => {
    await closeDatabase();
  });

  async function enable(userId: string, searchId: string) {
    return setSavedSearchAlertForUser(userId, searchId, true);
  }

  it("sends nothing for searches that never had alerts turned on", async () => {
    totals.value = 9;
    const result = await runSavedSearchAlerts();
    expect(result.recipients).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("alerts once about new results and not again until more arrive", async () => {
    expect(await enable(fixture.optedInId, fixture.searchId)).toBe("alerts_on");

    const quiet = await runSavedSearchAlerts();
    expect(quiet).toMatchObject({ sent: 0, skippedEmpty: 1 });

    totals.value = 8;
    const first = await runSavedSearchAlerts();
    expect(first).toMatchObject({ recipients: 1, sent: 1, failed: 0 });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe("alert.in@example.test");
    expect(sent[0]!.text).toContain("3 new results");
    const inSite = await getDatabase()
      .select()
      .from(notification)
      .where(eq(notification.userId, fixture.optedInId));
    expect(inSite).toHaveLength(1);
    expect(inSite[0]).toMatchObject({
      kind: "saved_search_results",
      params: { query: "bakery", count: 3 },
    });

    const repeat = await runSavedSearchAlerts();
    expect(repeat.sent).toBe(0);
    expect(sent).toHaveLength(1);

    totals.value = 9;
    await runSavedSearchAlerts();
    expect(sent).toHaveLength(2);
    expect(sent[1]!.text).toContain("1 new result ");
  });

  it("does not alert banned residents", async () => {
    await enable(fixture.bannedId, fixture.bannedSearchId);
    totals.value = 9;
    const result = await runSavedSearchAlerts();
    expect(result.recipients).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("refuses to change another resident's search", async () => {
    expect(await enable(fixture.otherId, fixture.searchId)).toBe("not_found");
    const [row] = await getDatabase()
      .select({ emailAlerts: savedSearch.emailAlerts })
      .from(savedSearch)
      .where(eq(savedSearch.id, fixture.searchId));
    expect(row?.emailAlerts).toBe(false);
  });

  it("unsubscribes only the resident named in the signed link", async () => {
    await enable(fixture.optedInId, fixture.searchId);
    await enable(fixture.otherId, fixture.otherSearchId);

    expect(
      await applyUnsubscribe(
        "saved_search_alert",
        fixture.optedInId,
        "0".repeat(64),
      ),
    ).toBe("invalid");

    const token = createUnsubscribeToken(
      "saved_search_alert",
      fixture.optedInId,
    );
    expect(
      await applyUnsubscribe("saved_search_alert", fixture.optedInId, token),
    ).toBe("unsubscribed");

    const rows = await getDatabase()
      .select({ id: savedSearch.id, emailAlerts: savedSearch.emailAlerts })
      .from(savedSearch);
    const alerts = Object.fromEntries(rows.map((r) => [r.id, r.emailAlerts]));
    expect(alerts[fixture.searchId]).toBe(false);
    expect(alerts[fixture.otherSearchId]).toBe(true);
  });
});
