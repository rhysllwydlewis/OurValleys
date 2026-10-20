import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { authoredTextLang } from "@/lib/i18n/business-copy";
import { LOCALE_DETAILS, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey, Translator } from "@/lib/i18n/translate";
import { isMediaStorageConfigured } from "@/lib/media-storage";
import { isPublicDemoEmail } from "@/lib/public-demo-policy";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import {
  listStudioEvents,
  type StudioEventRow,
} from "@/modules/businesses/event-studio";
import {
  actionsFor,
  countEvents,
  eventGuidance,
  eventLimits,
  eventState,
  eventStates,
  groupEvents,
  postponeChoices,
  toLondonInput,
  upcomingSeriesCounts,
  type EventState,
  type QuickAction,
} from "@/modules/businesses/event-studio-model";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { ContentImageFields } from "../operations/sections/content-image-fields";
import { DashboardTabs } from "../_hub/dashboard-tabs";
import hubStyles from "../_hub/hub.module.css";
import { readDashboardTabAccess } from "../_hub/tab-access";
import {
  cancelSeriesStudioAction,
  eventQuickAction,
  removeEventStudioAction,
} from "./actions";
import { EventEditor } from "./event-editor";
import styles from "./events.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("evstudio.metaTitle"),
    robots: { index: false, follow: false },
  };
}

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

const outcomeTones: Record<string, "ok" | "bad"> = {
  created: "ok",
  createdSeries: "ok",
  saved: "ok",
  published: "ok",
  resumed: "ok",
  paused: "ok",
  cancelled: "ok",
  reopened: "ok",
  postponed: "ok",
  duplicated: "ok",
  seriesCancelled: "ok",
  removed: "ok",
  forbidden: "bad",
  invalid: "bad",
  not_found: "bad",
  not_series: "bad",
  locked: "bad",
  not_allowed: "bad",
  not_ready: "bad",
  already_over: "bad",
  limit: "bad",
  unavailable: "bad",
  "picture-text": "bad",
};

