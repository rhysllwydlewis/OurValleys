import Link from "next/link";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey, Translator } from "@/lib/i18n/translate";
import type { CategorySectionView } from "@/modules/businesses/content-features";
import {
  extraSectionAnchor,
  extraSectionKinds,
  publicExtraSections,
  splitPriceMeta,
} from "@/modules/businesses/extra-sections-model";
import { ContentPicture } from "./content-picture";
import generated from "./generated-business-website.module.css";
import styles from "./business-extra-sections.module.css";

type Entry = CategorySectionView["entries"][number];

function Accordion({ entries }: { entries: Entry[] }) {
  return (
    <div className={styles.faq}>
      {entries.map((entry, index) => (
        <details className={styles.faqItem} key={`${entry.title}-${index}`}>
          <summary>
            <span>{entry.title}</span>
          </summary>
          {entry.description ? (
            <p className={styles.faqAnswer}>{entry.description}</p>
          ) : null}
        </details>
      ))}
    </div>
  );
}

/**
 * The entry's name, as a link to its own page when it has one. The preview and
 * entries without an id show plain text.
 */
function EntryName({
  entry,
  slug,
  t,
  authoredLang,
}: {
  entry: Entry;
  slug: string | undefined;
  t: Translator;
  authoredLang: string | undefined;
}) {
  if (!slug || !entry.id) return <>{entry.title}</>;
  return (
    <Link
      className={styles.entryName}
      href={`/b/${slug}/catalogue/${entry.id}`}
      aria-label={t("extra.page.detailsFor", { item: entry.title })}
      lang={authoredLang}
    >
      {entry.title}
    </Link>
  );
}

function Picture({ entry }: { entry: Entry }) {
  // Through the image optimiser, so visitors get a resized copy, not the
  // owner's original upload.
  return (
    <ContentPicture
      image={entry.image}
      variant="flush"
      sizes="(max-width: 700px) 100vw, 320px"
    />
  );
}

function Availability({
  entry,
  t,
  lang,
}: {
  entry: Entry;
  t: Translator;
  lang: string;
}) {
  // "In stock" is the unmarked default, so only the exceptions get a badge.
  if (!entry.availability || entry.availability === "available") return null;
  return (
    <p
      className={`${styles.badge} ${styles[`badge_${entry.availability}`] ?? ""}`}
      lang={lang}
    >
      {t(`extra.availability.${entry.availability}` as MessageKey)}
    </p>
  );
}

