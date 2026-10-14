import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { isPublicDemoEmail } from "@/lib/demo-account";
import { authoredTextLang } from "@/lib/i18n/business-copy";
import { LOCALE_DETAILS, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";
import {
  describeOfferEnding,
  parseSavedTab,
  savedTabCount,
  savedTabHref,
  SAVED_TABS,
  type SavedTab,
} from "@/modules/residents/resident-home";
import { loadSavedItems } from "@/modules/residents/resident-home-data";
import {
  removeBusinessAction,
  removeEventAction,
  removePlaceAction,
} from "./actions";
import styles from "./saved.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t("saved.metaTitle") };
}

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

function formatDate(value: Date, locale: Locale) {
  return new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

const TAB_LABEL = {
  all: "resident.saved.tab.all",
  businesses: "resident.saved.tab.businesses",
  events: "resident.saved.tab.events",
  places: "resident.saved.tab.places",
} as const;

function RemoveForm({
  action,
  itemId,
  returnTo,
  name,
  t,
}: {
  action: (formData: FormData) => Promise<never>;
  itemId: string;
  returnTo: string;
  name: string;
  t: Translator;
}) {
  return (
    <form action={action}>
      <input name="itemId" type="hidden" value={itemId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <button type="submit">
        {t("saved.remove")}
        <span className="sr-only">
          : <span lang={authoredTextLang}>{name}</span>
        </span>
      </button>
    </form>
  );
}

export default async function SavedItemsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string | string[];
    savedOutcome?: string | string[];
  }>;
}) {
  const { locale, t } = await getTranslator();
  const session = await readSession();
  const query = await searchParams;
  const tab = parseSavedTab(query.tab);
  const outcome = Array.isArray(query.savedOutcome)
    ? query.savedOutcome[0]
    : query.savedOutcome;
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(savedTabHref(tab))}`);
  }

  const now = new Date();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const isDemoAccount = isPublicDemoEmail(session.user.email);
  const saved = isDemoAccount
    ? {
        state: "ready" as const,
        businesses: [],
        events: [],
        places: [],
        enrichmentFailed: false,
      }
    : await loadSavedItems(session.user.id, now);
  const returnTo = savedTabHref(tab);
  const counts =
    saved.state === "ready"
      ? {
          businesses: saved.businesses.length,
          events: saved.events.length,
          places: saved.places.length,
        }
      : { businesses: 0, events: 0, places: 0 };
  const total = savedTabCount(counts, "all");
  const show = (kind: Exclude<SavedTab, "all">) =>
    tab === "all" || tab === kind;

  return (
    <>
      <SiteHeader />
      <main className={styles.shell} lang={lang}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{t("resident.saved.eyebrow")}</p>
            <h1>{t("resident.saved.title")}</h1>
            <p className={styles.lead}>{t("resident.saved.lead")}</p>
          </div>
          <div className={styles.actions}>
            <Link className="button" href={"/account" as Route}>
              {t("saved.back")}
            </Link>
            <Link
              className="button"
              href={"/account/settings#preferences" as Route}
            >
              {t("resident.saved.manageEmails")}
            </Link>
          </div>
        </header>

        {outcome === "removed" || outcome === "not_found" ? (
          <p className={styles.outcome} role="status">
            {t("resident.saved.outcome.removed")}
          </p>
        ) : outcome === "invalid" ||
          outcome === "unavailable" ||
          outcome === "forbidden" ? (
          <p className={styles.outcome} role="status">
            {t("resident.saved.outcome.failed")}
          </p>
        ) : null}

        {saved.state === "ready" &&
        "enrichmentFailed" in saved &&
        saved.enrichmentFailed ? (
          <p className={styles.outcome} role="status">
            {t("resident.saved.partial")}
          </p>
        ) : null}

        {isDemoAccount ? (
          <section className={styles.stateCard} role="note">
            <h2>{t("saved.demoTitle")}</h2>
            <p>{t("saved.demoBody")}</p>
            <Link href="/register">{t("saved.demoCta")}</Link>
          </section>
        ) : saved.state === "unavailable" ? (
          <section className={styles.stateCard} role="status">
            <h2>{t("saved.unavailableTitle")}</h2>
            <p>{t("saved.unavailableBody")}</p>
          </section>
        ) : saved.state === "invalid" ? (
          <section className={styles.stateCard} role="status">
            <h2>{t("saved.invalidTitle")}</h2>
            <p>{t("saved.invalidBody")}</p>
          </section>
        ) : total === 0 ? (
          <section className={styles.stateCard}>
            <h2>{t("saved.emptyTitle")}</h2>
            <p>{t("saved.emptyBody")}</p>
            <p>
              <Link className="button primary" href="/businesses">
                {t("saved.browse")}
              </Link>
            </p>
          </section>
        ) : (
          <>
            <nav aria-label={t("resident.saved.tabsAria")}>
              <ul className={styles.tabs}>
                {SAVED_TABS.map((item) => (
                  <li key={item}>
                    <Link
                      href={savedTabHref(item) as Route}
                      aria-current={item === tab ? "page" : undefined}
                    >
                      {t(TAB_LABEL[item])}
                      <span>{savedTabCount(counts, item)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className={styles.sections}>
              {show("businesses") ? (
                <section aria-labelledby="saved-businesses-title">
                  <div className={styles.sectionHeading}>
                    <h2 id="saved-businesses-title">
                      {t("saved.businesses.title")}
                    </h2>
                    <span>{counts.businesses}</span>
                  </div>
                  {saved.businesses.length === 0 ? (
                    <div className={styles.emptyRow}>
                      <p>{t("resident.saved.emptyTab.businesses")}</p>
                      <Link className="button" href="/businesses">
                        {t("resident.saved.browseBusinesses")}
                      </Link>
                    </div>
                  ) : (
                    <ul className={styles.grid}>
                      {saved.businesses.map((item) => {
                        const ending = item.offer
                          ? describeOfferEnding(item.offer.endsAt, now)
                          : { kind: "none" as const };
                        return (
                          <li className={styles.card} key={item.id}>
                            <div>
                              <p
                                className={styles.meta}
                                lang={authoredTextLang}
                              >
                                {item.categoryName} · {item.placeName}
                              </p>
                              <h3 lang={authoredTextLang}>
                                <Link href={`/b/${item.slug}` as Route}>
                                  {item.tradingName}
                                </Link>
                              </h3>
                              <p lang={authoredTextLang}>{item.summary}</p>
                              {item.offer ||
                              (item.upcomingEventCount ?? 0) > 0 ? (
                                <div className={styles.tagRow}>
                                  {item.offer ? (
                                    <span
                                      className={`${styles.tag} ${styles.tagOffer}`}
                                    >
                                      {t("resident.businesses.offerLabel")}{" "}
                                      <span lang={authoredTextLang}>
                                        {item.offer.title}
                                      </span>
                                      {ending.kind === "today"
                                        ? ` · ${t("resident.businesses.endsToday")}`
                                        : ending.kind === "days"
                                          ? ` · ${
                                              ending.days === 1
                                                ? t(
                                                    "resident.businesses.endsTomorrow",
                                                  )
                                                : t(
                                                    "resident.businesses.endsInDays",
                                                    {
                                                      days: ending.days,
                                                    },
                                                  )
                                            }`
                                          : ""}
                                    </span>
                                  ) : null}
                                  {(item.upcomingEventCount ?? 0) > 0 ? (
                                    <span className={styles.tag}>
                                      {t(
                                        item.upcomingEventCount === 1
                                          ? "resident.businesses.events.one"
                                          : "resident.businesses.events.other",
                                        { count: item.upcomingEventCount ?? 0 },
                                      )}
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                            <div className={styles.cardActions}>
                              <Link href={`/b/${item.slug}` as Route}>
                                {t("saved.businesses.view")}
                              </Link>
                              <RemoveForm
                                action={removeBusinessAction}
                                itemId={item.id}
                                returnTo={returnTo}
                                name={item.tradingName}
                                t={t}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              ) : null}

              {show("events") ? (
                <section aria-labelledby="saved-events-title">
                  <div className={styles.sectionHeading}>
                    <h2 id="saved-events-title">{t("saved.events.title")}</h2>
                    <span>{counts.events}</span>
                  </div>
                  {saved.events.length === 0 ? (
                    <div className={styles.emptyRow}>
                      <p>{t("resident.saved.emptyTab.events")}</p>
                      <Link className="button" href="/events">
                        {t("resident.saved.browseEvents")}
                      </Link>
                    </div>
                  ) : (
                    <ul className={styles.grid}>
                      {saved.events.map((event) => (
                        <li className={styles.card} key={event.id}>
                          <div>
                            <p className={styles.meta}>
                              {formatDate(event.startsAt, locale)}
                            </p>
                            <h3 lang={authoredTextLang}>
                              <Link href={`/events/${event.id}` as Route}>
                                {event.title}
                              </Link>
                            </h3>
                            <p lang={authoredTextLang}>
                              {event.businessName}
                              {event.locationDisplay
                                ? ` · ${event.locationDisplay}`
                                : ""}
                            </p>
                          </div>
                          <div className={styles.cardActions}>
                            <a href={`/api/events/${event.id}/ics`}>
                              {t("resident.comingUp.addToCalendar")}
                              <span className="sr-only">
                                :{" "}
                                <span lang={authoredTextLang}>
                                  {event.title}
                                </span>
                              </span>
                            </a>
                            <RemoveForm
                              action={removeEventAction}
                              itemId={event.id}
                              returnTo={returnTo}
                              name={event.title}
                              t={t}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}

              {show("places") ? (
                <section aria-labelledby="saved-places-title">
                  <div className={styles.sectionHeading}>
                    <h2 id="saved-places-title">{t("saved.places.title")}</h2>
                    <span>{counts.places}</span>
                  </div>
                  {saved.places.length === 0 ? (
                    <div className={styles.emptyRow}>
                      <p>{t("resident.saved.emptyTab.places")}</p>
                      <Link className="button" href="/places">
                        {t("resident.saved.browsePlaces")}
                      </Link>
                    </div>
                  ) : (
                    <ul className={styles.grid}>
                      {saved.places.map((item) => (
                        <li className={styles.card} key={item.id}>
                          <div>
                            {item.welshName && item.welshName !== item.name ? (
                              <p className={styles.meta} lang="cy">
                                {item.welshName}
                              </p>
                            ) : null}
                            <h3 lang={authoredTextLang}>
                              <Link href={`/places/${item.slug}` as Route}>
                                {item.name}
                              </Link>
                            </h3>
                            <p lang={authoredTextLang}>
                              {item.editorialSummary}
                            </p>
                            {item.businessCount === null ? null : (
                              <div className={styles.tagRow}>
                                <span className={styles.tag}>
                                  {t(
                                    item.businessCount === 1
                                      ? "resident.places.businesses.one"
                                      : "resident.places.businesses.other",
                                    { count: item.businessCount ?? 0 },
                                  )}
                                </span>
                                {(item.upcomingEventCount ?? 0) > 0 ? (
                                  <span className={styles.tag}>
                                    {t(
                                      item.upcomingEventCount === 1
                                        ? "resident.places.events.one"
                                        : "resident.places.events.other",
                                      { count: item.upcomingEventCount ?? 0 },
                                    )}
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </div>
                          <div className={styles.cardActions}>
                            <Link href={`/places/${item.slug}` as Route}>
                              {t("saved.places.view")}
                            </Link>
                            <RemoveForm
                              action={removePlaceAction}
                              itemId={item.id}
                              returnTo={returnTo}
                              name={item.name}
                              t={t}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
