import { GuideImage } from "./guide-image";
import type { GuideCardMedia } from "./guide-media";
import styles from "./guide-card-picture.module.css";

/**
 * The picture at the top of a guide card: the guide's own, or the stock one
 * for its subject. Decorative (`alt=""`), because the card's heading already
 * names the guide and the picture's description belongs to the article.
 */
export function GuideCardPicture({
  media,
  shape = "card",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px",
  priority = false,
}: {
  media: GuideCardMedia;
  /** `card` is 16:9 across the top of a card; `feature` fills a taller panel. */
  shape?: "card" | "feature";
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={shape === "feature" ? styles.feature : styles.card}
      data-guide-card-picture
    >
      <GuideImage
        className={styles.image}
        src={media.src}
        alt=""
        width={shape === "feature" ? 960 : 640}
        height={shape === "feature" ? 600 : 360}
        sizes={sizes}
        optimised={media.optimised}
        priority={priority}
      />
    </span>
  );
}
