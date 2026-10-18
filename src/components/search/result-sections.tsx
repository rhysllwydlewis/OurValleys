import Link from "next/link";
import type { Route } from "next";
import { DirectoryCard } from "@/components/directory/directory-card";
import directory from "@/components/directory/directory.module.css";
import type { Translator } from "@/lib/i18n/translate";
import { daysUntilOfferEnds } from "@/modules/businesses/public-offers";
import {
  SITE_SEARCH_SECTION_LIMIT,
  type SiteSearchResult,
} from "@/modules/search/site-search";
import { searchHref } from "@/modules/search/search-filters";
import styles from "./search.module.css";

type Ready = Extract<SiteSearchResult, { state: "ready" }>;

type SectionProps = {
  t: Translator;
  result: Ready;
  /** `htmlLang` of the reader's language. */
  lang: string;
  welsh: boolean;
};

/** Owner- and editor-typed text is English data, so it is marked as such for Welsh readers. */
function authored(welsh: boolean): string | undefined {
  return welsh ? "en-GB" : undefined;
}

export function businessCountLabel(t: Translator, count: number): string {
  if (count === 0) return t("searchx.businessCountNone");
  if (count === 1) return t("searchx.businessCountOne");
  return t("searchx.businessCount", { count });
}

function offerEnds(t: Translator, endsAt: Date | null): string {
  const days = daysUntilOfferEnds(endsAt, new Date());
  if (days === null) return t("offers.noEnd");
  if (days === 0) return t("offers.endsToday");
  if (days === 1) return t("offers.endsTomorrow");
  return t("offers.endsInDays", { days });
}

/** A count beside a chip: shown as a number, read out once as a phrase. */
export function CountBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <>
      <span className={styles.chipCount} aria-hidden="true">
        {count}
      </span>
      <span className="sr-only"> {label}</span>
    </>
  );
}

function SectionHead({
  id,
  title,
  more,
}: {
  id: string;
  title: string;
  more?: { href: string; label: string } | null;
}) {
  return (
    <div className={styles.sectionHead}>
      <h2 id={id}>{title}</h2>
      {more ? (
        <Link className="text-link" href={more.href as Route}>
          {more.label}
          <span aria-hidden="true"> →</span>
        </Link>
      ) : null}
    </div>
  );
}

/** Whether the "all" view should show a summary slice (with a link on) or everything. */
function sliceFor<T>(items: readonly T[], open: boolean): T[] {
  return open ? [...items] : items.slice(0, SITE_SEARCH_SECTION_LIMIT);
}

export function BestMatch({ t, result, welsh }: SectionProps) {
  const top = result.top;
  if (!top || result.type !== "all") return null;
  let href: string;
  let kindLabel: string;
  let action: string;
  let body: string | null = null;
  if (top.kind === "business") {
    href = `/b/${top.slug}`;
    kindLabel = t("searchx.bestBusiness");
    action = t("searchx.bestOpenBusiness");
    const found = result.businesses.items.find(
      (item) => item.slug === top.slug,
    );
    body = found
      ? `${(welsh && result.welsh.categories[found.category.slug]) || found.category.name} · ${(welsh && result.welsh.places[found.place.slug]) || found.place.name}`
      : null;
  } else if (top.kind === "place") {
    const place = result.places.find((item) => item.slug === top.slug);
    href = `/places/${encodeURIComponent(top.slug)}`;
    kindLabel = t("searchx.bestPlace");
    action = t("searchx.bestOpenPlace", { name: top.label });
    body = place ? businessCountLabel(t, place.businesses) : null;
  } else {
    const category = result.categories.find((item) => item.slug === top.slug);
    href = `/businesses?category=${encodeURIComponent(top.slug)}`;
    kindLabel = t("searchx.bestCategory");
    action = t("searchx.bestOpenCategory", { name: top.label });
    body = category ? businessCountLabel(t, category.businesses) : null;
  }
  return (
    <section className={styles.best} aria-labelledby="best-match-title">
      <div>
        <p className="eyebrow" id="best-match-title">
          {t("searchx.bestMatch")} · {kindLabel}
        </p>
        <h2 lang={top.kind === "business" ? authored(welsh) : undefined}>
          {top.label}
        </h2>
        {body ? <p>{body}</p> : null}
      </div>
      <Link className="button primary" href={href as Route}>
        {action}
      </Link>
    </section>
  );
}

