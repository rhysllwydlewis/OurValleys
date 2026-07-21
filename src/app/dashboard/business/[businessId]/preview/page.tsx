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
import styles from "./preview.module.css";

type PreviewParams = Promise<{ businessId: string }>;

export const dynamic = "force-dynamic";

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
  const dashboardHref = `/dashboard/business/${parsedBusinessId.data}`;

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
              Nothing has been published or lost. Return to the dashboard and
              try again when the data service has recovered.
            </p>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  if (draftResult.status !== "ready") notFound();

  const draft = draftResult.draft;
  const profile = draft?.profile ?? null;
  const location = draft?.location ?? null;
  const services = draft?.services ?? [];
  const hours = draft?.hours ?? [];
  const missingSections = [
    !profile ? "business profile" : null,
    !location ? "location" : null,
    services.length === 0 ? "services" : null,
    hours.length === 0 ? "opening hours" : null,
  ].filter((value): value is string => Boolean(value));
  const tradingName =
    profile?.tradingName ?? membership?.tradingName ?? "Your business";

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
            <span className={styles.statusChip}>
              Draft v{draft?.version ?? 0}
            </span>
            <Link className={styles.secondaryAction} href={dashboardHref}>
              Edit profile
            </Link>
          </div>
        </div>

        {missingSections.length > 0 ? (
          <section className={styles.guidance} role="note">
            <strong>Preview in progress.</strong>
            <span>
              Complete {missingSections.join(", ")} before this website is ready
              for publication review.
            </span>
          </section>
        ) : (
          <section className={styles.guidance} role="status">
            <strong>Core preview complete.</strong>
            <span>
              Review the content and return to the dashboard when you are ready
              to use the controlled publishing workflow.
            </span>
          </section>
        )}

        <article
          className={styles.websiteFrame}
          aria-labelledby="preview-title"
        >
          <header className={styles.websiteHeader}>
            <Link className={styles.wordmark} href={dashboardHref}>
              {tradingName}
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
                {location?.publicLocality ?? "Serving the local community"}
              </p>
              <h1 id="preview-title">{tradingName}</h1>
              <p className={styles.summary}>
                {profile?.summary ??
                  "Add a concise business summary in the dashboard to introduce your work here."}
              </p>
              <div className={styles.heroActions}>
                {profile?.publicPhone ? (
                  <a
                    className={styles.primaryAction}
                    href={`tel:${profile.publicPhone}`}
                  >
                    Call {profile.publicPhone}
                  </a>
                ) : (
                  <span className={styles.disabledAction}>
                    Add a public phone number
                  </span>
                )}
                {profile?.publicEmail ? (
                  <a
                    className={styles.secondaryAction}
                    href={`mailto:${profile.publicEmail}`}
                  >
                    Email the business
                  </a>
                ) : null}
              </div>
            </div>
            <div className={styles.heroVisual} aria-hidden="true">
              <span>{tradingName.slice(0, 1).toUpperCase()}</span>
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
            {services.length > 0 ? (
              <div className={styles.serviceGrid}>
                {services.map((service) => (
                  <article className={styles.serviceCard} key={service.name}>
                    <h3>{service.name}</h3>
                    <p>
                      {service.description ??
                        "Add a service description in the dashboard to explain this offer."}
                    </p>
                    <strong>
                      {service.priceGuidance ?? "Contact for details"}
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
              {hours.length > 0 ? (
                <dl className={styles.hoursList}>
                  {hours.map((day) => (
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
                <p className={styles.emptyState}>
                  Add regular opening hours in the dashboard.
                </p>
              )}
            </div>
            <div className={styles.locationCard} id="contact">
              <p className={styles.eyebrow}>Where we work</p>
              <h2>{location?.publicLocality ?? "Location to be added"}</h2>
              <p>
                {location?.locationType === "service_area"
                  ? "This business travels to customers across its selected service area."
                  : location?.locationType === "online"
                    ? "This business provides its services online."
                    : "Public address details follow the visibility choice saved in the dashboard."}
              </p>
              {location?.publicAddressVisibility === "full_address" ? (
                <address>
                  {location.publicAddressLineOne}
                  <br />
                  {location.publicLocality}
                  <br />
                  {location.publicPostcode}
                </address>
              ) : null}
            </div>
          </section>

          <footer className={styles.websiteFooter}>
            <div>
              <strong>{tradingName}</strong>
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
