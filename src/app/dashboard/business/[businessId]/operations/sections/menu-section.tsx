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
import { hidden } from "./shared";

export async function MenuSection({
  businessId,
  canContent,
}: {
  businessId: string;
  canContent: boolean;
}) {
  const [menu, menuDocument] = await Promise.all([
    listBusinessMenu(businessId),
    getBusinessMenuDocument(businessId),
  ]);

  return (
    <section className={styles.section} id="menu" aria-labelledby="menu-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">Structured or quick upload</p>
          <h2 id="menu-title">Menu</h2>
        </div>
        <p className={styles.meta}>
          Structured content is accessible and searchable; a PDF or image is
          available as a quick route.
        </p>
      </div>
      {menu.length === 0 ? (
        <p className={styles.empty}>No structured menu groups yet.</p>
      ) : (
        <div className={styles.grid}>
          {menu.map((group) => (
            <article className={styles.card} key={group.id}>
              <h3>{group.name}</h3>
              <p>{group.description}</p>
              <ul>
                {group.items.map((item) => (
                  <li key={item.id}>
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
                    Remove group
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
            <h3>Add menu group</h3>
            <div className={styles.field}>
              <label htmlFor="menu-group-name">Name</label>
              <input id="menu-group-name" name="name" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="menu-group-description">Description</label>
              <textarea id="menu-group-description" name="description" />
            </div>
            <input type="hidden" name="sortOrder" value={menu.length} />
            <input type="hidden" name="status" value="active" />
            <button className="button primary" type="submit">
              Add group
            </button>
          </form>
          {menu.length > 0 ? (
            <form className={styles.card} action={saveMenuItemAction}>
              {hidden("businessId", businessId)}
              <h3>Add menu item</h3>
              <div className={styles.field}>
                <label htmlFor="menu-item-group">Group</label>
                <select id="menu-item-group" name="groupId">
                  {menu.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="menu-item-name">Name</label>
                <input id="menu-item-name" name="name" required />
              </div>
              <div className={styles.field}>
                <label htmlFor="menu-item-description">Description</label>
                <textarea id="menu-item-description" name="description" />
              </div>
              <div className={styles.field}>
                <label htmlFor="menu-item-price">Price</label>
                <input id="menu-item-price" name="priceDisplay" />
              </div>
              <div className={styles.field}>
                <label htmlFor="menu-item-labels">
                  Dietary/allergen labels, comma-separated
                </label>
                <input id="menu-item-labels" name="dietaryLabels" />
              </div>
              <input type="hidden" name="sortOrder" value="0" />
              <label className={styles.check}>
                <input type="checkbox" name="available" defaultChecked />{" "}
                Available
              </label>
              <label className={styles.check}>
                <input type="checkbox" name="featured" /> Featured
              </label>
              <button className="button primary" type="submit">
                Add item
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
      <div className={styles.card}>
        {menuDocument ? (
          <>
            <h3>{menuDocument.displayName}</h3>
            <p>
              {Math.ceil(menuDocument.byteSize / 1024)} KB ·{" "}
              {menuDocument.contentType}
            </p>
            {menuDocument.url ? (
              <a href={menuDocument.url}>Open uploaded menu</a>
            ) : (
              <p>Public media URL is not configured.</p>
            )}
            {canContent ? (
              <form action={removeMenuDocumentAction}>
                {hidden("businessId", businessId)}
                <button className={`button ${styles.danger}`} type="submit">
                  Remove uploaded menu
                </button>
              </form>
            ) : null}
          </>
        ) : canContent ? (
          <form className={styles.form} action={uploadMenuDocumentAction}>
            {hidden("businessId", businessId)}
            <h3>Quick menu upload</h3>
            <input
              name="file"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              required
              disabled={!isMediaStorageConfigured()}
            />
            <p className={styles.meta}>
              {isMediaStorageConfigured()
                ? "PDF, JPEG, PNG or WebP up to 8 MB."
                : "R2 storage must be configured before uploads open."}
            </p>
            <button
              className="button"
              type="submit"
              disabled={!isMediaStorageConfigured()}
            >
              Upload menu
            </button>
          </form>
        ) : (
          <p>No menu document uploaded.</p>
        )}
      </div>
    </section>
  );
}
