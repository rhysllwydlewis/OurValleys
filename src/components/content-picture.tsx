import type { ContentImageView } from "@/modules/businesses/content-images";

/**
 * The owner-supplied picture of an offer or event. `flush` sits against the
 * edge of a card that already clips its corners; `inset` is for padded cards
 * and rounds its own corners. Renders nothing when there is no picture.
 */
export function ContentPicture({
  image,
  variant = "flush",
}: {
  image: ContentImageView | null | undefined;
  variant?: "flush" | "inset";
}) {
  if (!image) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`content-picture content-picture--${variant}`}
      src={image.url}
      alt={image.altText}
      width={640}
      height={400}
      loading="lazy"
      decoding="async"
    />
  );
}
