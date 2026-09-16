import type { Metadata, Route } from "next";
import Link from "next/link";
import { listReviewsForModeration } from "@/modules/businesses/reviews";
import styles from "../admin.module.css";
import { statusLabel, statusTone } from "../status-tone";
import { ReviewRowActions } from "./review-row-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reviews",
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/London",
  }).format(value);
}

function renderStars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter =
    status === "published" || status === "hidden" ? status : undefined;
  const result = await listReviewsForModeration(filter);

  return (
    <section>
      <h2>Reviews</h2>
      <div className={styles.filterBar}>
        {(["published", "hidden"] as const).map((value) => (
          <Link
            key={value}
            href={`/admin/reviews?status=${value}` as Route}
            aria-current={filter === value ? "page" : undefined}
            className={`${styles.filterLink} ${filter === value ? styles.filterLinkActive : ""}`}
          >
            {statusLabel(value)}
          </Link>
        ))}
        <Link
          href={"/admin/reviews" as Route}
          aria-current={!filter ? "page" : undefined}
          className={`${styles.filterLink} ${!filter ? styles.filterLinkActive : ""}`}
        >
          All
        </Link>
      </div>

      {result.state === "unavailable" ? (
        <div className={styles.emptyState}>
          Reviews are temporarily unavailable. Please try again shortly.
        </div>
      ) : result.reviews.length === 0 ? (
        <div className={styles.emptyState}>No reviews match this filter.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Business</th>
                <th>Reviewer</th>
                <th>Rating</th>
                <th>Review</th>
                <th>Status</th>
                <th>Posted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.reviews.map((review) => (
                <tr key={review.id}>
                  <td>
                    <Link
                      className={styles.rowLink}
                      href={`/admin/businesses/${review.businessId}` as Route}
                    >
                      {review.businessTradingName}
                    </Link>
                  </td>
                  <td>{review.reviewerName}</td>
                  <td aria-label={`${review.rating} out of 5 stars`}>
                    {renderStars(review.rating)}
                  </td>
                  <td>{review.body ?? "—"}</td>
                  <td>
                    <span
                      className={`${styles.pill} ${styles[statusTone(review.status)]}`}
                    >
                      {statusLabel(review.status)}
                    </span>
                  </td>
                  <td>{formatDate(review.createdAt)}</td>
                  <td>
                    <ReviewRowActions
                      reviewId={review.id}
                      status={review.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
