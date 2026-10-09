import type { Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  BusinessLifecycleBanner,
  buildOperationSectionRenderers,
} from "@/components/business-operations-sections";
import { GeneratedBusinessWebsite } from "@/components/generated-business-website";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import {
  getBusinessAppearance,
  getBusinessPresentationContext,
} from "@/modules/businesses/appearance-repository";
import { applyAppearanceDraft } from "@/modules/businesses/appearance";
import { getBusinessAttributes } from "@/modules/businesses/attributes";
import {
  getPublicBusinessOperations,
  type PublicBusinessOperations,
} from "@/modules/businesses/public-operations";
import { listBusinessMedia } from "@/modules/businesses/media";
import { readOnboardingDraftForUser } from "@/modules/businesses/onboarding-draft-access";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { getPublishedBusinessById } from "@/modules/businesses/public";
import { projectDraftBusinessSiteWithPublishedFallback } from "@/modules/businesses/site-projection";
import styles from "./preview.module.css";

type PreviewParams = Promise<{ businessId: string }>;
type PreviewSearchParams = Promise<{
  frame?: string;
  template?: string;
  accent?: string;
  hide?: string;
  order?: string;
  layouts?: string;
}>;

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

/**
 * What the private preview shows in the operation sections. Form buttons need
 * the public address, which an unpublished business does not have yet. A
 * business that has not been published or set up contact methods still has
 * the phone and email typed during onboarding, so those become the same
 * "Email us" and "Call us" actions the published site would offer.
 */
function previewOperations(
  operations: PublicBusinessOperations,
  projection: { publicEmail: string | null; publicPhone: string | null },
  isPublished: boolean,
): PublicBusinessOperations {
  let contacts = isPublished
    ? operations.contacts
    : operations.contacts.filter((contact) => !contact.formKind);
  if (contacts.length === 0) {
    const fallback: PublicBusinessOperations["contacts"] = [];
    if (projection.publicEmail) {
      fallback.push({
        id: "draft-email",
        type: "email",
        label: "Email us",
        href: `mailto:${projection.publicEmail}`,
        formKind: null,
        isPrimary: true,
      });
    }
    if (projection.publicPhone) {
      fallback.push({
        id: "draft-phone",
        type: "call",
        label: "Call us",
        href: `tel:${projection.publicPhone.replace(/[^\d+]/g, "")}`,
        formKind: null,
        isPrimary: fallback.length === 0,
      });
    }
    contacts = fallback;
  }
  return { ...operations, contacts };
}

export default async function BusinessDraftPreviewPage({
  params,
  searchParams,
}: {
  params: PreviewParams;
  searchParams: PreviewSearchParams;
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

  const rawQuery = await searchParams;
  // A repeated parameter arrives as an array; only a single value is used.
  const query = Object.fromEntries(
    Object.entries(rawQuery).map(([key, value]) => [
      key,
      typeof value === "string" ? value : undefined,
    ]),
  ) as Awaited<PreviewSearchParams>;
  const [
    draftResult,
    memberships,
    savedAppearance,
    media,
    context,
    publishedResult,
    operations,
    savedAttributes,
  ] = await Promise.all([
    readOnboardingDraftForUser({
      userId: session.user.id,
      businessId: parsedBusinessId.data,
    }),
    listAccessibleBusinesses(session.user.id).catch(() => []),
    getBusinessAppearance(parsedBusinessId.data),
    listBusinessMedia(parsedBusinessId.data),
    getBusinessPresentationContext(parsedBusinessId.data),
    getPublishedBusinessById(parsedBusinessId.data),
    getPublicBusinessOperations(parsedBusinessId.data).catch(() => null),
    getBusinessAttributes(parsedBusinessId.data),
  ]);
  // The designer's live preview passes unsaved choices in the address. They
  // are only ever applied to this private view and are checked against the
  // approved lists, so nothing is saved and no unapproved style is possible.
  const appearance = applyAppearanceDraft(savedAppearance, {
    template: query.template,
    accent: query.accent,
    hide: query.hide,
    order: query.order,
    layouts: query.layouts,
  });
  const isFrame = query.frame === "1";
  const published =
    publishedResult.state === "ready" ? publishedResult.business : null;

  const membership = memberships.find(
    (candidate) => candidate.id === parsedBusinessId.data,
  );
  const dashboardHref = `/dashboard/business/${parsedBusinessId.data}` as Route;
  const designHref =
    `/dashboard/business/${parsedBusinessId.data}/website` as Route;

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
  const projection = projectDraftBusinessSiteWithPublishedFallback({
    draft,
    published,
    fallbackTradingName:
      context?.tradingName ?? membership?.tradingName ?? "Your business",
  });
  const missingSections = projection.missingSections.map(
    (section) => missingSectionLabels[section],
  );

  const website = (
    <GeneratedBusinessWebsite
      projection={projection}
      description={projection.summary}
      category={
        context?.category ?? {
          name: "Local business",
          slug: "local-business",
        }
      }
      placeName={null}
      appearance={appearance}
      media={media}
      isDemo={membership?.isDemo ?? false}
      verificationStatus="unverified"
      updatedLabel={draft ? formatUpdatedAt(draft.updatedAt) : null}
      embedded
      operationSections={
        operations
          ? buildOperationSectionRenderers({
              businessId: parsedBusinessId.data,
              businessSlug: published?.slug ?? "",
              businessName: projection.tradingName,
              // Form buttons need the public address, which an unpublished
              // business does not have yet.
              operations: previewOperations(
                operations,
                projection,
                Boolean(published),
              ),
              attributes: savedAttributes,
              preview: true,
            })
          : {}
      }
      notice={
        operations ? (
          <BusinessLifecycleBanner
            businessName={projection.tradingName}
            operations={operations}
          />
        ) : null
      }
    />
  );

  if (isFrame) return <div className={styles.frame}>{website}</div>;

  return (
    <>
      <SiteHeader />
      <main className={styles.shell}>
        <div className={styles.previewBar}>
          <div>
            <p className={styles.eyebrow}>Private draft preview</p>
            <p>
              This is the same template, media, section order and business-first
              shell customers will see when the site is published.
            </p>
          </div>
          <div className={styles.previewActions}>
            <span className={styles.statusChip}>
              Draft v{draft?.version ?? 0}
            </span>
            <Link className={styles.secondaryAction} href={dashboardHref}>
              Edit content
            </Link>
            <Link className={styles.secondaryAction} href={designHref}>
              Design &amp; photos
            </Link>
          </div>
        </div>

        {projection.isComplete ? (
          <section className={styles.guidance} role="status">
            <strong>Core preview complete.</strong>
            <span>
              Review the website across desktop and mobile before using the
              controlled publishing workflow.
            </span>
          </section>
        ) : (
          <section className={styles.guidance} role="note">
            <strong>Preview in progress.</strong>
            <span>
              Complete {missingSections.join(", ")} before this website is ready
              for publication review. Honest placeholders remain visible until
              then.
            </span>
          </section>
        )}

        {website}
      </main>
      <SiteFooter />
    </>
  );
}
