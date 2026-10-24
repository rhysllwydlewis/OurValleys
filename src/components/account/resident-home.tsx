import type { Route } from "next";
import Link from "next/link";
import { authoredTextLang } from "@/lib/i18n/business-copy";
import type { Translator } from "@/lib/i18n/translate";
import { formatDayShort, formatEventTimes } from "@/modules/events/format";
import { londonDayKey } from "@/modules/events/date-window";
import type {
  ResidentBusiness,
  ResidentPlace,
} from "@/modules/residents/resident-home-data";
import { describeSavedQuery } from "@/modules/residents/saved-search-model";
import type { SavedSearchesResult } from "@/modules/residents/saved-searches";
import type { PlaceDigestContent } from "@/modules/residents/place-digest";
import {
  describeOfferEnding,
  groupComingUp,
  type ComingUpEvent,
  type ResidentStep,
} from "@/modules/residents/resident-home";
import styles from "./resident-home.module.css";

const SOURCE_KEY = {
  saved: "resident.comingUp.sourceSaved",
  business: "resident.comingUp.sourceBusiness",
  place: "resident.comingUp.sourcePlace",
} as const;

const BUCKET_KEY = {
  today: "resident.comingUp.today",
  thisWeek: "resident.comingUp.thisWeek",
  later: "resident.comingUp.later",
} as const;

function Panel({
  id,
  eyebrow,
  title,
  hint,
  action,
  children,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`${styles.panel} ${className ?? ""}`}
      aria-labelledby={id}
    >
      <header className={styles.panelHead}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 id={id}>{title}</h2>
        </div>
        {action}
      </header>
      {hint ? <p className={styles.hintRow}>{hint}</p> : null}
      {children}
    </section>
  );
}

function EmptyState({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className={styles.empty}>
      <h3>{title}</h3>
      <p>{body}</p>
      <Link className="button" href={href as Route}>
        {cta}
      </Link>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className={styles.notice} role="status">
      {children}
    </p>
  );
}

