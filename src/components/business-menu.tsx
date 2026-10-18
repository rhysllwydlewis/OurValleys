import { authoredTextLang } from "@/lib/i18n/business-copy";
import type { Translator } from "@/lib/i18n/translate";
import {
  dietaryKeysInUse,
  featuredMenuItems,
  menuGroupAnchor,
  splitStoredLabels,
  type DietaryLabelKey,
  type MenuGroupShape,
  type MenuItemShape,
} from "@/modules/businesses/menu-model";
import { MenuFilters } from "./menu-filters";
import styles from "./business-menu.module.css";

type MenuItemView = MenuItemShape;

function MenuItemRow({
  item,
  t,
  authoredLang,
  duplicate = false,
  showFavourite = true,
}: {
  item: MenuItemView;
  t: Translator;
  authoredLang: string | undefined;
  duplicate?: boolean;
  showFavourite?: boolean;
}) {
  const { keys, custom } = splitStoredLabels(item.dietaryLabels);
  return (
    <li
      className={`${styles.item} ${item.available ? "" : styles.itemOut}`}
      data-menu-item=""
      data-menu-duplicate={duplicate ? "true" : undefined}
      data-diet={keys.join(" ")}
      data-available={item.available ? "true" : "false"}
    >
      <div className={styles.itemHead}>
        <strong lang={item.welshName ? "cy-GB" : authoredLang}>
          {item.name}
        </strong>
        {item.featured && showFavourite && item.available ? (
          <span className={styles.badge}>{t("menu.public.favourite")}</span>
        ) : null}
        {item.priceDisplay ? (
          <span className={styles.price} lang={authoredLang}>
            {item.priceDisplay}
          </span>
        ) : null}
      </div>
      {item.description ? (
        <p
          className={styles.description}
          lang={item.welshDescription ? "cy-GB" : authoredLang}
        >
          {item.description}
        </p>
      ) : null}
      {keys.length + custom.length > 0 ? (
        <ul className={styles.labels}>
          {keys.map((key) => (
            <li key={key} className={styles.label}>
              {t(`menu.diet.${key}`)}
            </li>
          ))}
          {custom.map((label) => (
            <li key={label} className={styles.label} lang={authoredLang}>
              {label}
            </li>
          ))}
        </ul>
      ) : null}
      {item.available ? null : (
        <p className={styles.unavailable}>{t("menu.public.unavailable")}</p>
      )}
    </li>
  );
}

/**
 * The public structured menu, used in the business website's menu section and
 * on the full-menu page: a jump bar, house favourites, sections of dishes with
 * dietary labels and an unavailable state, an optional dietary filter and an
 * allergen notice. Everything the business typed is data and carries the
 * business's language; labels and notices follow the reader's language.
 */
export function BusinessMenu({
  groups,
  t,
  layout = "columns",
  variant = "section",
}: {
  groups: ReadonlyArray<MenuGroupShape>;
  t: Translator;
  layout?: string;
  variant?: "section" | "page";
}) {
  // The data model records no language for owner-typed text, so it is marked
  // as unknown rather than guessed (it may be Welsh or English).
  const authoredLang = authoredTextLang;
  const Heading = variant === "page" ? "h2" : "h3";
  const shapes = groups.filter((group) => group.items.length > 0);
  if (shapes.length === 0) return null;
  const favourites = featuredMenuItems(shapes);
  const keysInUse: DietaryLabelKey[] = dietaryKeysInUse(shapes);
  const hasUnavailable = shapes.some((group) =>
    group.items.some((item) => !item.available),
  );
  const compact = layout === "compact" && variant === "section";

  return (
    <div
      className={`${styles.menu} ${variant === "page" ? styles.menuPage : ""}`}
    >
      {shapes.length >= 3 ? (
        <nav
          className={`${styles.jump} ${variant === "page" ? styles.jumpSticky : ""}`}
          aria-label={t("menu.public.jumpAria")}
        >
          {shapes.map((group) => (
            <a
              key={group.id}
              href={`#${menuGroupAnchor(group)}`}
              className={styles.jumpLink}
              data-menu-jump={menuGroupAnchor(group)}
              lang={group.welshName ? "cy-GB" : authoredLang}
            >
              {group.name}
            </a>
          ))}
        </nav>
      ) : null}
      <MenuFilters
        options={keysInUse.map((key) => ({
          key,
          label: t(`menu.diet.${key}`),
        }))}
        hasUnavailable={hasUnavailable}
        labels={{
          legend: t("menu.public.filterLegend"),
          ariaLabel: t("menu.public.filterAria"),
          hideUnavailable: t("menu.public.hideUnavailable"),
          clear: t("menu.public.clear"),
          noMatch: t("menu.public.noMatch"),
          cleared: t("menu.public.cleared"),
          count: t("menu.public.count", { shown: "{shown}", total: "{total}" }),
          countOne: t("menu.public.countOne", { total: "{total}" }),
        }}
      >
        {favourites.length > 0 ? (
          <section
            className={styles.favourites}
            data-menu-favourites=""
            aria-label={t("menu.public.favourites")}
          >
            <Heading className={styles.favouritesTitle}>
              {t("menu.public.favourites")}
            </Heading>
            <ul className={styles.favouriteList}>
              {favourites.map((item) => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  t={t}
                  authoredLang={authoredLang}
                  duplicate
                  showFavourite={false}
                />
              ))}
            </ul>
          </section>
        ) : null}
        <div className={compact ? styles.groupsCompact : styles.groups}>
          {shapes.map((group) => (
            <article
              key={group.id}
              id={menuGroupAnchor(group)}
              className={styles.group}
              data-menu-group=""
            >
              <div className={styles.groupHead}>
                <Heading lang={group.welshName ? "cy-GB" : authoredLang}>
                  {group.name}
                </Heading>
                {group.description ? (
                  <p lang={group.welshDescription ? "cy-GB" : authoredLang}>
                    {group.description}
                  </p>
                ) : null}
              </div>
              <ul className={styles.items}>
                {group.items.map((item) => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    t={t}
                    authoredLang={authoredLang}
                  />
                ))}
              </ul>
            </article>
          ))}
        </div>
      </MenuFilters>
      <p className={styles.allergen} role="note">
        {t("menu.public.allergen")}
      </p>
    </div>
  );
}
