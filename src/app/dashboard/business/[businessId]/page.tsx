import type { Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import {
  businessOnboardingSteps,
  calculateBusinessOnboardingProgress,
} from "@/modules/businesses/onboarding";
import { readOnboardingDraftForUser } from "@/modules/businesses/onboarding-draft-access";
import { deriveCompletedOnboardingSteps } from "@/modules/businesses/onboarding-draft";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { getBusinessLifecycleSummary } from "@/modules/businesses/publication";
import { listActivePlaces } from "@/modules/reference-data/places";
import { ExceptionalHoursForm } from "./exceptional-hours-form";
import { OnboardingForms } from "./onboarding-forms";
import { PublishPanel } from "./publish-panel";

type DashboardParams = Promise<{ businessId: string }>;

export const dynamic = "force-dynamic";

const deferredStepNotes: Record<string, string> = {
  preview: "The website preview opens once profile and location are drafted.",
};
const editableStepKeys = new Set(["profile", "location", "services", "hours"]);
const statusLabelOverrides: Record<string, string> = {
  pending_review: "In review",
  rejected: "Changes requested",
  suspended: "Suspended",
};
const weekdayLabels: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

function formatExceptionalDate(value: string): string {
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: "Europe/London",
  }).format(date);
}

export default async function BusinessDashboardPage({
  params,
}: {
  params: DashboardParams;
}) {
  const session = await readSession();
  if (!session) redirect("/login?next=/dashboard");

  const { businessId } = await params;
  const parsedBusinessId = z.uuid().safeParse(businessId);
  if (!parsedBusinessId.success) notFound();

  const authorised = await canUserAccessBusiness({
    userId: session.user.id,
    businessId: parsedBusinessId.data,
    permission: businessPermissions.view,
  });
  if (!authorised) notFound();

  const [canEdit, canPublish, draftResult, memberships, places, lifecycle] =
    await Promise.all([
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
    ]);

  const membership = memberships.find(
    (candidate) => candidate.id === parsedBusinessId.data,
  );
  const draft = draftResult.status === "ready" ? draftResult.draft : null;
  const completedSteps = draft ? deriveCompletedOnboardingSteps(draft) : [];
  const progress = calculateBusinessOnboardingProgress(completedSteps);
  const publishStatus = lifecycle?.status ?? "draft";
  const stepStatus = (key: string): "complete" | "todo" | "planned" => {
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
      <main className="dashboard-shell">
        <nav className="business-breadcrumb" aria-label="Breadcrumb">
          <Link href="/account">
            <span aria-hidden="true">← </span>
            Your account
          </Link>
        </nav>

        <section className="dashboard-hero" aria-labelledby="dashboard-title">
          <div className="tag-row">
            {membership ? <span className="tag">{membership.role}</span> : null}
            {membership?.isDemo ? (
              <span className="tag tag--quiet">Fictional demo</span>
            ) : null}
            {!canEdit ? (
              <span className="tag tag--quiet">View only</span>
            ) : null}
          </div>
          <p className="eyebrow">Protected business dashboard</p>
          <h1 id="dashboard-title">
            {membership?.tradingName ?? "Your business"}
          </h1>
          <p className="lead">
            Complete one structured profile and use it across discovery, your
            generated website and future resident journeys. Everything here
            saves as a draft — nothing publishes automatically.
          </p>
          <div className="progress-block">
            <div className="progress-meta">
              <span>
                {progress.completedCount} of {progress.totalCount} setup steps
                complete
              </span>
              <strong>{progress.percentage}%</strong>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Onboarding progress"
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

        <nav className="tag-row" aria-label="Website tools">
          <Link
            className="button"
            href={
              `/dashboard/business/${parsedBusinessId.data}/preview` as Route
            }
          >
            Preview your website
          </Link>
          <Link
            className="button"
            href={
              `/dashboard/business/${parsedBusinessId.data}/website` as Route
            }
          >
            Design &amp; photos
          </Link>
        </nav>

        {draftResult.status === "unavailable" ? (
          <section className="state-panel" role="status">
            <p className="eyebrow">Temporary problem</p>
            <h2>The saved draft could not be loaded.</h2>
            <p>
              Nothing has been lost. Please reload this page once the data
              service has recovered.
            </p>
          </section>
        ) : canEdit ? (
          <section aria-labelledby="editing-heading">
            <p className="eyebrow">Draft editing</p>
            <h2 id="editing-heading">Build your profile</h2>
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
          </section>
        ) : (
          <section
            className="dashboard-readonly"
            aria-labelledby="readonly-heading"
          >
            <p className="eyebrow">Draft contents</p>
            <h2 id="readonly-heading">Current saved draft</h2>
            <p className="dashboard-readonly__note" role="note">
              Your membership can view this dashboard but cannot edit or
              publish. Ask a business owner or manager for edit access.
            </p>
            <div className="dashboard-readonly__panels">
              <div className="detail-panel">
                <p className="eyebrow">Business profile</p>
                {draft?.profile ? (
                  <dl className="compact-facts">
                    <div>
                      <dt>Trading name</dt>
                      <dd>{draft.profile.tradingName}</dd>
                    </div>
                    <div>
                      <dt>Summary</dt>
                      <dd>{draft.profile.summary}</dd>
                    </div>
                    <div>
                      <dt>Public phone</dt>
                      <dd>{draft.profile.publicPhone ?? "Not supplied"}</dd>
                    </div>
                    <div>
                      <dt>Public email</dt>
                      <dd>{draft.profile.publicEmail ?? "Not supplied"}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="inline-empty">
                    The profile step has not been drafted yet.
                  </p>
                )}
              </div>
              <div className="detail-panel">
                <p className="eyebrow">Location and service area</p>
                {draft?.location ? (
                  <dl className="compact-facts">
                    <div>
                      <dt>Operating style</dt>
                      <dd>{draft.location.locationType.replace("_", " ")}</dd>
                    </div>
                    <div>
                      <dt>Public visibility</dt>
                      <dd>
                        {draft.location.publicAddressVisibility.replaceAll(
                          "_",
                          " ",
                        )}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="inline-empty">
                    The location step has not been drafted yet.
                  </p>
                )}
              </div>
              <div className="detail-panel">
                <p className="eyebrow">Services</p>
                {draft?.services && draft.services.length > 0 ? (
                  <dl className="compact-facts">
                    {draft.services.map((service) => (
                      <div key={service.name}>
                        <dt>{service.name}</dt>
                        <dd>
                          {service.priceGuidance ?? "Contact for details"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="inline-empty">
                    The services step has not been drafted yet.
                  </p>
                )}
              </div>
              <div className="detail-panel">
                <p className="eyebrow">Opening hours</p>
                {draft?.hours && draft.hours.length > 0 ? (
                  <dl className="compact-facts">
                    {draft.hours.map((day) => (
                      <div key={day.day}>
                        <dt>{weekdayLabels[day.day] ?? day.day}</dt>
                        <dd>
                          {day.closed
                            ? "Closed"
                            : `${day.opensAt}–${day.closesAt}`}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="inline-empty">
                    The opening-hours step has not been drafted yet.
                  </p>
                )}
              </div>
              <div className="detail-panel">
                <p className="eyebrow">Exceptional opening hours</p>
                {draft?.exceptionalHours &&
                draft.exceptionalHours.length > 0 ? (
                  <dl className="compact-facts">
                    {draft.exceptionalHours.map((exception) => (
                      <div key={exception.date}>
                        <dt>{formatExceptionalDate(exception.date)}</dt>
                        <dd>
                          {exception.closed
                            ? "Closed"
                            : `${exception.opensAt}–${exception.closesAt}`}
                          {exception.note ? ` · ${exception.note}` : ""}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="inline-empty">
                    No exceptional dates have been drafted. Regular hours apply.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="dashboard-steps" aria-labelledby="steps-heading">
          <p className="eyebrow">Setup checklist</p>
          <h2 id="steps-heading">Every step towards publishing</h2>
          <ol className="step-list">
            {businessOnboardingSteps.map((step, index) => {
              const status = stepStatus(step.key);
              return (
                <li className="step-card" key={step.key}>
                  <span className="step-card__index" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="step-card__body">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                    {status === "planned" ? (
                      <p className="step-card__note">
                        {deferredStepNotes[step.key]}
                      </p>
                    ) : null}
                  </div>
                  <span className={`status-chip status-chip--${status}`}>
                    {step.key === "publish"
                      ? (statusLabelOverrides[publishStatus] ??
                        (status === "complete" ? "Published" : "Not started"))
                      : status === "complete"
                        ? "Drafted"
                        : status === "todo"
                          ? "Not started"
                          : "Coming later"}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="publish-heading">
          <p className="eyebrow">Publishing</p>
          <h2 id="publish-heading">Review and go live</h2>
          <PublishPanel
            businessId={parsedBusinessId.data}
            status={publishStatus}
            moderationNote={lifecycle?.moderationNote ?? null}
            suspensionReason={lifecycle?.suspensionReason ?? null}
            canPublish={canPublish}
          />
        </section>

        <section className="dashboard-safety" aria-labelledby="safety-heading">
          <p className="eyebrow">Safe by default</p>
          <h2 id="safety-heading">Nothing publishes automatically.</h2>
          <p>
            Preview, verification and publication remain separate controlled
            steps. This dashboard is available only after server-side tenant
            membership and permission checks succeed.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
