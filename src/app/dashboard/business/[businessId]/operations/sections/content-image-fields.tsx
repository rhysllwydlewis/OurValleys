import type { ContentImageView } from "@/modules/businesses/content-images";
import styles from "../operations.module.css";

/**
 * The optional picture controls shared by the offer and event forms. It is
 * plain server-rendered HTML: a file input inside a server-action form is sent
 * as multipart data, and the server validates the file and its description.
 */
export function ContentImageFields({
  idPrefix,
  image,
  canEdit,
  uploadsEnabled,
  noun,
}: {
  idPrefix: string;
  image: ContentImageView | null;
  canEdit: boolean;
  uploadsEnabled: boolean;
  noun: "offer" | "event";
}) {
  if (!image && !(canEdit && uploadsEnabled)) {
    return canEdit ? (
      <p className={styles.meta}>
        Pictures for {noun}s are not available in this environment yet.
      </p>
    ) : null;
  }

  return (
    <fieldset className={styles.pictureFields}>
      <legend>Picture (optional)</legend>
      {image ? (
        <figure className={styles.pictureCurrent}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={image.altText} loading="lazy" />
          <figcaption className={styles.meta}>Current picture</figcaption>
        </figure>
      ) : null}
      {canEdit && uploadsEnabled ? (
        <>
          <div className={styles.field}>
            <label htmlFor={`${idPrefix}-image`}>
              {image ? "Replace the picture" : `Add a picture for this ${noun}`}
            </label>
            <input
              id={`${idPrefix}-image`}
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-describedby={`${idPrefix}-image-hint`}
            />
            <p id={`${idPrefix}-image-hint`} className={styles.meta}>
              JPEG, PNG or WebP, up to 5MB.
            </p>
          </div>
          <div className={styles.field}>
            <label htmlFor={`${idPrefix}-image-alt`}>
              Describe the picture
            </label>
            <input
              id={`${idPrefix}-image-alt`}
              name="imageAlt"
              maxLength={300}
              autoComplete="off"
              aria-describedby={`${idPrefix}-image-alt-hint`}
            />
            <p id={`${idPrefix}-image-alt-hint`} className={styles.meta}>
              Needed whenever you choose a picture, so people using a screen
              reader know what it shows.
            </p>
          </div>
          {image ? (
            <label className={styles.check}>
              <input type="checkbox" name="removeImage" />
              <span>Remove the current picture</span>
            </label>
          ) : null}
        </>
      ) : null}
    </fieldset>
  );
}
