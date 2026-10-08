import type { ContentImageView } from "@/modules/businesses/content-images";
import { isOptimisableMediaUrl } from "@/lib/media-image-config";
import { ContentPictureImage } from "./content-picture-image";

/**
 * Tell the browser how wide a picture is drawn so it can pick the right resized
 * copy. They follow the layouts, measured at 390, 820 and 1280px wide:
 * - card: the offers and events lists (one column up to 1024px, then two).
 * - site: cards on a business website, which may stretch when alone in a row.
 * - wide: the picture on an event page.
 * The caps sit just under steps of Next's default size ladder (1200, 2048) so a
 * 2x screen gets a copy about as wide as it needs, not the next step up.
 */
export const contentPictureSizes = {
  card: "(max-width: 1024px) 100vw, min(50vw, 598px)",
  site: "(max-width: 700px) 100vw, 800px",
  wide: "(max-width: 900px) 100vw, min(100vw, 1000px)",
} as const;

/**
 * The owner-supplied picture of an offer or event. `flush` sits against the
 * edge of a card that already clips its corners; `inset` is for padded cards
 * and rounds its own corners. Renders nothing when there is no picture.
 */
export function ContentPicture({
  image,
  variant = "flush",
  sizes = contentPictureSizes.card,
  priority = false,
}: {
  image: ContentImageView | null | undefined;
  variant?: "flush" | "inset";
  sizes?: string;
  /** For the main picture of a page, which is usually the largest thing above the fold. */
  priority?: boolean;
}) {
  if (!image) return null;
  return (
    <ContentPictureImage
      src={image.url}
      alt={image.altText}
      variant={variant}
      sizes={sizes}
      priority={priority}
      optimised={isOptimisableMediaUrl(
        image.url,
        process.env.R2_PUBLIC_BASE_URL,
      )}
    />
  );
}
