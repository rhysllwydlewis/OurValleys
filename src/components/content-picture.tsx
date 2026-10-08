import type { ContentImageView } from "@/modules/businesses/content-images";
import { isOptimisableMediaUrl } from "@/lib/media-image-config";
import { ContentPictureImage } from "./content-picture-image";

export const contentPictureSizes = {
  card: "(max-width: 700px) 100vw, 360px",
  wide: "(max-width: 900px) 100vw, 800px",
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
}: {
  image: ContentImageView | null | undefined;
  variant?: "flush" | "inset";
  sizes?: string;
}) {
  if (!image) return null;
  return (
    <ContentPictureImage
      src={image.url}
      alt={image.altText}
      variant={variant}
      sizes={sizes}
      optimised={isOptimisableMediaUrl(
        image.url,
        process.env.R2_PUBLIC_BASE_URL,
      )}
    />
  );
}
