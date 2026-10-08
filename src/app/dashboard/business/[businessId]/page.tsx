import type { Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import {
  attributeCopy,
  memberRoleTag,
  onboardingStepCopy,
  previewStepCopy,
  publicationGuidanceCopy,
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
import {
  businessOnboardingSteps,
  calculateBusinessOnboardingProgress,
  describePreviewStep,
} from "@/modules/businesses/onboarding";
import { readOnboardingDraftForUser } from "@/modules/businesses/onboarding-draft-access";
import { deriveCompletedOnboardingSteps } from "@/modules/businesses/onboarding-draft";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { getBusinessLifecycleSummary } from "@/modules/businesses/publication";
import { getPublicationGuidance } from "@/modules/businesses/publication-guidance";
import { listActivePlaces } from "@/modules/reference-data/places";
import { AttributesForm } from "./attributes-form";
import { ExceptionalHoursForm } from "./exceptional-hours-form";
import { OnboardingForms } from "./onboarding-forms";
import { PublishPanel } from "./publish-panel";

type DashboardParams = Promise<{ businessId: string }>;

export const dynamic = "force-dynamic";

const editableStepKeys = new Set([
  "profile",
  "location",
  "services",
  "hours",
  "attributes",
]);
const statusLabelOverrides = {
  pending_review: "dash.steps.chipInReview",
  rejected: "dash.steps.chipChanges",
  suspended: "dash.steps.chipSuspended",
} as const;

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

export default async function BusinessDashboardPage({
  params,
}: {
  params: DashboardParams;
}) {
  const { locale, t } = await getTranslator();
  const htmlLang = LOCALE_DETAILS[locale].htmlLang;
  const session = await readSession();
  if (!session) redirect("/login?next=/dashboard");

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

  const [
    canEdit,
    canPublish,
    draftResult,
    memberships,
    places,
    lifecycle,
    attributes,
  ] = await Promise.all([
    canUserAccessBusiness({
      userId: session.user.id,
      businessId: parsedBusinessId.data,
      permission: businessPermissions.editProfile,
    }),
    canUserAccessBusiness({
      userId: session.user.id,
      businessId: parsedBusinessId.data,
      permission: businessPermissions.publish,
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
  const publishStatus = lifecycle?.status ?? "draft";
  const publicationGuidance = publicationGuidanceCopy(
    t,
    publishStatus,
    getPublicationGuidance(publishStatus),
  );
  const isPublished = publishStatus === "published";
  const rawPreviewStep = describePreviewStep(completedSteps, {
    published: isPublished,
  });
  const previewStep = {
    ...rawPreviewStep,
    ...previewStepCopy(t, rawPreviewStep),
  };
  const stepStatus = (key: string): "complete" | "todo" | "planned" => {
    if (key === "preview") return previewStep.chip;
    if (editableStepKeys.has(key)) {
      return completedSteps.includes(key as (typeof completedSteps)[number])
        ? "complete"
        : "todo";
    }
    if (key === "publish") {
      if (publishStatus === "published") return "complete";
      if (publishStatus === "pending_review") return "planned";
      return "todo";
    }
    return "planned";
  };

  return (
    <>
      <SiteHeader />
      <main className="dashboard-shell" lang={htmlLang}>
        <nav className="business-breadcrumb" aria-label={t("dash.breadcrumb")}>
          <Link href="/account">
            <span aria-hidden="true">← </span>
            {t("dash.backToAccount")}
          </Link>
        </nav>

        <section className="dashboard-hero" aria-labelledby="dashboard-title">
          <div className="tag-row">
            <span
              className={`status-chip status-chip--${publicationGuidance.chip}`}
            >
              {publicationGuidance.label}
            </span>
            {membership ? (
              <span className="tag">{memberRoleTag(t, membership.role)}</span>
            ) : null}
            {membership?.isDemo ? (
              <span className="tag tag--quiet">{t("dash.fictionalDemo")}</span>
            ) : null}
            {!canEdit ? (
              <span className="tag tag--quiet">{t("dash.viewOnly")}</span>
            ) : null}
          </div>
          <p className="eyebrow">{t("dash.hero.eyebrow")}</p>
          <h1 id="dashboard-title">
            {membership?.tradingName ?? t("dash.hero.fallbackTitle")}
          </h1>
          <p className="lead">
            {isPublished
              ? t("dash.hero.leadPublished")
              : t("dash.hero.leadDraft")}
          </p>
          <div className="progress-block">
            <div className="progress-meta">
              <span>
                {t(
                  isPublished
                    ? "dash.progress.published"
                    : "dash.progress.setup",
                  {
                    done: progress.completedCount,
                    total: progress.totalCount,
                  },
                )}
              </span>
              <strong>{progress.percentage}%</strong>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label={t(
                isPublished
                  ? "dash.progress.ariaPublished"
                  : "dash.progress.ariaSetup",
              )}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percentage}
            >
              <span
                className="progress-fill"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        </section>

        <nav className="tag-row" aria-label={t("dash.tools.aria")}>
          <Link
            className="button"
            href={
              `/dashboard/business/${parsedBusinessId.data}/preview` as Route
            }
          >
            {t("dash.tools.preview")}
          </Link>
          {!isPublicDemo ? (
            <>
              <Link
                className="button"
                href={
                  `/dashboard/business/${parsedBusinessId.data}/website` as Route
                }
              >
                {t("dash.tools.design")}
              </Link>
              <Link
                className="button"
                href={
                  `/dashboard/business/${parsedBusinessId.data}/operations` as Route
                }
              >
                {t("dash.tools.operations")}
              </Link>
            </>
          ) : null}
        </nav>

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
              places={places}
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
                      <dd>{draft.profile.tradingName}</dd>
                    </div>
                    <div>
                      <dt>{t("dash.readonly.summary")}</dt>
                      <dd>{draft.profile.summary}</dd>
                    </div>
                    <div>
                      <dt>{t("dash.readonly.phone")}</dt>
                      <dd>
                        {draft.profile.publicPhone ??
                          t("dash.readonly.notSupplied")}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("dash.readonly.email")}</dt>
                      <dd>
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
                        <dt>{service.name}</dt>
                        <dd>
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
                          {exception.note ? ` · ${exception.note}` : ""}
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

        <section className="dashboard-steps" aria-labelledby="steps-heading">
          <p className="eyebrow">{t("dash.steps.eyebrow")}</p>
          <h2 id="steps-heading">
            {isPublished
              ? t("dash.steps.titlePublished")
              : t("dash.steps.titleSetup")}
          </h2>
          {isPublished ? (
            <p className="dashboard-readonly__note" role="note">
              {t("dash.steps.publishedNote")}
            </p>
          ) : null}
          <ol className="step-list">
            {businessOnboardingSteps.map((step, index) => {
              const status = stepStatus(step.key);
              const stepCopy = onboardingStepCopy(t, step.key);
              const isUneditedSinceLive =
                isPublished &&
                status === "todo" &&
                editableStepKeys.has(step.key);
              return (
                <li className="step-card" key={step.key}>
                  <span className="step-card__index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="step-card__body">
                    <h3>{stepCopy.title}</h3>
                    <p>{stepCopy.description}</p>
                    {step.key === "preview" ? (
                      <p className="step-card__note">{previewStep.note}</p>
                    ) : isUneditedSinceLive ? (
                      <p className="step-card__note">
                        {t("dash.steps.alreadyCovered")}
                      </p>
                    ) : null}
                  </div>
                  <span className={`status-chip status-chip--${status}`}>
                    {step.key === "preview"
                      ? previewStep.label
                      : step.key === "publish"
                        ? t(
                            statusLabelOverrides[
                              publishStatus as keyof typeof statusLabelOverrides
                            ] ??
                              (status === "complete"
                                ? "dash.steps.chipPublished"
                                : "dash.steps.chipNotStarted"),
                          )
                        : status === "complete"
                          ? t("dash.steps.chipDrafted")
                          : status === "todo"
                            ? isUneditedSinceLive
                              ? t("dash.steps.chipNoEdits")
                              : t("dash.steps.chipNotStarted")
                            : t("dash.steps.chipWaiting")}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="publish-heading">
          <p className="eyebrow">{t("dash.publishing.eyebrow")}</p>
          <h2 id="publish-heading">{t("dash.publishing.title")}</h2>
          <PublishPanel
            businessId={parsedBusinessId.data}
            status={publishStatus}
            moderationNote={lifecycle?.moderationNote ?? null}
            suspensionReason={lifecycle?.suspensionReason ?? null}
            canPublish={canPublish}
          />
        </section>

        <section className="dashboard-safety" aria-labelledby="safety-heading">
          <p className="eyebrow">{t("dash.safety.eyebrow")}</p>
          <h2 id="safety-heading">{t("dash.safety.title")}</h2>
          <p>{t("dash.safety.body")}</p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
