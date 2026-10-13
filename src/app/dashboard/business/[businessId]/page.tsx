import type { Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import {
  memberRoleTag,
  onboardingStepCopy,
  previewStepCopy,
  publicationGuidanceCopy,
  authoredTextLang,
} from "@/lib/i18n/business-copy";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { isPublicDemoEmail } from "@/lib/public-demo-policy";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import { getBusinessAttributes } from "@/modules/businesses/attributes";
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
import { loadOwnerHubData } from "@/modules/businesses/owner-hub-data";
import {
  buildOwnerNextSteps,
  hubFigures,
  toOwnerHubStatus,
  withEnquiryVisibility,
} from "@/modules/businesses/owner-hub";
import { PublishPanel } from "./publish-panel";
import { DashboardTabs } from "./_hub/dashboard-tabs";
import { readDashboardTabAccess } from "./_hub/tab-access";
import hubStyles from "./_hub/hub.module.css";
import { ManageGrid } from "./_hub/manage-grid";
import { NextSteps } from "./_hub/next-steps";
import { Performance } from "./_hub/performance";

type DashboardParams = Promise<{ businessId: string }>;

export const dynamic = "force-dynamic";

const setupStepKeys = ["profile", "location", "services", "hours"] as const;
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
    tabAccess,
    canViewAnalytics,
    draftResult,
    memberships,
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
    readDashboardTabAccess({
      userId: session.user.id,
      businessId: parsedBusinessId.data,
      isPublicDemo,
    }),
    canUserAccessBusiness({
      userId: session.user.id,
      businessId: parsedBusinessId.data,
      permission: businessPermissions.viewAnalytics,
    }),
    readOnboardingDraftForUser({
      userId: session.user.id,
      businessId: parsedBusinessId.data,
    }),
    listAccessibleBusinesses(session.user.id).catch(() => []),
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
  const publishStatus = lifecycle?.status ?? "draft";
  const publicationGuidance = publicationGuidanceCopy(
    t,
    publishStatus,
    getPublicationGuidance(publishStatus),
  );
  const isPublished = publishStatus === "published";
  // Analytics are only read, and the panel only shown, for members whose role
  // includes them (editors and the public demo owner do not have it).
  const hub = await loadOwnerHubData(parsedBusinessId.data, new Date(), {
    includeAnalytics: canViewAnalytics,
  });
  const nextSteps = buildOwnerNextSteps({
    ...withEnquiryVisibility(hub.facts, tabAccess.canOperate),
    status: toOwnerHubStatus(publishStatus),
    canEdit,
    canPublish,
    setupKnown: draftResult.status === "ready",
    canOperate: tabAccess.canOperate,
    canDesign: tabAccess.canDesign,
    missingSetupSteps: setupStepKeys.filter(
      (key) => !completedSteps.includes(key),
    ),
  });
  const figures = hub.analytics
    ? hubFigures(hub.analytics.summary, hub.analytics.summary.previous)
    : [];
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
      <main className={`dashboard-shell ${hubStyles.wide}`} lang={htmlLang}>
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
          <h1
            id="dashboard-title"
            lang={membership?.tradingName ? authoredTextLang : undefined}
          >
            {membership?.tradingName ?? t("dash.hero.fallbackTitle")}
          </h1>
          <p className="lead">
            {isPublished
              ? t("dash.hero.leadPublished")
              : t("dash.hero.leadDraft")}
          </p>
          <div className={hubStyles.headerActions}>
            {isPublished && membership?.slug ? (
              <Link
                className="button primary"
                href={`/b/${membership.slug}` as Route}
              >
                {t("hub.viewPublic")}
              </Link>
            ) : null}
            <Link
              className="button"
              href={
                `/dashboard/business/${parsedBusinessId.data}/preview` as Route
              }
            >
              {t("hub.openPreview")}
            </Link>
          </div>
          {!isPublished ? (
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
          ) : null}
        </section>

        <DashboardTabs
          businessId={parsedBusinessId.data}
          current="overview"
          canDesign={tabAccess.canDesign}
          canOperate={tabAccess.canOperate}
        />

        {draftResult.status === "unavailable" ? (
          <section className="state-panel" role="status">
            <p className="eyebrow">{t("dash.unavailable.eyebrow")}</p>
            <h2>{t("dash.unavailable.title")}</h2>
            <p>{t("dash.unavailable.body")}</p>
          </section>
        ) : null}

        <div
          className={`${hubStyles.columns} ${hub.analytics ? "" : hubStyles.single}`}
        >
          <NextSteps
            businessId={parsedBusinessId.data}
            steps={nextSteps}
            canEdit={canEdit}
            t={t}
          />
          {hub.analytics ? (
            <Performance
              businessId={parsedBusinessId.data}
              figures={figures}
              daily={hub.analytics.daily}
              periodDays={hub.analytics.summary.periodDays}
              locale={locale}
              live={isPublished}
              canOperate={tabAccess.canOperate}
              t={t}
            />
          ) : null}
        </div>

        <ManageGrid
          businessId={parsedBusinessId.data}
          slug={membership?.slug ?? null}
          live={isPublished}
          waitingEnquiries={
            withEnquiryVisibility(hub.facts, tabAccess.canOperate)
              .enquiriesWaiting
          }
          canDesign={tabAccess.canDesign}
          canOperate={tabAccess.canOperate}
          t={t}
        />

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
          {isPublished ? (
            <details className="step-details">
              <summary>{t("hub.steps.showChecklist")}</summary>
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
            </details>
          ) : (
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
          )}
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
