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
import { isPublicDemoEmail } from "@/lib/public-demo-policy";
import {
  deletionRecoveryDays,
  type LifecycleView,
} from "@/modules/businesses/lifecycle-automation";
import { readListingFacts } from "@/modules/businesses/listing-health";
import {
  availableActions,
  headlineTones,
  listingHeadline,
  listingTimeline,
  londonDateInput,
  maxClosureDays,
  type TimelineItem,
} from "@/modules/businesses/listing-health-model";
import {
  businessPermissions,
  canUserAccessBusiness,
  getUserBusinessRole,
} from "@/modules/businesses/permissions";
import { DashboardTabs } from "../_hub/dashboard-tabs";
import hubStyles from "../_hub/hub.module.css";
import { readDashboardTabAccess } from "../_hub/tab-access";
import {
  acceptListingTermsAction,
  listingAction,
  postponeListingAction,
  reminderPreferencesAction,
} from "./actions";
import styles from "./listing.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("listing.metaTitle"),
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
  confirmed: "ok",
  paused: "ok",
  resumed: "ok",
  closed_temporarily: "ok",
  closed_permanently: "ok",
  deletion_requested: "ok",
  deletion_cancelled: "ok",
  preferences_saved: "ok",
  terms_accepted: "ok",
  postponed: "ok",
  forbidden: "bad",
  not_found: "bad",
  invalid: "bad",
  unavailable: "bad",
  date_required: "bad",
  date_invalid: "bad",
  date_past: "bad",
  date_too_far: "bad",
  name_mismatch: "bad",
};

function formatDate(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "long",
    timeZone: "Europe/London",
  }).format(value);
}

function describeWhen(t: Translator, item: TimelineItem, locale: Locale) {
  if (item.days < 0 && item.urgency === "overdue") {
    return t("listing.when.overdue", { date: formatDate(item.date, locale) });
  }
  const date = formatDate(item.date, locale);
  if (item.days === 0) return `${t("listing.when.today")} (${date})`;
  if (item.days === 1) return `${t("listing.when.tomorrow")} (${date})`;
  if (item.days > 1 && item.days <= 60) {
    return `${t("listing.when.inDays", { days: item.days })} (${date})`;
  }
  return date;
}

