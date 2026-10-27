import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { isPublicDemoEmail } from "@/lib/demo-account";
import { LOCALE_DETAILS, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { followHref } from "@/modules/residents/following-model";
import { loadFollowingOverview } from "@/modules/residents/following";
import { setAllNoticesAction, setBusinessNoticesAction } from "./actions";
import styles from "./following.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t("follow.metaTitle") };
}

const OUTCOME_LABEL = {
  on: "follow.outcome.on",
  off: "follow.outcome.off",
  all_on: "follow.outcome.allOn",
  all_off: "follow.outcome.allOff",
  not_found: "follow.outcome.notFound",
  unavailable: "follow.outcome.failed",
  invalid: "follow.outcome.failed",
  forbidden: "follow.outcome.failed",
} as const;

const KIND_LABEL = {
  update: "follow.kind.update",
  offer: "follow.kind.offer",
  event: "follow.kind.event",
} as const;

const OPEN_LABEL = {
  update: "follow.open.update",
  offer: "follow.open.offer",
  event: "follow.open.event",
} as const;

function formatDate(value: Date, locale: Locale) {
  return new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function FollowingPage({
  searchParams,
}: {
  searchParams: Promise<{ outcome?: string | string[] }>;
}) {
  const { locale, t } = await getTranslator();
  const session = await getAuth()
    .api.getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) {
    redirect(`/login?next=${encodeURIComponent("/account/following")}`);
  }

  const query = await searchParams;
  const outcomeParam = Array.isArray(query.outcome)
    ? query.outcome[0]
    : query.outcome;
  const outcome =
    outcomeParam && Object.hasOwn(OUTCOME_LABEL, outcomeParam)
      ? (outcomeParam as keyof typeof OUTCOME_LABEL)
      : null;
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const isDemo = isPublicDemoEmail(session.user.email);
  const overview = isDemo ? null : await loadFollowingOverview(session.user.id);

  return (
    <>
      <SiteHeader />
      <main className={styles.shell} lang={lang}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{t("follow.eyebrow")}</p>
            <h1>{t("follow.title")}</h1>
            <p className={styles.lead}>{t("follow.lead")}</p>
          </div>
          <div className={styles.actions}>
            <Link className="button" href={"/account" as Route}>
              {t("follow.back")}
            </Link>
            <Link className="button" href={"/account/notifications" as Route}>
              {t("follow.notifications")}
            </Link>
          </div>
        </header>

        {outcome ? (
          <p
            id="outcome"
            tabIndex={-1}
            className={`${styles.outcome} ${["on", "off", "all_on", "all_off"].includes(outcome) ? "" : styles.outcomeProblem}`}
            role={
              ["on", "off", "all_on", "all_off"].includes(outcome)
                ? "status"
                : "alert"
            }
          >
            {t(OUTCOME_LABEL[outcome])}
          </p>
        ) : null}

        {isDemo ? (
          <p className={styles.stateCard}>{t("follow.demo")}</p>
        ) : !overview || overview.state === "unavailable" ? (
          <p className={styles.stateCard} role="alert">
            {t("follow.unavailable")}
          </p>
        ) : (
          <>
            <section className={styles.section} aria-labelledby="feed-title">
              <h2 id="feed-title">{t("follow.feed.title")}</h2>
              {overview.feed.length === 0 ? (
                <div className={styles.stateCard}>
                  <h3>{t("follow.feed.emptyTitle")}</h3>
                  <p>{t("follow.feed.emptyBody")}</p>
                </div>
              ) : (
                <ul className={styles.list} aria-label={t("follow.feed.aria")}>
                  {overview.feed.map((item) => (
                    <li
                      key={`${item.kind}-${item.id}`}
                      className={styles.item}
                      data-testid="following-item"
                      data-kind={item.kind}
                    >
                      <div className={styles.itemHead}>
                        <span className={styles.kind}>
                          {t(KIND_LABEL[item.kind])}
                        </span>
                        <span className={styles.meta}>
                          {t("follow.item.by", { business: item.businessName })}
                        </span>
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.excerpt}</p>
                      <p className={styles.meta}>
                        {item.startsAt
                          ? t("follow.item.when", {
                              when: formatDate(item.startsAt, locale),
                            })
                          : t("follow.item.posted", {
                              when: formatDate(item.at, locale),
                            })}
                      </p>
                      {item.fictional ? (
                        <p className={styles.fictional}>
                          {t("follow.feed.fictional")}
                        </p>
                      ) : null}
                      <Link
                        className={styles.itemLink}
                        href={
                          followHref({
                            kind: item.kind,
                            itemId: item.id,
                            businessSlug: item.businessSlug,
                          }) as Route
                        }
                        aria-label={t(OPEN_LABEL[item.kind], {
                          business: item.businessName,
                        })}
                      >
                        {t("follow.item.open")}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section
              className={styles.section}
              aria-labelledby="manage-title"
              id="manage"
            >
              <h2 id="manage-title">{t("follow.manage.title")}</h2>
              <p className={styles.sectionLead}>{t("follow.manage.lead")}</p>
              {overview.businesses.length === 0 ? (
                <div className={styles.stateCard}>
                  <h3>{t("follow.manage.emptyTitle")}</h3>
                  <p>{t("follow.manage.emptyBody")}</p>
                  <Link className="button" href={"/businesses" as Route}>
                    {t("follow.manage.browse")}
                  </Link>
                </div>
              ) : (
                <>
                  <div className={styles.bulk}>
                    <form action={setAllNoticesAction}>
                      <input name="notify" type="hidden" value="off" />
                      <button type="submit">{t("follow.manage.allOff")}</button>
                    </form>
                    <form action={setAllNoticesAction}>
                      <input name="notify" type="hidden" value="on" />
                      <button type="submit">{t("follow.manage.allOn")}</button>
                    </form>
                  </div>
                  <ul
                    className={styles.list}
                    aria-label={t("follow.manage.aria")}
                  >
                    {overview.businesses.map((item) => (
                      <li
                        key={item.id}
                        className={styles.switchRow}
                        data-testid="following-business"
                        data-notify={item.notify ? "on" : "off"}
                      >
                        <div>
                          <strong>
                            <Link href={`/b/${item.slug}` as Route}>
                              {item.tradingName}
                            </Link>
                          </strong>
                          {item.placeName ? (
                            <span className={styles.placeName}>
                              {item.placeName}
                            </span>
                          ) : null}
                        </div>
                        <form
                          className={styles.switchForm}
                          action={setBusinessNoticesAction}
                        >
                          <input
                            name="businessId"
                            type="hidden"
                            value={item.id}
                          />
                          <input
                            name="notify"
                            type="hidden"
                            value={item.notify ? "off" : "on"}
                          />
                          <span className={styles.state}>
                            {item.notify
                              ? t("follow.manage.on")
                              : t("follow.manage.off")}
                          </span>
                          <button
                            type="submit"
                            aria-label={t(
                              item.notify
                                ? "follow.manage.turnOff"
                                : "follow.manage.turnOn",
                              { business: item.tradingName },
                            )}
                          >
                            {item.notify
                              ? t("follow.manage.switchOff")
                              : t("follow.manage.switchOn")}
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
