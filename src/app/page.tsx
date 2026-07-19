import Image from "next/image";
import Link from "next/link";
import { HomeEnhancements } from "@/components/home/home-enhancements";
import { HomeHeader } from "@/components/home/home-header";
import styles from "@/components/home/home.module.css";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";

export const dynamic = "force-dynamic";

const popularSearches = [
  "Coffee",
  "Takeaways",
  "Hairdressers",
  "Dog friendly",
  "Things to do",
] as const;

const stats = [
  { value: "RCT", label: "Launch geography", icon: "⌂" },
  { value: "1 profile", label: "Directory + website", icon: "↗" },
  { value: "6 areas", label: "Representative previews", icon: "◎" },
  { value: "No login", label: "Required to search", icon: "✓" },
] as const;

const categories = [
  { name: "Coffee & food", query: "coffee", icon: "☕" },
  { name: "Home & trades", query: "plumbing", icon: "⌂" },
  { name: "Shops", query: "shop", icon: "◇" },
  { name: "Health & fitness", query: "fitness", icon: "+" },
  { name: "Events", query: "events", icon: "□" },
  { name: "Things to do", query: "things to do", icon: "↟" },
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
    image: "/home/biz-florist.webp",
  },
  {
    month: "Jul",
    date: "26",
    day: "Sun",
    name: "Live at the Coliseum",
    time: "19:00–22:00",
    place: "Aberdare",
    image: "/home/biz-gym.webp",
  },
  {
    month: "Jul",
    date: "25",
    day: "Sat",
    name: "Dare Valley sunrise walk",
    time: "05:00–09:00",
    place: "Dare Valley Country Park",
    image: "/home/biz-tyres.webp",
  },
  {
    month: "Jul",
    date: "26",
    day: "Sun",
    name: "Plant Swap Rhondda",
    time: "11:00–13:00",
    place: "Treorchy",
    image: "/home/biz-florist.webp",
  },
] as const;

const guides = [
  {
    title: "Independent coffee across the Valleys",
    summary:
      "A representative guide concept for discovering welcoming local stops.",
    image: "/home/biz-gym.webp",
  },
  {
    title: "A practical afternoon in Porth",
    summary:
      "A sample place guide combining useful services and local highlights.",
    image: "/home/biz-florist.webp",
  },
  {
    title: "Valley trails for a clear day",
    summary:
      "A fictional editorial preview for future outdoor discovery content.",
    image: "/home/biz-tyres.webp",
  },
] as const;

