import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { HomeEnhancements } from "@/components/home/home-enhancements";
import { HomeHeader } from "@/components/home/home-header";
import styles from "@/components/home/home-refined.module.css";
import { getHomepageDiscovery } from "@/modules/home/public";

export const dynamic = "force-dynamic";

const popularSearches = [
  "Coffee",
  "Takeaways",
  "Hairdressers",
  "Dog friendly",
  "Things to do",
] as const;

const categories = [
  {
    name: "Coffee & food",
    query: "coffee",
    detail: "Cafés, bakeries and places to eat",
    icon: "cup",
  },
  {
    name: "Home & trades",
    query: "plumbing",
    detail: "Local help for jobs at home",
    icon: "home",
  },
  {
    name: "Shops",
    query: "shop",
    detail: "Independent places worth knowing",
    icon: "bag",
  },
  {
    name: "Health & fitness",
    query: "fitness",
    detail: "Studios, wellbeing and local care",
    icon: "heart",
  },
  {
    name: "Events",
    query: "events",
    detail: "Ideas for today and the weekend",
    icon: "calendar",
  },
  {
    name: "Things to do",
    query: "things to do",
    detail: "Walks, activities and useful ideas",
    icon: "trail",
  },
] as const;

type CategoryIconName = (typeof categories)[number]["icon"];

const representativeBusinesses = [
  {
    name: "Rhondda Fitness Studio",
    category: "Fitness",
    place: "Pontypridd",
    image: "/home/biz-gym.webp",
  },
  {
    name: "Valley Bloom Florist",
    category: "Florist",
    place: "Aberdare",
    image: "/home/biz-florist.webp",
  },
  {
    name: "Taff Tyres",
    category: "Automotive",
    place: "Treorchy",
    image: "/home/biz-tyres.webp",
  },
] as const;

const guideImages = [
  "/home/biz-gym.webp",
  "/home/biz-florist.webp",
  "/home/biz-tyres.webp",
] as const;

const eventDateFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "2-digit",
  weekday: "short",
});

const eventTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

function getEventDateParts(date: Date) {
  const parts = eventDateFormatter.formatToParts(date);
  return {
    month: parts.find((part) => part.type === "month")?.value ?? "",
    date: parts.find((part) => part.type === "day")?.value ?? "",
    day: parts.find((part) => part.type === "weekday")?.value ?? "",
  };
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16 16 4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21c-3.5-4.2-6.5-7.4-6.5-10.8a6.5 6.5 0 0 1 13 0C18.5 13.6 15.5 16.8 12 21Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="10.2"
        r="2.4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
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
          <path
            d="M12 20s-7-4.2-7-10a4.2 4.2 0 0 1 7-3.1A4.2 4.2 0 0 1 19 10c0 5.8-7 10-7 10Z"
            {...common}
          />
          <path d="M8.2 12h2l1.2-2.3 1.7 4.6 1.1-2.3h1.7" {...common} />
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
          <path
            d="M5 19c3.8-1.8 4-4.8 6.2-6.4 2-1.5 4.1-1.3 7.8-4.6"
            {...common}
          />
          <path
            d="m14.8 5.5 4.2 2.4-2.5 4.2M5 19h4M4.5 5.5h4v4h-4z"
            {...common}
          />
        </>
      ) : null}
    </svg>
  );
}

