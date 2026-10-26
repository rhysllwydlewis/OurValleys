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
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { listStudioUpdates } from "@/modules/businesses/updates";
import {
  groupUpdates,
  updateExcerpt,
  updateGuidance,
  type StudioUpdate,
} from "@/modules/businesses/updates-model";
import { DashboardTabs } from "../_hub/dashboard-tabs";
import hubStyles from "../_hub/hub.module.css";
import { readDashboardTabAccess } from "../_hub/tab-access";
import { removeUpdateAction, updateStateAction } from "./actions";
import { UpdateEditor } from "./update-editor";
import styles from "./updates.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("upd.metaTitle"),
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
  draftSaved: "ok",
  saved: "ok",
  published: "ok",
  unpublished: "ok",
  removed: "ok",
  unchanged: "ok",
  forbidden: "bad",
  invalid: "bad",
  not_found: "bad",
  rate: "bad",
  limit: "bad",
  unavailable: "bad",
};

function formatWhen(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

function StateForm({
  t,
  businessId,
  update,
  to,
}: {
  t: Translator;
  businessId: string;
  update: StudioUpdate;
  to: "published" | "draft";
}) {
  const label = t(to === "published" ? "upd.act.publish" : "upd.act.unpublish");
  return (
    <form action={updateStateAction}>
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="updateId" value={update.id} />
      <input type="hidden" name="to" value={to} />
      <button
        className={to === "published" ? "button primary" : "button"}
        type="submit"
        aria-label={t("upd.act.named", { action: label, title: update.title })}
      >
        {label}
      </button>
    </form>
  );
}

function UpdateRow({
  t,
  locale,
  businessId,
  businessSlug,
  update,
  canEdit,
}: {
  t: Translator;
  locale: Locale;
  businessId: string;
  businessSlug: string;
  update: StudioUpdate;
  canEdit: boolean;
}) {
  const lang = authoredTextLang || undefined;
  const published = update.status === "published";
  const guidance = canEdit ? updateGuidance(update) : [];
  return (
    <li className={styles.update} id={`update-${update.id}`}>
      <div>
        <h3 className={styles.updateTitle}>
          <span lang={lang}>{update.title}</span>
          <span className={styles.badge} data-state={update.status}>
            {t(published ? "upd.state.published" : "upd.state.draft")}
          </span>
          {update.titleCy && update.bodyCy ? (
            <span className={styles.badge}>{t("upd.badge.welsh")}</span>
          ) : null}
        </h3>
        <p className={styles.when}>
          {published && update.publishedAt
            ? t("upd.when.published", {
                date: formatWhen(update.publishedAt, locale),
              })
            : t("upd.when.edited", {
                date: formatWhen(update.updatedAt, locale),
              })}
        </p>
      </div>
      <p className={styles.excerpt} lang={lang}>
        {updateExcerpt(update.body, 220)}
      </p>
      {guidance.length > 0 ? (
        <ul className={styles.guidance}>
          {guidance.map((item) => (
            <li key={item.code}>{t(`upd.tip.${item.code}` as MessageKey)}</li>
          ))}
        </ul>
      ) : null}
      {canEdit ? (
        <div className={styles.actions}>
          {published ? (
            <>
              <Link
                className="button"
                href={`/b/${businessSlug}/updates#update-${update.id}` as Route}
              >
                {t("upd.act.view")}
              </Link>
              <StateForm
                t={t}
                businessId={businessId}
                update={update}
                to="draft"
              />
            </>
          ) : (
            <StateForm
              t={t}
              businessId={businessId}
              update={update}
              to="published"
            />
          )}
          <details className={styles.removeBox}>
            <summary className="button">{t("upd.act.remove")}</summary>
            <form className={styles.removeBody} action={removeUpdateAction}>
              <input type="hidden" name="businessId" value={businessId} />
              <input type="hidden" name="updateId" value={update.id} />
              <p>{t("upd.remove.warning")}</p>
              <button className={`button ${styles.danger}`} type="submit">
                {t("upd.remove.confirm")}
              </button>
            </form>
          </details>
        </div>
      ) : null}
      <details className={styles.more}>
        <summary className="button">
          {canEdit ? t("upd.act.edit") : t("upd.act.read")}
        </summary>
        <div className={styles.moreBody}>
          <UpdateEditor
            businessId={businessId}
            updateId={update.id}
            expectedUpdatedAt={update.updatedAt.getTime()}
            idPrefix={`edit-${update.id}`}
            published={published}
            canEdit={canEdit}
            initial={{
              title: update.title,
              body: update.body,
              titleCy: update.titleCy ?? "",
              bodyCy: update.bodyCy ?? "",
            }}
          />
        </div>
      </details>
    </li>
  );
}

export default async function BusinessUpdatesPage({
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

  // Drafts are private, so opening the studio needs the content permission
  // itself, not just membership.
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
    listStudioUpdates(id),
  ]);
  const summary = memberships.find((item) => item.id === id);
  if (!summary) notFound();

  if (result.status === "unavailable") {
    return (
      <>
        <SiteHeader />
        <main className={`dashboard-shell ${hubStyles.wide}`} lang={htmlLang}>
          <p className={styles.notice} data-tone="bad" role="alert">
            {t("upd.unavailable")}
          </p>
        </main>
        <SiteFooter />
      </>
    );
  }

  const canEdit = !isDemo;
  const updates = result.updates;
  const groups = groupUpdates(updates);
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
            {t("upd.back")}
          </Link>
        </nav>
        <header className={hubStyles.header}>
          <div>
            <p className="eyebrow">{t("upd.eyebrow")}</p>
            <h1>{t("upd.title")}</h1>
            <p className="lead">
              <span lang={lang}>{summary.tradingName}</span>
              {" · "}
              {t("upd.lead")}
            </p>
          </div>
        </header>
        <DashboardTabs
          businessId={id}
          current="updates"
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
            {t(`upd.outcome.${requested}` as MessageKey)}
          </p>
        ) : null}
        {isDemo ? (
          <p className={styles.notice} role="status">
            {t("upd.demo")}
          </p>
        ) : null}

        <ul className={styles.summary} aria-label={t("upd.summary.aria")}>
          <li className={styles.summaryItem}>
            <strong>{groups.published.length}</strong>
            <span>{t("upd.summary.published")}</span>
          </li>
          <li className={styles.summaryItem}>
            <strong>{groups.drafts.length}</strong>
            <span>{t("upd.summary.drafts")}</span>
          </li>
        </ul>

        {canEdit ? (
          <details className={styles.panel} open={updates.length === 0}>
            <summary className="button primary">{t("upd.new.summary")}</summary>
            <div className={styles.moreBody}>
              <UpdateEditor
                key={`new:${requested}`}
                businessId={id}
                idPrefix="new-update"
                published={false}
                canEdit
                initial={{ title: "", body: "", titleCy: "", bodyCy: "" }}
              />
            </div>
          </details>
        ) : null}

        {updates.length === 0 ? (
          <section className={styles.empty} aria-labelledby="updates-empty">
            <h2 id="updates-empty">{t("upd.empty.title")}</h2>
            <p>{t("upd.empty.body")}</p>
          </section>
        ) : null}

        {(["published", "drafts"] as const).map((key) =>
          groups[key].length === 0 ? null : (
            <section
              key={key}
              className={styles.group}
              aria-labelledby={`group-${key}`}
            >
              <header className={styles.groupHead}>
                <h2 id={`group-${key}`}>
                  {t(`upd.group.${key}` as MessageKey)} ({groups[key].length})
                </h2>
                <p>{t(`upd.group.${key}Hint` as MessageKey)}</p>
              </header>
              <ul className={styles.list}>
                {groups[key].map((update) => (
                  <UpdateRow
                    key={update.id}
                    t={t}
                    locale={locale}
                    businessId={id}
                    businessSlug={summary.slug}
                    update={update}
                    canEdit={canEdit}
                  />
                ))}
              </ul>
            </section>
          ),
        )}
      </main>
      <SiteFooter />
    </>
  );
}
