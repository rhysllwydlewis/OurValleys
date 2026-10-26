import Link from "next/link";
import type { Route } from "next";
import { LOCALE_DETAILS, type Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import type { PublicUpdate } from "@/modules/businesses/public-updates";
import { bodyParagraphs } from "@/modules/businesses/updates-model";
import generated from "./generated-business-website.module.css";
import styles from "./business-updates.module.css";

export function updateDateLabel(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "long",
    timeZone: "Europe/London",
  }).format(date);
}

/** The update list shared by the website block and the all-updates page. */
export function BusinessUpdateList({
  updates,
  locale,
  headingLevel,
}: {
  updates: PublicUpdate[];
  locale: Locale;
  headingLevel: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <ol className={styles.list}>
      {updates.map((update) => (
        <li
          className={styles.item}
          id={`update-${update.id}`}
          key={update.id}
          // Owner-written text: Welsh only where the owner wrote Welsh.
          lang={update.welsh ? "cy-GB" : "en-GB"}
        >
          <Heading>{update.title}</Heading>
          <p className={styles.date}>
            <time
              dateTime={update.publishedAt.toISOString()}
              lang={LOCALE_DETAILS[locale].htmlLang}
            >
              {updateDateLabel(update.publishedAt, locale)}
            </time>
          </p>
          <div className={styles.body}>
            {bodyParagraphs(update.body).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** "Latest updates" on `/b/[slug]`; rendered only when there is something to show. */
export function BusinessUpdatesSection({
  updates,
  total,
  slug,
  locale,
  t,
}: {
  updates: PublicUpdate[];
  total: number;
  slug: string;
  locale: Locale;
  t: Translator;
}) {
  if (updates.length === 0) return null;
  return (
    <section
      className={generated.section}
      id="updates"
      aria-labelledby="updates-heading"
    >
      <div className={generated.sectionHeading}>
        <div>
          <p className={generated.eyebrow}>{t("upd.site.eyebrow")}</p>
          <h2 id="updates-heading">{t("upd.site.title")}</h2>
        </div>
      </div>
      <BusinessUpdateList updates={updates} locale={locale} headingLevel="h3" />
      {total > updates.length ? (
        <p className={styles.more}>
          <Link
            className={generated.outlineAction}
            href={`/b/${slug}/updates` as Route}
          >
            {t("upd.site.all", { count: total })}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
