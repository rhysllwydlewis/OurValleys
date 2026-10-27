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
import type { MessageParams, Translator } from "@/lib/i18n/translate";
import {
  describeNotification,
  NOTIFICATION_GROUPS,
  NOTIFICATION_PAGE_SIZE,
  parseNotificationGroup,
  parsePage,
  totalPages,
  type NotificationGroup,
} from "@/modules/residents/notification-model";
import {
  listNotificationsForUser,
  type NotificationItem,
} from "@/modules/residents/notifications";
import {
  clearReadNotificationsAction,
  dismissNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  markNotificationUnreadAction,
} from "./actions";
import styles from "./notifications.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t("notif.metaTitle") };
}

const GROUP_LABEL = {
  all: "notif.filter.all",
  saved: "notif.filter.saved",
  business: "notif.filter.business",
} as const;

const OUTCOME_LABEL = {
  done: "notif.outcome.done",
  not_found: "notif.outcome.notFound",
  unavailable: "notif.outcome.failed",
  invalid: "notif.outcome.failed",
  forbidden: "notif.outcome.failed",
} as const;

function pageHref(group: NotificationGroup, page: number): Route {
  const query = new URLSearchParams();
  if (group !== "all") query.set("group", group);
  if (page > 1) query.set("page", String(page));
  const text = query.toString();
  return (
    text ? `/account/notifications?${text}` : "/account/notifications"
  ) as Route;
}

