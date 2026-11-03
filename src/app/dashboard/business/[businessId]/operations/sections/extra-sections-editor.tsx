import { authoredTextLang } from "@/lib/i18n/business-copy";
import { en } from "@/lib/i18n/messages/en";
import type { MessageKey, Translator } from "@/lib/i18n/translate";
import type { CategorySectionView } from "@/modules/businesses/content-features";
import {
  blankRowsOffered,
  descriptionLimit,
  entryAvailabilities,
  entryCategoryLimit,
  entryUrlLimit,
  categoryNames,
  extraSectionKinds,
  hasEntryPage,
  maxEntriesPerSection,
  metaLimit,
  sectionTitleLimit,
  sectionTitleMin,
  titleLimit,
  type ExtraSectionType,
} from "@/modules/businesses/extra-sections-model";
import {
  moveCategorySectionAction,
  removeCategorySectionAction,
  saveCategorySectionAction,
  toggleCategorySectionAction,
} from "../actions";
import styles from "../operations.module.css";
import builder from "./menu-builder.module.css";
import extra from "./extra-sections.module.css";
import { hidden } from "./shared";

const label = (key: string) => key as MessageKey;

/**
 * One row editor for a section. Saved entries come first, then a few blank
 * rows; blank rows are ignored on save. Plain form fields, so it works
 * without script and the page keeps the owner's place after saving.
 */
