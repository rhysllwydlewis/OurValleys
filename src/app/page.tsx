import { getTranslator } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/config";
import type { MessageKey } from "@/lib/i18n/translate";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { HomeEnhancements } from "@/components/home/home-enhancements";
import { HomeHeader } from "@/components/home/home-header";
import liveStyles from "@/components/home/home-live.module.css";
import { NearYou } from "@/components/home/near-you";
import styles from "@/components/home/home-refined.module.css";
import type { HeroCard } from "@/components/home/hero";
import { Hero } from "@/components/home/hero";
import { getHomepageDiscovery } from "@/modules/home/public";
import { listActivePlaces } from "@/modules/reference-data/places";

export const dynamic = "force-dynamic";

/** `query` is the English search term the directory understands. */
const categories = [
  { key: "food", query: "coffee", icon: "cup" },
  { key: "home", query: "plumbing", icon: "home" },
  { key: "shops", query: "shop", icon: "bag" },
  { key: "health", query: "fitness", icon: "heart" },
  { key: "events", query: "events", icon: "calendar" },
  { key: "things", query: "things to do", icon: "trail" },
] as const;

type CategoryIconName = (typeof categories)[number]["icon"];

const guideImages = [
  "/home/guide-coffee.webp",
  "/home/guide-place.webp",
  "/home/guide-trails.webp",
] as const;

const areaImages = [
  "/home/area-1.webp",
  "/home/area-2.webp",
  "/home/area-3.webp",
  "/home/area-4.webp",
  "/home/area-5.webp",
  "/home/area-6.webp",
] as const;

/** Dates and times are shown in the visitor's language and London time. */
function dateFormatters(locale: Locale) {
  const tag = locale === "cy" ? "cy-GB" : "en-GB";
  return {
    eventDate: new Intl.DateTimeFormat(tag, {
      month: "short",
      day: "2-digit",
      weekday: "short",
      timeZone: "Europe/London",
    }),
    eventTime: new Intl.DateTimeFormat(tag, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/London",
    }),
    offerDate: new Intl.DateTimeFormat(tag, {
      day: "numeric",
      month: "short",
      timeZone: "Europe/London",
    }),
  };
}

