import type { Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import { readOnboardingDraftForUser } from "@/modules/businesses/onboarding-draft-access";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { projectDraftBusinessSite } from "@/modules/businesses/site-projection";
import styles from "./preview.module.css";

type PreviewParams = Promise<{ businessId: string }>;

export const dynamic = "force-dynamic";

const missingSectionLabels = {
  profile: "business profile",
  location: "location",
  services: "services",
  hours: "opening hours",
} as const;

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

function formatUpdatedAt(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function BusinessDraftPreviewPage({
  params,
}: {
  params: PreviewParams;
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

  const [draftResult, memberships] = await Promise.all([
    readOnboardingDraftForUser({
      userId: session.user.id,
      businessId: parsedBusinessId.data,
    }),
    listAccessibleBusinesses(session.user.id).catch(() => []),
  ]);

  const membership = memberships.find(
    (candidate) => candidate.id === parsedBusinessId.data,
  );
  const dashboardHref = `/dashboard/business/${parsedBusinessId.data}` as Route;

  if (draftResult.status === "unavailable") {
    return (
      <>
        <SiteHeader />
        <main className={styles.shell}>
          <Link className={styles.backLink} href={dashboardHref}>
            <span aria-hidden="true">← </span>
            Back to dashboard
          </Link>
          <section className={styles.statePanel} role="status">
            <p className={styles.eyebrow}>Preview temporarily unavailable</p>
            <h1>The saved draft could not be loaded.</h1>
            <p>
              Nothing has been published or lost. Return to the dashboard and try
              again when the data service has recovered.
            </p>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  if (draftResult.status !== "ready") notFound();

  const draft = draftResult.draft;
  const projection = projectDraftBusinessSite({
    draft,
    fallbackTradingName: membership?.tradingName ?? "Your business",
  });
  const missingSections = projection.missingSections.map(
    (section) => missingSectionLabels[section],
  );

  return (
    <>
      <SiteHeader />
      <main className={styles.shell}>
        <div className={styles.previewBar}>
          <div>
            <p className={styles.eyebrow}>Private draft preview</p>
            <p>
              Only authorised business members can see this version. Nothing on
              this page is published automatically.
            </p>
          </div>
          <div className={styles.previewActions}>
            <span className={styles.statusChip}>Draft v{draft?.version ?? 0}</span>
            <Link className={styles.secondaryAction} href={dashboardHref}>
              Edit profile
            </Link>
          </div>
        </div>

        {projection.isComplete ? (
          <section className={styles.guidance} role="status">
            <strong>Core preview complete.</strong>
            <span>
              Review the content and return to the dashboard when you are ready
              to use the controlled publishing workflow.
            </span>
          </section>
        ) : (
          <section className={styles.guidance} role="note">
            <strong>Preview in progress.</strong>
            <span>
              Complete {missingSections.join(", ")} before this website is ready
              for publication review.
            </span>
          </section>
        )}

        <article
          className={styles.websiteFrame}
          aria-labelledby="preview-title"
        >
          <header className={styles.websiteHeader}>
            <Link className={styles.wordmark} href={dashboardHref}>
              {projection.tradingName}
            </Link>
            <nav aria-label="Preview sections">
              <a href="#services">Services</a>
              <a href="#hours">Hours</a>
              <a href="#contact">Contact</a>
            </nav>
          </header>

          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.localLabel}>
                {projection.locationDisplay ?? "Serving the local community"}
              </p>
              <h1 id="preview-title">{projection.tradingName}</h1>
              <p className={styles.summary}>
                {projection.summary ??
                  "Add a concise business summary in the dashboard to introduce your work here."}
              </p>
              <div className={styles.heroActions}>
                {projection.publicPhone ? (
                  <a
                    className={styles.primaryAction}
                    href={`tel:${projection.publicPhone}`}
                  >
                    Call {projection.publicPhone}
                  </a>
                ) : (
                  <span className={styles.disabledAction}>
                    Add a public phone number
                  </span>
                )}
                {projection.publicEmail ? (
                  <a
                    className={styles.secondaryAction}
                    href={`mailto:${projection.publicEmail}`}
                  >
                    Email the business
                  </a>
                ) : null}
              </div>
            </div>
            <div className={styles.heroVisual} aria-hidden="true">
              <span>{projection.tradingName.slice(0, 1).toUpperCase()}</span>
              <p>Generated from one structured OurValleys profile</p>
            </div>
          </section>

          <section
            className={styles.section}
            id="services"
            aria-labelledby="services-title"
          >
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>What we do</p>
              <h2 id="services-title">Services</h2>
            </div>
            {projection.services.length > 0 ? (
              <div className={styles.serviceGrid}>
                {projection.services.map((service) => (
                  <article className={styles.serviceCard} key={service.name}>
                    <h3>{service.name}</h3>
                    <p>
                      {service.description ??
                        "Add a service description in the dashboard to explain this offer."}
                    </p>
                    <strong>
                      {service.priceDisplay ?? "Contact for details"}
                    </strong>
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>
                Add at least one service in the dashboard to build this section.
              </p>
            )}
          </section>

          <section className={styles.splitSection} id="hours">
            <div>
              <p className={styles.eyebrow}>Plan a visit</p>
              <h2>Opening hours</h2>
              {projection.openingHours.length > 0 ? (
                <dl className={styles.hoursList}>
                  {projection.openingHours.map((day) => (
                    <div key={day.day}>
                      <dt>{day.day}</dt>
                      <dd>{day.display}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className={styles.emptyState}>
                  Add regular opening hours in the dashboard.
                </p>
              )}
            </div>
            <div className={styles.locationCard} id="contact">
              <p className={styles.eyebrow}>Where we work</p>
              <h2>{projection.locationDisplay ?? "Location to be added"}</h2>
              <p>
                This preview displays only the location information selected for
                public presentation. Private premises data is never included.
              </p>
            </div>
          </section>

          <footer className={styles.websiteFooter}>
            <div>
              <strong>{projection.tradingName}</strong>
              <p>Draft generated website preview powered by OurValleys.</p>
            </div>
            <p>
              {draft
                ? `Last saved ${formatUpdatedAt(draft.updatedAt)}`
                : "No saved draft yet"}
            </p>
          </footer>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