export function SectionForm({
  businessId,
  type,
  section,
  uploadsEnabled,
  t,
}: {
  businessId: string;
  type: ExtraSectionType;
  section?: CategorySectionView;
  uploadsEnabled: boolean;
  t: Translator;
}) {
  const kind = extraSectionKinds[type];
  const prefix = `extra-${section?.id ?? `new-${type}`}`;
  const saved = section?.entries ?? [];
  const blanks = Math.max(
    0,
    Math.min(blankRowsOffered, maxEntriesPerSection - saved.length),
  );
  const rows = [
    ...saved,
    ...Array.from({ length: blanks }, () => ({
      id: undefined as string | undefined,
      title: "",
      description: "",
      titleCy: undefined as string | undefined,
      descriptionCy: undefined as string | undefined,
      meta: undefined as string | undefined,
      imageMediaId: undefined as string | undefined,
      availability: undefined as string | undefined,
      url: undefined as string | undefined,
      category: undefined as string | undefined,
      image: undefined as { url: string; altText: string } | undefined,
    })),
  ];
  return (
    <form className={styles.form} action={saveCategorySectionAction}>
      {hidden("businessId", businessId)}
      {hidden("sectionType", type)}
      {section ? hidden("sectionId", section.id) : null}
      {hidden("status", section?.status === "hidden" ? "hidden" : "active")}
      <div className={styles.field}>
        <label htmlFor={`${prefix}-title`}>{t("extra.form.title")}</label>
        <input
          id={`${prefix}-title`}
          name="title"
          required
          minLength={sectionTitleMin}
          maxLength={sectionTitleLimit}
          defaultValue={
            section?.title ?? en[kind.defaultTitleKey as keyof typeof en]
          }
          aria-describedby={`${prefix}-title-hint`}
          lang={authoredTextLang}
        />
        <span className={builder.hint} id={`${prefix}-title-hint`}>
          {t("extra.form.titleHint")}
        </span>
      </div>
      <p className={builder.hint} id={`${prefix}-rows-hint`}>
        {t(label(`extra.rowsHint.${type}`))}
      </p>
      {kind.hasPicture && uploadsEnabled ? (
        <p className={builder.hint}>{t("extra.field.pictureOneAtATime")}</p>
      ) : null}
      {kind.hasCategory ? (
        <datalist id={`${prefix}-categories`}>
          {categoryNames(saved).map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      ) : null}
      <ol className={extra.rows} aria-describedby={`${prefix}-rows-hint`}>
        {rows.map((row, index) => (
          <li className={extra.row} key={index}>
            <fieldset>
              {hasEntryPage(type) ? (
                <input type="hidden" name="entryKey" value={row.id ?? ""} />
              ) : null}
              <legend>
                {t("extra.form.row", { number: index + 1 })}
                {row.title ? (
                  <span className={extra.rowName} lang={authoredTextLang}>
                    {" "}
                    · {row.title}
                  </span>
                ) : null}
              </legend>
              <div className={builder.formGrid}>
                <div className={styles.field}>
                  <label htmlFor={`${prefix}-t-${index}`}>
                    {t(label(kind.titleLabel))}
                  </label>
                  <input
                    id={`${prefix}-t-${index}`}
                    name="entryTitle"
                    maxLength={titleLimit}
                    defaultValue={row.title}
                    placeholder={t(label(`extra.example.${type}.title`))}
                  />
                </div>
                {kind.metaLabel ? (
                  <div className={styles.field}>
                    <label htmlFor={`${prefix}-m-${index}`}>
                      {t(label(kind.metaLabel))}
                    </label>
                    <input
                      id={`${prefix}-m-${index}`}
                      name="entryMeta"
                      maxLength={metaLimit}
                      defaultValue={row.meta ?? ""}
                      placeholder={t(label(`extra.example.${type}.meta`))}
                    />
                  </div>
                ) : null}
                {kind.metaLabel ? null : (
                  <input
                    type="hidden"
                    name="entryMeta"
                    value={row.meta ?? ""}
                  />
                )}
                {kind.hasDescription ? (
                  <div className={`${styles.field} ${builder.wide}`}>
                    <label htmlFor={`${prefix}-d-${index}`}>
                      {t(label(kind.descriptionLabel))}
                    </label>
                    <textarea
                      id={`${prefix}-d-${index}`}
                      name="entryDescription"
                      maxLength={descriptionLimit}
                      defaultValue={row.description}
                      lang={authoredTextLang}
                    />
                  </div>
                ) : null}
                <details
                  className={`${builder.wide} ${extra.welshRow}`}
                  open={Boolean(row.titleCy || row.descriptionCy)}
                >
                  <summary>{t("extra.field.welshHeading")}</summary>
                  <div className={builder.formGrid}>
                    <div className={styles.field}>
                      <label htmlFor={`${prefix}-tc-${index}`}>
                        {t("extra.field.titleCy")}
                      </label>
                      <input
                        id={`${prefix}-tc-${index}`}
                        name="entryTitleCy"
                        maxLength={titleLimit}
                        defaultValue={row.titleCy ?? ""}
                        lang="cy"
                      />
                    </div>
                    {kind.hasDescription ? (
                      <div className={`${styles.field} ${builder.wide}`}>
                        <label htmlFor={`${prefix}-dc-${index}`}>
                          {t("extra.field.descriptionCy")}
                        </label>
                        <textarea
                          id={`${prefix}-dc-${index}`}
                          name="entryDescriptionCy"
                          maxLength={descriptionLimit}
                          defaultValue={row.descriptionCy ?? ""}
                          lang="cy"
                        />
                      </div>
                    ) : null}
                  </div>
                  <span className={builder.hint}>
                    {t("extra.field.welshHint")}
                  </span>
                </details>
                {kind.hasCategory ? (
                  <div className={styles.field}>
                    <label htmlFor={`${prefix}-c-${index}`}>
                      {t("extra.field.category")}
                    </label>
                    <input
                      id={`${prefix}-c-${index}`}
                      name="entryCategory"
                      maxLength={entryCategoryLimit}
                      defaultValue={row.category ?? ""}
                      list={`${prefix}-categories`}
                      autoComplete="off"
                      aria-describedby={`${prefix}-c-hint-${index}`}
                      lang={authoredTextLang}
                    />
                    <span
                      className={builder.hint}
                      id={`${prefix}-c-hint-${index}`}
                    >
                      {t("extra.field.categoryHint")}
                    </span>
                  </div>
                ) : null}
                {kind.hasAvailability ? (
                  <div className={styles.field}>
                    <label htmlFor={`${prefix}-a-${index}`}>
                      {t("extra.field.availability")}
                    </label>
                    <select
                      id={`${prefix}-a-${index}`}
                      name="entryAvailability"
                      defaultValue={row.availability ?? "available"}
                    >
                      {entryAvailabilities.map((value) => (
                        <option key={value} value={value}>
                          {t(label(`extra.availability.${value}`))}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {kind.hasLink ? (
                  <div className={`${styles.field} ${builder.wide}`}>
                    <label htmlFor={`${prefix}-u-${index}`}>
                      {t(label(`extra.field.link.${type}`))}
                    </label>
                    <input
                      id={`${prefix}-u-${index}`}
                      name="entryUrl"
                      type="url"
                      inputMode="url"
                      maxLength={entryUrlLimit}
                      defaultValue={row.url ?? ""}
                      placeholder="https://"
                      autoComplete="off"
                      aria-describedby={`${prefix}-u-hint-${index}`}
                    />
                    <span
                      className={builder.hint}
                      id={`${prefix}-u-hint-${index}`}
                    >
                      {t("extra.field.linkHint")}
                    </span>
                  </div>
                ) : null}
                {kind.hasPicture ? (
                  <div className={`${extra.picture} ${builder.wide}`}>
                    <input
                      type="hidden"
                      name="entryImageId"
                      value={row.image ? row.imageMediaId : ""}
                    />
                    {row.image ? (
                      <figure className={extra.pictureCurrent}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.image.url}
                          alt={row.image.altText}
                          lang={authoredTextLang}
                          loading="lazy"
                          width={96}
                          height={96}
                        />
                        <figcaption className={builder.hint}>
                          {t("extra.field.pictureCurrent")}
                        </figcaption>
                      </figure>
                    ) : null}
                    {uploadsEnabled ? (
                      <>
                        <div className={styles.field}>
                          <label htmlFor={`${prefix}-i-${index}`}>
                            {t(
                              type === "team"
                                ? "extra.field.pictureTeam"
                                : "extra.field.picture",
                            )}
                          </label>
                          <input
                            id={`${prefix}-i-${index}`}
                            name="entryImage"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            aria-describedby={`${prefix}-i-hint-${index}`}
                          />
                          <span
                            className={builder.hint}
                            id={`${prefix}-i-hint-${index}`}
                          >
                            {t("ops.image.hint")}
                          </span>
                        </div>
                        <div className={styles.field}>
                          <label htmlFor={`${prefix}-ia-${index}`}>
                            {t(
                              row.image
                                ? "extra.field.pictureReplaceAlt"
                                : "extra.field.pictureAlt",
                            )}
                          </label>
                          <input
                            id={`${prefix}-ia-${index}`}
                            name="entryImageAlt"
                            maxLength={300}
                            autoComplete="off"
                            lang={authoredTextLang}
                            aria-describedby={`${prefix}-ia-hint-${index}`}
                          />
                          <span
                            className={builder.hint}
                            id={`${prefix}-ia-hint-${index}`}
                          >
                            {t("extra.field.pictureAltHint")}
                          </span>
                        </div>
                        {row.image ? (
                          <label className={styles.check}>
                            <input
                              type="checkbox"
                              name="removeImageRow"
                              value={index}
                            />
                            <span>{t("extra.field.pictureRemove")}</span>
                          </label>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <input type="hidden" name="entryImageAlt" value="" />
                        {row.image ? null : (
                          <p className={builder.hint}>
                            {t("extra.field.pictureUploadsOff")}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      {saved.length + blanks >= maxEntriesPerSection ? (
        <p className={builder.hint}>
          {t("extra.form.entryLimit", { count: maxEntriesPerSection })}
        </p>
      ) : (
        <p className={builder.hint}>{t("extra.form.moreRows")}</p>
      )}
      <div>
        <button className="button primary" type="submit">
          {section ? t("extra.form.save") : t("extra.form.add")}
        </button>
      </div>
    </form>
  );
}

function Tool({
  businessId,
  sectionId,
  name,
  direction,
  disabled,
  t,
}: {
  businessId: string;
  sectionId: string;
  name: string;
  direction: "up" | "down";
  disabled: boolean;
  t: Translator;
}) {
  return (
    <form action={moveCategorySectionAction}>
      {hidden("businessId", businessId)}
      {hidden("sectionId", sectionId)}
      {hidden("direction", direction)}
      <button
        className={`button ${builder.small}`}
        type="submit"
        disabled={disabled}
        aria-label={t(direction === "up" ? "extra.moveUp" : "extra.moveDown", {
          name,
        })}
      >
        {t(direction === "up" ? "menub.up" : "menub.down")}
      </button>
    </form>
  );
}

export function SectionCard({
  businessId,
  canContent,
  uploadsEnabled,
  sections,
  section,
  index,
  t,
}: {
  businessId: string;
  canContent: boolean;
  uploadsEnabled: boolean;
  sections: CategorySectionView[];
  section: CategorySectionView;
  index: number;
  t: Translator;
}) {
  const isHidden = section.status === "hidden";
  const typeName = t(label(`ops.sections.type.${section.sectionType}`));
  return (
    <article
      id={`extra-${section.id}`}
      className={`${builder.group} ${isHidden ? builder.groupHidden : ""}`}
      aria-labelledby={`extra-heading-${section.id}`}
    >
      <div className={builder.groupHead}>
        <div>
          <p className={extra.type}>{typeName}</p>
          <h3 id={`extra-heading-${section.id}`} lang={authoredTextLang}>
            {section.title}
            {isHidden ? (
              <span className={builder.badge}>{t("extra.hiddenBadge")}</span>
            ) : null}
          </h3>
          <p className={builder.hint}>
            {section.entries.length === 1
              ? t("extra.entryCountOne")
              : t("extra.entryCount", { count: section.entries.length })}
          </p>
        </div>
        {canContent ? (
          <div className={builder.tools}>
            <Tool
              businessId={businessId}
              sectionId={section.id}
              name={section.title}
              direction="up"
              disabled={index === 0}
              t={t}
            />
            <Tool
              businessId={businessId}
              sectionId={section.id}
              name={section.title}
              direction="down"
              disabled={index === sections.length - 1}
              t={t}
            />
            <form action={toggleCategorySectionAction}>
              {hidden("businessId", businessId)}
              {hidden("sectionId", section.id)}
              {hidden("status", isHidden ? "active" : "hidden")}
              <button
                className={`button ${builder.small}`}
                type="submit"
                aria-label={t(isHidden ? "extra.showAria" : "extra.hideAria", {
                  name: section.title,
                })}
              >
                {t(isHidden ? "extra.show" : "extra.hide")}
              </button>
            </form>
          </div>
        ) : null}
      </div>
      <ul className={extra.preview} lang={authoredTextLang}>
        {section.entries.slice(0, 6).map((entry, entryIndex) => (
          <li key={`${entry.title}-${entryIndex}`}>
            <strong>{entry.title}</strong>
            {entry.meta ? <span> · {entry.meta}</span> : null}
          </li>
        ))}
        {section.entries.length > 6 ? (
          <li className={builder.hint} lang={undefined}>
            {t("extra.andMore", { count: section.entries.length - 6 })}
          </li>
        ) : null}
      </ul>
      {canContent ? (
        <details className={builder.editor}>
          <summary>{t("extra.edit")}</summary>
          <SectionForm
            businessId={businessId}
            type={section.sectionType}
            section={section}
            uploadsEnabled={uploadsEnabled}
            t={t}
          />
          <details className={builder.confirm}>
            <summary
              aria-label={t("extra.removeAria", { name: section.title })}
            >
              {t("extra.remove")}
            </summary>
            <p>{t("extra.removeHint")}</p>
            <form action={removeCategorySectionAction}>
              {hidden("businessId", businessId)}
              {hidden("sectionId", section.id)}
              <button className={`button ${styles.danger}`} type="submit">
                {t("extra.confirmRemove")}
              </button>
            </form>
          </details>
        </details>
      ) : null}
    </article>
  );
}
