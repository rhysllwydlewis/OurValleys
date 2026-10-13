import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import {
  attributeCopy,
  authoredTextLang,
  memberRoleTag,
  weekdayLabel,
} from "@/lib/i18n/business-copy";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { isPublicDemoEmail } from "@/lib/public-demo-policy";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import {
  getBusinessAttributes,
  listDeclaredAttributes,
} from "@/modules/businesses/attributes";
import { calculateBusinessOnboardingProgress } from "@/modules/businesses/onboarding";
import { readOnboardingDraftForUser } from "@/modules/businesses/onboarding-draft-access";
import { deriveCompletedOnboardingSteps } from "@/modules/businesses/onboarding-draft";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { getBusinessLifecycleSummary } from "@/modules/businesses/publication";
import { listActivePlaces } from "@/modules/reference-data/places";
import { AttributesForm } from "../attributes-form";
import { ExceptionalHoursForm } from "../exceptional-hours-form";
import { OnboardingForms } from "../onboarding-forms";
import { DashboardTabs } from "../_hub/dashboard-tabs";
import styles from "../_hub/hub.module.css";

type ProfileParams = Promise<{ businessId: string }>;

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("hub.profile.title"),
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

function formatExceptionalDate(value: string, htmlLang: string): string {
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(htmlLang, {
    dateStyle: "long",
    timeZone: "Europe/London",
  }).format(date);
}

