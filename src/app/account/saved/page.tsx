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
import { listSavedDiscoveryForUser } from "@/modules/residents/saved-discovery";
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

export default async function SavedItemsPage() {
  const { locale, t } = await getTranslator();
  const session = await readSession();
  if (!session) redirect("/login?next=/account/saved");

  const isDemoAccount = isPublicDemoEmail(session.user.email);
  const saved = isDemoAccount
    ? { state: "ready" as const, businesses: [], events: [], places: [] }
    : await listSavedDiscoveryForUser(session.user.id);

  return (
    <>
      <SiteHeader />
      <main className={styles.shell} lang={LOCALE_DETAILS[locale].htmlLang}>
        <section className={`${styles.hero} ov-glass`}>
          <p className={styles.eyebrow}>{t("settings.eyebrow")}</p>
          <h1>{t("saved.metaTitle")}</h1>
          <p className={styles.lead}>{t("saved.lead")}</p>
          <div className={styles.actions}>
            <Link className="button" href={"/account" as Route}>
              {t("saved.back")}
            </Link>
            <Link className="button primary" href="/businesses">
              {t("saved.browse")}
            </Link>
          </div>
        </section>

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
        ) : saved.businesses.length === 0 &&
          saved.events.length === 0 &&
          saved.places.length === 0 ? (
          <section className={styles.stateCard}>
            <h2>{t("saved.emptyTitle")}</h2>
            <p>{t("saved.emptyBody")}</p>
          </section>
        ) : (
          <div className={styles.sections}>
            <section aria-labelledby="saved-businesses-title">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>
                    {t("saved.businesses.eyebrow")}
                  </p>
                  <h2 id="saved-businesses-title">
                    {t("saved.businesses.title")}
                  </h2>
                </div>
                <span>{saved.businesses.length}</span>
              </div>

              {saved.businesses.length === 0 ? (
                <div className={styles.emptyRow}>
                  {t("saved.businesses.empty")}
                </div>
              ) : (
                <div className={styles.grid}>
                  {saved.businesses.map((business) => (
                    <article className={styles.card} key={business.id}>
                      <div>
                        <p className={styles.meta} lang={authoredTextLang}>
                          {business.categoryName} · {business.placeName}
                        </p>
                        <h3 lang={authoredTextLang}>{business.tradingName}</h3>
                        <p lang={authoredTextLang}>{business.summary}</p>
                      </div>
                      <div className={styles.cardActions}>
                        <Link href={`/businesses/${business.slug}` as Route}>
                          {t("saved.businesses.view")}
                        </Link>
                        <form action={removeBusinessAction}>
                          <input
                            name="itemId"
                            type="hidden"
                            value={business.id}
                          />
                          <input
                            name="returnTo"
                            type="hidden"
                            value="/account/saved"
                          />
                          <button type="submit">{t("saved.remove")}</button>
                        </form>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="saved-events-title">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>{t("saved.events.eyebrow")}</p>
                  <h2 id="saved-events-title">{t("saved.events.title")}</h2>
                </div>
                <span>{saved.events.length}</span>
              </div>

              {saved.events.length === 0 ? (
                <div className={styles.emptyRow}>{t("saved.events.empty")}</div>
              ) : (
                <div className={styles.grid}>
                  {saved.events.map((event) => (
                    <article className={styles.card} key={event.id}>
                      <div>
                        <p className={styles.meta}>
                          {formatDate(event.startsAt, locale)}
                        </p>
                        <h3 lang={authoredTextLang}>{event.title}</h3>
                        <p lang={authoredTextLang}>
                          {event.businessName}
                          {event.locationDisplay
                            ? ` · ${event.locationDisplay}`
                            : ""}
                        </p>
                      </div>
                      <div className={styles.cardActions}>
                        <Link
                          href={`/businesses/${event.businessSlug}` as Route}
                        >
                          {t("saved.events.view")}
                        </Link>
                        <form action={removeEventAction}>
                          <input name="itemId" type="hidden" value={event.id} />
                          <input
                            name="returnTo"
                            type="hidden"
                            value="/account/saved"
                          />
                          <button type="submit">{t("saved.remove")}</button>
                        </form>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="saved-places-title">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>{t("saved.places.eyebrow")}</p>
                  <h2 id="saved-places-title">{t("saved.places.title")}</h2>
                </div>
                <span>{saved.places.length}</span>
              </div>

              {saved.places.length === 0 ? (
                <div className={styles.emptyRow}>{t("saved.places.empty")}</div>
              ) : (
                <div className={styles.grid}>
                  {saved.places.map((place) => (
                    <article className={styles.card} key={place.id}>
                      <div>
                        {place.welshName && place.welshName !== place.name ? (
                          <p className={styles.meta} lang="cy">
                            {place.welshName}
                          </p>
                        ) : null}
                        <h3 lang={authoredTextLang}>{place.name}</h3>
                        <p lang={authoredTextLang}>{place.editorialSummary}</p>
                      </div>
                      <div className={styles.cardActions}>
                        <Link href={`/places/${place.slug}` as Route}>
                          {t("saved.places.view")}
                        </Link>
                        <form action={removePlaceAction}>
                          <input name="itemId" type="hidden" value={place.id} />
                          <input
                            name="returnTo"
                            type="hidden"
                            value="/account/saved"
                          />
                          <button type="submit">{t("saved.remove")}</button>
                        </form>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
