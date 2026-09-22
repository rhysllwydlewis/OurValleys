import type { CSSProperties } from "react";
import type { PublicBusinessCardImage } from "@/modules/businesses/types";

/**
 * Renders the business's hero/logo photo as the `.business-card__art` tile
 * background, keeping the same dark scrim the tile already uses so the
 * overlaid label text stays legible. Returns undefined when there is no
 * photo, so the tile falls back to its default gradient and initials.
 */
export function businessCardArtStyle(
  cardImage: PublicBusinessCardImage | null | undefined,
): CSSProperties | undefined {
  if (!cardImage) return undefined;
  return {
    backgroundImage: `linear-gradient(180deg, transparent 35%, rgba(16, 23, 20, 0.75)), url(${cardImage.url})`,
    backgroundSize: "cover",
    backgroundPosition: `${cardImage.focalX}% ${cardImage.focalY}%`,
  };
}
