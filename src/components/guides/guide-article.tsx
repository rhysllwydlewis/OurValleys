import type { Route } from "next";
import Link from "next/link";
import { ShareControl } from "@/components/share-control";
import { sectionAnchor, splitParagraphs } from "@/modules/guides/guide-model";
import type { GuideSection } from "@/modules/guides/shared";
import styles from "./guide-article.module.css";

/**
 * The reader-facing text around a guide, resolved to the reader's language by
 * the page (or by the studio for its preview) so this component carries no
 * catalogue and works on the server and in the browser.
 */
export type GuideArticleLabels = {
  eyebrow: string;
  by: string;
  contentsTitle: string;
  part: string;
  tip: string;
  /** Shown to readers of another language, since the guide is in English. */
  englishOnly: string | null;
  sponsoredLabel: string;
  published: string | null;
  updated: string | null;
  share: string;
  shareMessages: {
    shared: string;
    copied: string;
    cancelled: string;
    unavailable: string;
  };
  backToTop: string;
  placeEyebrow: string;
  placeTitle: string;
  placeBody: string;
  placeLink: string;
  relatedEyebrow: string;
  relatedTitle: string;
  ctaTitle: string;
  ctaBody: string;
  ctaBusinesses: string;
  ctaEvents: string;
  browseAll: string;
};

export type GuideArticleGuide = {
  slug: string;
  title: string;
  summary: string;
  area: string;
  readingTime: string;
  authorName: string;
  sponsorshipDisclosure: string | null;
  sections: readonly GuideSection[];
  place: { slug: string; name: string } | null;
};

export type GuideArticleRelated = {
  slug: string;
  title: string;
  summary: string;
  area: string;
  readingTime: string;
  /** The language this card's text is in, when it differs from the article's. */
  lang?: string;
};

