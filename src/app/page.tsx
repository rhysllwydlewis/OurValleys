import Image from "next/image";
import Link from "next/link";
import { HomeEnhancements } from "@/components/home/home-enhancements";
import { HomeHeader } from "@/components/home/home-header";
import styles from "@/components/home/home-overhaul.module.css";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { listActivePlaces } from "@/modules/reference-data/places";

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
    icon: "☕",
  },
  {
    name: "Home & trades",
    query: "plumbing",
    detail: "Trusted help for jobs at home",
    icon: "⌂",
  },
  {
    name: "Shops",
    query: "shop",
    detail: "Independent places worth knowing",
    icon: "◇",
  },
  {
    name: "Health & fitness",
    query: "fitness",
    detail: "Studios, wellbeing and local care",
    icon: "+",
  },
  {
    name: "Events",
    query: "events",
    detail: "Ideas for today and the weekend",
    icon: "□",
  },
  {
    name: "Things to do",
    query: "things to do",
    detail: "Walks, activities and useful ideas",
    icon: "↟",
  },
] as const;

const representativeBusinesses = [
  {
    name: "Rhondda Fitness Studio",
    category: "Fitness",
    summary:
      "A fictional example showing how classes and local services could appear.",
    place: "Pontypridd",
    image: "/home/biz-gym.webp",
  },
  {
    name: "Valley Bloom Florist",
    category: "Florist",
    summary:
      "A fictional preview for seasonal flowers, occasions and local delivery.",
    place: "Aberdare",
    image: "/home/biz-florist.webp",
  },
  {
    name: "Taff Tyres",
    category: "Automotive",
    summary:
      "A fictional local-services preview with clear contact and location details.",
    place: "Treorchy",
    image: "/home/biz-tyres.webp",
  },
] as const;

const representativeEvents = [
  {
    month: "Jul",
    date: "25",
    day: "Sat",
    name: "Pontypridd Food & Craft Market",
    time: "10:00–15:00",
    place: "Pontypridd town centre",
    exploreHref: "/businesses?place=pontypridd",
  },
  {
    month: "Jul",
    date: "26",
    day: "Sun",
    name: "Live at the Coliseum",
    time: "19:00–22:00",
    place: "Aberdare",
    exploreHref: "/businesses?place=aberdare",
  },
  {
    month: "Jul",
    date: "26",
    day: "Sun",
    name: "Plant Swap Rhondda",
    time: "11:00–13:00",
    place: "Treorchy",
    exploreHref: "/businesses?place=treorchy",
  },
] as const;

const guides = [
  {
    title: "Independent coffee across the Valleys",
    summary:
      "A representative guide concept for discovering welcoming local stops.",
    image: "/home/biz-gym.webp",
    href: "/businesses?q=coffee",
  },
  {
    title: "A practical afternoon in Porth",
    summary:
      "A sample place guide combining useful services and local highlights.",
    image: "/home/biz-florist.webp",
    href: "/businesses?place=porth",
  },
  {
    title: "Valley trails for a clear day",
    summary:
      "A fictional editorial preview for future outdoor discovery content.",
    image: "/home/biz-tyres.webp",
    href: "/businesses?q=things%20to%20do",
  },
] as const;

const fallbackAreas = [
  { name: "Treorchy", slug: "treorchy" },
  { name: "Tonypandy", slug: "tonypandy" },
  { name: "Porth", slug: "porth" },
  { name: "Aberdare", slug: "aberdare" },
  { name: "Mountain Ash", slug: "mountain-ash" },
  { name: "Ferndale", slug: "ferndale" },
] as const;

function SearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
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
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
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

