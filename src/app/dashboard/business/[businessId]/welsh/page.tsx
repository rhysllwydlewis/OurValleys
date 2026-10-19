import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { authoredTextLang } from "@/lib/i18n/business-copy";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { isPublicDemoEmail } from "@/lib/public-demo-policy";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import { readOnboardingDraftForUser } from "@/modules/businesses/onboarding-draft-access";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import {
  welshCoverage,
  type WelshCoverage,
} from "@/modules/businesses/translation-model";
import {
  readEnglishBusinessText,
  readWelshContent,
} from "@/modules/businesses/translations";
import { DashboardTabs } from "../_hub/dashboard-tabs";
import hubStyles from "../_hub/hub.module.css";
import { readDashboardTabAccess } from "../_hub/tab-access";
import { WelshEditor } from "./welsh-editor";
import styles from "./welsh.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("welsh.metaTitle"),
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

function coverageLine(
  coverage: WelshCoverage,
  t: Awaited<ReturnType<typeof getTranslator>>["t"],
): string {
  if (coverage.total === 0) return t("welsh.coverage.empty");
  if (coverage.state === "none") return t("welsh.coverage.none");
  if (coverage.state === "complete") return t("welsh.coverage.complete");
  return t("welsh.coverage.partial", {
    done: coverage.done,
    total: coverage.total,
  });
}

