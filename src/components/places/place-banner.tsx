import type { Translator } from "@/lib/i18n/translate";
import {
  resolvePlacePicture,
  type PlacePictureView,
} from "@/modules/reference-data/place-picture-model";
import styles from "./place-banner.module.css";

/**
 * The editorial picture of a place (doc 98) as a wide banner under the page
 * heading. The description is the editor's, in Welsh where one was written
 * (marked `lang`), and the credit is shown only when the editor gave one.
 * Renders nothing for a place without a picture.
 */
export function PlaceBanner({
  t,
  lang,
  welsh,
  picture,
}: {
  t: Translator;
  lang: string;
  welsh: boolean;
  picture: PlacePictureView | null;
}) {
  if (!picture) return null;
  const resolved = resolvePlacePicture(picture, welsh);
  return (
    <figure className={styles.banner} data-testid="place-banner">
      {/* eslint-disable-next-line @next/next/no-img-element -- the media host is not in the optimiser's allow-list for places */}
      <img
        className={styles.image}
        src={resolved.url}
        alt={resolved.alt}
        lang={welsh ? resolved.altLang : undefined}
        width={1200}
        height={514}
        fetchPriority="high"
        decoding="async"
      />
      {resolved.credit ? (
        <figcaption className={styles.credit} lang={lang}>
          {t("placepic.credit", { credit: resolved.credit })}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** A small round picture for a directory tile; decorative beside the place name. */
export function PlaceThumb({
  picture,
}: {
  picture: PlacePictureView | null | undefined;
}) {
  if (!picture) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- see PlaceBanner
    <img
      className={styles.thumb}
      src={picture.url}
      alt=""
      width={56}
      height={56}
      loading="lazy"
      decoding="async"
    />
  );
}