function EntryLink({
  lang,
  authoredLang,
  entry,
  kind,
  t,
}: {
  lang: string;
  authoredLang: string | undefined;
  entry: Entry;
  kind: "products" | "treatments";
  t: Translator;
}) {
  if (!entry.url) return null;
  return (
    <a
      className={styles.entryLink}
      href={entry.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      lang={lang}
    >
      {t(kind === "products" ? "extra.public.order" : "extra.public.book")}
      <span className={styles.srOnly}>
        {" "}
        (<span lang={authoredLang}>{entry.title}</span>,{" "}
        {t("extra.public.opensElsewhere")})
      </span>
    </a>
  );
}

function PriceList({
  entries,
  kind,
  t,
  lang,
  authoredLang,
  slug,
}: {
  slug: string | undefined;
  entries: Entry[];
  kind: "products" | "treatments";
  t: Translator;
  lang: string;
  authoredLang: string | undefined;
}) {
  // Any picture turns the list into a catalogue grid; without one the
  // compact price list stays as it was.
  const catalogue = entries.some((entry) => entry.image);
  return (
    <ul className={catalogue ? styles.catalogue : styles.priceList}>
      {entries.map((entry, index) => {
        const { price, note } = splitPriceMeta(entry.meta);
        const soldOut = entry.availability === "sold_out";
        return (
          <li
            className={catalogue ? styles.card : styles.priceRow}
            data-sold-out={soldOut ? "true" : undefined}
            key={`${entry.title}-${index}`}
          >
            {catalogue ? <Picture entry={entry} /> : null}
            <div className={styles.priceMain}>
              <h3>
                <EntryName
                  entry={entry}
                  slug={slug}
                  t={t}
                  authoredLang={authoredLang}
                />
              </h3>
              <Availability entry={entry} t={t} lang={lang} />
              {entry.description ? <p>{entry.description}</p> : null}
              {note ? <p className={styles.priceNote}>{note}</p> : null}
              {catalogue && price ? (
                <p className={styles.price}>{price}</p>
              ) : null}
              {catalogue && !soldOut ? (
                <EntryLink
                  entry={entry}
                  kind={kind}
                  t={t}
                  lang={lang}
                  authoredLang={authoredLang}
                />
              ) : null}
            </div>
            {!catalogue ? (
              <div className={styles.priceSide}>
                {price ? <p className={styles.price}>{price}</p> : null}
                {soldOut ? null : (
                  <EntryLink
                    entry={entry}
                    kind={kind}
                    t={t}
                    lang={lang}
                    authoredLang={authoredLang}
                  />
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function People({
  entries,
  slug,
  t,
  authoredLang,
}: {
  entries: Entry[];
  slug: string | undefined;
  t: Translator;
  authoredLang: string | undefined;
}) {
  return (
    <ul className={styles.people}>
      {entries.map((entry, index) => (
        <li className={styles.person} key={`${entry.title}-${index}`}>
          {entry.image ? (
            <span className={styles.portrait}>
              <ContentPicture
                image={entry.image}
                variant="flush"
                sizes="72px"
              />
            </span>
          ) : (
            <span className={styles.initial} aria-hidden="true">
              {Array.from(entry.title)[0]?.toLocaleUpperCase("en-GB")}
            </span>
          )}
          <div>
            <h3>
              <EntryName
                entry={entry}
                slug={slug}
                t={t}
                authoredLang={authoredLang}
              />
            </h3>
            {entry.meta ? <p className={styles.role}>{entry.meta}</p> : null}
            {entry.description ? <p>{entry.description}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Chips({ entries }: { entries: Entry[] }) {
  return (
    <ul className={styles.chips}>
      {entries.map((entry, index) => (
        <li key={`${entry.title}-${index}`}>
          <span>{entry.title}</span>
          {entry.description ? (
            <span className={styles.chipNote}>{entry.description}</span>
          ) : null}
          {entry.meta ? (
            <span className={styles.chipNote}>{entry.meta}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Body({
  section,
  t,
  lang,
  authoredLang,
  slug,
}: {
  slug: string | undefined;
  section: CategorySectionView;
  t: Translator;
  lang: string;
  authoredLang: string | undefined;
}) {
  const presentation = extraSectionKinds[section.sectionType].presentation;
  switch (presentation) {
    case "accordion":
      return <Accordion entries={section.entries} />;
    case "priceList":
      return (
        <PriceList
          entries={section.entries}
          kind={section.sectionType === "products" ? "products" : "treatments"}
          t={t}
          lang={lang}
          authoredLang={authoredLang}
          slug={slug}
        />
      );
    case "people":
      return (
        <People
          entries={section.entries}
          slug={slug}
          t={t}
          authoredLang={authoredLang}
        />
      );
    case "chips":
      return <Chips entries={section.entries} />;
  }
}

function typeLabel(t: Translator, type: string): string {
  return t(`ops.sections.type.${type}` as MessageKey);
}

/**
 * The owner's extra sections on the public website. Each type has its own
 * presentation (questions open in place, a price list, people, plain chips);
 * the owner's words are marked as English inside a Welsh page.
 */
export async function BusinessExtraSections({
  sections,
  businessSlug,
}: {
  sections: CategorySectionView[];
  /** When set, products, treatments and people link to their own pages. */
  businessSlug?: string | undefined;
}) {
  const { locale, t } = await getTranslator();
  const authoredLang = locale === "cy" ? "en-GB" : undefined;
  return (
    <>
      {publicExtraSections(sections).map((section) => (
        <section
          className={generated.section}
          id={extraSectionAnchor(section.id)}
          aria-labelledby={`feature-heading-${section.id}`}
          data-extra-type={section.sectionType}
          key={section.id}
        >
          <div className={generated.sectionHeading}>
            <div>
              <p className={generated.eyebrow}>
                {typeLabel(t, section.sectionType)}
              </p>
              <h2 id={`feature-heading-${section.id}`} lang={authoredLang}>
                {section.title}
              </h2>
            </div>
          </div>
          <div lang={authoredLang}>
            <Body
              section={section}
              t={t}
              lang={locale}
              authoredLang={authoredLang}
              slug={businessSlug}
            />
          </div>
        </section>
      ))}
    </>
  );
}
