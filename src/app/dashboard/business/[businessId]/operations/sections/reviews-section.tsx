import { listPublishedReviewsForBusiness } from "@/modules/businesses/reviews";
import { removeReviewResponseAction, respondToReviewAction } from "../actions";
import styles from "../operations.module.css";
import { formatDate, hidden } from "./shared";

export async function ReviewsSection({
  businessId,
  canContent,
}: {
  businessId: string;
  canContent: boolean;
}) {
  const reviewsResult = await listPublishedReviewsForBusiness(businessId);
  const reviews = reviewsResult.state === "ready" ? reviewsResult.reviews : [];

  return (
    <section
      className={styles.section}
      id="reviews"
      aria-labelledby="reviews-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">Resident feedback</p>
          <h2 id="reviews-title">Reviews</h2>
        </div>
        <p className={styles.meta}>
          A public response appears under the review on your website.
        </p>
      </div>
      {reviews.length === 0 ? (
        <p className={styles.empty}>No published reviews yet.</p>
      ) : (
        <ol className={styles.list}>
          {reviews.map((review) => (
            <li className={styles.inboxItem} key={review.id}>
              <div>
                <strong>{"★".repeat(review.rating)}</strong> ·{" "}
                {review.reviewerName} · {formatDate(review.createdAt)}
              </div>
              {review.body ? <p>{review.body}</p> : null}
              {review.ownerResponseBody ? (
                <div className={styles.card}>
                  <p className={styles.meta}>
                    Your response · {formatDate(review.ownerResponseAt)}
                  </p>
                  <p>{review.ownerResponseBody}</p>
                </div>
              ) : null}
              {canContent ? (
                <>
                  <form
                    className={styles.actions}
                    action={respondToReviewAction}
                  >
                    {hidden("businessId", businessId)}
                    {hidden("reviewId", review.id)}
                    <label
                      htmlFor={`review-response-${review.id}`}
                      className="sr-only"
                    >
                      Your response
                    </label>
                    <textarea
                      id={`review-response-${review.id}`}
                      name="body"
                      maxLength={1000}
                      defaultValue={review.ownerResponseBody ?? ""}
                      placeholder="Thank the reviewer or address their feedback publicly…"
                      required
                    />
                    <button className="button primary" type="submit">
                      {review.ownerResponseBody
                        ? "Update response"
                        : "Post response"}
                    </button>
                  </form>
                  {review.ownerResponseBody ? (
                    <form action={removeReviewResponseAction}>
                      {hidden("businessId", businessId)}
                      {hidden("reviewId", review.id)}
                      <button
                        className={`button ${styles.danger}`}
                        type="submit"
                      >
                        Remove response
                      </button>
                    </form>
                  ) : null}
                </>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