/** The diary: saved events and events from saved businesses and places, by when. */
export function ComingUpPanel({
  t,
  lang,
  now,
  events,
  truncated,
  unavailable,
}: {
  t: Translator;
  lang: string;
  now: Date;
  events: ComingUpEvent[];
  truncated: boolean;
  unavailable: boolean;
}) {
  const buckets = groupComingUp(events, now);
  return (
    <Panel
      id="coming-up-title"
      eyebrow={t("resident.comingUp.eyebrow")}
      title={t("resident.comingUp.title")}
      hint={t("resident.comingUp.hint")}
      action={
        <Link className={styles.panelLink} href="/events">
          {t("resident.comingUp.allEvents")}
        </Link>
      }
    >
      {unavailable ? (
        <Notice>{t("resident.comingUp.unavailable")}</Notice>
      ) : buckets.length === 0 ? (
        <EmptyState
          title={t("resident.comingUp.emptyTitle")}
          body={t("resident.comingUp.emptyBody")}
          href="/events"
          cta={t("resident.comingUp.emptyCta")}
        />
      ) : (
        <div className={styles.buckets}>
          {buckets.map((bucket) => (
            <div key={bucket.key}>
              <h3 className={styles.bucketTitle}>
                {t(BUCKET_KEY[bucket.key])}
              </h3>
              <ul className={styles.eventList}>
                {bucket.events.map((event) => {
                  const day = formatDayShort(
                    londonDayKey(event.startsAt),
                    lang,
                  );
                  const times = formatEventTimes(event, lang, (when) =>
                    t("resident.comingUp.until", { when }),
                  );
                  return (
                    <li className={styles.eventItem} key={event.id}>
                      <div className={styles.dateTile} aria-hidden="true">
                        <span>{day.weekday}</span>
                        <strong>{day.day}</strong>
                        <span>{day.month}</span>
                      </div>
                      <div className={styles.eventBody}>
                        <h4 lang={authoredTextLang}>
                          <Link href={`/events/${event.id}` as Route}>
                            {event.title}
                          </Link>
                        </h4>
                        <p className={styles.eventMeta}>
                          <span>
                            {times.start}
                            {times.until ? ` · ${times.until}` : ""}
                          </span>
                          <span lang={authoredTextLang}>
                            {event.businessName}
                            {event.locationDisplay
                              ? ` · ${event.locationDisplay}`
                              : ""}
                          </span>
                        </p>
                        <p className={styles.eventFoot}>
                          <span className={styles.sourceTag}>
                            {t(SOURCE_KEY[event.source])}
                          </span>
                          <a href={`/api/events/${event.id}/ics`}>
                            {t("resident.comingUp.addToCalendar")}
                            <span className="sr-only">
                              :{" "}
                              <span lang={authoredTextLang}>{event.title}</span>
                            </span>
                          </a>
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
      {truncated && !unavailable ? (
        <p className={styles.more}>
          <Link href={"/account/saved?tab=events" as Route}>
            {t("resident.comingUp.truncated")}
          </Link>
        </p>
      ) : null}
    </Panel>
  );
}

const SHOWN_BUSINESSES = 6;

/** Saved businesses with their live offer and event count. */
export function SavedBusinessesPanel({
  t,
  now,
  businesses,
  unavailable,
  partial,
}: {
  t: Translator;
  now: Date;
  businesses: ResidentBusiness[];
  unavailable: boolean;
  partial: boolean;
}) {
  const shown = businesses.slice(0, SHOWN_BUSINESSES);
  return (
    <Panel
      id="saved-businesses-title"
      eyebrow={t("resident.businesses.eyebrow")}
      title={t("resident.businesses.title")}
      action={
        <Link
          className={styles.panelLink}
          href={"/account/saved?tab=businesses" as Route}
        >
          {t("resident.businesses.viewAll")}
        </Link>
      }
    >
      {unavailable ? (
        <Notice>{t("resident.comingUp.unavailable")}</Notice>
      ) : shown.length === 0 ? (
        <EmptyState
          title={t("resident.businesses.emptyTitle")}
          body={t("resident.businesses.emptyBody")}
          href="/businesses"
          cta={t("resident.businesses.emptyCta")}
        />
      ) : (
        <>
          {partial ? <Notice>{t("resident.businesses.partial")}</Notice> : null}
          <ul className={styles.businessGrid}>
            {shown.map((item) => {
              const ending = item.offer
                ? describeOfferEnding(item.offer.endsAt, now)
                : { kind: "none" as const };
              return (
                <li className={styles.businessCard} key={item.id}>
                  <p className={styles.cardMeta} lang={authoredTextLang}>
                    {item.categoryName} · {item.placeName}
                  </p>
                  <h3 lang={authoredTextLang}>
                    <Link href={`/b/${item.slug}` as Route}>
                      {item.tradingName}
                    </Link>
                  </h3>
                  {item.offer ? (
                    <p className={styles.offerLine}>
                      <span>
                        {t("resident.businesses.offerLabel")}{" "}
                        <span lang={authoredTextLang}>{item.offer.title}</span>
                      </span>
                      {ending.kind === "today" ? (
                        <span className={styles.urgentTag}>
                          {t("resident.businesses.endsToday")}
                        </span>
                      ) : ending.kind === "days" ? (
                        <span className={styles.urgentTag}>
                          {ending.days === 1
                            ? t("resident.businesses.endsTomorrow")
                            : t("resident.businesses.endsInDays", {
                                days: ending.days,
                              })}
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                  <p className={styles.cardFoot}>
                    {item.upcomingEventCount === null
                      ? ""
                      : item.upcomingEventCount > 0
                        ? t(
                            item.upcomingEventCount === 1
                              ? "resident.businesses.events.one"
                              : "resident.businesses.events.other",
                            { count: item.upcomingEventCount },
                          )
                        : item.offer
                          ? ""
                          : t("resident.businesses.noNews")}
                  </p>
                </li>
              );
            })}
          </ul>
          {businesses.length > shown.length ? (
            <p className={styles.more}>
              {t("resident.businesses.more", {
                count: businesses.length - shown.length,
              })}
            </p>
          ) : null}
        </>
      )}
    </Panel>
  );
}

/** Saved places with live counts. */
export function PlacesPanel({
  t,
  places,
  unavailable,
}: {
  t: Translator;
  places: ResidentPlace[];
  unavailable: boolean;
}) {
  return (
    <Panel
      id="saved-places-title"
      eyebrow={t("resident.places.eyebrow")}
      title={t("resident.places.title")}
      className={styles.side}
    >
      {places.length === 0 && unavailable ? (
        <Notice>{t("resident.places.unavailable")}</Notice>
      ) : places.length === 0 ? (
        <EmptyState
          title={t("resident.places.emptyTitle")}
          body={t("resident.places.emptyBody")}
          href="/places"
          cta={t("resident.places.emptyCta")}
        />
      ) : (
        <>
          {unavailable ? (
            <Notice>{t("resident.places.unavailable")}</Notice>
          ) : null}
          <ul className={styles.placeList}>
            {places.map((item) => (
              <li key={item.id}>
                <Link href={`/places/${item.slug}` as Route}>
                  <strong lang={authoredTextLang}>{item.name}</strong>
                  {unavailable || item.businessCount === null ? null : (
                    <span>
                      {t(
                        item.businessCount === 1
                          ? "resident.places.businesses.one"
                          : "resident.places.businesses.other",
                        { count: item.businessCount },
                      )}
                      {(item.upcomingEventCount ?? 0) > 0
                        ? ` · ${t(
                            item.upcomingEventCount === 1
                              ? "resident.places.events.one"
                              : "resident.places.events.other",
                            { count: item.upcomingEventCount ?? 0 },
                          )}`
                        : ""}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

/** What was added to the resident's places and businesses in the last two weeks. */
export function WhatsNewPanel({
  t,
  content,
}: {
  t: Translator;
  content: PlaceDigestContent | null;
}) {
  const groups = content
    ? (
        [
          {
            key: "businesses",
            title: t("resident.new.businesses"),
            items: content.businesses.map((item) => ({
              id: item.slug,
              href: `/b/${item.slug}`,
              label: item.name,
              note: t("resident.new.in", { place: item.placeName }),
            })),
          },
          {
            key: "offers",
            title: t("resident.new.offers"),
            items: content.savedOffers.map((item) => ({
              id: item.id,
              href: `/b/${item.businessSlug}`,
              label: item.title,
              note: t("resident.new.by", { business: item.businessName }),
            })),
          },
          {
            key: "events",
            title: t("resident.new.events"),
            items: [...content.events, ...content.savedEvents].map((item) => ({
              id: item.id,
              href: `/events/${item.id}`,
              label: item.title,
              note: t("resident.new.by", { business: item.businessName }),
            })),
          },
        ] as const
      ).filter((group) => group.items.length > 0)
    : [];
  return (
    <Panel
      id="whats-new-title"
      eyebrow={t("resident.new.eyebrow")}
      title={t("resident.new.title")}
    >
      {content === null ? (
        <Notice>{t("resident.new.unavailable")}</Notice>
      ) : groups.length === 0 ? (
        <p className={styles.quiet}>{t("resident.new.empty")}</p>
      ) : (
        <div className={styles.newGroups}>
          {groups.map((group) => (
            <div key={group.key}>
              <h3 className={styles.bucketTitle}>{group.title}</h3>
              <ul className={styles.newList}>
                {group.items.map((item) => (
                  <li key={`${group.key}-${item.id}`}>
                    <Link href={item.href as Route} lang={authoredTextLang}>
                      {item.label}
                    </Link>
                    <span lang={authoredTextLang}>{item.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

const SEARCH_TYPE_KEY = {
  all: "resident.saved.searches.type.all",
  businesses: "resident.saved.searches.type.businesses",
  offers: "resident.saved.searches.type.offers",
  events: "resident.saved.searches.type.events",
  places: "resident.saved.searches.type.places",
  categories: "resident.saved.searches.type.categories",
  guides: "resident.saved.searches.type.guides",
  directory: "resident.saved.searches.type.directory",
  event_filters: "resident.saved.searches.type.event_filters",
} as const;

/** The searches the resident kept, with how many results are new since they last looked. */
export function SavedSearchesPanel({
  t,
  result,
}: {
  t: Translator;
  result: SavedSearchesResult;
}) {
  if (result.state === "ready" && result.searches.length === 0) return null;
  return (
    <Panel
      id="saved-searches-title"
      eyebrow={t("resident.home.searches.eyebrow")}
      title={t("resident.saved.searches.title")}
      action={
        <Link
          className={styles.panelLink}
          href={"/account/saved?tab=searches" as Route}
        >
          {t("resident.home.searches.all")}
        </Link>
      }
    >
      {result.state === "unavailable" ? (
        <Notice>{t("resident.saved.searches.unavailable")}</Notice>
      ) : (
        <ul className={styles.newList}>
          {result.searches.map((item) => (
            <li key={item.id}>
              <Link href={item.href as Route} lang={authoredTextLang}>
                {describeSavedQuery(item)}
              </Link>
              <span>
                {t(SEARCH_TYPE_KEY[item.type])}
                {" · "}
                {item.newCount === null
                  ? t("resident.saved.searches.unknown")
                  : item.newCount === 0
                    ? t("resident.saved.searches.noNew")
                    : t(
                        item.newCount === 1
                          ? "resident.saved.searches.new.one"
                          : "resident.saved.searches.new.other",
                        { count: item.newCount },
                      )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Which emails the resident has chosen, with one link to change them. */
export function TouchPanel({
  t,
  preferences,
}: {
  t: Translator;
  preferences: { digestOn: boolean; remindersOn: boolean } | null;
}) {
  return (
    <Panel
      id="touch-title"
      eyebrow={t("resident.touch.eyebrow")}
      title={t("resident.touch.title")}
      className={styles.side}
    >
      {preferences ? (
        <ul className={styles.statusList}>
          <li data-on={preferences.digestOn || undefined}>
            {preferences.digestOn
              ? t("resident.touch.digestOn")
              : t("resident.touch.digestOff")}
          </li>
          <li data-on={preferences.remindersOn || undefined}>
            {preferences.remindersOn
              ? t("resident.touch.remindersOn")
              : t("resident.touch.remindersOff")}
          </li>
        </ul>
      ) : (
        <Notice>{t("resident.touch.unavailable")}</Notice>
      )}
      <p className={styles.quiet}>{t("resident.touch.body")}</p>
      <Link className="button" href={"/account/settings#preferences" as Route}>
        {t("resident.touch.manage")}
      </Link>
    </Panel>
  );
}

const STEP_COPY = {
  saveFirst: [
    "resident.steps.saveFirst.title",
    "resident.steps.saveFirst.body",
  ],
  savePlace: [
    "resident.steps.savePlace.title",
    "resident.steps.savePlace.body",
  ],
  turnOnDigest: [
    "resident.steps.turnOnDigest.title",
    "resident.steps.turnOnDigest.body",
  ],
  turnOnReminders: [
    "resident.steps.turnOnReminders.title",
    "resident.steps.turnOnReminders.body",
  ],
  createBusiness: [
    "resident.steps.createBusiness.title",
    "resident.steps.createBusiness.body",
  ],
} as const;

/** Up to three optional suggestions; hidden when there is nothing left to suggest. */
export function NextStepsPanel({
  t,
  steps,
}: {
  t: Translator;
  steps: ResidentStep[];
}) {
  if (steps.length === 0) return null;
  return (
    <Panel
      id="next-steps-title"
      eyebrow={t("resident.steps.eyebrow")}
      title={t("resident.steps.title")}
      className={styles.side}
    >
      <ul className={styles.stepList}>
        {steps.map((step) => (
          <li key={step.key}>
            <Link href={step.href as Route}>
              <strong>{t(STEP_COPY[step.key][0])}</strong>
              <span>{t(STEP_COPY[step.key][1])}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