export default async function ListingHealthPage({
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

  const userId = session.user.id;
  const canView = await canUserAccessBusiness({
    userId,
    businessId: id,
    permission: businessPermissions.view,
  });
  if (!canView) notFound();

  const isDemo = isPublicDemoEmail(session.user.email);
  const [tabAccess, canLifecycle, canPublish, role, facts] = await Promise.all([
    readDashboardTabAccess({ userId, businessId: id, isPublicDemo: isDemo }),
    canUserAccessBusiness({
      userId,
      businessId: id,
      permission: businessPermissions.manageLifecycle,
    }),
    canUserAccessBusiness({
      userId,
      businessId: id,
      permission: businessPermissions.publish,
    }),
    getUserBusinessRole({ userId, businessId: id }),
    readListingFacts(id),
  ]);

  const requested = (await searchParams).outcome ?? "";
  // Own keys only: `?outcome=constructor` must not find an inherited member.
  const tone = Object.hasOwn(outcomeTones, requested)
    ? outcomeTones[requested]
    : undefined;
  const lang = authoredTextLang || undefined;
  const now = new Date();

  const editable = !isDemo;
  const lifecycle = facts?.lifecycle;
  const headline = lifecycle
    ? listingHeadline(lifecycle.state, facts.publicationStatus)
    : null;
  const actions =
    lifecycle && editable
      ? availableActions({
          state: lifecycle.state,
          canLifecycle,
          isOwner: role === "owner",
        })
      : [];
  const timeline =
    lifecycle && facts
      ? listingTimeline({
          lifecycle,
          publicationStatus: facts.publicationStatus,
          now,
        })
      : [];
  const today = londonDateInput(now);
  const lastDay = londonDateInput(
    new Date(now.getTime() + maxClosureDays * 86_400_000),
  );
  const lastPostponeDay = londonDateInput(
    new Date(now.getTime() + 90 * 86_400_000),
  );

  return (
    <>
      <SiteHeader />
      <main className={`dashboard-shell ${hubStyles.wide}`} lang={htmlLang}>
        <nav className="business-breadcrumb" aria-label={t("dash.breadcrumb")}>
          <Link href={`/dashboard/business/${id}` as Route}>
            <span aria-hidden="true">← </span>
            {t("listing.back")}
          </Link>
        </nav>
        <header className={hubStyles.header}>
          <div>
            <p className="eyebrow">{t("listing.eyebrow")}</p>
            <h1>{t("listing.title")}</h1>
            <p className="lead">
              {facts ? (
                <>
                  <span lang={lang}>{facts.tradingName}</span>
                  {" · "}
                </>
              ) : null}
              {t("listing.lead")}
            </p>
          </div>
        </header>
        <DashboardTabs
          businessId={id}
          current="listing"
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
            {t(`listing.outcome.${requested}` as MessageKey)}
          </p>
        ) : null}
        {isDemo ? (
          <p className={styles.notice} role="status">
            {t("listing.demo")}
          </p>
        ) : !canLifecycle && !canPublish ? (
          <p className={styles.notice} role="status">
            {t("listing.readOnly")}
          </p>
        ) : null}

        {!facts || !lifecycle || !headline ? (
          <p className={styles.notice} data-tone="bad" role="alert">
            {t("listing.unavailable")}
          </p>
        ) : (
          <>
            <section
              className={styles.hero}
              data-tone={headlineTones[headline]}
              aria-labelledby="listing-status"
            >
              <p className={styles.statusLabel}>{t("listing.status")}</p>
              <h2 id="listing-status">
                {t(`listing.head.${headline}.title` as MessageKey)}
              </h2>
              <p>{t(`listing.head.${headline}.body` as MessageKey)}</p>
            </section>

            <section className={styles.panel} aria-labelledby="listing-next">
              <h2 id="listing-next">{t("listing.next.heading")}</h2>
              {timeline.length === 0 ? (
                <p className={styles.muted}>{t("listing.next.empty")}</p>
              ) : (
                <ol className={styles.timeline}>
                  {timeline.map((item) => (
                    <li
                      key={item.code}
                      className={styles.timelineItem}
                      data-urgency={item.urgency}
                    >
                      <span className={styles.timelineWhat}>
                        {t(`listing.tl.${item.code}` as MessageKey)}
                      </span>
                      <span className={styles.timelineWhen}>
                        {item.urgency !== "calm" ? (
                          <strong className={styles.urgency}>
                            {t(`listing.urgency.${item.urgency}` as MessageKey)}
                            {": "}
                          </strong>
                        ) : null}
                        {describeWhen(t, item, locale)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <div className={styles.grid}>
              {actions.includes("confirm") ? (
                <ConfirmCard
                  t={t}
                  businessId={id}
                  lifecycle={lifecycle}
                  locale={locale}
                />
              ) : lifecycle.state !== "active" ? (
                <section className={styles.card}>
                  <h2>{t("listing.confirm.title")}</h2>
                  <p className={styles.muted}>
                    {t("listing.confirm.unavailable")}
                  </p>
                </section>
              ) : null}

              {actions.some((action) =>
                ["pause", "resume", "temporary_close"].includes(action),
              ) ? (
                <section className={styles.card} aria-labelledby="listing-vis">
                  <h2 id="listing-vis">{t("listing.visibility.title")}</h2>
                  {actions.includes("pause") ? (
                    <form action={listingAction} className={styles.block}>
                      <input type="hidden" name="businessId" value={id} />
                      <input type="hidden" name="action" value="pause" />
                      <h3>{t("listing.pause.heading")}</h3>
                      <p>{t("listing.pause.body")}</p>
                      <button type="submit" className="button secondary">
                        {t("listing.pause.button")}
                      </button>
                    </form>
                  ) : null}
                  {actions.includes("resume") ? (
                    <form action={listingAction} className={styles.block}>
                      <input type="hidden" name="businessId" value={id} />
                      <input type="hidden" name="action" value="resume" />
                      <h3>{t("listing.resume.heading")}</h3>
                      <p>{t("listing.resume.body")}</p>
                      <button type="submit" className="button primary">
                        {t("listing.resume.button")}
                      </button>
                    </form>
                  ) : null}
                  {actions.includes("temporary_close") ? (
                    <form action={listingAction} className={styles.block}>
                      <input type="hidden" name="businessId" value={id} />
                      <input
                        type="hidden"
                        name="action"
                        value="temporary_close"
                      />
                      <h3>{t("listing.close.heading")}</h3>
                      <p>{t("listing.close.body")}</p>
                      <div className="field">
                        <label htmlFor="closure-date">
                          {t("listing.close.until")}
                        </label>
                        <input
                          id="closure-date"
                          name="closureDate"
                          type="date"
                          min={today}
                          max={lastDay}
                          required
                          aria-describedby="closure-help"
                        />
                        <p id="closure-help" className="field-help">
                          {t("listing.close.help")}
                        </p>
                      </div>
                      <button type="submit" className="button secondary">
                        {t("listing.close.button")}
                      </button>
                    </form>
                  ) : null}
                </section>
              ) : null}

              {canPublish && editable ? (
                <section className={styles.card} aria-labelledby="listing-rem">
                  <h2 id="listing-rem">{t("listing.reminders.title")}</h2>
                  <p className={styles.muted}>{t("listing.reminders.body")}</p>
                  <form
                    action={reminderPreferencesAction}
                    className={styles.block}
                  >
                    <input type="hidden" name="businessId" value={id} />
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        name="lifecycleEmails"
                        defaultChecked={lifecycle.lifecycleEmailsEnabled}
                      />
                      <span>{t("listing.reminders.emails")}</span>
                    </label>
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        name="weeklyDigest"
                        defaultChecked={Boolean(lifecycle.weeklyDigestEnabled)}
                      />
                      <span>{t("listing.reminders.digest")}</span>
                    </label>
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        name="autoPublish"
                        defaultChecked={lifecycle.autoPublishEnabled}
                        aria-describedby="auto-help"
                      />
                      <span>{t("listing.reminders.auto")}</span>
                    </label>
                    <p id="auto-help" className="field-help">
                      {t("listing.reminders.autoHelp")}
                    </p>
                    <button type="submit" className="button primary">
                      {t("listing.reminders.save")}
                    </button>
                  </form>

                  <div className={styles.block}>
                    <h3>{t("listing.terms.title")}</h3>
                    {lifecycle.termsAccepted ? (
                      <p>{t("listing.terms.accepted")}</p>
                    ) : (
                      <form action={acceptListingTermsAction}>
                        <input type="hidden" name="businessId" value={id} />
                        <p>{t("listing.terms.needed")}</p>
                        <label className={styles.check}>
                          <input type="checkbox" name="acceptTerms" required />
                          <span>{t("listing.terms.label")}</span>
                        </label>
                        <button type="submit" className="button secondary">
                          {t("listing.terms.button")}
                        </button>
                      </form>
                    )}
                  </div>

                  {lifecycle.autoPublishEnabled &&
                  lifecycle.state === "active" &&
                  facts.publicationStatus !== "published" ? (
                    <form
                      action={postponeListingAction}
                      className={styles.block}
                    >
                      <input type="hidden" name="businessId" value={id} />
                      <div className="field">
                        <label htmlFor="postpone-date">
                          {t("listing.postpone.label")}
                        </label>
                        <input
                          id="postpone-date"
                          name="postponeDate"
                          type="date"
                          min={today}
                          max={lastPostponeDay}
                          required
                          aria-describedby="postpone-help"
                        />
                        <p id="postpone-help" className="field-help">
                          {t("listing.postpone.help")}
                        </p>
                      </div>
                      <button type="submit" className="button secondary">
                        {t("listing.postpone.button")}
                      </button>
                    </form>
                  ) : null}
                </section>
              ) : null}

              {editable &&
              canLifecycle &&
              role !== "owner" &&
              lifecycle.state !== "deletion_pending" ? (
                <section className={styles.card}>
                  <p className={styles.muted}>
                    {t("listing.danger.ownerOnly")}
                  </p>
                </section>
              ) : null}

              {actions.some((action) =>
                [
                  "permanent_close",
                  "request_deletion",
                  "cancel_deletion",
                ].includes(action),
              ) ? (
                <section
                  className={`${styles.card} ${styles.danger}`}
                  aria-labelledby="listing-danger"
                >
                  <h2 id="listing-danger">{t("listing.danger.title")}</h2>
                  {actions.includes("cancel_deletion") ? (
                    <form action={listingAction} className={styles.block}>
                      <input type="hidden" name="businessId" value={id} />
                      <input
                        type="hidden"
                        name="action"
                        value="cancel_deletion"
                      />
                      <h3>{t("listing.cancelDelete.heading")}</h3>
                      <p>
                        {t("listing.cancelDelete.body", {
                          date: lifecycle.deleteAfter
                            ? formatDate(lifecycle.deleteAfter, locale)
                            : "",
                        })}
                      </p>
                      <button type="submit" className="button primary">
                        {t("listing.cancelDelete.button")}
                      </button>
                    </form>
                  ) : (
                    <>
                      <p>{t("listing.danger.body")}</p>
                      {actions.includes("permanent_close") ? (
                        <GuardedForm
                          t={t}
                          businessId={id}
                          action="permanent_close"
                          fieldId="confirm-close"
                          name={facts.tradingName}
                          lang={lang}
                          heading={t("listing.permanent.heading")}
                          body={t("listing.permanent.body")}
                          button={t("listing.permanent.button")}
                        />
                      ) : null}
                      {actions.includes("request_deletion") ? (
                        <GuardedForm
                          t={t}
                          businessId={id}
                          action="request_deletion"
                          fieldId="confirm-delete"
                          name={facts.tradingName}
                          lang={lang}
                          heading={t("listing.delete.heading")}
                          body={t("listing.delete.body", {
                            days: deletionRecoveryDays,
                          })}
                          button={t("listing.delete.button")}
                        />
                      ) : null}
                    </>
                  )}
                </section>
              ) : null}
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function ConfirmCard({
  t,
  businessId,
  lifecycle,
  locale,
}: {
  t: Translator;
  businessId: string;
  lifecycle: LifecycleView;
  locale: Locale;
}) {
  return (
    <section className={styles.card} aria-labelledby="listing-confirm">
      <h2 id="listing-confirm">{t("listing.confirm.title")}</h2>
      <p>{t("listing.confirm.body")}</p>
      <div className={styles.facts}>
        <p>
          {lifecycle.lastConfirmedAt
            ? t("listing.confirm.last", {
                date: formatDate(lifecycle.lastConfirmedAt, locale),
              })
            : t("listing.confirm.never")}
        </p>
        {lifecycle.nextConfirmationDueAt ? (
          <p>
            {t("listing.confirm.next", {
              date: formatDate(lifecycle.nextConfirmationDueAt, locale),
            })}
          </p>
        ) : null}
      </div>
      <form action={listingAction}>
        <input type="hidden" name="businessId" value={businessId} />
        <input type="hidden" name="action" value="confirm" />
        <button type="submit" className="button primary">
          {t("listing.confirm.button")}
        </button>
      </form>
    </section>
  );
}

function GuardedForm({
  t,
  businessId,
  action,
  fieldId,
  name,
  lang,
  heading,
  body,
  button,
}: {
  t: Translator;
  businessId: string;
  action: "permanent_close" | "request_deletion";
  fieldId: string;
  name: string;
  lang: string | undefined;
  heading: string;
  body: string;
  button: string;
}) {
  return (
    <form action={listingAction} className={styles.block}>
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="action" value={action} />
      <h3>{heading}</h3>
      <p>{body}</p>
      <div className="field">
        <label htmlFor={fieldId}>
          {t("listing.danger.nameLabel", { name })}
        </label>
        <input
          id={fieldId}
          name="confirmName"
          type="text"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          lang={lang}
          required
        />
      </div>
      <button type="submit" className={`button ${styles.dangerButton}`}>
        {button}
      </button>
    </form>
  );
}