export default async function BusinessWelshPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { locale, t } = await getTranslator();
  const htmlLang = LOCALE_DETAILS[locale].htmlLang;
  const session = await readSession();
  if (!session) redirect("/login?next=/account");

  const { businessId } = await params;
  const parsedBusinessId = z.uuid().safeParse(businessId);
  if (!parsedBusinessId.success) notFound();
  const id = parsedBusinessId.data;

  const canView = await canUserAccessBusiness({
    userId: session.user.id,
    businessId: id,
    permission: businessPermissions.view,
  });
  if (!canView) notFound();

  const isDemo = isPublicDemoEmail(session.user.email);
  const [canEditProfile, tabAccess, memberships, englishRow, draftResult] =
    await Promise.all([
      canUserAccessBusiness({
        userId: session.user.id,
        businessId: id,
        permission: businessPermissions.editProfile,
      }),
      readDashboardTabAccess({
        userId: session.user.id,
        businessId: id,
        isPublicDemo: isDemo,
      }),
      listAccessibleBusinesses(session.user.id).catch(() => []),
      readEnglishBusinessText(id).catch(() => undefined),
      readOnboardingDraftForUser({ userId: session.user.id, businessId: id }),
    ]);
  const summary = memberships.find((item) => item.id === id);
  if (!summary || englishRow === null) notFound();

  const content = englishRow
    ? await readWelshContent(id).catch(() => null)
    : null;
  if (!content || !englishRow) {
    return (
      <>
        <SiteHeader />
        <main className={`dashboard-shell ${hubStyles.wide}`} lang={htmlLang}>
          <p className={styles.notice} data-tone="bad" role="alert">
            {t("welsh.unavailable")}
          </p>
        </main>
        <SiteFooter />
      </>
    );
  }

  const canEdit = canEditProfile && !isDemo;
  const draft = draftResult.status === "ready" ? draftResult.draft : null;
  // A published page shows the canonical summary, so that is what the Welsh
  // sits beside; pending draft edits only stand in before first publication.
  const published = englishRow.status === "published";
  const english = {
    summary: published
      ? englishRow.summary
      : (draft?.profile?.summary ?? englishRow.summary),
    description: englishRow.description,
  };
  const coverage = welshCoverage(
    {
      ...english,
      services: content.services,
      offers: content.offers,
      events: content.events,
      menuGroups: content.menuGroups,
      menuItems: content.menuGroups.flatMap((group) => group.items),
    },
    content.translation,
  );

  return (
    <>
      <SiteHeader />
      <main className={`dashboard-shell ${hubStyles.wide}`} lang={htmlLang}>
        <nav className="business-breadcrumb" aria-label={t("dash.breadcrumb")}>
          <Link href={`/dashboard/business/${id}` as Route}>
            <span aria-hidden="true">← </span>
            {t("welsh.back")}
          </Link>
        </nav>
        <header className={hubStyles.header}>
          <div>
            <p className="eyebrow">{t("welsh.eyebrow")}</p>
            <h1>{t("welsh.title")}</h1>
            <p className="lead">
              <span lang={authoredTextLang}>{summary.tradingName}</span>
              {" · "}
              {t("welsh.lead")}
            </p>
          </div>
        </header>
        <DashboardTabs
          businessId={id}
          current="welsh"
          canDesign={tabAccess.canDesign}
          canOperate={tabAccess.canOperate}
        />

        {isDemo ? (
          <p className={styles.notice} role="status">
            {t("welsh.demo")}
          </p>
        ) : null}

        <div className={styles.layout}>
          <WelshEditor
            businessId={id}
            canEdit={canEdit}
            english={english}
            welsh={{
              summary: content.translation.summary ?? "",
              description: content.translation.description ?? "",
            }}
            services={content.services.map((item) => ({
              ...item,
              welshName: content.translation.services[item.id]?.name ?? "",
              welshDescription:
                content.translation.services[item.id]?.description ?? "",
            }))}
            events={content.events.map((item) => ({
              ...item,
              startsAt: item.startsAt.toISOString(),
              welshTitle: content.translation.events[item.id]?.title ?? "",
              welshDescription:
                content.translation.events[item.id]?.description ?? "",
            }))}
            menuGroups={content.menuGroups.map((group) => ({
              ...group,
              welshName: content.translation.menuGroups[group.id]?.name ?? "",
              welshDescription:
                content.translation.menuGroups[group.id]?.description ?? "",
              items: group.items.map((item) => ({
                ...item,
                welshName: content.translation.menuItems[item.id]?.name ?? "",
                welshDescription:
                  content.translation.menuItems[item.id]?.description ?? "",
              })),
            }))}
            offers={content.offers.map((item) => ({
              ...item,
              welshTitle: content.translation.offers[item.id]?.title ?? "",
              welshDescription:
                content.translation.offers[item.id]?.description ?? "",
              welshTerms: content.translation.offers[item.id]?.terms ?? "",
              welshActionLabel:
                content.translation.offers[item.id]?.actionLabel ?? "",
            }))}
          />
          <aside
            className={styles.aside}
            aria-label={t("welsh.coverage.title")}
          >
            <section className={styles.card}>
              <h2>{t("welsh.coverage.title")}</h2>
              <p className={styles.progressText}>{coverageLine(coverage, t)}</p>
              {coverage.total > 0 ? (
                <div
                  className={styles.progressTrack}
                  role="img"
                  aria-label={t("welsh.coverage.aria", {
                    percent: coverage.percent,
                  })}
                >
                  <div
                    className={styles.progressFill}
                    style={{ width: `${coverage.percent}%` }}
                  />
                </div>
              ) : null}
              <ul className={styles.checklist}>
                {coverage.items.map((item) => (
                  <li key={item.key}>
                    <a href={`#field-${item.key}`}>
                      <span
                        className={styles.mark}
                        data-done={item.done ? "true" : "false"}
                        aria-hidden="true"
                      >
                        {item.done ? "✓" : ""}
                      </span>
                      <span className={styles.markText}>
                        {item.label !== "summary" &&
                        item.label !== "description"
                          ? t(`welsh.coverage.item.${item.label}`, {
                              name: item.serviceName ?? "",
                            })
                          : t(`welsh.coverage.item.${item.label}`)}
                      </span>
                      <span className={styles.state}>
                        {item.done
                          ? t("welsh.coverage.done")
                          : t("welsh.coverage.todo")}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
            <section className={styles.card}>
              <h2>{t("welsh.preview.title")}</h2>
              <p className={styles.hint}>
                {published
                  ? t("welsh.preview.body")
                  : t("welsh.preview.unpublished")}
              </p>
              {published ? (
                <Link
                  className="button"
                  href={`/b/${englishRow.slug}` as Route}
                >
                  {t("welsh.preview.open")}
                </Link>
              ) : null}
            </section>
            <section className={styles.card}>
              <h2>{t("welsh.tip.title")}</h2>
              <ul className={styles.tips}>
                <li>{t("welsh.tip.one")}</li>
                <li>{t("welsh.tip.two")}</li>
                <li>{t("welsh.tip.three")}</li>
              </ul>
            </section>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
