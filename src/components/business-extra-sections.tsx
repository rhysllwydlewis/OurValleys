import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey, Translator } from "@/lib/i18n/translate";
import type { CategorySectionView } from "@/modules/businesses/content-features";
import {
  extraSectionAnchor,
  extraSectionKinds,
  publicExtraSections,
  splitPriceMeta,
} from "@/modules/businesses/extra-sections-model";
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

function PriceList({ entries }: { entries: Entry[] }) {
  return (
    <ul className={styles.priceList}>
      {entries.map((entry, index) => {
        const { price, note } = splitPriceMeta(entry.meta);
        return (
          <li className={styles.priceRow} key={`${entry.title}-${index}`}>
            <div className={styles.priceMain}>
              <h3>{entry.title}</h3>
              {entry.description ? <p>{entry.description}</p> : null}
              {note ? <p className={styles.priceNote}>{note}</p> : null}
            </div>
            {price ? <p className={styles.price}>{price}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

function People({ entries }: { entries: Entry[] }) {
  return (
    <ul className={styles.people}>
      {entries.map((entry, index) => (
        <li className={styles.person} key={`${entry.title}-${index}`}>
          <span className={styles.initial} aria-hidden="true">
            {Array.from(entry.title)[0]?.toLocaleUpperCase("en-GB")}
          </span>
          <div>
            <h3>{entry.title}</h3>
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

function Body({ section }: { section: CategorySectionView }) {
  const presentation = extraSectionKinds[section.sectionType].presentation;
  switch (presentation) {
    case "accordion":
      return <Accordion entries={section.entries} />;
    case "priceList":
      return <PriceList entries={section.entries} />;
    case "people":
      return <People entries={section.entries} />;
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
}: {
  sections: CategorySectionView[];
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
            <Body section={section} />
          </div>
        </section>
      ))}
    </>
  );
}
