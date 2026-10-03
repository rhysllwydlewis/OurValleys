import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { emailDeliveryLog } from "@/lib/database/schema/business-operations";
import {
  getEmailDeliverySummary,
  recordEmailDelivery,
} from "@/modules/platform/email-delivery-log";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;
const category = "delivery-log-fixture";

describeDatabase("email delivery log", () => {
  afterAll(async () => {
    await getDatabase()
      .delete(emailDeliveryLog)
      .where(eq(emailDeliveryLog.category, category));
    await closeDatabase();
  });

  it("counts sent and failed outcomes and lists recent failures", async () => {
    const before = await getEmailDeliverySummary();
    await recordEmailDelivery({ category, mode: "resend", status: "sent" });
    await recordEmailDelivery({
      category,
      mode: "resend",
      status: "failed",
      error: "x".repeat(500),
    });
    const after = await getEmailDeliverySummary();
    expect(after.sent).toBe(before.sent + 1);
    expect(after.failed).toBe(before.failed + 1);
    const failure = after.recentFailures.find((f) => f.category === category);
    expect(failure?.error).toHaveLength(200);
  });
});
