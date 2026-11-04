import Link from "next/link";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey, Translator } from "@/lib/i18n/translate";
import type { CategorySectionView } from "@/modules/businesses/content-features";
import {
  extraSectionAnchor,
  extraSectionKinds,
  groupEntriesByCategory,
  hasEntryPage,
  localiseSections,
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
  authoredLang,
}: {
  entry: Entry;
  slug: string | undefined;
  authoredLang: string | undefined;
}) {
  if (!slug || !entry.id) return <>{entry.title}</>;
  return (
    <Link
      className={styles.entryName}
      href={`/b/${slug}/catalogue/${entry.id}`}
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

function FeaturedBadge({
  entry,
  t,
  lang,
}: {
  entry: Entry;
  t: Translator;
  lang: string;
}) {
  if (!entry.featured) return null;
  return (
    <p className={`${styles.badge} ${styles.badge_featured}`} lang={lang}>
      {t("extra.featured.badge")}
    </p>
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
  metaLang,
  slug,
  Name = "h3",
}: {
  metaLang: string | undefined;
  slug: string | undefined;
  entries: Entry[];
  /** The heading level of each name; one lower when category headings sit above. */
  Name?: "h3" | "h4";
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
              <Name>
                <EntryName
                  entry={entry}
                  slug={slug}
                  authoredLang={authoredLang}
                />
              </Name>
              <FeaturedBadge entry={entry} t={t} lang={lang} />
              <Availability entry={entry} t={t} lang={lang} />
              {entry.description ? <p>{entry.description}</p> : null}
              {note ? (
                <p className={styles.priceNote} lang={metaLang}>
                  {note}
                </p>
              ) : null}
              {catalogue && price ? (
                <p className={styles.price} lang={metaLang}>
                  {price}
                </p>
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
                {price ? (
                  <p className={styles.price} lang={metaLang}>
                    {price}
                  </p>
                ) : null}
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
  authoredLang,
  metaLang,
  t,
  lang,
  Name = "h3",
}: {
  t: Translator;
  lang: string;
  metaLang: string | undefined;
  Name?: "h3" | "h4";
  entries: Entry[];
  slug: string | undefined;
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
            <Name>
              <EntryName
                entry={entry}
                slug={slug}
                authoredLang={authoredLang}
              />
            </Name>
            <FeaturedBadge entry={entry} t={t} lang={lang} />
            {entry.meta ? (
              <p className={styles.role} lang={metaLang}>
                {entry.meta}
              </p>
            ) : null}
            {entry.description ? <p>{entry.description}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Chips({
  entries,
  metaLang,
}: {
  entries: Entry[];
  metaLang: string | undefined;
}) {
  return (
    <ul className={styles.chips}>
      {entries.map((entry, index) => (
        <li key={`${entry.title}-${index}`}>
          <span>{entry.title}</span>
          {entry.description ? (
            <span className={styles.chipNote}>{entry.description}</span>
          ) : null}
          {entry.meta ? (
            <span className={styles.chipNote} lang={metaLang}>
              {entry.meta}
            </span>
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
  // Prices, notes and roles are never translated, so a Welsh list marks them English.
  const metaLang = section.welsh ? "en-GB" : undefined;
  switch (presentation) {
    case "accordion":
      return <Accordion entries={section.entries} />;
    case "priceList":
    case "people": {
      // Categories split a list under headings; without any, nothing changes.
      const groups = groupEntriesByCategory(section.entries);
      const grouped = groups.some((group) => group.category);
      return (
        <>
          {groups.map((group) => {
            const body =
              presentation === "priceList" ? (
                <PriceList
                  metaLang={metaLang}
                  entries={group.entries}
                  kind={
                    section.sectionType === "products"
                      ? "products"
                      : "treatments"
                  }
                  t={t}
                  lang={lang}
                  authoredLang={authoredLang}
                  slug={slug}
                  Name={grouped ? "h4" : "h3"}
                />
              ) : (
                <People
                  t={t}
                  lang={lang}
                  metaLang={metaLang}
                  entries={group.entries}
                  slug={slug}
                  authoredLang={authoredLang}
                  Name={grouped ? "h4" : "h3"}
                />
              );
            if (!grouped) return body;
            return (
              <div
                className={styles.categoryGroup}
                key={group.category ?? "__other"}
                data-testid="category-group"
              >
                <h3
                  className={styles.categoryHeading}
                  lang={group.category && section.welsh ? "en-GB" : undefined}
                >
                  {group.category ?? t("extra.catalogue.other")}
                </h3>
                {body}
              </div>
            );
          })}
        </>
      );
    }
    case "chips":
      return <Chips entries={section.entries} metaLang={metaLang} />;
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
  const englishLang = locale === "cy" ? "en-GB" : undefined;
  return (
    <>
      {localiseSections(publicExtraSections(sections), locale).map(
        (section) => {
          // A fully translated list reads as Welsh; the rest are the owner's English.
          const authoredLang = section.welsh ? undefined : englishLang;
          return (
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
                  <h2 id={`feature-heading-${section.id}`} lang={englishLang}>
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
              {businessSlug && hasEntryPage(section.sectionType) ? (
                <Link
                  className={styles.catalogueLink}
                  href={`/b/${businessSlug}/catalogue?type=${section.sectionType}`}
                >
                  {t("extra.catalogue.seeAll")}
                  <span className={styles.srOnly}>
                    {" "}
                    (<span lang={englishLang}>{section.title}</span>)
                  </span>
                </Link>
              ) : null}
            </section>
          );
        },
      )}
    </>
  );
}
