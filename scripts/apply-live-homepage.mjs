import fs from "node:fs";

const path = "src/app/page.tsx";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(pattern, replacement, label) {
  const next = source.replace(pattern, replacement);
  if (next === source) throw new Error(`Could not apply ${label}`);
  source = next;
}

replaceOnce(
  'import { getPublishedBusinessBySlug } from "@/modules/businesses/public";\nimport { listActivePlaces } from "@/modules/reference-data/places";',
  'import { getHomepageDiscovery } from "@/modules/home/public";',
  "homepage composition import",
);

replaceOnce(
  /const representativeEvents = \[[\s\S]*?\] as const;\n\n/,
  "",
  "representative events removal",
);
replaceOnce(/const guides = \[[\s\S]*?\] as const;\n\n/, "", "guide removal");
replaceOnce(
  /const fallbackAreas = \[[\s\S]*?\] as const;\n\n/,
  "",
  "fallback area removal",
);

replaceOnce(
  "function SearchIcon() {",
  `const guideImages = [
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

function SearchIcon() {`,
  "homepage format helpers",
);

replaceOnce(
  /  const \[businessResult, activePlaces\] = await Promise\.all\([\s\S]*?  const areaCards = placeOptions\.slice\(0, 6\);/,
  `  const discovery = await getHomepageDiscovery();
  const demoBusiness = discovery.featuredBusiness;
  const placeOptions = discovery.places.map(({ slug, name }) => ({ slug, name }));
  const areaCards = placeOptions;`,
  "homepage data loading",
);

source = source.replaceAll(
  '<Link href="/b/cwm-coil-heating">',
  '<Link href={demoBusiness ? `/b/${demoBusiness.slug}` : "/businesses"}>',
);

replaceOnce(
  /                <div className=\{styles\.eventList\}>[\s\S]*?                <\/div>\n              <\/section>/,
  `                <div className={styles.eventList}>
                  {discovery.eventsState === "ready" ? (
                    discovery.events.map((event) => {
                      const date = getEventDateParts(event.startsAt);
                      return (
                        <article className={styles.eventRow} key={event.id}>
                          <div
                            className={styles.eventDate}
                            aria-label={\`${"${date.day} ${date.date} ${date.month}"}\`}
                          >
                            <span>{date.month}</span>
                            <strong>{date.date}</strong>
                            <span>{date.day}</span>
                          </div>
                          <div>
                            <h4>{event.title}</h4>
                            <p>
                              {eventTimeFormatter.format(event.startsAt)} · {event.locationDisplay ?? event.businessName}
                            </p>
                          </div>
                          <Link
                            href={\`/events/${"${event.id}"}\`}
                            aria-label={\`Open ${"${event.title}"}\`}
                          >
                            ↗
                          </Link>
                        </article>
                      );
                    })
                  ) : (
                    <article className={styles.eventRow}>
                      <div>
                        <h4>
                          {discovery.eventsState === "unavailable"
                            ? "Event previews are temporarily unavailable"
                            : "No upcoming event previews yet"}
                        </h4>
                        <p>Browse the dedicated events journey for the latest public state.</p>
                      </div>
                      <Link href="/events" aria-label="Open local events">
                        ↗
                      </Link>
                    </article>
                  )}
                </div>
              </section>`,
  "live event panel",
);

replaceOnce(
  /                <div className=\{styles\.guideList\}>[\s\S]*?                <\/div>\n              <\/section>/,
  `                <div className={styles.guideList}>
                  {discovery.guidesState === "ready" ? (
                    discovery.guides.map((guide, index) => (
                      <article className={styles.guideCard} key={guide.slug}>
                        <Link href={\`/guides/${"${guide.slug}"}\`}>
                          <div className={styles.guideMedia}>
                            <Image
                              src={guideImages[index % guideImages.length]}
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
                    ))
                  ) : (
                    <article className={styles.guideCard}>
                      <Link href="/guides">
                        <div className={styles.guideBody}>
                          <span>01</span>
                          <h4>
                            {discovery.guidesState === "unavailable"
                              ? "Guide previews are temporarily unavailable"
                              : "More local guides are being prepared"}
                          </h4>
                          <p>Open the guides directory for the current public state.</p>
                        </div>
                      </Link>
                    </article>
                  )}
                </div>
              </section>`,
  "live guide panel",
);

source = source.replace(
  'href={`/businesses?place=${area.slug}`}',
  'href={`/places/${area.slug}`}',
);
source = source.replace(
  "All events, guides and additional business previews above are",
  "All guide and additional business previews above are",
);
source = source.replace(
  "clearly fictional demonstration content. They show intended",
  "clearly fictional demonstration content. Event data uses the public lifecycle projection. These surfaces show intended",
);

fs.writeFileSync(path, source);
