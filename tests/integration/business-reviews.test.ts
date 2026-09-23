import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, category } from "@/lib/database/schema/business";
import { businessReview } from "@/lib/database/schema/business-reviews";
import {
  deleteOwnReview,
  getBusinessRatingSummary,
  getOwnReviewForBusiness,
  hideReview,
  listPublishedReviewsForBusiness,
  listReviewsForModeration,
  removeReviewResponse,
  respondToReview,
  restoreReview,
  submitBusinessReview,
} from "@/modules/businesses/reviews";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000000931",
  businessId: "00000000-0000-4000-8000-000000000932",
  reviewerUserId: "00000000-0000-4000-8000-000000000933",
  otherReviewerUserId: "00000000-0000-4000-8000-000000000934",
  adminUserId: "00000000-0000-4000-8000-000000000935",
  ownerUserId: "00000000-0000-4000-8000-000000000936",
  otherBusinessId: "00000000-0000-4000-8000-000000000937",
} as const;

describeDatabase("business reviews", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture review services",
      slug: "fixture-review-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values([
      {
        id: fixture.businessId,
        tradingName: "Business Review Fixture Studio",
        slug: "business-review-fixture-studio",
        summary: "A fictional business used only by review tests.",
        description: "Fictional description.",
        primaryCategoryId: fixture.categoryId,
        businessType: "limited_company",
      },
      {
        id: fixture.otherBusinessId,
        tradingName: "Other Business Review Fixture Studio",
        slug: "other-business-review-fixture-studio",
        summary: "A second fictional business used only by review tests.",
        description: "Fictional description.",
        primaryCategoryId: fixture.categoryId,
        businessType: "limited_company",
      },
    ]);
    await database.insert(user).values([
      {
        id: fixture.reviewerUserId,
        name: "Fixture Reviewer",
        email: "reviewer@review-fixture.test",
        emailVerified: true,
      },
      {
        id: fixture.otherReviewerUserId,
        name: "Second Fixture Reviewer",
        email: "second-reviewer@review-fixture.test",
        emailVerified: true,
      },
      {
        id: fixture.adminUserId,
        name: "Fixture Admin",
        email: "admin@review-fixture.test",
        emailVerified: true,
        role: "admin",
      },
      {
        id: fixture.ownerUserId,
        name: "Fixture Owner",
        email: "owner@review-fixture.test",
        emailVerified: true,
      },
    ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(businessReview)
      .where(eq(businessReview.businessId, fixture.businessId));
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database
      .delete(business)
      .where(eq(business.id, fixture.otherBusinessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.reviewerUserId));
    await database.delete(user).where(eq(user.id, fixture.otherReviewerUserId));
    await database.delete(user).where(eq(user.id, fixture.adminUserId));
    await database.delete(user).where(eq(user.id, fixture.ownerUserId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("refuses a review against a business that does not exist", async () => {
    const result = await submitBusinessReview(fixture.reviewerUserId, {
      businessId: "00000000-0000-4000-8000-000000000999",
      rating: 5,
    });
    expect(result).toEqual({ status: "not_found" });
  });

  it("accepts a review and includes it in the published list and rating summary", async () => {
    const submission = await submitBusinessReview(fixture.reviewerUserId, {
      businessId: fixture.businessId,
      rating: 4,
      body: "Did a great job fixing the boiler.",
    });
    expect(submission).toEqual({ status: "submitted" });

    const reviews = await listPublishedReviewsForBusiness(fixture.businessId);
    expect(reviews.state).toBe("ready");
    if (reviews.state !== "ready") throw new Error("Expected ready");
    expect(reviews.reviews).toHaveLength(1);
    expect(reviews.reviews[0]?.rating).toBe(4);
    expect(reviews.reviews[0]?.reviewerName).toBe("Fixture Reviewer");

    const summary = await getBusinessRatingSummary(fixture.businessId);
    expect(summary).toEqual({ average: 4, count: 1 });
  });

  it("replaces a resident's existing review instead of creating a duplicate", async () => {
    await submitBusinessReview(fixture.reviewerUserId, {
      businessId: fixture.businessId,
      rating: 2,
      body: "Initial impression.",
    });
    const update = await submitBusinessReview(fixture.reviewerUserId, {
      businessId: fixture.businessId,
      rating: 5,
      body: "Updated after they resolved the issue.",
    });
    expect(update).toEqual({ status: "submitted" });

    const reviews = await listPublishedReviewsForBusiness(fixture.businessId);
    if (reviews.state !== "ready") throw new Error("Expected ready");
    expect(reviews.reviews).toHaveLength(1);
    expect(reviews.reviews[0]?.rating).toBe(5);

    const ownReview = await getOwnReviewForBusiness(
      fixture.reviewerUserId,
      fixture.businessId,
    );
    expect(ownReview).toEqual({
      rating: 5,
      body: "Updated after they resolved the issue.",
    });
  });

  it("averages ratings across multiple residents", async () => {
    await submitBusinessReview(fixture.reviewerUserId, {
      businessId: fixture.businessId,
      rating: 3,
    });
    await submitBusinessReview(fixture.otherReviewerUserId, {
      businessId: fixture.businessId,
      rating: 5,
    });

    const summary = await getBusinessRatingSummary(fixture.businessId);
    expect(summary).toEqual({ average: 4, count: 2 });
  });

  it("removes a resident's own review", async () => {
    await submitBusinessReview(fixture.reviewerUserId, {
      businessId: fixture.businessId,
      rating: 3,
    });
    const removal = await deleteOwnReview(
      fixture.reviewerUserId,
      fixture.businessId,
    );
    expect(removal).toBe("removed");

    const reviews = await listPublishedReviewsForBusiness(fixture.businessId);
    if (reviews.state !== "ready") throw new Error("Expected ready");
    expect(reviews.reviews).toHaveLength(0);
  });

  it("hides a review from the public list until an admin restores it", async () => {
    await submitBusinessReview(fixture.reviewerUserId, {
      businessId: fixture.businessId,
      rating: 1,
      body: "Reported as abusive.",
    });
    const [review] = (await listReviewsForModeration()).reviews;
    if (!review) throw new Error("Expected a review to exist");

    const hidden = await hideReview({
      reviewId: review.id,
      adminUserId: fixture.adminUserId,
      reason: "Abusive language.",
    });
    expect(hidden).toBe("updated");

    const afterHide = await listPublishedReviewsForBusiness(fixture.businessId);
    if (afterHide.state !== "ready") throw new Error("Expected ready");
    expect(afterHide.reviews).toHaveLength(0);

    const summaryWhileHidden = await getBusinessRatingSummary(
      fixture.businessId,
    );
    expect(summaryWhileHidden).toEqual({ average: null, count: 0 });

    const restored = await restoreReview({
      reviewId: review.id,
      adminUserId: fixture.adminUserId,
    });
    expect(restored).toBe("updated");

    const afterRestore = await listPublishedReviewsForBusiness(
      fixture.businessId,
    );
    if (afterRestore.state !== "ready") throw new Error("Expected ready");
    expect(afterRestore.reviews).toHaveLength(1);
  });

  it("lets an owner respond publicly to a review and later remove the response", async () => {
    await submitBusinessReview(fixture.reviewerUserId, {
      businessId: fixture.businessId,
      rating: 2,
      body: "The wait was longer than expected.",
    });
    const [review] = (await listPublishedReviewsForBusiness(fixture.businessId))
      .reviews;
    if (!review) throw new Error("Expected a review to exist");

    const responded = await respondToReview({
      reviewId: review.id,
      businessId: fixture.businessId,
      responderUserId: fixture.ownerUserId,
      body: "Thanks for the feedback, we have taken on extra staff.",
    });
    expect(responded).toBe("saved");

    const withResponse = await listPublishedReviewsForBusiness(
      fixture.businessId,
    );
    if (withResponse.state !== "ready") throw new Error("Expected ready");
    expect(withResponse.reviews[0]?.ownerResponseBody).toBe(
      "Thanks for the feedback, we have taken on extra staff.",
    );
    expect(withResponse.reviews[0]?.ownerResponseAt).not.toBeNull();

    const removed = await removeReviewResponse({
      reviewId: review.id,
      businessId: fixture.businessId,
    });
    expect(removed).toBe("saved");

    const withoutResponse = await listPublishedReviewsForBusiness(
      fixture.businessId,
    );
    if (withoutResponse.state !== "ready") throw new Error("Expected ready");
    expect(withoutResponse.reviews[0]?.ownerResponseBody).toBeNull();
  });

  it("refuses a response targeting a review that belongs to a different business", async () => {
    await submitBusinessReview(fixture.reviewerUserId, {
      businessId: fixture.businessId,
      rating: 5,
    });
    const [review] = (await listPublishedReviewsForBusiness(fixture.businessId))
      .reviews;
    if (!review) throw new Error("Expected a review to exist");

    const result = await respondToReview({
      reviewId: review.id,
      businessId: fixture.otherBusinessId,
      responderUserId: fixture.ownerUserId,
      body: "This should not be applied.",
    });
    expect(result).toBe("not_found");

    const reviews = await listPublishedReviewsForBusiness(fixture.businessId);
    if (reviews.state !== "ready") throw new Error("Expected ready");
    expect(reviews.reviews[0]?.ownerResponseBody).toBeNull();
  });

  it("rejects an empty or oversized response body", async () => {
    await submitBusinessReview(fixture.reviewerUserId, {
      businessId: fixture.businessId,
      rating: 5,
    });
    const [review] = (await listPublishedReviewsForBusiness(fixture.businessId))
      .reviews;
    if (!review) throw new Error("Expected a review to exist");

    const empty = await respondToReview({
      reviewId: review.id,
      businessId: fixture.businessId,
      responderUserId: fixture.ownerUserId,
      body: "   ",
    });
    expect(empty).toBe("invalid");

    const oversized = await respondToReview({
      reviewId: review.id,
      businessId: fixture.businessId,
      responderUserId: fixture.ownerUserId,
      body: "a".repeat(1001),
    });
    expect(oversized).toBe("invalid");
  });

  it("refuses a response to a review an admin has hidden", async () => {
    await submitBusinessReview(fixture.reviewerUserId, {
      businessId: fixture.businessId,
      rating: 1,
      body: "Reported as abusive.",
    });
    const [review] = (await listReviewsForModeration()).reviews;
    if (!review) throw new Error("Expected a review to exist");

    const hidden = await hideReview({
      reviewId: review.id,
      adminUserId: fixture.adminUserId,
      reason: "Abusive language.",
    });
    expect(hidden).toBe("updated");

    const result = await respondToReview({
      reviewId: review.id,
      businessId: fixture.businessId,
      responderUserId: fixture.ownerUserId,
      body: "This should not be applied while hidden.",
    });
    expect(result).toBe("not_found");
  });
});
