"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import {
  deleteReviewAction,
  submitReviewAction,
} from "@/app/b/[businessSlug]/review-actions";
import styles from "./business-reviews.module.css";

export type BusinessReviewView = {
  id: string;
  rating: number;
  body: string | null;
  reviewerName: string;
  dateLabel: string;
};

export type BusinessReviewsProps = {
  businessId: string;
  reviews: BusinessReviewView[];
  ratingAverage: number | null;
  ratingCount: number;
  viewerState: "anonymous" | "eligible" | "forbidden";
  ownReview: { rating: number; body: string | null } | null;
  loginHref: string;
};

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className={styles.stars} aria-hidden="true">
      {"★★★★★".slice(0, rating)}
      {"☆☆☆☆☆".slice(0, 5 - rating)}
    </span>
  );
}

export function BusinessReviews({
  businessId,
  reviews,
  ratingAverage,
  ratingCount,
  viewerState,
  ownReview,
  loginHref,
}: BusinessReviewsProps) {
  const [rating, setRating] = useState(ownReview?.rating ?? 0);
  const [body, setBody] = useState(ownReview?.body ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasOwnReview, setHasOwnReview] = useState(Boolean(ownReview));
  const [outcome, setOutcome] = useState<
    "idle" | "saved" | "removed" | "error"
  >("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating < 1) {
      setOutcome("error");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await submitReviewAction({
        businessId,
        rating,
        body: body.trim() || undefined,
      });
      setOutcome(result.status === "submitted" ? "saved" : "error");
      if (result.status === "submitted") setHasOwnReview(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove() {
    setIsSubmitting(true);
    try {
      const result = await deleteReviewAction(businessId);
      if (result.status === "removed") {
        setHasOwnReview(false);
        setRating(0);
        setBody("");
        setOutcome("removed");
      } else {
        setOutcome("error");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="state-panel"
    >
      <p className="eyebrow">Resident reviews</p>
      <h2 id="reviews-heading">What locals say</h2>
      <div className={styles.summary}>
        {ratingCount > 0 && ratingAverage !== null ? (
          <>
            <span className={styles.summaryScore}>
              {ratingAverage.toFixed(1)} / 5
            </span>
            <StarDisplay rating={Math.round(ratingAverage)} />
            <span className={styles.summaryCount}>
              {ratingCount} {ratingCount === 1 ? "review" : "reviews"}
            </span>
          </>
        ) : (
          <span className={styles.summaryCount}>No reviews yet.</span>
        )}
      </div>

      {reviews.length > 0 ? (
        <ul className={styles.list}>
          {reviews.map((review) => (
            <li key={review.id} className={styles.reviewCard}>
              <div className={styles.reviewMeta}>
                <StarDisplay rating={review.rating} />
                <span className={styles.reviewerName}>
                  {review.reviewerName}
                </span>
                <span>{review.dateLabel}</span>
              </div>
              {review.body ? (
                <p className={styles.reviewBody}>{review.body}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {viewerState === "forbidden" ? (
        <p className="field-hint">Shared demo accounts cannot post reviews.</p>
      ) : viewerState === "anonymous" ? (
        <p>
          <a className="button primary" href={loginHref}>
            Sign in to leave a review
          </a>
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="review-rating">Your rating</label>
            <select
              id="review-rating"
              value={rating || ""}
              onChange={(event) => setRating(Number(event.target.value))}
            >
              <option value="" disabled>
                Choose a rating
              </option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value} star{value === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="review-body">Your review (optional)</label>
            <textarea
              id="review-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={2000}
              placeholder="What was your experience with this business?"
            />
          </div>
          {outcome === "error" ? (
            <p className="field-error" role="alert">
              {rating < 1
                ? "Choose a star rating before posting."
                : "This could not be saved. Please try again shortly."}
            </p>
          ) : outcome === "saved" ? (
            <p role="status">Your review has been posted.</p>
          ) : outcome === "removed" ? (
            <p role="status">Your review has been removed.</p>
          ) : null}
          <div className={styles.ownReviewActions}>
            <button
              className="button primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving…"
                : hasOwnReview
                  ? "Update review"
                  : "Post review"}
            </button>
            {hasOwnReview ? (
              <button
                className="button"
                type="button"
                disabled={isSubmitting}
                onClick={handleRemove}
              >
                Remove review
              </button>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}
