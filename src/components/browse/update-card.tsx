import Link from "next/link";
import type { Route } from "next";
import type { Locale } from "@/lib/i18n/config";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import type { PublicFeedUpdate } from "@/modules/businesses/public-updates";
import { updateExcerpt } from "@/modules/businesses/updates-model";
import styles from "./browse.module.css";

/**
 * One update in the local feed. The title link covers the update on the
 * business's own updates page; the business link sits beside it. Update
 * wording is owner-written, so it is tagged with the language it is in.
 */
export function UpdateCard({
  t,
  locale,
  update,
}: {
  t: Translator;
  locale: Locale;
  update: PublicFeedUpdate;
}) {
  const date = new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "long",
    timeZone: "Europe/London",
  }).format(update.publishedAt);
  const lang = update.welsh ? "cy-GB" : "en-GB";
  return (
    <article className={styles.card}>
      <div className={styles.cardBody}>
        <div className="tag-row">
          <span className="tag">{update.categoryName}</span>
          {update.fictional ? (
            <span className="tag">{t("offers.fictionalDemo")}</span>
          ) : null}
        </div>
        <h3 className={styles.cardTitle} lang={lang}>
          <Link
            href={
              `/b/${update.businessSlug}/updates?update=${update.id}#update-${update.id}` as Route
            }
          >
            {update.title}
          </Link>
        </h3>
        <p className={styles.meta}>
          <Link href={`/b/${update.businessSlug}` as Route} lang="en-GB">
            {update.businessName}
          </Link>
          {" · "}
          {update.placeName}
          {" · "}
          <time dateTime={update.publishedAt.toISOString()}>{date}</time>
        </p>
        <p className={styles.copy} lang={lang}>
          {updateExcerpt(update.body, 200)}
        </p>
      </div>
    </article>
  );
}