export function BusinessSection({ t, result, welsh }: SectionProps) {
  const { businesses } = result;
  if (businesses.items.length === 0) return null;
  const open = result.type === "businesses";
  const items = sliceFor(businesses.items, open);
  const via = businesses.viaCategory;
  const moreHref = via
    ? `/businesses?category=${encodeURIComponent(via.slug)}`
    : `/businesses?q=${encodeURIComponent(result.query)}`;
  const more =
    businesses.total > items.length
      ? open
        ? null
        : {
            href: searchHref({ q: result.query, type: "businesses" }),
            label: t("searchx.seeAllIn", { count: businesses.total }),
          }
      : null;
  return (
    <section
      className={styles.section}
      aria-labelledby="search-businesses-title"
    >
      <SectionHead
        id="search-businesses-title"
        title={t("search.businesses", { count: businesses.total })}
        more={more}
      />
      {via ? (
        <p className={styles.note}>
          {t("searchx.viaCategory", {
            query: result.query,
            category: (welsh && result.welsh.categories[via.slug]) || via.name,
          })}
        </p>
      ) : null}
      <div className={directory.results}>
        {items.map((business) => (
          <DirectoryCard
            key={business.id}
            t={t}
            business={business}
            welsh={welsh}
            categoryName={
              (welsh && result.welsh.categories[business.category.slug]) ||
              business.category.name
            }
            placeName={
              (welsh && result.welsh.places[business.place.slug]) ||
              business.place.name
            }
          />
        ))}
      </div>
      {via ? (
        <p className={styles.note}>
          <Link className="text-link" href={moreHref as Route}>
            {t("searchx.seeCategory", {
              count: businesses.total,
              category:
                (welsh && result.welsh.categories[via.slug]) || via.name,
            })}
            <span aria-hidden="true"> →</span>
          </Link>
        </p>
      ) : null}
    </section>
  );
}