export function fillLabel(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function GuideArticle({
  guide,
  labels,
  lang,
  contentLang = "en-GB",
  related = [],
  shareUrl,
  preview = false,
}: {
  guide: GuideArticleGuide;
  labels: GuideArticleLabels;
  /** The reader's language, for the text around the guide. */
  lang: string;
  /** The language the guide itself is written in. */
  contentLang?: string;
  related?: readonly GuideArticleRelated[];
  shareUrl?: string;
  /** The studio's preview: inert links, no page-level landmarks or heading 1. */
  preview?: boolean;
}) {
  const Title = preview ? "h3" : "h1";
  const SectionTitle = preview ? "h4" : "h2";
  const idPrefix = preview ? "preview-" : "";
  const total = guide.sections.length;
  const showContents = total >= 3;
  const anchorOf = (section: GuideSection) =>
    `${idPrefix}${sectionAnchor(section)}`;

  function renderLink(
    href: string,
    children: React.ReactNode,
    className: string,
  ) {
    if (preview) {
      return (
        <span className={className} data-preview-link={href}>
          {children}
        </span>
      );
    }
    return (
      <Link className={className} href={href as Route}>
        {children}
      </Link>
    );
  }

  return (
    <article
      className={styles.article}
      lang={contentLang}
      id={`${idPrefix}guide-top`}
    >
      <div className={styles.header}>
        <p className="eyebrow" lang={lang}>
          {labels.eyebrow}
        </p>
        <Title className={styles.title}>{guide.title}</Title>
        {labels.englishOnly ? (
          <p className={styles.englishOnly} lang={lang}>
            {labels.englishOnly}
          </p>
        ) : null}
        <p className={styles.lead}>{guide.summary}</p>
        <ul className={styles.meta}>
          <li className="tag">{guide.area}</li>
          <li className="tag">{guide.readingTime}</li>
          <li className="tag" lang={lang}>
            {labels.by}
          </li>
          {labels.published ? (
            <li className="tag tag--quiet" lang={lang}>
              {labels.published}
            </li>
          ) : null}
          {labels.updated ? (
            <li className="tag tag--quiet" lang={lang}>
              {labels.updated}
            </li>
          ) : null}
        </ul>
        {guide.sponsorshipDisclosure ? (
          <p className={styles.disclosure}>
            <strong lang={lang}>{labels.sponsoredLabel}.</strong>{" "}
            {guide.sponsorshipDisclosure}
          </p>
        ) : null}
        {!preview && shareUrl ? (
          <div className={styles.headerActions} lang={lang}>
            {renderLink("/guides", labels.browseAll, "button")}
            <ShareControl
              title={guide.title}
              url={shareUrl}
              label={labels.share}
              messages={labels.shareMessages}
            />
          </div>
        ) : null}
      </div>

      <div className={showContents ? styles.layout : styles.layoutSingle}>
        {showContents ? (
          <nav
            className={`${styles.contents} ov-glass`}
            aria-labelledby={`${idPrefix}guide-contents-title`}
            lang={lang}
          >
            <p
              className={styles.contentsTitle}
              id={`${idPrefix}guide-contents-title`}
            >
              {labels.contentsTitle}
            </p>
            <ol className={styles.contentsList}>
              {guide.sections.map((section) => (
                <li key={section.id}>
                  {preview ? (
                    <span className={styles.contentsLink} lang={contentLang}>
                      {section.heading}
                    </span>
                  ) : (
                    <a
                      className={styles.contentsLink}
                      href={`#${anchorOf(section)}`}
                      lang={contentLang}
                    >
                      {section.heading}
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className={styles.body}>
          {guide.sections.map((section, index) => (
            <section
              key={section.id}
              id={anchorOf(section)}
              className={section.kind === "tip" ? styles.tip : styles.section}
            >
              <p className={styles.part} lang={lang}>
                {section.kind === "tip"
                  ? labels.tip
                  : fillLabel(labels.part, { number: index + 1, total })}
              </p>
              <SectionTitle
                className={styles.sectionTitle}
                id={`${anchorOf(section)}-title`}
              >
                {section.heading}
              </SectionTitle>
              {splitParagraphs(section.body).map(
                (paragraph, paragraphIndex) => (
                  <p className={styles.paragraph} key={paragraphIndex}>
                    {paragraph}
                  </p>
                ),
              )}
              {section.href && section.linkLabel
                ? renderLink(
                    section.href,
                    <>
                      {section.linkLabel}
                      <span aria-hidden="true"> →</span>
                    </>,
                    styles.sectionLink ?? "",
                  )
                : null}
            </section>
          ))}
        </div>
      </div>

      {!preview ? (
        <div className={styles.footer} lang={lang}>
          {guide.place ? (
            <section
              className={`${styles.placePanel} ov-glass`}
              aria-labelledby="guide-place-title"
            >
              <p className="eyebrow">{labels.placeEyebrow}</p>
              <h2 id="guide-place-title">{labels.placeTitle}</h2>
              <p>{labels.placeBody}</p>
              <Link
                className="button primary"
                href={`/places/${guide.place.slug}` as Route}
              >
                {labels.placeLink}
              </Link>
            </section>
          ) : null}

          {related.length > 0 ? (
            <section aria-labelledby="guide-related-title">
              <p className="eyebrow">{labels.relatedEyebrow}</p>
              <h2 id="guide-related-title" className={styles.relatedTitle}>
                {labels.relatedTitle}
              </h2>
              <ul className={styles.relatedList}>
                {related.map((item) => (
                  <li key={item.slug} className={styles.relatedCard}>
                    <p
                      className={styles.relatedMeta}
                      lang={item.lang ?? contentLang}
                    >
                      {item.area} · {item.readingTime}
                    </p>
                    <h3 lang={item.lang ?? contentLang}>
                      <Link href={`/guides/${item.slug}` as Route}>
                        {item.title}
                      </Link>
                    </h3>
                    <p lang={item.lang ?? contentLang}>{item.summary}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className={styles.cta} aria-labelledby="guide-cta-title">
            <h2 id="guide-cta-title">{labels.ctaTitle}</h2>
            <p>{labels.ctaBody}</p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                {labels.ctaBusinesses}
              </Link>
              <Link className="button" href="/events">
                {labels.ctaEvents}
              </Link>
              <a className="button" href="#guide-top">
                {labels.backToTop}
              </a>
            </div>
          </section>
        </div>
      ) : null}
    </article>
  );
}