function formatDate(value: Date, locale: Locale) {
  return new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

/** Stored values are language-free; dates are written for the reader here. */
function messageParams(item: NotificationItem, locale: Locale): MessageParams {
  const params: MessageParams = { ...item.params };
  const startsAt = item.params.startsAt;
  if (typeof startsAt === "string") {
    const date = new Date(startsAt);
    params.when = Number.isNaN(date.getTime()) ? "" : formatDate(date, locale);
  }
  return params;
}

function ItemForm({
  action,
  item,
  group,
  page,
  label,
  t,
}: {
  action: (formData: FormData) => Promise<never>;
  item: NotificationItem;
  group: NotificationGroup;
  page: number;
  label: "notif.markRead" | "notif.markUnread" | "notif.dismiss";
  t: Translator;
}) {
  return (
    <form action={action}>
      <input name="itemId" type="hidden" value={item.id} />
      <input name="group" type="hidden" value={group} />
      <input name="page" type="hidden" value={page} />
      <button type="submit">{t(label)}</button>
    </form>
  );
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    group?: string | string[];
    page?: string | string[];
    outcome?: string | string[];
  }>;
}) {
  const { locale, t } = await getTranslator();
  const session = await getAuth()
    .api.getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) {
    redirect(`/login?next=${encodeURIComponent("/account/notifications")}`);
  }

  const query = await searchParams;
  const group = parseNotificationGroup(query.group);
  const requestedPage = parsePage(query.page);
  const outcomeParam = Array.isArray(query.outcome)
    ? query.outcome[0]
    : query.outcome;
  const outcome =
    outcomeParam && Object.hasOwn(OUTCOME_LABEL, outcomeParam)
      ? (outcomeParam as keyof typeof OUTCOME_LABEL)
      : null;
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const isDemo = isPublicDemoEmail(session.user.email);
  const result = isDemo
    ? null
    : await listNotificationsForUser(session.user.id, {
        group,
        page: requestedPage,
      });
  // A page past the end (after dismissing the last item on it) shows the last.
  const lastPage = result?.state === "ready" ? totalPages(result.total) : 1;
  if (result?.state === "ready" && requestedPage > lastPage) {
    redirect(pageHref(group, lastPage));
  }
  const page = requestedPage;

  return (
    <>
      <SiteHeader />
      <main className={styles.shell} lang={lang}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{t("notif.eyebrow")}</p>
            <h1>{t("notif.title")}</h1>
            <p className={styles.lead}>{t("notif.lead")}</p>
          </div>
          <div className={styles.actions}>
            <Link className="button" href={"/account" as Route}>
              {t("notif.back")}
            </Link>
            <Link className="button" href={"/account/following" as Route}>
              {t("notif.manageFollowing")}
            </Link>
            <Link
              className="button"
              href={"/account/settings#preferences" as Route}
            >
              {t("notif.settings")}
            </Link>
          </div>
        </header>

        {outcome ? (
          <p
            className={`${styles.outcome} ${outcome === "done" ? "" : styles.outcomeProblem}`}
            role={outcome === "done" ? "status" : "alert"}
          >
            {t(OUTCOME_LABEL[outcome])}
          </p>
        ) : null}

        {isDemo ? (
          <p className={styles.stateCard}>{t("notif.demo")}</p>
        ) : result?.state === "unavailable" || !result ? (
          <p className={styles.stateCard} role="alert">
            {t("notif.unavailable")}
          </p>
        ) : (
          <>
            <nav className={styles.tabs} aria-label={t("notif.filter.aria")}>
              <ul>
                {NOTIFICATION_GROUPS.map((value) => (
                  <li key={value}>
                    <Link
                      href={pageHref(value, 1)}
                      aria-current={value === group ? "page" : undefined}
                    >
                      {t(GROUP_LABEL[value])}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className={styles.toolbar}>
              <p className={styles.summary} role="status">
                {result.unread > 0
                  ? t("notif.summary.unread", { count: result.unread })
                  : t("notif.summary.allRead")}
              </p>
              <div className={styles.toolbarActions}>
                {result.unread > 0 ? (
                  <form action={markAllNotificationsReadAction}>
                    <input name="group" type="hidden" value={group} />
                    <input name="page" type="hidden" value={page} />
                    <button type="submit">{t("notif.markAll")}</button>
                  </form>
                ) : null}
                {result.items.some((item) => item.read) ? (
                  <form action={clearReadNotificationsAction}>
                    <input name="group" type="hidden" value={group} />
                    <button type="submit">{t("notif.clearRead")}</button>
                  </form>
                ) : null}
              </div>
            </div>

            {result.items.length === 0 ? (
              <section className={styles.stateCard}>
                <h2>
                  {group === "all"
                    ? t("notif.empty.title")
                    : t("notif.emptyFiltered.title")}
                </h2>
                <p>
                  {group === "all"
                    ? t("notif.empty.body")
                    : t("notif.emptyFiltered.body")}
                </p>
                {group === "all" ? (
                  <Link className="button" href={"/account/saved" as Route}>
                    {t("notif.empty.link")}
                  </Link>
                ) : null}
              </section>
            ) : (
              <ul className={styles.list} aria-label={t("notif.list.aria")}>
                {result.items.map((item) => {
                  const keys = describeNotification(item.kind, item.params);
                  const params = messageParams(item, locale);
                  return (
                    <li
                      key={item.id}
                      className={`${styles.item} ${item.read ? "" : styles.unread}`}
                      data-testid="notification"
                      data-read={item.read ? "true" : "false"}
                    >
                      <div className={styles.itemText}>
                        <h2>
                          {item.read ? null : (
                            <span className={styles.badge}>
                              {t("notif.new")}
                            </span>
                          )}
                          <span>{t(keys.title, params)}</span>
                        </h2>
                        <p>{t(keys.body, params)}</p>
                        <p className={styles.time}>
                          <time dateTime={item.createdAt.toISOString()}>
                            {formatDate(item.createdAt, locale)}
                          </time>
                        </p>
                      </div>
                      <div className={styles.itemActions}>
                        {item.href ? (
                          <Link className="button" href={item.href as Route}>
                            {t("notif.open")}
                          </Link>
                        ) : null}
                        <ItemForm
                          action={
                            item.read
                              ? markNotificationUnreadAction
                              : markNotificationReadAction
                          }
                          item={item}
                          group={group}
                          page={page}
                          label={
                            item.read ? "notif.markUnread" : "notif.markRead"
                          }
                          t={t}
                        />
                        <ItemForm
                          action={dismissNotificationAction}
                          item={item}
                          group={group}
                          page={page}
                          label="notif.dismiss"
                          t={t}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {result.total > NOTIFICATION_PAGE_SIZE ? (
              <nav className={styles.pager} aria-label={t("notif.pager.aria")}>
                {page > 1 ? (
                  <Link href={pageHref(group, page - 1)} rel="prev">
                    {t("notif.pager.prev")}
                  </Link>
                ) : (
                  <span />
                )}
                <span>
                  {t("notif.pager.status", { page, pages: lastPage })}
                </span>
                {page < lastPage ? (
                  <Link href={pageHref(group, page + 1)} rel="next">
                    {t("notif.pager.next")}
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            ) : null}
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
