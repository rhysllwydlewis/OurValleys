import { authoredTextLang } from "@/lib/i18n/business-copy";
import type { Translator } from "@/lib/i18n/translate";
import type { MenuGroupView } from "@/modules/businesses/content-features";
import {
  dietaryLabelDefinitions,
  splitStoredLabels,
} from "@/modules/businesses/menu-model";
import {
  moveMenuAction,
  removeMenuAction,
  saveMenuGroupAction,
  saveMenuItemAction,
  toggleMenuItemAction,
} from "../actions";
import styles from "../operations.module.css";
import builder from "./menu-builder.module.css";
import { hidden } from "./shared";

type Item = MenuGroupView["items"][number];

function MoveButtons({
  businessId,
  target,
  name,
  first,
  last,
  t,
}: {
  businessId: string;
  target: { groupId: string } | { itemId: string };
  name: string;
  first: boolean;
  last: boolean;
  t: Translator;
}) {
  const field = "groupId" in target ? "groupId" : "itemId";
  const id = "groupId" in target ? target.groupId : target.itemId;
  return (
    <>
      {(["up", "down"] as const).map((direction) => (
        <form action={moveMenuAction} key={direction}>
          {hidden("businessId", businessId)}
          {hidden(field, id)}
          {hidden("direction", direction)}
          <button
            className={`button ${builder.small}`}
            type="submit"
            disabled={direction === "up" ? first : last}
            aria-label={t(
              direction === "up" ? "menub.moveUp" : "menub.moveDown",
              {
                name,
              },
            )}
          >
            {t(direction === "up" ? "menub.up" : "menub.down")}
          </button>
        </form>
      ))}
    </>
  );
}

function ConfirmRemove({
  businessId,
  field,
  id,
  label,
  ariaLabel,
  hint,
  t,
}: {
  businessId: string;
  field: "groupId" | "itemId";
  id: string;
  label: string;
  ariaLabel: string;
  hint: string;
  t: Translator;
}) {
  return (
    <details className={builder.confirm}>
      <summary aria-label={ariaLabel}>{label}</summary>
      <p>{hint}</p>
      <form action={removeMenuAction}>
        {hidden("businessId", businessId)}
        {hidden(field, id)}
        <button className={`button ${styles.danger}`} type="submit">
          {t("menub.confirmRemove")}
        </button>
      </form>
    </details>
  );
}

function DietaryFieldset({
  checked,
  idPrefix,
  t,
}: {
  checked: readonly string[];
  idPrefix: string;
  t: Translator;
}) {
  return (
    <fieldset className={builder.dietary}>
      <legend>{t("menub.dietaryLegend")}</legend>
      {dietaryLabelDefinitions.map((definition) => (
        <label key={definition.key} htmlFor={`${idPrefix}-${definition.key}`}>
          <input
            id={`${idPrefix}-${definition.key}`}
            type="checkbox"
            name="dietary"
            value={definition.label}
            defaultChecked={checked.includes(definition.key)}
          />
          {t(`menu.diet.${definition.key}`)}
        </label>
      ))}
      <p className={`${builder.hint} ${builder.wide}`}>
        {t("menub.dietaryHint")}
      </p>
    </fieldset>
  );
}

