import { authoredTextLang } from "@/lib/i18n/business-copy";
import { getTranslator } from "@/lib/i18n/server";
import { businessPermissions } from "@/modules/businesses/permissions";
import { listPublishedReviewsForBusiness } from "@/modules/businesses/reviews";
import { removeReviewResponseAction, respondToReviewAction } from "../actions";
import styles from "../operations.module.css";
import { formatDate, hidden, hasPermission } from "./shared";

export async function ReviewsSection({
  businessId,
  userId,
}: {
  businessId: string;
  userId: string;
}) {
  const i18n = await getTranslator();
  const { t } = i18n;
  const canContentPromise = hasPermission(
    userId,
    businessId,
    businessPermissions.manageContent,
  );
  const reviewsResult = await listPublishedReviewsForBusiness(businessId);
  const reviews = reviewsResult.state === "ready" ? reviewsResult.reviews : [];
  const canContent = await canContentPromise;

  return (
    <section
      className={styles.section}
      id="reviews"
      aria-labelledby="reviews-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">{t("ops.reviews.eyebrow")}</p>
          <h2 id="reviews-title">{t("ops.reviews.title")}</h2>
        </div>
        <p className={styles.meta}>{t("ops.reviews.meta")}</p>
      </div>
      {reviews.length === 0 ? (
        <p className={styles.empty}>{t("ops.reviews.none")}</p>
      ) : (
        <ol className={styles.list}>
          {reviews.map((review) => (
            <li className={styles.inboxItem} key={review.id}>
              <div>
                <strong>{"★".repeat(review.rating)}</strong> ·{" "}
                <span lang={authoredTextLang}>{review.reviewerName}</span> ·{" "}
                {formatDate(review.createdAt, i18n)}
              </div>
              {review.body ? (
                <p lang={authoredTextLang}>{review.body}</p>
              ) : null}
              {review.ownerResponseBody ? (
                <div className={styles.card}>
                  <p className={styles.meta}>
                    {t("ops.reviews.yourResponseAt", {
                      date: formatDate(review.ownerResponseAt, i18n),
                    })}
                  </p>
                  <p lang={authoredTextLang}>{review.ownerResponseBody}</p>
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
                      {t("ops.reviews.yourResponse")}
                    </label>
                    <textarea
                      id={`review-response-${review.id}`}
                      name="body"
                      maxLength={1000}
                      defaultValue={review.ownerResponseBody ?? ""}
                      lang={authoredTextLang}
                      placeholder={t("ops.reviews.placeholder")}
                      required
                    />
                    <button className="button primary" type="submit">
                      {review.ownerResponseBody
                        ? t("ops.reviews.update")
                        : t("ops.reviews.post")}
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
                        {t("ops.reviews.remove")}
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
