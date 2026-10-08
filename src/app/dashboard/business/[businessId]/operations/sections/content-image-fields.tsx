import { authoredTextLang } from "@/lib/i18n/business-copy";
import { getTranslator } from "@/lib/i18n/server";
import type { ContentImageView } from "@/modules/businesses/content-images";
import styles from "../operations.module.css";

/**
 * The optional picture controls shared by the offer and event forms. It is
 * plain server-rendered HTML: a file input inside a server-action form is sent
 * as multipart data, and the server validates the file and its description.
 */
export async function ContentImageFields({
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
  const { t } = await getTranslator();
  if (!image && !(canEdit && uploadsEnabled)) {
    return canEdit ? (
      <p className={styles.meta}>
        {t(
          noun === "offer"
            ? "ops.image.unavailableOffer"
            : "ops.image.unavailableEvent",
        )}
      </p>
    ) : null;
  }

  return (
    <fieldset className={styles.pictureFields}>
      <legend>{t("ops.image.legend")}</legend>
      {image ? (
        <figure className={styles.pictureCurrent}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.altText}
            lang={authoredTextLang}
            loading="lazy"
          />
          <figcaption className={styles.meta}>
            {t("ops.image.current")}
          </figcaption>
        </figure>
      ) : null}
      {canEdit && uploadsEnabled ? (
        <>
          <div className={styles.field}>
            <label htmlFor={`${idPrefix}-image`}>
              {image
                ? t("ops.image.replace")
                : t(
                    noun === "offer"
                      ? "ops.image.addOffer"
                      : "ops.image.addEvent",
                  )}
            </label>
            <input
              id={`${idPrefix}-image`}
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-describedby={`${idPrefix}-image-hint`}
            />
            <p id={`${idPrefix}-image-hint`} className={styles.meta}>
              {t("ops.image.hint")}
            </p>
          </div>
          <div className={styles.field}>
            <label htmlFor={`${idPrefix}-image-alt`}>
              {t("ops.image.describe")}
            </label>
            <input
              id={`${idPrefix}-image-alt`}
              name="imageAlt"
              lang={authoredTextLang}
              maxLength={300}
              autoComplete="off"
              aria-describedby={`${idPrefix}-image-alt-hint`}
            />
            <p id={`${idPrefix}-image-alt-hint`} className={styles.meta}>
              {t("ops.image.describeHint")}
            </p>
          </div>
          {image ? (
            <label className={styles.check}>
              <input type="checkbox" name="removeImage" />
              <span>{t("ops.image.remove")}</span>
            </label>
          ) : null}
        </>
      ) : null}
    </fieldset>
  );
}