function CoilIllustration() {
  return (
    <svg viewBox="0 0 74 74" fill="none" aria-hidden="true">
      <path
        d="M15 25h44v29H15zM21 19v6m32-6v6M23 33h28M23 41h28M23 49h20"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M52 47c4.2 0 7 2.8 7 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default async function HomePage() {
  const discovery = await getHomepageDiscovery();
  const demoBusiness = discovery.featuredBusiness;
  const firstEvent = discovery.events.at(0) ?? null;
  const placeOptions = discovery.places.map(({ slug, name }) => ({
    slug,
    name,
  }));
  const areaCards = placeOptions;
  const firstArea = areaCards.at(0) ?? null;

  return (
    <div className={styles.home} data-home-root>
      <HomeEnhancements />
      <HomeHeader />

      <main>
        <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.heroAtmosphere} aria-hidden="true" />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>Rhondda Cynon Taf, connected</p>
              <h1 id="home-title">Everything local, all in one place.</h1>
              <p className={styles.welshLine}>Popeth lleol, mewn un lle.</p>
              <p className={styles.heroLead}>
                Find useful businesses, places, events and local ideas across
                the Valleys through one clear, connected experience.
              </p>

              <form
                className={styles.searchForm}
                action="/businesses"
                method="get"
              >
                <div className={styles.searchField}>
                  <span className={styles.searchIcon}>
                    <SearchIcon />
                  </span>
                  <span className={styles.searchFieldText}>
                    <label htmlFor="home-query">
                      What are you looking for?
                    </label>
                    <input
                      id="home-query"
                      name="q"
                      type="search"
                      placeholder="Coffee, a plumber, somewhere to go…"
                      maxLength={80}
                    />
                  </span>
                </div>
                <div className={styles.searchField}>
                  <span className={styles.searchIcon}>
                    <LocationIcon />
                  </span>
                  <span className={styles.searchFieldText}>
                    <label htmlFor="home-place">Where?</label>
                    <select id="home-place" name="place" defaultValue="">
                      <option value="">All of RCT</option>
                      {placeOptions.map((option) => (
                        <option key={option.slug} value={option.slug}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </span>
                </div>
                <button className={styles.searchSubmit} type="submit">
                  Search
                </button>
              </form>

              <div className={styles.popularRow} aria-label="Popular searches">
                <span>Popular searches</span>
                {popularSearches.map((search) => (
                  <Link
                    key={search}
                    href={`/businesses?q=${encodeURIComponent(search)}`}
                  >
                    {search}
                  </Link>
                ))}
              </div>

              <div className={styles.heroTrust} aria-label="Search information">
                <span>Public search</span>
                <span>No account needed</span>
                <span>Choose your area manually</span>
              </div>
            </div>

            <div className={styles.heroVisual} data-home-parallax>
              <div className={styles.heroCanvas}>
                <div
                  className={styles.heroImage}
                  role="img"
                  aria-label="A welcoming independent café on a Valleys high street"
                >
                  <span
                    className={`${styles.heroStrip} ${styles.heroStrip0}`}
                  />
                  <span
                    className={`${styles.heroStrip} ${styles.heroStrip1}`}
                  />
                  <span
                    className={`${styles.heroStrip} ${styles.heroStrip2}`}
                  />
                  <span
                    className={`${styles.heroStrip} ${styles.heroStrip3}`}
                  />
                  <span
                    className={`${styles.heroStrip} ${styles.heroStrip4}`}
                  />
                  <span
                    className={`${styles.heroStrip} ${styles.heroStrip5}`}
                  />
                  <div className={styles.heroPlaceNames} aria-hidden="true">
                    <span>Rhondda</span>
                    <span>Cynon</span>
                    <span>Taff</span>
                    <span>Ely</span>
                  </div>
                </div>

                <section
                  className={styles.localViewPanel}
                  aria-label="Your local view preview"
                >
                  <div className={styles.localViewTopline}>
                    <span>Your local view</span>
                    <strong>All of RCT</strong>
                  </div>
                  <div className={styles.localViewIntro}>
                    <p>One place to start</p>
                    <h2>
                      Businesses, events and places that lead somewhere useful.
                    </h2>
                  </div>

                  <div className={styles.localViewList}>
                    <Link
                      href={
                        (demoBusiness
                          ? `/b/${demoBusiness.slug}`
                          : "/businesses") as Route
                      }
                    >
                      <span className={styles.localViewIndex}>01</span>
                      <span>
                        <small>Local business</small>
                        <strong>
                          {demoBusiness?.tradingName ??
                            "Browse local businesses"}
                        </strong>
                      </span>
                      <em>Open website</em>
                    </Link>

                    <Link
                      href={
                        (firstEvent
                          ? `/events/${firstEvent.id}`
                          : "/events") as Route
                      }
                    >
                      <span className={styles.localViewIndex}>02</span>
                      <span>
                        <small>What is on</small>
                        <strong>
                          {firstEvent?.title ??
                            (discovery.eventsState === "unavailable"
                              ? "Event previews are unavailable"
                              : "Explore local events")}
                        </strong>
                      </span>
                      <em>View events</em>
                    </Link>

                    <Link
                      href={
                        (firstArea
                          ? `/places/${firstArea.slug}`
                          : "/businesses") as Route
                      }
                    >
                      <span className={styles.localViewIndex}>03</span>
                      <span>
                        <small>Start with a place</small>
                        <strong>
                          {firstArea?.name ?? "Explore the Valleys"}
                        </strong>
                      </span>
                      <em>Explore area</em>
                    </Link>
                  </div>

                  <p className={styles.localViewNote}>
                    Product demonstration using clearly fictional seed content.
                  </p>
                </section>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.profileBridge} data-home-reveal>
          <div className={styles.profileBridgeInner}>
            <div className={styles.profileBridgeCopy}>
              <p className={styles.eyebrow}>
                The part a directory usually misses
              </p>
              <h2>One profile. A complete local presence.</h2>
              <p>
                A business updates its information once. The same record can
                power search results, place pages and a polished website of its
                own.
              </p>
              <a href="#for-business">See how the business product works →</a>
            </div>
            <div
              className={styles.profileBridgeFlow}
              aria-label="One profile powers three surfaces"
            >
              <div>
                <span>01</span>
                <strong>Local search</strong>
                <small>Found by service and place</small>
              </div>
              <div>
                <span>02</span>
                <strong>Discovery routes</strong>
                <small>Reused across the platform</small>
              </div>
              <div>
                <span>03</span>
                <strong>Business website</strong>
                <small>A complete page, not a listing</small>
              </div>
            </div>
          </div>
        </section>

        <section
          className={styles.categoriesSection}
          id="discover"
          data-home-reveal
        >
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Start with what you need</p>
                <h2>What do you need today?</h2>
              </div>
              <p>
                Clear routes into local discovery, without making you learn how
                the platform is organised first.
              </p>
            </div>
            <div className={styles.categoryGrid}>
              {categories.map((category) => (
                <Link
                  className={styles.categoryLink}
                  href={`/businesses?q=${encodeURIComponent(category.query)}`}
                  key={category.name}
                >
                  <span className={styles.categoryIcon}>
                    <CategoryIcon name={category.icon} />
                  </span>
                  <span>
                    <strong>{category.name}</strong>
                    <small>{category.detail}</small>
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
              <p className={styles.eyebrow}>One connected local view</p>
              <h2>Local life should feel joined up.</h2>
              <p>
                A useful business can lead to its website. An event can lead to
                a place. A guide can help turn a free afternoon into a plan.
              </p>
            </div>

            <div className={styles.discoveryLeadGrid}>
              <article className={styles.featuredBusiness}>
                <Link
                  href={
                    (demoBusiness
                      ? `/b/${demoBusiness.slug}`
                      : "/businesses") as Route
                  }
                >
                  <div className={styles.featuredArt}>
                    <span className={styles.featuredIndex}>
                      Featured local business
                    </span>
                    <CoilIllustration />
                  </div>
                  <div className={styles.featuredBody}>
                    <div className={styles.contentTopline}>
                      <span>
                        {demoBusiness?.category.name ?? "Plumbing & heating"}
                      </span>
                      <span>Demonstration profile</span>
                    </div>
                    <h3>
                      {demoBusiness?.tradingName ?? "Browse local businesses"}
                    </h3>
                    <p>
                      {demoBusiness?.summary ??
                        "The database-backed business demonstration is temporarily unavailable, but public discovery remains open."}
                    </p>
                    <div className={styles.featuredMeta}>
                      <span>
                        {demoBusiness?.place.name ?? "Rhondda Cynon Taf"}
                      </span>
                      <strong>View the business website</strong>
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
                    <p className={styles.eyebrow}>What is on</p>
                    <h3 id="events-title">Ideas for the days ahead</h3>
                  </div>
                  <Link href="/events">All events</Link>
                </div>
                <div className={styles.eventList}>
                  {discovery.eventsState === "ready" ? (
                    discovery.events.map((event) => {
                      const date = getEventDateParts(event.startsAt);
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
                            <h4>{event.title}</h4>
                            <p>
                              {eventTimeFormatter.format(event.startsAt)} ·{" "}
                              {event.locationDisplay ?? event.businessName}
                            </p>
                          </div>
                          <Link
                            href={`/events/${event.id}` as Route}
                            aria-label={`View ${event.title}`}
                          >
                            View event
                          </Link>
                        </article>
                      );
                    })
                  ) : (
                    <article className={styles.eventRow}>
                      <div className={styles.eventEmptyMark} aria-hidden="true">
                        —
                      </div>
                      <div className={styles.eventCopy}>
                        <h4>
                          {discovery.eventsState === "unavailable"
                            ? "Event previews are temporarily unavailable"
                            : "No upcoming event previews yet"}
                        </h4>
                        <p>
                          Open the events journey for the current public state.
                        </p>
                      </div>
                      <Link href="/events">View events</Link>
                    </article>
                  )}
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className={styles.areasSection} id="areas" data-home-reveal>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Places you already know</p>
                <h2>Explore the Valleys by area.</h2>
              </div>
              <p>
                Choose a familiar place yourself. OurValleys does not need
                precise location permission to help you start nearby.
              </p>
            </div>

            {discovery.placesState === "ready" ? (
              <div className={styles.areaGrid}>
                {areaCards.map((area, index) => (
                  <Link
                    className={`${styles.areaLink} ${styles[`areaTone${(index % 6) + 1}`]}`}
                    href={`/places/${area.slug}` as Route}
                    key={area.slug}
                  >
                    <span className={styles.areaNumber}>0{index + 1}</span>
                    <span className={styles.areaContour} aria-hidden="true" />
                    <span className={styles.areaCopy}>
                      <strong>{area.name}</strong>
                      <small>Businesses · events · guides</small>
                    </span>
                    <span className={styles.areaAction}>Explore area →</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.areaEmpty}>
                <strong>
                  {discovery.placesState === "unavailable"
                    ? "Area routes are temporarily unavailable"
                    : "Area routes are being prepared"}
                </strong>
                <p>
                  Public business search remains available across all of RCT.
                </p>
                <Link href="/businesses">Browse local businesses →</Link>
              </div>
            )}
          </div>
        </section>

        <section className={styles.guidesSection} id="guides" data-home-reveal>
          <div className={styles.sectionInner}>
            <div className={styles.guidesLayout}>
              <div className={styles.guidesMain}>
                <div className={styles.panelHeading}>
                  <div>
                    <p className={styles.eyebrow}>Local knowledge</p>
                    <h2>Useful local guides</h2>
                  </div>
                  <Link href="/guides">All guides</Link>
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
                              sizes="(max-width: 768px) 28vw, 11vw"
                            />
                          </div>
                          <span className={styles.guideNumber}>
                            0{index + 1}
                          </span>
                          <div className={styles.guideCopy}>
                            <h3>{guide.title}</h3>
                            <p>{guide.summary}</p>
                          </div>
                          <span className={styles.guideAction}>
                            Read guide →
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
                              ? "Guide previews are temporarily unavailable"
                              : "More local guides are being prepared"}
                          </h3>
                          <p>
                            Open the guides directory for the current public
                            state.
                          </p>
                        </div>
                        <span className={styles.guideAction}>
                          View guides →
                        </span>
                      </Link>
                    </article>
                  )}
                </div>
              </div>

              <aside
                className={styles.localMix}
                aria-labelledby="local-mix-title"
              >
                <p className={styles.eyebrow}>More local businesses</p>
                <h2 id="local-mix-title">
                  Different services, one clear language.
                </h2>
                <p>
                  Profiles stay easy to scan, while each business can still open
                  into a fuller website experience.
                </p>
                <div className={styles.businessMiniList}>
                  {representativeBusinesses.map((business) => (
                    <Link
                      href={`/businesses?q=${encodeURIComponent(business.category)}`}
                      key={business.name}
                    >
                      <div className={styles.businessMiniMedia}>
                        <Image
                          src={business.image}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 18vw, 5vw"
                        />
                      </div>
                      <span>
                        <small>{business.category}</small>
                        <strong>{business.name}</strong>
                        <em>{business.place}</em>
                      </span>
                      <b aria-hidden="true">↗</b>
                    </Link>
                  ))}
                </div>
              </aside>
            </div>

            <p className={styles.demoNote}>
              <strong>About this demonstration:</strong> named business and
              guide examples are fictional and show intended product structure.
              Event previews use the public lifecycle projection. Nothing here
              implies real availability, popularity, verification or
              endorsement.
            </p>
          </div>
        </section>

        <section
          className={styles.businessSection}
          id="for-business"
          data-home-reveal
        >
          <div className={styles.businessInner}>
            <div className={styles.businessStory}>
              <p className={styles.eyebrow}>The flagship business product</p>
              <h2>A website for every local business</h2>
              <p className={styles.businessLead}>
                Keep one structured profile up to date. OurValleys turns it into
                the different surfaces residents actually use.
              </p>

              <ol className={styles.profileFlow}>
                <li>
                  <span>01</span>
                  <div>
                    <strong>Maintain one profile</strong>
                    <p>Services, hours, area and public contact details.</p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>Appear across local discovery</strong>
                    <p>
                      Search, categories and place routes reuse the same record.
                    </p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <strong>Publish a polished website</strong>
                    <p>No separate website builder or duplicated updates.</p>
                  </div>
                </li>
              </ol>

              <div className={styles.ctaRow}>
                <Link className={styles.primaryCta} href="/login">
                  Open business sign-in →
                </Link>
                <Link
                  className={styles.secondaryCta}
                  href={
                    (demoBusiness
                      ? `/b/${demoBusiness.slug}`
                      : "/businesses") as Route
                  }
                >
                  View the full demonstration
                </Link>
              </div>
            </div>

            <div
              className={styles.sitePreview}
              role="group"
              aria-label="Generated business website demonstration"
            >
              <div className={styles.previewLabel}>
                <span>Generated website</span>
                <span>Powered by the same profile</span>
              </div>
              {demoBusiness ? (
                <>
                  <div className={styles.previewChrome}>
                    <span className={styles.browserDots} aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                    <strong>{demoBusiness.tradingName}</strong>
                    <span className={styles.previewNav} aria-hidden="true">
                      <span>Services</span>
                      <span>Hours</span>
                      <span>Contact</span>
                    </span>
                  </div>
                  <div className={styles.previewHero}>
                    <div className={styles.previewCopy}>
                      <p>{demoBusiness.category.name}</p>
                      <h3>{demoBusiness.tradingName}</h3>
                      <span>{demoBusiness.summary}</span>
                      <Link href={`/b/${demoBusiness.slug}` as Route}>
                        View generated website →
                      </Link>
                    </div>
                    <div className={styles.previewMedia} aria-hidden="true">
                      <CoilIllustration />
                    </div>
                  </div>
                  <div className={styles.previewFacts}>
                    <span>
                      <small>Service area</small>
                      <strong>{demoBusiness.place.name}</strong>
                    </span>
                    <span>
                      <small>Demonstration status</small>
                      <strong>Fictional · not verified</strong>
                    </span>
                    <span>
                      <small>Updates</small>
                      <strong>One record powers both</strong>
                    </span>
                  </div>
                </>
              ) : (
                <div className={styles.previewUnavailable}>
                  <strong>Generated website preview unavailable</strong>
                  <p>
                    Public search remains usable while the database-backed
                    demonstration is unavailable.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={styles.residentSection} data-home-reveal>
          <div className={styles.residentCta}>
            <div>
              <p className={styles.eyebrow}>Useful before account walls</p>
              <h2>Browse first. Sign in when it becomes useful.</h2>
              <p>
                Public search and local discovery stay open. Create an account
                when you need protected business tools or a more personal
                journey.
              </p>
            </div>
            <div className={styles.residentActions}>
              <Link className={styles.primaryCta} href="/businesses">
                Explore without an account →
              </Link>
              <Link className={styles.textCta} href="/register">
                Create an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <strong className="ov-display">OurValleys</strong>
            <p>
              Independent local discovery and business websites for Rhondda
              Cynon Taf.
            </p>
            <span>Made in the Valleys.</span>
          </div>

          <div className={styles.footerColumns}>
            <nav aria-label="Explore OurValleys">
              <strong>Explore</strong>
              <Link href="/businesses">Businesses</Link>
              <Link href="/events">Events</Link>
              <Link href="/guides">Guides</Link>
              <Link href="/news">News</Link>
            </nav>
            <nav aria-label="Business owner links">
              <strong>For business</strong>
              <a href="#for-business">How it works</a>
              <Link href="/login">Business sign-in</Link>
              <Link href="/register">Create account</Link>
            </nav>
            <nav aria-label="Area and account links">
              <strong>OurValleys</strong>
              <a href="#areas">Areas</a>
              <Link href="/login">Sign in</Link>
              <Link href="/businesses">Public search</Link>
            </nav>
          </div>
        </div>
        <div className={styles.footerLegal}>
          <p>
            OurValleys is independent and is not operated or endorsed by any
            council or public body.
          </p>
          <p>
            Fictional demonstration content is labelled and is not a real-world
            claim.
          </p>
        </div>
      </footer>
    </div>
  );
}