export default async function BusinessProfilePage({
  params,
}: {
  params: ProfileParams;
}) {
  const { locale, t } = await getTranslator();
  const htmlLang = LOCALE_DETAILS[locale].htmlLang;
  const session = await readSession();
  if (!session) redirect("/login?next=/account");

  const isPublicDemo = isPublicDemoEmail(session.user.email);
  const { businessId } = await params;
  const parsedBusinessId = z.uuid().safeParse(businessId);
  if (!parsedBusinessId.success) notFound();

  const authorised = await canUserAccessBusiness({
    userId: session.user.id,
    businessId: parsedBusinessId.data,
    permission: businessPermissions.view,
  });
  if (!authorised) notFound();

  const [canEdit, draftResult, memberships, places, lifecycle, attributes] =
    await Promise.all([
      canUserAccessBusiness({
        userId: session.user.id,
        businessId: parsedBusinessId.data,
        permission: businessPermissions.editProfile,
      }),
      readOnboardingDraftForUser({
        userId: session.user.id,
        businessId: parsedBusinessId.data,
      }),
      listAccessibleBusinesses(session.user.id).catch(() => []),
      listActivePlaces(),
      getBusinessLifecycleSummary(parsedBusinessId.data),
      getBusinessAttributes(parsedBusinessId.data),
    ]);

  const membership = memberships.find(
    (candidate) => candidate.id === parsedBusinessId.data,
  );
  const draft = draftResult.status === "ready" ? draftResult.draft : null;
  const completedSteps = [
    ...(draft ? deriveCompletedOnboardingSteps(draft) : []),
    ...(attributes ? ["attributes" as const] : []),
  ];
  const progress = calculateBusinessOnboardingProgress(completedSteps);
  const declaredAttributes = listDeclaredAttributes(attributes);
  const isPublished = lifecycle?.status === "published";

  return (
    <>
      <SiteHeader />
      <main className={`dashboard-shell ${styles.wide}`} lang={htmlLang}>
        <nav className="business-breadcrumb" aria-label={t("dash.breadcrumb")}>
          <Link href={`/dashboard/business/${parsedBusinessId.data}` as Route}>
            <span aria-hidden="true">← </span>
            {t("hub.profile.back")}
          </Link>
        </nav>
        <header className={styles.profileHeader}>
          <div className="tag-row">
            {membership ? (
              <span className="tag">{memberRoleTag(t, membership.role)}</span>
            ) : null}
            {!canEdit ? (
              <span className="tag tag--quiet">{t("dash.viewOnly")}</span>
            ) : null}
          </div>
          <p className="eyebrow">{t("hub.profile.eyebrow")}</p>
          <h1 lang={membership?.tradingName ? authoredTextLang : undefined}>
            {membership?.tradingName ?? t("dash.hero.fallbackTitle")}
          </h1>
          <p className={styles.lead}>
            {isPublished ? t("hub.profile.published") : t("hub.profile.lead")}
          </p>
          <p className={styles.lead}>
            {t("hub.profile.progress", {
              done: progress.completedCount,
              total: progress.totalCount,
            })}
          </p>
        </header>
        <DashboardTabs
          businessId={parsedBusinessId.data}
          current="profile"
          showTools={!isPublicDemo}
        />

        {draftResult.status === "unavailable" ? (
          <section className="state-panel" role="status">
            <p className="eyebrow">{t("dash.unavailable.eyebrow")}</p>
            <h2>{t("dash.unavailable.title")}</h2>
            <p>{t("dash.unavailable.body")}</p>
          </section>
        ) : canEdit ? (
          <section aria-labelledby="editing-heading">
            <p className="eyebrow">{t("dash.editing.eyebrow")}</p>
            <h2 id="editing-heading">{t("dash.editing.title")}</h2>
            <OnboardingForms
              businessId={parsedBusinessId.data}
              initialVersion={draft?.version ?? 0}
              initialProfile={draft?.profile ?? null}
              initialLocation={draft?.location ?? null}
              initialServices={draft?.services ?? null}
              initialHours={draft?.hours ?? null}
              places={places.map((option) => ({
                ...option,
                name: (locale === "cy" && option.welshName) || option.name,
              }))}
            />
            <ExceptionalHoursForm
              businessId={parsedBusinessId.data}
              initialVersion={draft?.version ?? 0}
              initialValues={draft?.exceptionalHours ?? null}
            />
            <AttributesForm
              businessId={parsedBusinessId.data}
              initialValues={attributes}
            />
          </section>
        ) : (
          <section
            className="dashboard-readonly"
            aria-labelledby="readonly-heading"
          >
            <p className="eyebrow">{t("dash.readonly.eyebrow")}</p>
            <h2 id="readonly-heading">{t("dash.readonly.title")}</h2>
            <p className="dashboard-readonly__note" role="note">
              {t("dash.readonly.note")}
            </p>
            <div className="dashboard-readonly__panels">
              <div className="detail-panel">
                <p className="eyebrow">{t("dash.readonly.profile")}</p>
                {draft?.profile ? (
                  <dl className="compact-facts">
                    <div>
                      <dt>{t("dash.readonly.tradingName")}</dt>
                      <dd lang={authoredTextLang}>
                        {draft.profile.tradingName}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("dash.readonly.summary")}</dt>
                      <dd lang={authoredTextLang}>{draft.profile.summary}</dd>
                    </div>
                    <div>
                      <dt>{t("dash.readonly.phone")}</dt>
                      <dd lang={authoredTextLang}>
                        {draft.profile.publicPhone ??
                          t("dash.readonly.notSupplied")}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("dash.readonly.email")}</dt>
                      <dd lang={authoredTextLang}>
                        {draft.profile.publicEmail ??
                          t("dash.readonly.notSupplied")}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="inline-empty">
                    {t("dash.readonly.profileEmpty")}
                  </p>
                )}
              </div>
              <div className="detail-panel">
                <p className="eyebrow">{t("dash.readonly.location")}</p>
                {draft?.location ? (
                  <dl className="compact-facts">
                    <div>
                      <dt>{t("dash.readonly.operating")}</dt>
                      <dd>
                        {t(`dash.locationType.${draft.location.locationType}`)}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("dash.readonly.visibility")}</dt>
                      <dd>
                        {t(
                          `dash.addressVisibility.${draft.location.publicAddressVisibility}`,
                        )}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="inline-empty">
                    {t("dash.readonly.locationEmpty")}
                  </p>
                )}
              </div>
              <div className="detail-panel">
                <p className="eyebrow">{t("dash.readonly.services")}</p>
                {draft?.services && draft.services.length > 0 ? (
                  <dl className="compact-facts">
                    {draft.services.map((service) => (
                      <div key={service.name}>
                        <dt lang={authoredTextLang}>{service.name}</dt>
                        <dd lang={authoredTextLang}>
                          {service.priceGuidance ??
                            t("dash.readonly.contactForDetails")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="inline-empty">
                    {t("dash.readonly.servicesEmpty")}
                  </p>
                )}
              </div>
              <div className="detail-panel">
                <p className="eyebrow">{t("dash.readonly.hours")}</p>
                {draft?.hours && draft.hours.length > 0 ? (
                  <dl className="compact-facts">
                    {draft.hours.map((day) => (
                      <div key={day.day}>
                        <dt>{weekdayLabel(t, day.day)}</dt>
                        <dd>
                          {day.closed
                            ? t("dash.readonly.closed")
                            : `${day.opensAt}–${day.closesAt}`}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="inline-empty">
                    {t("dash.readonly.hoursEmpty")}
                  </p>
                )}
              </div>
              <div className="detail-panel">
                <p className="eyebrow">{t("dash.readonly.attributes")}</p>
                {declaredAttributes.length > 0 ? (
                  <div className="tag-row">
                    {declaredAttributes.map((definition) => (
                      <span className="tag" key={definition.key}>
                        {attributeCopy(t, definition.key).label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="inline-empty">
                    {attributes
                      ? t("dash.readonly.attributesNone")
                      : t("dash.readonly.attributesUnsaved")}
                  </p>
                )}
              </div>
              <div className="detail-panel">
                <p className="eyebrow">{t("dash.readonly.exceptional")}</p>
                {draft?.exceptionalHours &&
                draft.exceptionalHours.length > 0 ? (
                  <dl className="compact-facts">
                    {draft.exceptionalHours.map((exception) => (
                      <div key={exception.date}>
                        <dt>
                          {formatExceptionalDate(exception.date, htmlLang)}
                        </dt>
                        <dd>
                          {exception.closed
                            ? t("dash.readonly.closed")
                            : `${exception.opensAt}–${exception.closesAt}`}
                          {exception.note ? (
                            <>
                              {" · "}
                              <span lang={authoredTextLang}>
                                {exception.note}
                              </span>
                            </>
                          ) : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="inline-empty">
                    {t("dash.readonly.exceptionalEmpty")}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