function CoilIllustration() {
  return (
    <svg
      width="76"
      height="76"
      viewBox="0 0 74 74"
      fill="none"
      aria-hidden="true"
    >
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
  const [businessResult, activePlaces] = await Promise.all([
    getPublishedBusinessBySlug("cwm-coil-heating"),
    listActivePlaces(),
  ]);
  const demoBusiness =
    businessResult.state === "ready" ? businessResult.business : null;
  const placeOptions =
    activePlaces.length > 0
      ? activePlaces.map(({ slug, name }) => ({ slug, name }))
      : fallbackAreas.map(({ slug, name }) => ({ slug, name }));
  const areaCards = placeOptions.slice(0, 6);

  return (
    <div className={styles.home} data-home-root>
      <HomeEnhancements />
      <HomeHeader />

      <main>
        <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.heroAtmosphere} aria-hidden="true" />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>Rhondda Cynon Taf</p>
              <h1 id="home-title">Everything local, all in one place.</h1>
              <p className={styles.welshLine}>Popeth lleol, mewn un lle.</p>
              <p className={styles.heroLead}>
                Find useful businesses, places and local ideas across the
                Valleys without fighting through disconnected directories.
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
                <span>Popular now</span>
                {popularSearches.map((search) => (
                  <Link
                    key={search}
                    href={`/businesses?q=${encodeURIComponent(search)}`}
                  >
                    {search}
                  </Link>
                ))}
              </div>
            </div>

            <div className={styles.heroVisual} data-home-parallax>
              <div
                className={styles.heroPhoto}
                role="img"
                aria-label="A welcoming independent café on a Valleys high street"
              >
                <span className={`${styles.heroStrip} ${styles.heroStrip0}`} />
                <span className={`${styles.heroStrip} ${styles.heroStrip1}`} />
                <span className={`${styles.heroStrip} ${styles.heroStrip2}`} />
                <span className={`${styles.heroStrip} ${styles.heroStrip3}`} />
                <span className={`${styles.heroStrip} ${styles.heroStrip4}`} />
                <span className={`${styles.heroStrip} ${styles.heroStrip5}`} />
              </div>
              <div className={styles.heroPhotoShade} aria-hidden="true" />
              <div className={styles.heroContour} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>

              <div className={styles.localViewCard}>
                <div className={styles.localViewTopline}>
                  <span>Preview of your local view</span>
                  <span className={styles.statusDot}>Fictional demo</span>
                </div>
                <div className={styles.localViewHeading}>
                  <div>
                    <p>Selected area</p>
                    <strong>All of RCT</strong>
                  </div>
                  <span aria-hidden="true">↗</span>
                </div>
                <div className={styles.localSignals}>
                  <Link href="/b/cwm-coil-heating">
                    <span className={styles.signalIcon}>01</span>
                    <span>
                      <small>Featured business</small>
                      <strong>
                        {demoBusiness?.tradingName ?? "Cwm & Coil Heating"}
                      </strong>
                    </span>
                  </Link>
                  <a href="#events">
                    <span className={styles.signalIcon}>02</span>
                    <span>
                      <small>Weekend ideas</small>
                      <strong>Three representative previews</strong>
                    </span>
                  </a>
                  <a href="#areas">
                    <span className={styles.signalIcon}>03</span>
                    <span>
                      <small>Explore places</small>
                      <strong>{areaCards.length} areas ready to browse</strong>
                    </span>
                  </a>
                </div>
              </div>

              <div className={styles.heroFloatCard} aria-hidden="true">
                <span>Search stays public</span>
                <strong>No account needed</strong>
              </div>
            </div>
          </div>
        </section>

        <section
          className={styles.quickPaths}
          aria-label="Quick ways to explore"
        >
          <div className={styles.quickPathInner}>
            <Link href="/businesses">
              <span>01</span>
              <div>
                <strong>Find a local service</strong>
                <small>Search the public directory</small>
              </div>
              <b aria-hidden="true">↗</b>
            </Link>
            <a href="#areas">
              <span>02</span>
              <div>
                <strong>Explore by place</strong>
                <small>Start with somewhere familiar</small>
              </div>
              <b aria-hidden="true">↓</b>
            </a>
            <a href="#for-business">
              <span>03</span>
              <div>
                <strong>See what businesses get</strong>
                <small>One profile, a complete local presence</small>
              </div>
              <b aria-hidden="true">↓</b>
            </a>
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
                Useful routes into local discovery, kept simple enough to scan
                in seconds.
              </p>
            </div>
            <div className={styles.categoryGrid}>
              {categories.map((category) => (
                <Link
                  className={styles.categoryCard}
                  href={`/businesses?q=${encodeURIComponent(category.query)}`}
                  key={category.name}
                >
                  <span className={styles.categoryIcon} aria-hidden="true">
                    {category.icon}
                  </span>
                  <span>
                    <strong>{category.name}</strong>
                    <small>{category.detail}</small>
                  </span>
                  <b aria-hidden="true">↗</b>
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
                Businesses, weekend ideas, practical guides and places belong in
                one useful experience — not four separate portals.
              </p>
            </div>

            <div className={styles.discoveryBoard}>
              <article className={styles.featuredBusiness}>
                <Link href="/b/cwm-coil-heating">
                  <div className={styles.featuredArt}>
                    <CoilIllustration />
                    <span className={styles.featuredIndex}>Featured / 01</span>
                  </div>
                  <div className={styles.featuredBody}>
                    <div className={styles.cardTopline}>
                      <span>
                        {demoBusiness?.category.name ?? "Plumbing & heating"}
                      </span>
                      <span className={styles.demoBadge}>Fictional demo</span>
                    </div>
                    <h3>{demoBusiness?.tradingName ?? "Cwm & Coil Heating"}</h3>
                    <p>
                      {demoBusiness?.summary ??
                        "The canonical fictional business is temporarily unavailable."}
                    </p>
                    <div className={styles.featuredMeta}>
                      <span>{demoBusiness?.place.name ?? "Tonypandy"}</span>
                      <strong>Open the business website →</strong>
                    </div>
                  </div>
                </Link>
              </article>

              <section className={styles.eventsPanel} id="events">
                <div className={styles.panelHeading}>
                  <div>
                    <p className={styles.eyebrow}>This weekend</p>
                    <h3>What could be on nearby</h3>
                  </div>
                  <span>Representative previews</span>
                </div>
                <div className={styles.eventList}>
                  {representativeEvents.map((event) => (
                    <article className={styles.eventRow} key={event.name}>
                      <div
                        className={styles.eventDate}
                        aria-label={`${event.day} ${event.date} ${event.month}`}
                      >
                        <span>{event.month}</span>
                        <strong>{event.date}</strong>
                        <span>{event.day}</span>
                      </div>
                      <div>
                        <h4>{event.name}</h4>
                        <p>
                          {event.time} · {event.place}
                        </p>
                      </div>
                      <Link
                        href={event.exploreHref}
                        aria-label={`Explore near ${event.place}`}
                      >
                        ↗
                      </Link>
                    </article>
                  ))}
                </div>
              </section>

              <section className={styles.areasPanel} id="areas">
                <div className={styles.panelHeading}>
                  <div>
                    <p className={styles.eyebrow}>Places you know</p>
                    <h3>Explore by area</h3>
                  </div>
                  <span>Manual choice, no location permission</span>
                </div>
                <div className={styles.areaGrid}>
                  {areaCards.map((area, index) => (
                    <Link
                      className={`${styles.areaCard} ${styles[`areaTone${(index % 6) + 1}`]}`}
                      href={`/businesses?place=${area.slug}`}
                      key={area.slug}
                    >
                      <span className={styles.areaContour} aria-hidden="true" />
                      <strong>{area.name}</strong>
                      <small>Explore nearby ↗</small>
                    </Link>
                  ))}
                </div>
              </section>

              <section className={styles.guidesPanel} id="guides">
                <div className={styles.panelHeading}>
                  <div>
                    <p className={styles.eyebrow}>Local knowledge</p>
                    <h3>Guide concepts for the Valleys</h3>
                  </div>
                  <span>Fictional editorial previews</span>
                </div>
                <div className={styles.guideList}>
                  {guides.map((guide, index) => (
                    <article className={styles.guideCard} key={guide.title}>
                      <Link href={guide.href}>
                        <div className={styles.guideMedia}>
                          <Image
                            src={guide.image}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 35vw, 12vw"
                          />
                        </div>
                        <div className={styles.guideBody}>
                          <span>0{index + 1}</span>
                          <h4>{guide.title}</h4>
                          <p>{guide.summary}</p>
                        </div>
                      </Link>
                    </article>
                  ))}
                </div>
              </section>

              <section
                className={styles.businessRibbon}
                aria-label="More fictional business previews"
              >
                <div>
                  <p className={styles.eyebrow}>
                    More ways discovery could feel
                  </p>
                  <h3>Different businesses, one clear local language.</h3>
                </div>
                <div className={styles.businessMiniGrid}>
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
                          sizes="(max-width: 768px) 30vw, 10vw"
                        />
                      </div>
                      <span>
                        <small>{business.category}</small>
                        <strong>{business.name}</strong>
                        <em>{business.place}</em>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            </div>

            <p className={styles.fictionNote}>
              All events, guides and additional business previews above are
              clearly fictional demonstration content. They show intended
              product structure, not real availability or verification.
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
                    <p>Search, categories and place-based routes reuse it.</p>
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
                  Prepare a business account →
                </Link>
                <Link
                  className={styles.secondaryCta}
                  href="/b/cwm-coil-heating"
                >
                  Open the full demo
                </Link>
              </div>
            </div>

            <div
              className={styles.sitePreview}
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
                    <div className={styles.previewMedia} aria-hidden="true">
                      <CoilIllustration />
                    </div>
                    <div className={styles.previewCopy}>
                      <p>{demoBusiness.category.name}</p>
                      <h3>{demoBusiness.tradingName}</h3>
                      <span>{demoBusiness.summary}</span>
                      <Link href={`/b/${demoBusiness.slug}`}>
                        View generated website →
                      </Link>
                    </div>
                  </div>
                  <div className={styles.previewFacts}>
                    <span>
                      <small>Service area</small>
                      <strong>{demoBusiness.place.name}</strong>
                    </span>
                    <span>
                      <small>Profile status</small>
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
                    Public search remains usable while the database-backed demo
                    is unavailable.
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
              <h2>Start exploring now. Sign in only when it adds value.</h2>
              <p>
                Public search and business discovery work without an account.
                Accounts are for protected business tools and later personalised
                journeys.
              </p>
            </div>
            <Link href="/businesses">Explore local businesses →</Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <strong className="ov-display">OurValleys</strong>
            <p>Independent local discovery for Rhondda Cynon Taf.</p>
          </div>
          <nav className={styles.footerNav} aria-label="Footer navigation">
            <Link href="/businesses">Businesses</Link>
            <a href="#areas">Areas</a>
            <a href="#guides">Guides</a>
            <Link href="/login">Sign in</Link>
          </nav>
        </div>
        <div className={styles.footerLegal}>
          <p>
            OurValleys is independent and is not operated or endorsed by any
            council or public body. Made in the Valleys.
          </p>
        </div>
      </footer>
    </div>
  );
}