export function ItemForm({
  businessId,
  groups,
  groupId,
  item,
  nextOrder,
  t,
}: {
  businessId: string;
  groups: MenuGroupView[];
  groupId: string;
  item?: Item;
  nextOrder: number;
  t: Translator;
}) {
  const prefix = `menu-item-${item?.id ?? `new-${groupId}`}`;
  const parts = splitStoredLabels(item?.dietaryLabels ?? []);
  return (
    <form className={styles.form} action={saveMenuItemAction}>
      {hidden("businessId", businessId)}
      {item ? hidden("itemId", item.id) : null}
      {hidden("sortOrder", String(item?.sortOrder ?? nextOrder))}
      <div className={builder.formGrid}>
        <div className={styles.field}>
          <label htmlFor={`${prefix}-name`}>{t("menub.itemName")}</label>
          <input
            id={`${prefix}-name`}
            name="name"
            required
            minLength={2}
            maxLength={120}
            defaultValue={item?.name ?? ""}
            lang={authoredTextLang}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${prefix}-price`}>{t("menub.itemPrice")}</label>
          <input
            id={`${prefix}-price`}
            name="priceDisplay"
            maxLength={80}
            defaultValue={item?.priceDisplay ?? ""}
            aria-describedby={`${prefix}-price-hint`}
            lang={authoredTextLang}
          />
          <span className={builder.hint} id={`${prefix}-price-hint`}>
            {t("menub.itemPriceHint")}
          </span>
        </div>
        <div className={`${styles.field} ${builder.wide}`}>
          <label htmlFor={`${prefix}-desc`}>{t("menub.itemDescription")}</label>
          <textarea
            id={`${prefix}-desc`}
            name="description"
            maxLength={1000}
            defaultValue={item?.description ?? ""}
            lang={authoredTextLang}
          />
        </div>
        {item && groups.length > 1 ? (
          <div className={styles.field}>
            <label htmlFor={`${prefix}-group`}>{t("ops.menu.group")}</label>
            <select
              id={`${prefix}-group`}
              name="groupId"
              defaultValue={groupId}
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          hidden("groupId", groupId)
        )}
      </div>
      <DietaryFieldset checked={parts.keys} idPrefix={prefix} t={t} />
      <div className={styles.field}>
        <label htmlFor={`${prefix}-labels`}>{t("menub.customLabels")}</label>
        <input
          id={`${prefix}-labels`}
          name="dietaryLabels"
          defaultValue={parts.custom.join(", ")}
          aria-describedby={`${prefix}-labels-hint`}
          lang={authoredTextLang}
        />
        <span className={builder.hint} id={`${prefix}-labels-hint`}>
          {t("menub.customLabelsHint")}
        </span>
      </div>
      <label className={styles.check}>
        <input
          type="checkbox"
          name="available"
          defaultChecked={item ? item.available : true}
        />
        {t("menub.itemAvailable")}
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          name="featured"
          defaultChecked={item?.featured ?? false}
        />
        {t("menub.itemFeatured")}
      </label>
      <div>
        <button className="button primary" type="submit">
          {item ? t("menub.save") : t("menub.addItem")}
        </button>
      </div>
    </form>
  );
}

function ItemRow({
  businessId,
  groups,
  group,
  item,
  index,
  t,
}: {
  businessId: string;
  groups: MenuGroupView[];
  group: MenuGroupView;
  item: Item;
  index: number;
  t: Translator;
}) {
  const parts = splitStoredLabels(item.dietaryLabels);
  return (
    <li className={`${builder.item} ${item.available ? "" : builder.itemOut}`}>
      <div className={builder.itemMain}>
        <span className={builder.itemName} lang={authoredTextLang}>
          {item.name}
        </span>
        {item.featured ? (
          <span className={`${builder.badge} ${builder.badgeFav}`}>
            {t("menub.favourite")}
          </span>
        ) : null}
        {item.available ? null : (
          <span className={builder.badge}>{t("menub.unavailableBadge")}</span>
        )}
        {item.priceDisplay ? (
          <span className={builder.itemPrice} lang={authoredTextLang}>
            {item.priceDisplay}
          </span>
        ) : null}
      </div>
      {item.description ? (
        <p className={builder.itemDesc} lang={authoredTextLang}>
          {item.description}
        </p>
      ) : null}
      {parts.keys.length + parts.custom.length > 0 ? (
        <ul className={builder.chips}>
          {parts.keys.map((key) => (
            <li key={key}>{t(`menu.diet.${key}`)}</li>
          ))}
          {parts.custom.map((label) => (
            <li key={label} lang={authoredTextLang}>
              {label}
            </li>
          ))}
        </ul>
      ) : null}
      <div className={builder.tools}>
        <form action={toggleMenuItemAction}>
          {hidden("businessId", businessId)}
          {hidden("itemId", item.id)}
          {hidden("flag", "available")}
          {hidden("value", item.available ? "false" : "true")}
          <button
            className={`button ${builder.small}`}
            type="submit"
            aria-label={t(
              item.available
                ? "menub.markUnavailableAria"
                : "menub.markAvailableAria",
              { name: item.name },
            )}
          >
            {t(
              item.available ? "menub.markUnavailable" : "menub.markAvailable",
            )}
          </button>
        </form>
        <form action={toggleMenuItemAction}>
          {hidden("businessId", businessId)}
          {hidden("itemId", item.id)}
          {hidden("flag", "featured")}
          {hidden("value", item.featured ? "false" : "true")}
          <button
            className={`button ${builder.small}`}
            type="submit"
            aria-label={t(
              item.featured
                ? "menub.favouriteOnAria"
                : "menub.favouriteOffAria",
              { name: item.name },
            )}
          >
            {t(item.featured ? "menub.favouriteOn" : "menub.favouriteOff")}
          </button>
        </form>
        <MoveButtons
          businessId={businessId}
          target={{ itemId: item.id }}
          name={item.name}
          first={index === 0}
          last={index === group.items.length - 1}
          t={t}
        />
      </div>
      <details className={builder.editor}>
        <summary aria-label={t("menub.editItemAria", { name: item.name })}>
          {t("menub.editItem")}
        </summary>
        <ItemForm
          businessId={businessId}
          groups={groups}
          groupId={group.id}
          item={item}
          nextOrder={index}
          t={t}
        />
        <ConfirmRemove
          businessId={businessId}
          field="itemId"
          id={item.id}
          label={t("menub.removeItem")}
          ariaLabel={t("menub.removeItemAria", { name: item.name })}
          hint={t("menub.confirmItemHint")}
          t={t}
        />
      </details>
    </li>
  );
}

export function GroupCard({
  businessId,
  groups,
  group,
  index,
  t,
}: {
  businessId: string;
  groups: MenuGroupView[];
  group: MenuGroupView;
  index: number;
  t: Translator;
}) {
  const isHidden = group.status === "hidden";
  return (
    <article
      className={`${builder.group} ${isHidden ? builder.groupHidden : ""}`}
      aria-labelledby={`menu-group-${group.id}`}
    >
      <div className={builder.groupHead}>
        <div>
          <h3 id={`menu-group-${group.id}`} lang={authoredTextLang}>
            {group.name}
            {isHidden ? (
              <span className={builder.badge}>{t("menub.hiddenBadge")}</span>
            ) : null}
          </h3>
          {group.description ? (
            <p lang={authoredTextLang}>{group.description}</p>
          ) : null}
          <p className={builder.hint}>
            {group.items.length === 1
              ? t("menub.itemCountOne")
              : t("menub.itemCount", { count: group.items.length })}
          </p>
        </div>
        <div className={builder.tools}>
          <MoveButtons
            businessId={businessId}
            target={{ groupId: group.id }}
            name={group.name}
            first={index === 0}
            last={index === groups.length - 1}
            t={t}
          />
        </div>
      </div>
      {group.items.length === 0 ? (
        <p className={styles.empty}>{t("menub.emptyGroup")}</p>
      ) : (
        <ul className={builder.items}>
          {group.items.map((item, itemIndex) => (
            <ItemRow
              key={item.id}
              businessId={businessId}
              groups={groups}
              group={group}
              item={item}
              index={itemIndex}
              t={t}
            />
          ))}
        </ul>
      )}
      <details className={builder.editor}>
        <summary>{t("menub.addItemTo", { name: group.name })}</summary>
        <ItemForm
          businessId={businessId}
          groups={groups}
          groupId={group.id}
          nextOrder={group.items.length}
          t={t}
        />
      </details>
      <details className={builder.editor}>
        <summary>{t("menub.editGroup")}</summary>
        <form className={styles.form} action={saveMenuGroupAction}>
          {hidden("businessId", businessId)}
          {hidden("groupId", group.id)}
          {hidden("sortOrder", String(group.sortOrder))}
          <div className={styles.field}>
            <label htmlFor={`group-name-${group.id}`}>
              {t("menub.groupName")}
            </label>
            <input
              id={`group-name-${group.id}`}
              name="name"
              required
              minLength={2}
              maxLength={100}
              defaultValue={group.name}
              lang={authoredTextLang}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor={`group-desc-${group.id}`}>
              {t("menub.groupDescription")}
            </label>
            <textarea
              id={`group-desc-${group.id}`}
              name="description"
              maxLength={500}
              defaultValue={group.description ?? ""}
              lang={authoredTextLang}
            />
          </div>
          <label className={styles.check}>
            <input
              type="checkbox"
              name="statusVisible"
              defaultChecked={!isHidden}
            />
            {t("menub.groupVisible")}
          </label>
          <div>
            <button className="button primary" type="submit">
              {t("menub.save")}
            </button>
          </div>
        </form>
        <ConfirmRemove
          businessId={businessId}
          field="groupId"
          id={group.id}
          label={t("menub.removeGroup")}
          ariaLabel={t("menub.removeGroupAria", { name: group.name })}
          hint={t("menub.confirmGroupHint")}
          t={t}
        />
      </details>
    </article>
  );
}
