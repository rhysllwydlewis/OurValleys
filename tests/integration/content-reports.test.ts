import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, category } from "@/lib/database/schema/business";
import { contentReport } from "@/lib/database/schema/moderation";
import {
  dismissContentReport,
  listContentReports,
  resolveContentReport,
  submitContentReport,
} from "@/modules/moderation/content-reports";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000000921",
  businessId: "00000000-0000-4000-8000-000000000922",
  adminUserId: "00000000-0000-4000-8000-000000000923",
} as const;

describeDatabase("content reports", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture report services",
      slug: "fixture-report-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.businessId,
      tradingName: "Content Report Fixture Studio",
      slug: "content-report-fixture-studio",
      summary: "A fictional business used only by content-report tests.",
      description: "Fictional description.",
      primaryCategoryId: fixture.categoryId,
      businessType: "limited_company",
    });
    await database.insert(user).values({
      id: fixture.adminUserId,
      name: "Fixture Admin",
      email: "admin@report-fixture.test",
      emailVerified: true,
      role: "admin",
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(contentReport)
      .where(eq(contentReport.businessId, fixture.businessId));
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.adminUserId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("refuses a report against a business that does not exist", async () => {
    const result = await submitContentReport({
      businessId: "00000000-0000-4000-8000-000000000999",
      reason: "other",
    });
    expect(result).toEqual({ status: "not_found" });
  });

  it("accepts an anonymous report and lists it as open", async () => {
    const submission = await submitContentReport({
      businessId: fixture.businessId,
      reason: "incorrect_details",
      details: "The phone number is wrong.",
    });
    expect(submission).toEqual({ status: "submitted" });

    const openReports = await listContentReports("open");
    expect(openReports.state).toBe("ready");
    if (openReports.state !== "ready") throw new Error("Expected ready");
    expect(openReports.reports).toHaveLength(1);
    expect(openReports.reports[0]?.reason).toBe("incorrect_details");
    expect(openReports.reports[0]?.reporterEmail).toBeNull();
  });

  it("resolves an open report and removes it from the open filter", async () => {
    await submitContentReport({
      businessId: fixture.businessId,
      reason: "other",
    });
    const [report] = (await listContentReports("open")).reports;
    if (!report) throw new Error("Expected a report to exist");

    const resolution = await resolveContentReport({
      reportId: report.id,
      adminUserId: fixture.adminUserId,
      note: "Confirmed and corrected.",
    });
    expect(resolution).toEqual({ status: "updated" });

    const stillOpen = await listContentReports("open");
    expect(stillOpen.reports).toHaveLength(0);
    const resolved = await listContentReports("resolved");
    expect(resolved.reports).toHaveLength(1);
  });

  it("does not allow resolving the same report twice", async () => {
    await submitContentReport({
      businessId: fixture.businessId,
      reason: "other",
    });
    const [report] = (await listContentReports("open")).reports;
    if (!report) throw new Error("Expected a report to exist");

    await resolveContentReport({
      reportId: report.id,
      adminUserId: fixture.adminUserId,
    });
    const second = await dismissContentReport({
      reportId: report.id,
      adminUserId: fixture.adminUserId,
    });
    expect(second).toEqual({ status: "not_found" });
  });
});
