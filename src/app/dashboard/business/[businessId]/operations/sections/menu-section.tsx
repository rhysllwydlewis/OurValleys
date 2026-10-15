import type { CSSProperties } from "react";
import { BusinessMenu } from "@/components/business-menu";
import { authoredTextLang } from "@/lib/i18n/business-copy";
import { getTranslator } from "@/lib/i18n/server";
import { isMediaStorageConfigured } from "@/lib/media-storage";
import { getAccent } from "@/modules/businesses/appearance";
import { getBusinessAppearance } from "@/modules/businesses/appearance-repository";
import {
  getBusinessMenuDocument,
  listBusinessMenu,
  maxMenuGroups,
} from "@/modules/businesses/content-features";
import { describeMenuGuidance } from "@/modules/businesses/menu-model";
import { businessPermissions } from "@/modules/businesses/permissions";
import {
  importMenuAction,
  removeMenuDocumentAction,
  saveMenuGroupAction,
  uploadMenuDocumentAction,
} from "../actions";
import styles from "../operations.module.css";
import builder from "./menu-builder.module.css";
import { GroupCard } from "./menu-builder";
import { hidden, hasPermission } from "./shared";

export async function MenuSection({
  businessId,
  userId,
}: {
  businessId: string;
  userId: string;
}) {
  const { t, locale } = await getTranslator();
  const canContentPromise = hasPermission(
    userId,
    businessId,
    businessPermissions.manageContent,
  );
  const [menu, menuDocument, appearance] = await Promise.all([
    listBusinessMenu(businessId),
    getBusinessMenuDocument(businessId),
    getBusinessAppearance(businessId),
  ]);
  const canContent = await canContentPromise;
  const guidance = describeMenuGuidance(menu);
  const accent = getAccent(appearance.accentKey);
  const previewStyle = {
    "--business-primary": accent.primary,
    "--business-strong": accent.strong,
    "--business-soft": accent.soft,
    "--business-canvas": "#f5f7f3",
    "--business-surface": "#ffffff",
    "--business-ink": "#14201b",
    "--business-muted": "#53635b",
    "--business-line": "rgba(20, 32, 27, 0.14)",
  } as CSSProperties;
  const publicGroups = menu.filter((group) => group.status === "active");
  const atGroupLimit = menu.length >= maxMenuGroups;
  const stats: Array<[string, number]> = [
    [t("menub.statGroups"), guidance.groups],
    [t("menub.statItems"), guidance.items],
    [t("menub.statUnavailable"), guidance.unavailableItems],
    [t("menub.statHidden"), guidance.hiddenGroups],
  ];

  return (
    <section className={styles.section} id="menu" aria-labelledby="menu-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">{t("ops.menu.eyebrow")}</p>
          <h2 id="menu-title">{t("ops.menu.title")}</h2>
        </div>
        <p className={styles.meta}>{t("ops.menu.meta")}</p>
      </div>

      <ul className={builder.stats} aria-label={t("menub.statsAria")}>
        {stats.map(([label, value]) => (
          <li className={builder.stat} key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </li>
        ))}
      </ul>

      {canContent ? (
        <div className={builder.guidance}>
          <h3>{t("menub.guidanceTitle")}</h3>
          {guidance.suggestions.length === 0 ? (
            <p>{t("menub.guidanceDone")}</p>
          ) : (
            <ul>
              {guidance.suggestions.map((code) => (
                <li key={code}>
                  {t(`menub.guidance.${code}`, {
                    count: guidance.missingPrice,
                  })}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {menu.length === 0 ? (
        <p className={styles.empty}>{t("menub.emptyBuilder")}</p>
      ) : (
        <div className={builder.groups}>
          {menu.map((group, index) =>
            canContent ? (
              <GroupCard
                key={group.id}
                businessId={businessId}
                groups={menu}
                group={group}
                index={index}
                t={t}
              />
            ) : (
              <article className={builder.group} key={group.id}>
                <h3 lang={authoredTextLang}>{group.name}</h3>
                <ul className={builder.items}>
                  {group.items.map((item) => (
                    <li className={builder.item} key={item.id}>
                      <span
                        className={builder.itemName}
                        lang={authoredTextLang}
                      >
                        {item.name}
                      </span>
                      {item.priceDisplay ? (
                        <span lang={authoredTextLang}>{item.priceDisplay}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </article>
            ),
          )}
        </div>
      )}

      {canContent ? (
        <div className={styles.grid}>
          <form className={styles.card} action={saveMenuGroupAction}>
            {hidden("businessId", businessId)}
            <h3>{t("menub.addGroupTitle")}</h3>
            <p className={builder.hint}>
              {t("menub.addGroupHint")} {t("menub.limitsNote")}
            </p>
            <div className={styles.field}>
              <label htmlFor="menu-group-name">{t("menub.groupName")}</label>
              <input
                id="menu-group-name"
                name="name"
                required
                minLength={2}
                maxLength={100}
                lang={authoredTextLang}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="menu-group-description">
                {t("menub.groupDescription")}
              </label>
              <textarea
                id="menu-group-description"
                name="description"
                maxLength={500}
                lang={authoredTextLang}
              />
            </div>
            <input
              type="hidden"
              name="sortOrder"
              value={Math.min(menu.length, 100)}
            />
            <input type="hidden" name="status" value="active" />
            <button
              className="button primary"
              type="submit"
              disabled={atGroupLimit}
            >
              {t("menub.addGroup")}
            </button>
          </form>
          <form className={styles.card} action={importMenuAction}>
            {hidden("businessId", businessId)}
            <h3>{t("menub.importTitle")}</h3>
            <p>{t("menub.importLead")}</p>
            <p className={builder.hint}>{t("menub.importHelp")}</p>
            <div className={styles.field}>
              <label htmlFor="menu-import-text">{t("menub.importLabel")}</label>
              <textarea
                id="menu-import-text"
                name="menuText"
                className={builder.paste}
                required
                maxLength={20000}
                placeholder={t("menub.importPlaceholder")}
                lang={authoredTextLang}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="menu-import-group">
                {t("menub.importDefaultGroup")}
              </label>
              <input
                id="menu-import-group"
                name="defaultGroup"
                maxLength={100}
                defaultValue={t("menub.importDefaultGroupValue")}
                lang={authoredTextLang}
              />
            </div>
            <p className={builder.hint}>{t("menub.importLimits")}</p>
            <button className="button primary" type="submit">
              {t("menub.importButton")}
            </button>
          </form>
        </div>
      ) : null}

      <div className={builder.preview} style={previewStyle}>
        <h3>{t("menub.previewTitle")}</h3>
        <p>{t("menub.previewLead")}</p>
        {publicGroups.some((group) => group.items.length > 0) ? (
          <BusinessMenu groups={publicGroups} t={t} locale={locale} />
        ) : (
          <p className={styles.empty}>{t("menub.previewEmpty")}</p>
        )}
      </div>

      <div className={styles.card}>
        {menuDocument ? (
          <>
            <h3 lang={authoredTextLang}>{menuDocument.displayName}</h3>
            <p>
              {t("ops.menu.fileInfo", {
                size: Math.ceil(menuDocument.byteSize / 1024),
                type: menuDocument.contentType,
              })}
            </p>
            {menuDocument.url ? (
              <a href={menuDocument.url}>{t("ops.menu.openUploaded")}</a>
            ) : (
              <p>{t("ops.menu.noUrl")}</p>
            )}
            {canContent ? (
              <form action={removeMenuDocumentAction}>
                {hidden("businessId", businessId)}
                <button className={`button ${styles.danger}`} type="submit">
                  {t("ops.menu.removeUploaded")}
                </button>
              </form>
            ) : null}
          </>
        ) : canContent ? (
          <form className={styles.form} action={uploadMenuDocumentAction}>
            {hidden("businessId", businessId)}
            <h3>{t("menub.quickUpload")}</h3>
            <p>{t("ops.menu.quickTitle")}</p>
            <input
              name="file"
              aria-label={t("ops.menu.fileLabel")}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              required
              disabled={!isMediaStorageConfigured()}
            />
            <p className={styles.meta}>
              {isMediaStorageConfigured()
                ? t("ops.menu.uploadHint")
                : t("ops.menu.storageHint")}
            </p>
            <button
              className="button"
              type="submit"
              disabled={!isMediaStorageConfigured()}
            >
              {t("ops.menu.upload")}
            </button>
          </form>
        ) : (
          <p>{t("ops.menu.noDocument")}</p>
        )}
      </div>
    </section>
  );
}
