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
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import { listOwnerCorrections } from "@/modules/businesses/corrections";
import {
  OWNER_CORRECTION_NOTE_MAX,
  ownerCorrectionActions,
} from "@/modules/businesses/corrections-model";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { DashboardTabs } from "../_hub/dashboard-tabs";
import hubStyles from "../_hub/hub.module.css";
import { readDashboardTabAccess } from "../_hub/tab-access";
import { decideCorrectionAction } from "./actions";
import styles from "./corrections.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("corr.metaTitle"),
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
  applied: "ok",
  handled: "ok",
  declined: "ok",
  escalated: "ok",
  forbidden: "bad",
  invalid: "bad",
  gone: "bad",
  note_too_long: "bad",
  nothing_to_apply: "bad",
  unavailable: "bad",
};

function formatWhen(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "medium",
    timeZone: "Europe/London",
  }).format(value);
}

function reasonLabel(t: Translator, reason: string): string {
  const key = `report.reason.${reason}`;
  return t(
    (reason === "incorrect_details" ||
    reason === "closed_or_moved" ||
    reason === "other"
      ? key
      : "report.reason.other") as MessageKey,
  );
}

export default async function OwnerCorrectionsPage({
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

  // Suggestions can propose changes to the public page, so reading and
  // deciding them needs the profile permission, not just membership.
  const canEditProfile = await canUserAccessBusiness({
    userId: session.user.id,
    businessId: id,
    permission: businessPermissions.editProfile,
  });
  if (!canEditProfile) notFound();

  const isDemo = isPublicDemoEmail(session.user.email);
  const [tabAccess, memberships, result] = await Promise.all([
    readDashboardTabAccess({
      userId: session.user.id,
      businessId: id,
      isPublicDemo: isDemo,
    }),
    listAccessibleBusinesses(session.user.id).catch(() => []),
    listOwnerCorrections(id),
  ]);
  const summary = memberships.find((item) => item.id === id);
  if (!summary) notFound();

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
            {t("corr.back")}
          </Link>
        </nav>
        <header className={hubStyles.header}>
          <div>
            <p className="eyebrow">{t("corr.eyebrow")}</p>
            <h1>{t("corr.title")}</h1>
            <p className="lead">
              <span lang={lang}>{summary.tradingName}</span>
              {" · "}
              {t("corr.lead")}
            </p>
          </div>
        </header>
        <DashboardTabs
          businessId={id}
          current="corrections"
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
            {t(`corr.outcome.${requested}` as MessageKey)}
          </p>
        ) : null}
        {isDemo ? (
          <p className={styles.notice} role="status">
            {t("corr.demo")}
          </p>
        ) : null}

        {result.state === "unavailable" ? (
          <p className={styles.notice} data-tone="bad" role="alert">
            {t("corr.unavailable")}
          </p>
        ) : (
          <>
            <p className={styles.intro}>{t("corr.intro")}</p>

            {result.open.length === 0 ? (
              <section className={styles.empty} aria-labelledby="corr-empty">
                <h2 id="corr-empty">{t("corr.empty.title")}</h2>
                <p>{t("corr.empty.body")}</p>
              </section>
            ) : (
              <section aria-labelledby="corr-open">
                <h2 id="corr-open">
                  {t("corr.open.heading", { count: result.open.length })}
                </h2>
                <ul className={styles.list}>
                  {result.open.map((item) => {
                    const withTeam = item.state === "with_team";
                    const actions = ownerCorrectionActions({
                      hasChanges: Object.keys(item.changes).length > 0,
                    });
                    return (
                      <li
                        key={item.id}
                        id={`correction-${item.id}`}
                        className={styles.card}
                        data-state={item.state}
                      >
                        <div className={styles.cardHead}>
                          <h3>{reasonLabel(t, item.reportReason)}</h3>
                          <span className={styles.when}>
                            {t("corr.sent", {
                              date: formatWhen(item.createdAt, locale),
                            })}
                          </span>
                        </div>
                        {withTeam ? (
                          <p>
                            <span className={styles.chip}>
                              {t("corr.withTeam")}
                            </span>{" "}
                            {t("corr.withTeamBody")}
                          </p>
                        ) : null}
                        <p className={styles.details}>
                          <span className="sr-only">
                            {t("corr.detailsLabel")}:{" "}
                          </span>
                          {item.details}
                        </p>
                        {item.fields.length > 0 ||
                        item.notes.hours ||
                        item.notes.address ? (
                          <dl className={styles.compare}>
                            {item.fields.map((field) => (
                              <div key={field.key} className={styles.field}>
                                <dt>
                                  {t(`corr.field.${field.key}` as MessageKey)}
                                </dt>
                                <dd>
                                  <span className="sr-only">
                                    {t("corr.suggested")}:{" "}
                                  </span>
                                  <strong lang={lang}>
                                    {field.proposed ?? t("corr.removed")}
                                  </strong>
                                </dd>
                                <dd
                                  className={
                                    field.differs ? styles.now : styles.same
                                  }
                                >
                                  {field.differs ? (
                                    <>
                                      {t("corr.today")}:{" "}
                                      <span lang={lang}>
                                        {field.current || t("corr.empty.value")}
                                      </span>
                                    </>
                                  ) : (
                                    t("corr.alreadyMatches")
                                  )}
                                </dd>
                              </div>
                            ))}
                            {item.notes.hours ? (
                              <div className={styles.field}>
                                <dt>{t("corr.note.hours")}</dt>
                                <dd lang={lang}>{item.notes.hours}</dd>
                              </div>
                            ) : null}
                            {item.notes.address ? (
                              <div className={styles.field}>
                                <dt>{t("corr.note.address")}</dt>
                                <dd lang={lang}>{item.notes.address}</dd>
                              </div>
                            ) : null}
                          </dl>
                        ) : null}
                        {item.notes.hours || item.notes.address ? (
                          <p className="field-help">{t("corr.notesHelp")}</p>
                        ) : null}

                        {isDemo || withTeam ? null : (
                          <form
                            action={decideCorrectionAction}
                            className={styles.decision}
                          >
                            <input type="hidden" name="businessId" value={id} />
                            <input
                              type="hidden"
                              name="ticketId"
                              value={item.id}
                            />
                            <div className="field">
                              <label htmlFor={`note-${item.id}`}>
                                {t("corr.noteLabel")}
                              </label>
                              <textarea
                                id={`note-${item.id}`}
                                name="note"
                                maxLength={OWNER_CORRECTION_NOTE_MAX}
                                placeholder={t("corr.notePlaceholder")}
                              />
                            </div>
                            <div className={styles.buttons}>
                              {actions.map((action) => (
                                <button
                                  key={action}
                                  type="submit"
                                  name="decision"
                                  value={action}
                                  className={
                                    action === "apply"
                                      ? "button primary"
                                      : "button secondary"
                                  }
                                >
                                  {t(`corr.act.${action}` as MessageKey)}
                                </button>
                              ))}
                            </div>
                            <p className="field-help">
                              {t(
                                (actions.includes("apply")
                                  ? "corr.help.withChanges"
                                  : "corr.help.notesOnly") as MessageKey,
                              )}
                            </p>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {result.recent.length > 0 ? (
              <section aria-labelledby="corr-recent">
                <h2 id="corr-recent">{t("corr.recent.heading")}</h2>
                <ul className={styles.recent}>
                  {result.recent.map((item) => (
                    <li key={item.id} className={styles.recentItem}>
                      <span className={styles.chip}>
                        {t(`corr.state.${item.state}` as MessageKey)}
                      </span>
                      <span>{reasonLabel(t, item.reportReason)}</span>
                      <span className={styles.when}>
                        {formatWhen(item.resolvedAt ?? item.createdAt, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