function getEventDateParts(formatter: Intl.DateTimeFormat, date: Date) {
  const parts = formatter.formatToParts(date);
  return {
    month: parts.find((part) => part.type === "month")?.value ?? "",
    date: parts.find((part) => part.type === "day")?.value ?? "",
    day: parts.find((part) => part.type === "weekday")?.value ?? "",
  };
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 17 17 7M9 7h8v8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CategoryIcon({ name }: { name: CategoryIconName }) {
  const common = {
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {name === "cup" ? (
        <>
          <path
            d="M5 8h11v5.2A4.8 4.8 0 0 1 11.2 18H9.8A4.8 4.8 0 0 1 5 13.2V8Z"
            {...common}
          />
          <path
            d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M7 5.5c.7-.8.7-1.6 0-2.4M11 5.5c.7-.8.7-1.6 0-2.4"
            {...common}
          />
        </>
      ) : null}
      {name === "home" ? (
        <>
          <path d="m3.8 11.2 8.2-7 8.2 7" {...common} />
          <path d="M6.2 10.2V20h11.6v-9.8M9.5 20v-5.5h5V20" {...common} />
        </>
      ) : null}
      {name === "bag" ? (
        <>
          <path d="M5.5 8.5h13l1 11h-15l1-11Z" {...common} />
          <path d="M9 9V6.5a3 3 0 0 1 6 0V9" {...common} />
        </>
      ) : null}
      {name === "heart" ? (
        <>
          <path d="M4 9.5v5M7 7v10M17 7v10M20 9.5v5" {...common} />
          <path d="M7 12h10" {...common} />
        </>
      ) : null}
      {name === "calendar" ? (
        <>
          <rect x="4.5" y="6" width="15" height="14" rx="2" {...common} />
          <path
            d="M8 3.8V8M16 3.8V8M4.5 10h15M8 14h.01M12 14h.01M16 14h.01"
            {...common}
          />
        </>
      ) : null}
      {name === "trail" ? (
        <>
          <path d="M3.5 18.5h17" {...common} />
          <path d="M5.5 18.5 10 9.4l3.2 4.7 2.3-3.4 4 7.8" {...common} />
          <circle cx="15.6" cy="7.4" r="1.9" {...common} />
        </>
      ) : null}
    </svg>
  );
}

type FlowIconName = "search" | "route" | "site";

function FlowIcon({ name }: { name: FlowIconName }) {
  const common = {
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {name === "search" ? (
        <>
          <circle cx="10.5" cy="10.5" r="6" {...common} />
          <path d="m19 19-4.3-4.3" {...common} />
        </>
      ) : null}
      {name === "route" ? (
        <>
          <circle cx="5.5" cy="6" r="2" {...common} />
          <circle cx="18.5" cy="18" r="2" {...common} />
          <path d="M5.5 8v4a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3" {...common} />
        </>
      ) : null}
      {name === "site" ? (
        <>
          <rect x="3.5" y="5" width="17" height="14" rx="2" {...common} />
          <path d="M3.5 9.2h17M7 5v4.2" {...common} />
        </>
      ) : null}
    </svg>
  );
}

export default async function HomePage() {
  const { locale, t } = await getTranslator();
  const formats = dateFormatters(locale);
  const [discovery, allPlaces] = await Promise.all([
    getHomepageDiscovery(),
    listActivePlaces(),
  ]);
  const demoBusiness = discovery.featuredBusiness;
  const firstEvent = discovery.events.at(0) ?? null;
  const areaCards = discovery.areas;
  const placeLabel = (entry: { name: string; welshName?: string | null }) =>
    (locale === "cy" && entry.welshName) || entry.name;
  const searchPlaceOptions = allPlaces.map((entry) => ({
    slug: entry.slug,
    name: placeLabel(entry),
  }));
  const firstArea = areaCards.at(0) ?? null;
  const businessHref = (
    demoBusiness ? `/b/${demoBusiness.slug}` : "/businesses"
  ) as Route;

  const heroCards: HeroCard[] = [
    {
      id: "business",
      eyebrow: t("homex.heroBusiness"),
      title: demoBusiness?.tradingName ?? t("homex.heroBrowseBusinesses"),
      meta: demoBusiness
        ? placeLabel(demoBusiness.place)
        : t("homex.fallbackPlace"),
      href: demoBusiness ? `/b/${demoBusiness.slug}` : "/businesses",
      cta: t("homex.heroCtaBusiness"),
    },
    {
      id: "event",
      eyebrow: t("homex.heroEvent"),
      title: firstEvent?.title ?? t("homex.heroSeeEvents"),
      meta:
        firstEvent?.locationDisplay ??
        firstEvent?.businessName ??
        t("homex.heroAcrossValleys"),
      href: firstEvent ? `/events/${firstEvent.id}` : "/events",
      cta: t("homex.heroCtaEvent"),
    },
    {
      id: "place",
      eyebrow: t("homex.heroPlace"),
      title: firstArea ? placeLabel(firstArea) : t("homex.heroExploreValleys"),
      meta: t("homex.heroPlaceMeta"),
      href: firstArea ? `/places/${firstArea.slug}` : "/places",
      cta: t("homex.heroCtaPlace"),
    },
    {
      id: "needs",
      eyebrow: t("homex.heroNeeds"),
      title: t("homex.heroNeedsTitle"),
      meta: t("homex.heroNeedsMeta"),
      href: "#discover",
      cta: t("homex.heroCtaNeeds"),
    },
  ];

  return (
    <div className={styles.home} data-home-root>
      <HomeEnhancements />
      <HomeHeader />

      <main>
        <Hero cards={heroCards} places={searchPlaceOptions} />

        <section
          className={styles.categoriesSection}
          id="discover"
          data-home-reveal
        >
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>{t("homex.needEyebrow")}</p>
                <h2>{t("homex.needTitle")}</h2>
              </div>
              <p>{t("homex.needLead")}</p>
            </div>
            <div
              className={`${styles.categoryGrid} ${liveStyles.needGrid}`}
              role="group"
              aria-label={t("homex.needAria")}
            >
              {categories.map((category) => (
                <Link
                  className={styles.categoryLink}
                  href={`/businesses?q=${encodeURIComponent(category.query)}`}
                  key={category.key}
                >
                  <span className={styles.categoryIcon}>
                    <CategoryIcon name={category.icon} />
                  </span>
                  <span>
                    <strong>
                      {t(`homex.cat.${category.key}` as MessageKey)}
                    </strong>
                    <small>
                      {t(`homex.cat.${category.key}Detail` as MessageKey)}
                    </small>
                  </span>
                  <span className={styles.linkArrow}>
                    <ArrowIcon />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.discoverySection} data-home-reveal>
          <div className={styles.sectionInner}>
            <div className={styles.discoveryIntro}>
              <p className={styles.eyebrow}>{t("homex.joinedEyebrow")}</p>
              <h2>{t("homex.joinedTitle")}</h2>
              <p>{t("homex.joinedLead")}</p>
            </div>

            <div className={styles.discoveryLeadGrid}>
              <article className={styles.featuredBusiness}>
                <Link href={businessHref}>
                  <div className={styles.featuredArt}>
                    <Image
                      src="/home/featured-plumbing.webp"
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 30vw"
                      className={styles.featuredArtImage}
                    />
                    <span className={styles.featuredIndex}>
                      {t("homex.featuredLabel")}
                    </span>
                  </div>
                  <div className={styles.featuredBody}>
                    <div className={styles.contentTopline}>
                      <span lang="en-GB">
                        {demoBusiness?.category.name ??
                          t("homex.fallbackCategory")}
                      </span>
                      <span>{t("homex.demoProfile")}</span>
                    </div>
                    <h3 lang="en-GB">
                      {demoBusiness?.tradingName ??
                        t("homex.fallbackBusinessTitle")}
                    </h3>
                    <p lang={demoBusiness ? "en-GB" : undefined}>
                      {demoBusiness?.summary ??
                        t("homex.fallbackBusinessSummary")}
                    </p>
                    <div className={styles.featuredMeta}>
                      <span>
                        {demoBusiness
                          ? placeLabel(demoBusiness.place)
                          : t("homex.fallbackPlace")}
                      </span>
                      <strong>{t("homex.viewWebsite")}</strong>
                    </div>
                  </div>
                </Link>
              </article>

              <section
                className={styles.eventsPanel}
                id="events"
                aria-labelledby="events-title"
              >
                <div className={styles.panelHeading}>
                  <div>
                    <p className={styles.eyebrow}>{t("homex.eventsEyebrow")}</p>
                    <h3 id="events-title">{t("homex.eventsTitle")}</h3>
                  </div>
                  <Link href="/events">{t("homex.allEvents")}</Link>
                </div>
                <div className={styles.eventList}>
                  {discovery.eventsState === "ready" ? (
                    discovery.events.map((event) => {
                      const date = getEventDateParts(
                        formats.eventDate,
                        event.startsAt,
                      );
                      return (
                        <article className={styles.eventRow} key={event.id}>
                          <div
                            className={styles.eventDate}
                            aria-label={`${date.day} ${date.date} ${date.month}`}
                          >
                            <span>{date.month}</span>
                            <strong>{date.date}</strong>
                            <span>{date.day}</span>
                          </div>
                          <div className={styles.eventCopy}>
                            <h4 lang="en-GB">{event.title}</h4>
                            <p>
                              {formats.eventTime.format(event.startsAt)} ·{" "}
                              <span lang="en-GB">
                                {event.locationDisplay ?? event.businessName}
                              </span>
                            </p>
                          </div>
                          <Link
                            href={`/events/${event.id}` as Route}
                            aria-label={t("homex.viewEventAria", {
                              title: event.title,
                            })}
                          >
                            {t("homex.viewEvent")}
                          </Link>
                        </article>
                      );
                    })
                  ) : (
                    <article className={styles.eventRow}>
                      <div className={styles.eventEmptyMark} aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                          <rect
                            x="4.5"
                            y="6"
                            width="15"
                            height="14"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="1.6"
                          />
                          <path
                            d="M8 3.8V8M16 3.8V8M4.5 11h15M9 15.5h6"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <div className={styles.eventCopy}>
                        <h4>
                          {discovery.eventsState === "unavailable"
                            ? t("homex.eventsUnavailable")
                            : t("homex.eventsNone")}
                        </h4>
                        <p>{t("homex.eventsHint")}</p>
                      </div>
                      <Link href="/events">{t("homex.viewEvents")}</Link>
                    </article>
                  )}
                </div>
                {discovery.offersState === "ready" ? (
                  <div
                    className={styles.offerList}
                    aria-labelledby="home-offers-title"
                    role="group"
                  >
                    <div className={styles.offerListHeading}>
                      <h4 id="home-offers-title">{t("homex.offersTitle")}</h4>
                      <Link href="/offers">{t("homex.allOffers")}</Link>
                    </div>
                    {discovery.offers.map((offer) => (
                      <article className={styles.offerRow} key={offer.id}>
                        <div className={styles.eventCopy}>
                          <h4 lang="en-GB">{offer.title}</h4>
                          <p>
                            <span lang="en-GB">{offer.businessName}</span>
                            {offer.endsAt
                              ? ` · ${t("homex.offerEnds", {
                                  date: formats.offerDate.format(offer.endsAt),
                                })}`
                              : ""}
                          </p>
                        </div>
                        <Link
                          href={`/b/${offer.businessSlug}` as Route}
                          aria-label={t("homex.viewBusinessAria", {
                            name: offer.businessName,
                          })}
                        >
                          {t("homex.viewBusiness")}
                        </Link>
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>
            </div>
          </div>
        </section>

        <section className={styles.areasSection} id="areas" data-home-reveal>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>{t("homex.areasEyebrow")}</p>
                <h2>{t("homex.areasTitle")}</h2>
              </div>
              <p>{t("homex.areasLead")}</p>
            </div>

            {discovery.placesState === "ready" ? (
              <>
                <div className={`${styles.areaGrid} ${liveStyles.areaRail}`}>
                  {areaCards.map((area, index) => (
                    <Link
                      className={styles.areaLink}
                      href={`/places/${area.slug}` as Route}
                      key={area.slug}
                    >
                      <Image
                        src={
                          areaImages[index % areaImages.length] ?? areaImages[0]
                        }
                        alt=""
                        fill
                        sizes="(max-width: 700px) 72vw, (max-width: 960px) 50vw, 28vw"
                        className={styles.areaMedia}
                      />
                      <span
                        className={`${styles.areaScrim} ${styles[`areaTone${(index % 6) + 1}`]}`}
                        aria-hidden="true"
                      />
                      <span className={styles.areaNumber}>0{index + 1}</span>
                      <span className={styles.areaContour} aria-hidden="true" />
                      <span className={styles.areaCopy}>
                        <strong>{placeLabel(area)}</strong>
                        {area.businessCount && area.businessCount > 0 ? (
                          <span className={liveStyles.areaCount}>
                            {area.businessCount === 1
                              ? t("homex.areaOneBusiness")
                              : t("homex.areaBusinesses", {
                                  count: area.businessCount,
                                })}
                          </span>
                        ) : (
                          <small>{t("homex.areaNoBusinesses")}</small>
                        )}
                      </span>
                      <span className={styles.areaAction}>
                        {t("homex.areaAction")}
                      </span>
                    </Link>
                  ))}
                </div>
                <div className={liveStyles.areaFooter}>
                  <Link href="/places">{t("homex.allPlaces")} →</Link>
                </div>
                <NearYou places={discovery.nearPlaces} />
              </>
            ) : (
              <div className={styles.areaEmpty}>
                <strong>
                  {discovery.placesState === "unavailable"
                    ? t("homex.areasUnavailable")
                    : t("homex.areasPreparing")}
                </strong>
                <p>{t("homex.areasHint")}</p>
                <Link href="/businesses">
                  {t("homex.browseBusinessesArrow")}
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className={styles.guidesSection} id="guides" data-home-reveal>
          <div className={styles.sectionInner}>
            <div className={styles.guidesMain}>
              <div className={styles.panelHeading}>
                <div>
                  <p className={styles.eyebrow}>{t("homex.guidesEyebrow")}</p>
                  <h2>{t("homex.guidesTitle")}</h2>
                </div>
                <Link href="/guides">{t("homex.allGuides")}</Link>
              </div>

              <div className={styles.guideList}>
                {discovery.guidesState === "ready" ? (
                  discovery.guides.map((guide, index) => (
                    <article className={styles.guideRow} key={guide.slug}>
                      <Link href={`/guides/${guide.slug}` as Route}>
                        <div className={styles.guideMedia}>
                          <Image
                            src={
                              guideImages[index % guideImages.length] ??
                              guideImages[0]
                            }
                            alt=""
                            fill
                            sizes="3.6rem"
                            className={styles.guideMediaImage}
                          />
                        </div>
                        <span className={styles.guideNumber}>0{index + 1}</span>
                        <div className={styles.guideCopy} lang="en-GB">
                          <h3>{guide.title}</h3>
                          <p>{guide.summary}</p>
                        </div>
                        <span className={styles.guideAction}>
                          {t("homex.readGuide")}
                        </span>
                      </Link>
                    </article>
                  ))
                ) : (
                  <article className={styles.guideRow}>
                    <Link href="/guides">
                      <span className={styles.guideNumber}>01</span>
                      <div className={styles.guideCopy}>
                        <h3>
                          {discovery.guidesState === "unavailable"
                            ? t("homex.guidesUnavailable")
                            : t("homex.guidesPreparing")}
                        </h3>
                        <p>{t("homex.guidesHint")}</p>
                      </div>
                      <span className={styles.guideAction}>
                        {t("homex.viewGuides")}
                      </span>
                    </Link>
                  </article>
                )}
              </div>
            </div>

            <section
              className={liveStyles.newSection}
              aria-labelledby="home-new-title"
            >
              <div className={liveStyles.newHeading}>
                <div>
                  <p className={styles.eyebrow}>{t("homex.newEyebrow")}</p>
                  <h2 id="home-new-title">{t("homex.newTitle")}</h2>
                </div>
                <Link href="/businesses?sort=newest">{t("homex.newAll")}</Link>
              </div>
              <p className={liveStyles.newLead}>{t("homex.newLead")}</p>
              {discovery.newBusinessesState === "ready" ? (
                <ul className={liveStyles.newGrid}>
                  {discovery.newBusinesses.map((entry) => (
                    <li className={liveStyles.newCard} key={entry.id}>
                      <Link href={`/b/${entry.slug}` as Route}>
                        <small lang="en-GB">{entry.category.name}</small>
                        <strong lang="en-GB">{entry.tradingName}</strong>
                        <span>
                          {placeLabel(entry.place)}
                          {entry.isDemo ? ` · ${t("homex.newFictional")}` : ""}
                        </span>
                        <p lang="en-GB">{entry.summary}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={liveStyles.newNotice}>
                  {discovery.newBusinessesState === "unavailable"
                    ? t("homex.newUnavailable")
                    : t("homex.newNone")}
                </p>
              )}
            </section>

            <p className={styles.demoNote}>
              <strong>{t("homex.demoNoteLabel")}</strong> {t("homex.demoNote")}
            </p>
          </div>
        </section>

        <section
          className={styles.businessSection}
          id="for-business"
          data-home-reveal
        >
          <div className={styles.sectionInner}>
            <div className={styles.businessInner}>
              <div className={styles.businessStory}>
                <p className={styles.eyebrow}>{t("homex.bizEyebrow")}</p>
                <h2>{t("homex.bizTitle")}</h2>
                <p className={styles.businessLead}>{t("homex.bizLead")}</p>

                <ol className={styles.profileFlow}>
                  <li>
                    <span>01</span>
                    <div>
                      <strong>{t("homex.bizStep1")}</strong>
                      <p>{t("homex.bizStep1Text")}</p>
                    </div>
                  </li>
                  <li>
                    <span>02</span>
                    <div>
                      <strong>{t("homex.bizStep2")}</strong>
                      <p>{t("homex.bizStep2Text")}</p>
                    </div>
                  </li>
                  <li>
                    <span>03</span>
                    <div>
                      <strong>{t("homex.bizStep3")}</strong>
                      <p>{t("homex.bizStep3Text")}</p>
                    </div>
                  </li>
                </ol>

                <div className={styles.ctaRow}>
                  <Link className={styles.primaryCta} href="/login">
                    {t("homex.bizSignIn")}
                  </Link>
                  <Link className={styles.secondaryCta} href={businessHref}>
                    {t("homex.bizDemo")}
                  </Link>
                </div>
              </div>

              <div
                className={styles.sitePreview}
                role="group"
                aria-label={t("homex.bizPreviewAria")}
              >
                <div className={styles.previewLabel}>
                  <span>{t("homex.bizPreviewLabel")}</span>
                  <span>{t("homex.bizPreviewPowered")}</span>
                </div>
                {demoBusiness ? (
                  <>
                    <div className={styles.previewChrome}>
                      <span className={styles.browserDots} aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                      <strong lang="en-GB">{demoBusiness.tradingName}</strong>
                      <span className={styles.previewNav} aria-hidden="true">
                        <span>{t("homex.bizNavServices")}</span>
                        <span>{t("homex.bizNavHours")}</span>
                        <span>{t("homex.bizNavContact")}</span>
                      </span>
                    </div>
                    <div className={styles.previewHero}>
                      <div className={styles.previewCopy}>
                        <p lang="en-GB">{demoBusiness.category.name}</p>
                        <h3 lang="en-GB">{demoBusiness.tradingName}</h3>
                        <span lang="en-GB">{demoBusiness.summary}</span>
                        <Link href={`/b/${demoBusiness.slug}` as Route}>
                          {t("homex.bizViewGenerated")}
                        </Link>
                      </div>
                      <div className={styles.previewMedia} aria-hidden="true">
                        <Image
                          src="/home/preview-heating.webp"
                          alt=""
                          fill
                          sizes="12rem"
                          className={styles.previewMediaImage}
                        />
                      </div>
                    </div>
                    <div className={styles.previewFacts}>
                      <span>
                        <small>{t("homex.bizFactArea")}</small>
                        <strong>{placeLabel(demoBusiness.place)}</strong>
                      </span>
                      <span>
                        <small>{t("homex.bizFactStatus")}</small>
                        <strong>{t("homex.bizFactStatusValue")}</strong>
                      </span>
                      <span>
                        <small>{t("homex.bizFactUpdates")}</small>
                        <strong>{t("homex.bizFactUpdatesValue")}</strong>
                      </span>
                    </div>
                  </>
                ) : (
                  <div className={styles.previewUnavailable}>
                    <strong>{t("homex.bizPreviewUnavailable")}</strong>
                    <p>{t("homex.bizPreviewUnavailableText")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.residentSection} data-home-reveal>
          <div className={styles.sectionInner}>
            <div className={styles.residentCta}>
              <span className={styles.residentIcon}>
                <FlowIcon name="route" />
              </span>
              <div className={styles.residentCopy}>
                <p className={styles.eyebrow}>{t("homex.residentEyebrow")}</p>
                <h2>{t("homex.residentTitle")}</h2>
                <p>{t("homex.residentLead")}</p>
              </div>
              <div className={styles.residentActions}>
                <Link className={styles.primaryCta} href="/businesses">
                  {t("homex.residentExplore")}
                </Link>
                <Link className={styles.textCta} href="/register">
                  {t("homex.residentCreate")}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <strong className="ov-display">OurValleys</strong>
            <p>{t("homex.footerTagline")}</p>
            <span>{t("homex.footerMade")}</span>
          </div>

          <div className={styles.footerColumns}>
            <nav aria-label={t("homex.footerExploreAria")}>
              <strong>{t("homex.footerExplore")}</strong>
              <Link href="/businesses">{t("homex.footerBusinesses")}</Link>
              <Link href="/events">{t("homex.footerEvents")}</Link>
              <Link href="/guides">{t("homex.footerGuides")}</Link>
              <Link href="/news">{t("homex.footerNews")}</Link>
            </nav>
            <nav aria-label={t("homex.footerBusinessAria")}>
              <strong>{t("homex.footerBusiness")}</strong>
              <a href="#for-business">{t("homex.footerHow")}</a>
              <Link href="/login">{t("homex.footerBusinessSignIn")}</Link>
              <Link href="/register">{t("homex.footerCreate")}</Link>
            </nav>
            <nav aria-label={t("homex.footerBrandAria")}>
              <strong>{t("homex.footerBrand")}</strong>
              <a href="#areas">{t("homex.footerAreas")}</a>
              <Link href="/login">{t("homex.footerSignIn")}</Link>
              <Link href="/businesses">{t("homex.footerSearch")}</Link>
            </nav>
          </div>
        </div>
        <div className={styles.footerLegal}>
          <p>{t("homex.footerLegal1")}</p>
          <p>{t("homex.footerLegal2")}</p>
        </div>
      </footer>
    </div>
  );
}
