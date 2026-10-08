import { authoredTextLang } from "@/lib/i18n/business-copy";
import { getTranslator } from "@/lib/i18n/server";
import { businessPermissions } from "@/modules/businesses/permissions";
import { isMediaStorageConfigured } from "@/lib/media-storage";
import {
  getBusinessMenuDocument,
  listBusinessMenu,
} from "@/modules/businesses/content-features";
import {
  removeMenuAction,
  removeMenuDocumentAction,
  saveMenuGroupAction,
  saveMenuItemAction,
  uploadMenuDocumentAction,
} from "../actions";
import styles from "../operations.module.css";
import { hidden, hasPermission } from "./shared";

export async function MenuSection({
  businessId,
  userId,
}: {
  businessId: string;
  userId: string;
}) {
  const { t } = await getTranslator();
  const canContentPromise = hasPermission(
    userId,
    businessId,
    businessPermissions.manageContent,
  );
  const [menu, menuDocument] = await Promise.all([
    listBusinessMenu(businessId),
    getBusinessMenuDocument(businessId),
  ]);
  const canContent = await canContentPromise;

  return (
    <section className={styles.section} id="menu" aria-labelledby="menu-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">{t("ops.menu.eyebrow")}</p>
          <h2 id="menu-title">{t("ops.menu.title")}</h2>
        </div>
        <p className={styles.meta}>{t("ops.menu.meta")}</p>
      </div>
      {menu.length === 0 ? (
        <p className={styles.empty}>{t("ops.menu.none")}</p>
      ) : (
        <div className={styles.grid}>
          {menu.map((group) => (
            <article className={styles.card} key={group.id}>
              <h3 lang={authoredTextLang}>{group.name}</h3>
              <p lang={authoredTextLang}>{group.description}</p>
              <ul>
                {group.items.map((item) => (
                  <li key={item.id} lang={authoredTextLang}>
                    <strong>{item.name}</strong>
                    {item.priceDisplay ? ` — ${item.priceDisplay}` : ""}
                    {item.description ? <p>{item.description}</p> : null}
                  </li>
                ))}
              </ul>
              {canContent ? (
                <form action={removeMenuAction}>
                  {hidden("businessId", businessId)}
                  {hidden("groupId", group.id)}
                  <button className={`button ${styles.danger}`} type="submit">
                    {t("ops.menu.removeGroup")}
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      )}
      {canContent ? (
        <div className={styles.grid}>
          <form className={styles.card} action={saveMenuGroupAction}>
            {hidden("businessId", businessId)}
            <h3>{t("ops.menu.addGroupTitle")}</h3>
            <div className={styles.field}>
              <label htmlFor="menu-group-name">{t("ops.common.name")}</label>
              <input id="menu-group-name" name="name" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="menu-group-description">
                {t("ops.common.description")}
              </label>
              <textarea id="menu-group-description" name="description" />
            </div>
            <input type="hidden" name="sortOrder" value={menu.length} />
            <input type="hidden" name="status" value="active" />
            <button className="button primary" type="submit">
              {t("ops.menu.addGroup")}
            </button>
          </form>
          {menu.length > 0 ? (
            <form className={styles.card} action={saveMenuItemAction}>
              {hidden("businessId", businessId)}
              <h3>{t("ops.menu.addItemTitle")}</h3>
              <div className={styles.field}>
                <label htmlFor="menu-item-group">{t("ops.menu.group")}</label>
                <select id="menu-item-group" name="groupId">
                  {menu.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="menu-item-name">{t("ops.common.name")}</label>
                <input id="menu-item-name" name="name" required />
              </div>
              <div className={styles.field}>
                <label htmlFor="menu-item-description">
                  {t("ops.common.description")}
                </label>
                <textarea id="menu-item-description" name="description" />
              </div>
              <div className={styles.field}>
                <label htmlFor="menu-item-price">{t("ops.menu.price")}</label>
                <input id="menu-item-price" name="priceDisplay" />
              </div>
              <div className={styles.field}>
                <label htmlFor="menu-item-labels">{t("ops.menu.labels")}</label>
                <input id="menu-item-labels" name="dietaryLabels" />
              </div>
              <input type="hidden" name="sortOrder" value="0" />
              <label className={styles.check}>
                <input type="checkbox" name="available" defaultChecked />{" "}
                {t("ops.menu.available")}
              </label>
              <label className={styles.check}>
                <input type="checkbox" name="featured" />{" "}
                {t("ops.menu.featured")}
              </label>
              <button className="button primary" type="submit">
                {t("ops.menu.addItem")}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
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
            <h3>{t("ops.menu.quickTitle")}</h3>
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