const areas = [
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
      width="19"
      height="19"
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
      width="19"
      height="19"
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
      width="74"
      height="74"
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
  const businessResult = await getPublishedBusinessBySlug("cwm-coil-heating");
  const demoBusiness =
    businessResult.state === "ready" ? businessResult.business : null;

  return (
    <div className={styles.home} data-home-root>
      <HomeEnhancements />
      <HomeHeader />

      <main>
        <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.heroMedia} data-home-parallax>
            <div
              className={styles.heroImage}
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
          </div>
          <div className={styles.heroOverlay} aria-hidden="true" />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.heroKicker}>Rhondda Cynon Taf</p>
              <h1 id="home-title">Everything local, all in one place.</h1>
              <p className={styles.welshLine}>Popeth lleol, mewn un lle.</p>
              <p className={styles.heroLead}>
                Find businesses, places and useful local information across the
                Valleys. Public search works without an account.
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
                      placeholder="e.g. Coffee, plumber, yoga"
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
                      <option value="tonypandy">Tonypandy</option>
                      <option value="treorchy">Treorchy</option>
                      <option value="porth">Porth</option>
                      <option value="aberdare">Aberdare</option>
                      <option value="mountain-ash">Mountain Ash</option>
                    </select>
                  </span>
                </div>
                <button className={styles.searchSubmit} type="submit">
                  Search
                </button>
              </form>

              <div className={styles.popularRow} aria-label="Popular searches">
                <span>Popular:</span>
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
          </div>
        </section>

        <section
          className={styles.statsBand}
          aria-label="Platform proof points"
        >
          <div className={styles.statsGrid}>
            {stats.map((stat) => (
              <div className={styles.stat} key={stat.label}>
                <span className={styles.statIcon} aria-hidden="true">
                  {stat.icon}
                </span>
                <div>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} id="discover" data-home-reveal>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Start nearby</p>
                <h2>What do you need today?</h2>
              </div>
              <p>
                Useful routes into the directory, built as real links rather
                than decorative homepage tiles.
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
                  <strong>{category.name}</strong>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} data-home-reveal>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Connected discovery</p>
                <h2>Featured local businesses</h2>
              </div>
              <Link className={styles.textLink} href="/businesses">
                View all businesses →
              </Link>
            </div>
            <div className={styles.cardGrid}>
              <article className={styles.businessCard}>
                <Link href="/b/cwm-coil-heating">
                  <div className={styles.canonicalArt}>
                    <CoilIllustration />
                  </div>
                  <div className={styles.cardBody}>
                    <p className={styles.cardEyebrow}>
                      {demoBusiness?.category.name ?? "Plumbing & heating"}
                    </p>
                    <h3>{demoBusiness?.tradingName ?? "Cwm & Coil Heating"}</h3>
                    <p>
                      {demoBusiness?.summary ??
                        "The canonical fictional business is temporarily unavailable."}
                    </p>
                    <div className={styles.cardMeta}>
                      <span className={styles.demoBadge}>Fictional demo</span>
                      <span>{demoBusiness?.place.name ?? "Tonypandy"}</span>
                    </div>
                  </div>
                </Link>
              </article>

              {representativeBusinesses.map((business) => (
                <article className={styles.businessCard} key={business.name}>
                  <Link
                    href={`/businesses?q=${encodeURIComponent(business.category)}`}
                  >
                    <div className={styles.cardMedia}>
                      <Image
                        src={business.image}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1072px) 50vw, 25vw"
                      />
                    </div>
                    <div className={styles.cardBody}>
                      <p className={styles.cardEyebrow}>{business.category}</p>
                      <h3>{business.name}</h3>
                      <p>{business.summary}</p>
                      <div className={styles.cardMeta}>
                        <span className={styles.demoBadge}>
                          Fictional preview
                        </span>
                        <span>{business.place}</span>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} id="events" data-home-reveal>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Representative data</p>
                <h2>What could be on nearby</h2>
              </div>
              <p>
                Event publishing is a later workstream. These fictional examples
                demonstrate the intended layout without claiming real
                availability.
              </p>
            </div>
            <div className={styles.eventGrid}>
              {representativeEvents.map((event) => (
                <article className={styles.eventCard} key={event.name}>
                  <div className={styles.eventTop}>
                    <div
                      className={styles.eventDate}
                      aria-label={`${event.day} ${event.date} ${event.month}`}
                    >
                      <span>{event.month}</span>
                      <strong>{event.date}</strong>
                      <span>{event.day}</span>
                    </div>
                    <div className={styles.eventMedia}>
                      <Image
                        src={event.image}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 75vw, (max-width: 1072px) 35vw, 18vw"
                      />
                    </div>
                  </div>
                  <div className={styles.eventBody}>
                    <h3>{event.name}</h3>
                    <p>{event.time}</p>
                    <p>{event.place}</p>
                    <div className={styles.eventActions}>
                      <span className={styles.demoBadge}>
                        Fictional event preview
                      </span>
                      <Link href="/businesses">Explore nearby →</Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} id="guides" data-home-reveal>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Local knowledge</p>
                <h2>Guide concepts for the Valleys</h2>
              </div>
              <p>
                Editorial previews show how local stories and practical
                information can sit alongside business discovery.
              </p>
            </div>
            <div className={styles.guideGrid}>
              {guides.map((guide) => (
                <article className={styles.guideCard} key={guide.title}>
                  <Link href="/businesses">
                    <div className={styles.guideMedia}>
                      <Image
                        src={guide.image}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 35vw, 14vw"
                      />
                    </div>
                    <div className={styles.guideBody}>
                      <p className={styles.cardEyebrow}>Sample guide</p>
                      <h3>{guide.title}</h3>
                      <p>{guide.summary}</p>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} id="areas" data-home-reveal>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Manual location choice</p>
                <h2>Explore by area</h2>
              </div>
              <p>
                Choose a place yourself. The homepage does not require precise
                location permission.
              </p>
            </div>
            <div className={styles.areaGrid}>
              {areas.map((area, index) => (
                <Link
                  className={`${styles.areaCard} ${styles[`areaTone${index + 1}`]}`}
                  href={`/businesses?place=${area.slug}`}
                  key={area.name}
                >
                  <span aria-hidden="true" className={styles.areaContour} />
                  <span>{area.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section
          className={styles.businessSection}
          id="for-business"
          data-home-reveal
        >
          <div className={styles.businessPanel}>
            <div className={styles.businessPitch}>
              <p className={styles.eyebrow}>One record, more value</p>
              <h2>A website for every local business</h2>
              <p>
                Maintain one structured OurValleys profile and use it for
                directory discovery and a generated mobile-friendly website.
              </p>
              <ul className={styles.perkList}>
                <li>Showcase services and opening hours</li>
                <li>Keep public and private address data separate</li>
                <li>Be found through local search</li>
                <li>No website-building skills required</li>
              </ul>
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
              {demoBusiness ? (
                <>
                  <div className={styles.previewChrome}>
                    <span className={styles.browserDots} aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                    <span className={styles.previewTitle}>
                      {demoBusiness.tradingName}
                    </span>
                    <span className={styles.previewNav} aria-hidden="true">
                      <span>Home</span>
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
                      <h3>{demoBusiness.tradingName}</h3>
                      <p>{demoBusiness.summary}</p>
                      <Link href={`/b/${demoBusiness.slug}`}>
                        View generated website
                      </Link>
                    </div>
                  </div>
                  <div className={styles.previewFacts}>
                    <span>
                      <strong>Category</strong>
                      {demoBusiness.category.name}
                    </span>
                    <span>
                      <strong>Service area</strong>
                      {demoBusiness.place.name}
                    </span>
                    <span>
                      <strong>Status</strong>
                      Fictional · not independently verified
                    </span>
                  </div>
                </>
              ) : (
                <div className={styles.previewUnavailable}>
                  <div>
                    <strong>Generated website preview unavailable</strong>
                    <p>
                      The homepage remains usable while the database-backed
                      preview is unavailable.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className={styles.fictionNote}>
            The canonical business and all additional listings, events and
            guides on this homepage are fictional demonstration content.
          </p>
        </section>

        <section className={styles.residentSection} data-home-reveal>
          <div className={styles.residentCta}>
            <div>
              <p className={styles.eyebrow}>Built for residents too</p>
              <h2>Find something useful without making an account.</h2>
              <p>
                Search the public directory now. Resident accounts will add
                saved places and tailored updates only when those journeys are
                complete and verified.
              </p>
            </div>
            <Link href="/businesses">Explore local businesses</Link>
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
