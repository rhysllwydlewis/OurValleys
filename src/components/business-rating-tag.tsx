import type { PublicBusinessRatingSummary } from "@/modules/businesses/types";

/**
 * Compact rating badge for business listing cards (search, category and
 * place pages). aria-label carries the accessible summary so the star glyph
 * itself stays aria-hidden rather than being announced literally.
 */
export function BusinessRatingTag({
  rating,
}: {
  rating: PublicBusinessRatingSummary;
}) {
  if (rating.count === 0 || rating.average === null) {
    return <span className="tag tag--quiet">No reviews yet</span>;
  }

  const average = rating.average.toFixed(1);
  const reviewWord = rating.count === 1 ? "review" : "reviews";

  return (
    <span
      className="tag"
      aria-label={`Rated ${average} out of 5 from ${rating.count} ${reviewWord}`}
    >
      <span aria-hidden="true">
        ★ {average} ({rating.count})
      </span>
    </span>
  );
}
