import type { Metadata, Route } from "next";
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
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
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

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("preview.eyebrow"),
    robots: { index: false, follow: false },
  };
}

const missingSectionLabels = {
  profile: "preview.missing.profile",
  location: "preview.missing.location",
  services: "preview.missing.services",
  hours: "preview.missing.hours",
} as const satisfies Record<string, MessageKey>;

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
  const { locale, t } = await getTranslator();
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
        <main className={styles.shell} lang={LOCALE_DETAILS[locale].htmlLang}>
          <Link className={styles.backLink} href={dashboardHref}>
            <span aria-hidden="true">← </span>
            {t("preview.back")}
          </Link>
          <section className={styles.statePanel} role="status">
            <p className={styles.eyebrow}>{t("preview.unavailableEyebrow")}</p>
            <h1>{t("preview.unavailableTitle")}</h1>
            <p>{t("preview.unavailableBody")}</p>
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
  const missingSections = projection.missingSections.map((section) =>
    t(missingSectionLabels[section]),
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
      <main className={styles.shell} lang={LOCALE_DETAILS[locale].htmlLang}>
        <div className={styles.previewBar}>
          <div>
            <p className={styles.eyebrow}>{t("preview.eyebrow")}</p>
            <p>{t("preview.lead")}</p>
          </div>
          <div className={styles.previewActions}>
            <span className={styles.statusChip}>
              {t("preview.draftChip", { version: draft?.version ?? 0 })}
            </span>
            <Link className={styles.secondaryAction} href={dashboardHref}>
              {t("preview.editContent")}
            </Link>
            <Link className={styles.secondaryAction} href={designHref}>
              {t("preview.designPhotos")}
            </Link>
          </div>
        </div>

        {projection.isComplete ? (
          <section className={styles.guidance} role="status">
            <strong>{t("preview.completeTitle")}</strong>
            <span>{t("preview.completeBody")}</span>
          </section>
        ) : (
          <section className={styles.guidance} role="note">
            <strong>{t("preview.progressTitle")}</strong>
            <span>
              {t("preview.progressBody", {
                missing: missingSections.join(", "),
              })}
            </span>
          </section>
        )}

        {/* The generated website is the business's own site, which has no
            Welsh version yet, so it stays English inside a Welsh page. */}
        <div
          style={{ display: "contents" }}
          lang={locale === "cy" ? LOCALE_DETAILS.en.htmlLang : undefined}
        >
          {website}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