function formatWhen(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

function whenLine(event: StudioEventRow, locale: Locale, t: Translator) {
  const start = formatWhen(event.startsAt, locale);
  if (!event.endsAt) return start;
  return t("evstudio.when.runs", {
    start,
    end: formatWhen(event.endsAt, locale),
  });
}

function QuickActionForm({
  t,
  businessId,
  event,
  action,
  days,
}: {
  t: Translator;
  businessId: string;
  event: StudioEventRow;
  action: QuickAction;
  days?: number;
}) {
  const label = t(
    days
      ? (`evstudio.act.postpone${days}` as MessageKey)
      : (`evstudio.act.${action}` as MessageKey),
  );
  return (
    <form action={eventQuickAction}>
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="eventId" value={event.id} />
      <input type="hidden" name="action" value={action} />
      {days ? <input type="hidden" name="days" value={days} /> : null}
      <button
        className={action === "cancel" ? `button ${styles.danger}` : "button"}
        type="submit"
        aria-label={t("evstudio.act.named", {
          action: label,
          title: event.title,
        })}
      >
        {label}
      </button>
    </form>
  );
}

function EventRow({
  t,
  locale,
  businessId,
  event,
  now,
  canEdit,
  uploadsEnabled,
  seriesUpcoming,
}: {
  t: Translator;
  locale: Locale;
  businessId: string;
  event: StudioEventRow;
  now: Date;
  canEdit: boolean;
  uploadsEnabled: boolean;
  /** Upcoming owner-managed dates in this event's series (0 if none). */
  seriesUpcoming: number;
}) {
  const state = eventState(event, now);
  // Tips about publishing or pictures only help someone who can act on them,
  // and a picture tip makes no sense while uploads are switched off.
  const guidance = canEdit
    ? eventGuidance(event, now).filter(
        (item) => uploadsEnabled || item.code !== "noPicture",
      )
    : [];
  const actions = actionsFor(state);
  const lang = authoredTextLang || undefined;
  const otherDates =
    event.seriesId &&
    ["draft", "active", "hidden"].includes(event.status) &&
    event.startsAt.getTime() >= now.getTime()
      ? Math.max(seriesUpcoming - 1, 0)
      : seriesUpcoming;
  return (
    <li className={styles.event} id={`event-${event.id}`}>
      <div className={styles.eventTop}>
        {event.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.thumb}
            src={event.image.url}
            alt={event.image.altText}
            lang={lang}
            loading="lazy"
          />
        ) : (
          <span className={styles.thumbEmpty} aria-hidden="true">
            ◌
          </span>
        )}
        <div>
          <h3 className={styles.eventTitle}>
            <span lang={lang}>{event.title}</span>
            <span className={styles.badge} data-state={state}>
              {t(`evstudio.state.${state}` as MessageKey)}
            </span>
          </h3>
          <p className={styles.when}>{whenLine(event, locale, t)}</p>
          {event.locationDisplay ? (
            <p className={styles.when} lang={lang}>
              {event.locationDisplay}
            </p>
          ) : null}
          <p className={styles.excerpt} lang={lang}>
            {event.description.length > 160
              ? `${event.description.slice(0, 157)}…`
              : event.description}
          </p>
          {event.seriesId && seriesUpcoming > 0 ? (
            <p className={styles.seriesNote}>
              {t("evstudio.series.note", { count: seriesUpcoming })}
            </p>
          ) : null}
        </div>
      </div>
      {guidance.length > 0 ? (
        <ul className={styles.guidance}>
          {guidance.map((item) => (
            <li key={item.code} data-level={item.level}>
              <strong>
                {item.level === "attention"
                  ? t("evstudio.guide.labelAttention")
                  : t("evstudio.guide.label")}
                :
              </strong>{" "}
              {t(`evstudio.guide.${item.code}` as MessageKey)}
            </li>
          ))}
        </ul>
      ) : null}
      {canEdit ? (
        <div className={styles.actions}>
          {actions.map((action) =>
            action === "postpone" ? (
              postponeChoices.map((days) => (
                <QuickActionForm
                  key={`postpone-${days}`}
                  t={t}
                  businessId={businessId}
                  event={event}
                  action="postpone"
                  days={days}
                />
              ))
            ) : (
              <QuickActionForm
                key={action}
                t={t}
                businessId={businessId}
                event={event}
                action={action}
              />
            ),
          )}
          {event.seriesId &&
          seriesUpcoming > 1 &&
          ["draft", "active", "hidden"].includes(event.status) ? (
            <form action={cancelSeriesStudioAction}>
              <input type="hidden" name="businessId" value={businessId} />
              <input type="hidden" name="eventId" value={event.id} />
              <button className={`button ${styles.danger}`} type="submit">
                {t("evstudio.series.cancelAll", { count: seriesUpcoming })}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
      <details className={styles.more}>
        <summary className="button">
          {canEdit
            ? t("evstudio.act.edit")
            : t(`evstudio.state.${state}` as MessageKey)}
        </summary>
        <div className={styles.moreBody}>
          <EventEditor
            key={`${event.id}:${event.updatedAt.getTime()}`}
            businessId={businessId}
            eventId={event.id}
            expectedUpdatedAt={event.updatedAt.getTime()}
            idPrefix={`edit-${event.id}`}
            canEdit={canEdit}
            seriesDates={otherDates}
            initial={{
              title: event.title,
              description: event.description,
              locationDisplay: event.locationDisplay ?? "",
              bookingUrl: event.bookingUrl ?? "",
              startsAt: toLondonInput(event.startsAt),
              endsAt: toLondonInput(event.endsAt),
              status: event.status,
              repeatFrequency: "",
              repeatOccurrences: "",
              applyToSeries: "",
            }}
            imageUrl={event.image?.url ?? null}
            imageAlt={event.image?.altText ?? ""}
            submitLabel={t("evstudio.form.save")}
            statusOptions={["draft", "active", "hidden", "cancelled"]}
            picture={
              <ContentImageFields
                idPrefix={`edit-${event.id}`}
                image={event.image}
                canEdit={canEdit}
                uploadsEnabled={uploadsEnabled}
                noun="event"
              />
            }
          />
          {canEdit ? (
            <details className={styles.removeBox}>
              <summary className={`button ${styles.danger}`}>
                {t("evstudio.act.remove")}
              </summary>
              <form
                action={removeEventStudioAction}
                className={styles.removeBody}
              >
                <input type="hidden" name="businessId" value={businessId} />
                <input type="hidden" name="eventId" value={event.id} />
                <p>{t("evstudio.act.removeWarning")}</p>
                <button className={`button ${styles.danger}`} type="submit">
                  {t("evstudio.act.removeConfirm")}
                </button>
              </form>
            </details>
          ) : null}
        </div>
      </details>
    </li>
  );
}

export default async function BusinessEventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ outcome?: string }>;
}) {
  const { locale, t } = await getTranslator();
  const htmlLang = LOCALE_DETAILS[locale].htmlLang;
  const session = await readSession();
  if (!session) redirect("/login?next=/account");

  const { businessId } = await params;
  const parsedBusinessId = z.uuid().safeParse(businessId);
  if (!parsedBusinessId.success) notFound();
  const id = parsedBusinessId.data;

  // Drafts and paused events are private, so opening the studio needs the
  // content permission itself, not just membership.
  const canManage = await canUserAccessBusiness({
    userId: session.user.id,
    businessId: id,
    permission: businessPermissions.manageContent,
  });
  if (!canManage) notFound();

  const isDemo = isPublicDemoEmail(session.user.email);
  const [tabAccess, memberships, result] = await Promise.all([
    readDashboardTabAccess({
      userId: session.user.id,
      businessId: id,
      isPublicDemo: isDemo,
    }),
    listAccessibleBusinesses(session.user.id).catch(() => []),
    listStudioEvents(id),
  ]);
  const summary = memberships.find((item) => item.id === id);
  if (!summary) notFound();

  if (result.status === "unavailable") {
    return (
      <>
        <SiteHeader />
        <main className={`dashboard-shell ${hubStyles.wide}`} lang={htmlLang}>
          <p className={styles.notice} data-tone="bad" role="alert">
            {t("evstudio.unavailable")}
          </p>
        </main>
        <SiteFooter />
      </>
    );
  }

  const canEdit = !isDemo;
  const uploadsEnabled = isMediaStorageConfigured();
  const now = new Date();
  const events = result.events;
  const byId = new Map(events.map((event) => [event.id, event]));
  const groups = groupEvents(events, now);
  const counts = countEvents(events, now);
  const seriesCounts = upcomingSeriesCounts(events, now);
  const requested = (await searchParams).outcome ?? "";
  // Own keys only: `?outcome=constructor` must not find an inherited member.
  const tone = Object.hasOwn(outcomeTones, requested)
    ? outcomeTones[requested]
    : undefined;
  const lang = authoredTextLang || undefined;

  return (
    <>
      <SiteHeader />
      <main className={`dashboard-shell ${hubStyles.wide}`} lang={htmlLang}>
        <nav className="business-breadcrumb" aria-label={t("dash.breadcrumb")}>
          <Link href={`/dashboard/business/${id}` as Route}>
            <span aria-hidden="true">← </span>
            {t("evstudio.back")}
          </Link>
        </nav>
        <header className={hubStyles.header}>
          <div>
            <p className="eyebrow">{t("evstudio.eyebrow")}</p>
            <h1>{t("evstudio.title")}</h1>
            <p className="lead">
              <span lang={lang}>{summary.tradingName}</span>
              {" · "}
              {t("evstudio.lead")}
            </p>
          </div>
        </header>
        <DashboardTabs
          businessId={id}
          current="events"
          canDesign={tabAccess.canDesign}
          canOperate={tabAccess.canOperate}
          canContent={tabAccess.canContent}
        />

        {tone ? (
          <p
            className={styles.notice}
            data-tone={tone}
            role={tone === "bad" ? "alert" : "status"}
          >
            {t(`evstudio.outcome.${requested}` as MessageKey)}
          </p>
        ) : null}
        {isDemo ? (
          <p className={styles.notice} role="status">
            {t("evstudio.demo")}
          </p>
        ) : null}
        {result.takenDown > 0 ? (
          <p className={styles.notice} role="status">
            {t("evstudio.takenDown", { count: result.takenDown })}
          </p>
        ) : null}

        <ul className={styles.summary} aria-label={t("evstudio.summary.aria")}>
          {eventStates.map((state) => (
            <li key={state} className={styles.summaryItem} data-state={state}>
              <strong>{counts[state]}</strong>
              <span>{t(`evstudio.summary.${state}` as MessageKey)}</span>
            </li>
          ))}
        </ul>

        {canEdit ? (
          <details className={styles.panel} open={events.length === 0}>
            <summary className="button primary">
              {t("evstudio.new.summary")}
            </summary>
            <div className={styles.moreBody}>
              <EventEditor
                key={`new:${requested}`}
                businessId={id}
                idPrefix="new-event"
                canEdit
                allowRepeat
                initial={{
                  title: "",
                  description: "",
                  locationDisplay: "",
                  bookingUrl: "",
                  startsAt: "",
                  endsAt: "",
                  status: "draft",
                  repeatFrequency: "never",
                  repeatOccurrences: "4",
                  applyToSeries: "",
                }}
                imageUrl={null}
                imageAlt=""
                submitLabel={t("evstudio.form.create")}
                statusOptions={["draft", "active"]}
                picture={
                  <ContentImageFields
                    idPrefix="new-event"
                    image={null}
                    canEdit
                    uploadsEnabled={uploadsEnabled}
                    noun="event"
                  />
                }
              />
            </div>
          </details>
        ) : null}

        {events.length === 0 ? (
          <section className={styles.empty} aria-labelledby="events-empty">
            <h2 id="events-empty">{t("evstudio.empty.title")}</h2>
            <p>{t("evstudio.empty.body")}</p>
          </section>
        ) : null}

        {eventStates.map((state) => {
          const all = groups[state];
          if (all.length === 0) return null;
          const shown =
            state === "past" ? all.slice(0, eventLimits.pastShown) : all;
          return (
            <section
              key={state}
              className={styles.group}
              aria-labelledby={`group-${state}`}
            >
              <header className={styles.groupHead}>
                <h2 id={`group-${state}`}>
                  {t(`evstudio.group.${state}` as MessageKey)} ({all.length})
                </h2>
                <p>{t(`evstudio.group.${state}Hint` as MessageKey)}</p>
              </header>
              <ul className={styles.list}>
                {shown.map((event) => (
                  <EventRow
                    key={event.id}
                    t={t}
                    locale={locale}
                    businessId={id}
                    event={byId.get(event.id)!}
                    now={now}
                    canEdit={canEdit}
                    uploadsEnabled={uploadsEnabled}
                    seriesUpcoming={
                      (event.seriesId && seriesCounts.get(event.seriesId)) || 0
                    }
                  />
                ))}
              </ul>
              {shown.length < all.length ? (
                <p className={styles.hint}>
                  {t("evstudio.group.pastMore", {
                    shown: shown.length,
                    count: all.length,
                  })}
                </p>
              ) : null}
            </section>
          );
        })}
      </main>
      <SiteFooter />
    </>
  );
}