export function OfferSection({ t, result, welsh }: SectionProps) {
  const { offers } = result;
  if (offers.items.length === 0) return null;
  const open = result.type === "offers";
  const items = sliceFor(offers.items, open);
  return (
    <section className={styles.section} aria-labelledby="search-offers-title">
      <SectionHead
        id="search-offers-title"
        title={t("searchx.offersHeading", { count: offers.total })}
        more={
          offers.total > items.length && !open
            ? {
                href: searchHref({ q: result.query, type: "offers" }),
                label: t("searchx.seeAllIn", { count: offers.total }),
              }
            : null
        }
      />
      <ul className={styles.list}>
        {items.map((offer) => (
          <li className={styles.item} key={offer.id}>
            <span className={styles.badge}>
              {offer.fictional
                ? t("offers.fictionalDemo")
                : t("searchx.offerBadge")}
            </span>
            <h3 lang={offer.welshTitle ? "cy-GB" : authored(welsh)}>
              <Link href={`/b/${offer.businessSlug}#offers` as Route}>
                {offer.title}
              </Link>
            </h3>
            <p className={styles.meta}>
              {t("offers.from")}{" "}
              <span lang={authored(welsh)}>{offer.businessName}</span> ·{" "}
              {offerEnds(t, offer.endsAt)}
            </p>
            <p lang={offer.welshDescription ? "cy-GB" : authored(welsh)}>
              {offer.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatWhen(value: Date, lang: string): string {
  return new Intl.DateTimeFormat(lang, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

export function EventSection({ t, result, lang, welsh }: SectionProps) {
  const { events } = result;
  if (events.items.length === 0) return null;
  const open = result.type === "events";
  const items = sliceFor(events.items, open);
  return (
    <section className={styles.section} aria-labelledby="search-events-title">
      <SectionHead
        id="search-events-title"
        title={t("searchx.eventsHeading", { count: events.total })}
        more={
          events.total > items.length && !open
            ? {
                href: searchHref({ q: result.query, type: "events" }),
                label: t("searchx.seeAllIn", { count: events.total }),
              }
            : null
        }
      />
      <ul className={styles.list}>
        {items.map((event) => (
          <li className={styles.item} key={event.id}>
            <p className="eyebrow">{formatWhen(event.startsAt, lang)}</p>
            <h3 lang={event.welshTitle ? "cy-GB" : authored(welsh)}>
              <Link href={`/events/${event.id}` as Route}>{event.title}</Link>
            </h3>
            <p className={styles.meta}>
              {t("offers.from")}{" "}
              <span lang={authored(welsh)}>{event.businessName}</span>
              {event.locationDisplay ? (
                <>
                  {" · "}
                  <span lang={authored(welsh)}>{event.locationDisplay}</span>
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PlaceSection({ t, result, welsh }: SectionProps) {
  if (result.places.length === 0) return null;
  const open = result.type === "places";
  const items = sliceFor(result.places, open);
  return (
    <section className={styles.section} aria-labelledby="search-places-title">
      <SectionHead
        id="search-places-title"
        title={t("searchx.placesHeading", { count: result.places.length })}
        more={
          result.places.length > items.length && !open
            ? {
                href: searchHref({ q: result.query, type: "places" }),
                label: t("searchx.seeAllIn", { count: result.places.length }),
              }
            : null
        }
      />
      <ul className={styles.chips}>
        {items.map((place) => (
          <li key={place.slug}>
            <Link
              className={styles.chip}
              href={`/places/${encodeURIComponent(place.slug)}` as Route}
            >
              {(welsh && place.welshName) || place.name}
              <CountBadge
                count={place.businesses}
                label={businessCountLabel(t, place.businesses)}
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CategorySection({ t, result, welsh }: SectionProps) {
  if (result.categories.length === 0) return null;
  const open = result.type === "categories";
  const items = sliceFor(result.categories, open);
  return (
    <section
      className={styles.section}
      aria-labelledby="search-categories-title"
    >
      <SectionHead
        id="search-categories-title"
        title={t("searchx.categoriesHeading", {
          count: result.categories.length,
        })}
        more={
          result.categories.length > items.length && !open
            ? {
                href: searchHref({ q: result.query, type: "categories" }),
                label: t("searchx.seeAllIn", {
                  count: result.categories.length,
                }),
              }
            : null
        }
      />
      <ul className={styles.chips}>
        {items.map((category) => (
          <li key={category.slug}>
            <Link
              className={styles.chip}
              href={
                `/businesses?category=${encodeURIComponent(category.slug)}` as Route
              }
            >
              {(welsh && category.welshLabel) || category.name}
              <CountBadge
                count={category.businesses}
                label={businessCountLabel(t, category.businesses)}
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GuideSection({ t, result, welsh }: SectionProps) {
  if (result.guides.length === 0) return null;
  const open = result.type === "guides";
  const items = sliceFor(result.guides, open);
  return (
    <section className={styles.section} aria-labelledby="search-guides-title">
      <SectionHead
        id="search-guides-title"
        title={t("searchx.guidesHeading", { count: result.guides.length })}
        more={
          result.guides.length > items.length && !open
            ? {
                href: searchHref({ q: result.query, type: "guides" }),
                label: t("searchx.seeAllIn", { count: result.guides.length }),
              }
            : null
        }
      />
      <ul className={styles.list}>
        {items.map((item) => (
          <li className={styles.item} key={item.slug}>
            <span className={styles.badge} lang={authored(welsh)}>
              {item.area}
            </span>
            <h3 lang={authored(welsh)}>
              <Link href={`/guides/${item.slug}` as Route}>{item.title}</Link>
            </h3>
            <p lang={authored(welsh)}>{item.summary}</p>
            <p className={styles.meta}>
              <span lang={authored(welsh)}>{item.readingTime}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Shown when nothing matched: typo-tolerant suggestions, categories, and a way to add a business. */
export function NoResults({ t, result, welsh }: SectionProps) {
  const recovery = result.recovery;
  return (
    <section className="state-panel">
      <p className="eyebrow">{t("search.noneEyebrow")}</p>
      <h2>{t("search.noneTitle", { query: result.query })}</h2>
      <p>{t("searchx.noneTips")}</p>
      {recovery && recovery.suggestions.length > 0 ? (
        <>
          <p>
            <strong>{t("searchx.didYouMean")}</strong>
          </p>
          <ul className={styles.chips}>
            {recovery.suggestions.map((suggestion) => (
              <li key={`${suggestion.kind}-${suggestion.href}`}>
                <Link
                  className={styles.chip}
                  href={suggestion.href as Route}
                  lang={authored(welsh)}
                >
                  {suggestion.label}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {recovery && recovery.categories.length > 0 ? (
        <>
          <p>
            <strong>{t("searchx.noneCategories")}</strong>
          </p>
          <ul className={styles.chips}>
            {recovery.categories.map((category) => (
              <li key={category.slug}>
                <Link
                  className={styles.chip}
                  href={
                    `/businesses?category=${encodeURIComponent(category.slug)}` as Route
                  }
                >
                  {(welsh && category.welshLabel) || category.name}
                  <CountBadge
                    count={category.count}
                    label={businessCountLabel(t, category.count)}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <div className={styles.suggest}>
        <span>{t("searchx.noneSuggestLead")}</span>
        <Link className="button" href="/suggest-a-business">
          {t("searchx.noneSuggest")}
        </Link>
      </div>
    </section>
  );
}
