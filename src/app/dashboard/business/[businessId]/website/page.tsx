import { randomUUID } from "node:crypto";
import type { Metadata, Route } from "next";
import type { CSSProperties } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { DashboardTabs } from "../_hub/dashboard-tabs";
import { readDashboardTabAccess } from "../_hub/tab-access";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isPublicDemoEmail } from "@/lib/public-demo-policy";
import { getAuth } from "@/lib/auth";
import {
  authoredTextLang,
  layoutName,
  sectionLabel,
} from "@/lib/i18n/business-copy";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import { isMediaStorageConfigured } from "@/lib/media-storage";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import {
  businessAccents,
  businessSections,
  defaultAppearanceForVariant,
  getAccent,
  resolveCategoryVariant,
  sectionCopyLimits,
  type BusinessSectionId,
} from "@/modules/businesses/appearance";
import {
  getBusinessAppearanceState,
  getBusinessPresentationContext,
} from "@/modules/businesses/appearance-repository";
import { listBusinessMedia, mediaLimits } from "@/modules/businesses/media";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { resetAppearanceAction, saveAppearanceAction } from "./actions";
import { PictureIcon } from "./designer-icons";
import designerStyles from "./designer.module.css";
import { LivePreview } from "./live-preview";
import { SectionRows } from "./section-rows";
import { StudioBar } from "./studio-bar";
import { ThemePicker } from "./theme-picker";

/** Approved accent colours by key, for the pickers' live selected states. */
const accentColours = Object.fromEntries(
  businessAccents.map((option) => [
    option.key,
    { primary: option.primary, strong: option.strong, soft: option.soft },
  ]),
);

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t("design.metaTitle") };
}

const outcomeMessages: Record<
  string,
  { tone: "ok" | "warn"; key: MessageKey }
> = {
  saved: { tone: "ok", key: "design.outcome.saved" },
  reset: { tone: "ok", key: "design.outcome.reset" },
  uploaded: { tone: "ok", key: "design.outcome.uploaded" },
  "media-saved": { tone: "ok", key: "design.outcome.mediaSaved" },
  moved: { tone: "ok", key: "design.outcome.moved" },
  unchanged: { tone: "ok", key: "design.outcome.unchanged" },
  stale: { tone: "warn", key: "design.outcome.stale" },
  removed: { tone: "ok", key: "design.outcome.removed" },
  invalid: { tone: "warn", key: "design.outcome.invalid" },
  limit: { tone: "warn", key: "design.outcome.limit" },
  disabled: { tone: "warn", key: "design.outcome.disabled" },
  forbidden: { tone: "warn", key: "design.outcome.forbidden" },
  missing: { tone: "warn", key: "design.outcome.missing" },
  unavailable: { tone: "warn", key: "design.outcome.unavailable" },
};

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

export default async function BusinessWebsitePage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ outcome?: string }>;
}) {
  const { locale, t } = await getTranslator();
  const session = await readSession();
  if (!session) redirect("/login?next=/dashboard");

  const { businessId } = await params;
  if (!z.uuid().safeParse(businessId).success) notFound();

  const canView = await canUserAccessBusiness({
    userId: session.user.id,
    businessId,
    permission: businessPermissions.view,
  });
  if (!canView) notFound();

  const canEdit = await canUserAccessBusiness({
    userId: session.user.id,
    businessId,
    permission: businessPermissions.editProfile,
  });

  const tabAccess = await readDashboardTabAccess({
    userId: session.user.id,
    businessId,
    isPublicDemo: isPublicDemoEmail(session.user.email),
  });

  const [{ appearance, saved: designSaved }, media, memberships, context] =
    await Promise.all([
      getBusinessAppearanceState(businessId),
      listBusinessMedia(businessId),
      listAccessibleBusinesses(session.user.id),
      getBusinessPresentationContext(businessId),
    ]);
  const membership = memberships.find((entry) => entry.id === businessId);
  const uploadsEnabled = isMediaStorageConfigured();
  // Categories are platform content with an optional stored Welsh label; the
  // English name stays the fallback, marked as English inside a Welsh page.
  const welshCategory =
    locale === "cy" ? (context?.category.welshLabel ?? null) : null;
  const categoryLabel = welshCategory ?? context?.category.name ?? "";
  const categoryLang =
    locale === "cy" && !welshCategory ? LOCALE_DETAILS.en.htmlLang : undefined;
  const suggestedDesign = defaultAppearanceForVariant(
    context
      ? resolveCategoryVariant(context.category.name, context.category.slug)
      : "general",
  );
  const outcome = outcomeMessages[(await searchParams).outcome ?? ""];
  // Any saved change to the appearance or pictures remounts the preview, so a
  // server action that redirects back here never leaves an old frame showing.
  const previewVersion = JSON.stringify([
    appearance,
    [media.logo, media.hero, ...media.gallery].map((item) =>
      item ? [item.id, item.url, item.focalX, item.focalY, item.altText] : null,
    ),
  ]);
  // The controls are uncontrolled inputs, so they are remounted whenever the
  // saved design changes (a save, or a reset to the suggested design):
  // otherwise they would go on showing the choices from before.
  const designVersion = JSON.stringify(appearance);
  const accent = getAccent(appearance.accentKey);
  const pickerStyle = {
    "--picker-accent": accent.primary,
    "--picker-strong": accent.strong,
    "--picker-soft": accent.soft,
  } as CSSProperties;
  const previewPath = `/dashboard/business/${businessId}/preview`;
  // Where each section's content is added. A link is offered only where the
  // reader can open that page; each page still authorises on its own.
  const sectionHomes: Record<
    BusinessSectionId,
    { path: string; tab: MessageKey; allowed: boolean }
  > = {
    about: { path: "/profile", tab: "hub.tab.profile", allowed: canEdit },
    services: { path: "/profile", tab: "hub.tab.profile", allowed: canEdit },
    location: { path: "/profile", tab: "hub.tab.profile", allowed: canEdit },
    hours: { path: "/profile", tab: "hub.tab.profile", allowed: canEdit },
    accessibility: {
      path: "/profile",
      tab: "hub.tab.profile",
      allowed: canEdit,
    },
    gallery: { path: "/photos", tab: "hub.tab.photos", allowed: canEdit },
    offers: {
      path: "/offers",
      tab: "hub.tab.offers",
      allowed: tabAccess.canContent,
    },
    events: {
      path: "/events",
      tab: "hub.tab.events",
      allowed: tabAccess.canContent,
    },
    contact: {
      path: "/operations#contacts",
      tab: "hub.tab.operations",
      allowed: tabAccess.canOperate,
    },
    menu: {
      path: "/operations#menu",
      tab: "hub.tab.operations",
      allowed: tabAccess.canOperate,
    },
  };
  const addContentLink = (id: BusinessSectionId) => {
    const home = sectionHomes[id];
    return home.allowed
      ? {
          href: `/dashboard/business/${businessId}${home.path}`,
          label: t("design.designer.emptyLink", { page: t(home.tab) }),
        }
      : null;
  };
  const photosHref = `/dashboard/business/${businessId}/photos` as Route;
  const galleryPeek = media.gallery.slice(0, 4);

  return (
    <>
      <SiteHeader />
      <main
        className={`dashboard-shell ${designerStyles.studio}`}
        lang={LOCALE_DETAILS[locale].htmlLang}
      >
        <nav className="business-breadcrumb" aria-label={t("dash.breadcrumb")}>
          <Link href={`/dashboard/business/${businessId}` as Route}>
            <span aria-hidden="true">← </span>
            {t("design.back")}
          </Link>
        </nav>

        <DashboardTabs
          businessId={businessId}
          current="website"
          canDesign
          canOperate={tabAccess.canOperate}
          canContent={tabAccess.canContent}
        />

        <section className={`dashboard-hero ${designerStyles.header}`}>
          <div className={designerStyles.headerText}>
            <p className="eyebrow">{t("design.eyebrow")}</p>
            <h1>
              {t("design.titleBefore")}
              {membership?.tradingName ? (
                <span lang={authoredTextLang}>{membership.tradingName}</span>
              ) : (
                t("design.fallbackName")
              )}
              {t("design.titleAfter")}
            </h1>
            <p className="lead">{t("design.lead")}</p>
          </div>
          {context ? (
            <p className={designerStyles.headerNote}>
              {t("design.categoryPrefix")}{" "}
              <strong lang={categoryLang}>{categoryLabel}</strong>
              {t("design.categorySuffix")}
            </p>
          ) : null}
          {outcome ? (
            <p
              className={designerStyles.outcome}
              data-tone={outcome.tone}
              role="status"
            >
              {t(outcome.key)}
            </p>
          ) : null}
          {!canEdit ? (
            <p className={designerStyles.outcome} data-tone="warn" role="note">
              {t("design.viewOnly")}
            </p>
          ) : null}
        </section>

        <section
          className={designerStyles.workspace}
          aria-labelledby="appearance-h"
        >
          <h2 id="appearance-h" className="sr-only">
            {t("design.appearance.title")}
          </h2>
          <div className={designerStyles.layout}>
            <div className={designerStyles.controls}>
              <form
                action={saveAppearanceAction}
                className={designerStyles.form}
                id="appearance-form"
                // Browsers may restore earlier unsaved choices into a form on
                // reload; the controls must start from the saved design.
                autoComplete="off"
                style={pickerStyle}
              >
                <input type="hidden" name="businessId" value={businessId} />

                {/* Keyed on the saved design: see designVersion above. The
                    key is on this wrapper, not the form, because React keeps
                    a form that is mid-submission and would show both. */}
                <div key={designVersion} className={designerStyles.formBody}>
                  <ThemePicker
                    t={t}
                    appearance={appearance}
                    suggested={suggestedDesign}
                    canEdit={canEdit}
                  />

                  <fieldset disabled={!canEdit}>
                    <legend>{t("design.appearance.sectionsLegend")}</legend>
                    <p className={designerStyles.help}>
                      {t("design.appearance.sectionsNote")}
                    </p>
                    {!designSaved && context ? (
                      <p className={designerStyles.callout} role="note">
                        {t("design.appearance.startingNote", {
                          category: categoryLabel,
                        })}
                      </p>
                    ) : null}
                    <SectionRows
                      sections={businessSections.map((section) => {
                        const label = sectionLabel(t, section.id);
                        return {
                          id: section.id,
                          label,
                          showLabel: t("design.appearance.show", {
                            section: label,
                          }),
                          moveUpLabel: t("design.designer.moveUp", {
                            section: label,
                          }),
                          moveDownLabel: t("design.designer.moveDown", {
                            section: label,
                          }),
                          addContent: addContentLink(section.id),
                          copy: appearance.sectionCopy[section.id] ?? {
                            heading: { en: "", cy: "" },
                            intro: { en: "", cy: "" },
                          },
                          layouts: section.layouts.map((layout) => ({
                            key: layout.key,
                            name: layoutName(t, section.id, layout.key),
                          })),
                        };
                      })}
                      initialOrder={appearance.sectionOrder}
                      hidden={appearance.hiddenSections}
                      layouts={appearance.sectionLayouts}
                      disabled={!canEdit}
                      text={{
                        layout: t("design.appearance.layout"),
                        hiddenTag: t("design.designer.hidden"),
                        emptyNote: t("design.designer.emptyNote"),
                        copySummary: t("design.copy.summary"),
                        copyHint: t("design.copy.hint"),
                        headingEn: t("design.copy.headingEn"),
                        headingCy: t("design.copy.headingCy"),
                        introEn: t("design.copy.introEn"),
                        introCy: t("design.copy.introCy"),
                        standardWording: t("design.copy.standard"),
                        count: t("design.copy.count", {
                          used: "{used}",
                          max: "{max}",
                        }),
                        limits: sectionCopyLimits,
                        moved: t("design.designer.moved", {
                          section: "{section}",
                          position: "{position}",
                          total: "{total}",
                        }),
                      }}
                    />
                  </fieldset>
                </div>
              </form>

              {canEdit ? (
                <form
                  action={resetAppearanceAction}
                  className={designerStyles.reset}
                >
                  <input type="hidden" name="businessId" value={businessId} />
                  <button type="submit">{t("design.appearance.reset")}</button>
                </form>
              ) : null}

              <StudioBar
                key={designVersion}
                renderToken={randomUUID()}
                formId="appearance-form"
                previewHref={previewPath}
                accents={accentColours}
                canEdit={canEdit}
                text={{
                  save: t("design.appearance.save"),
                  saving: t("design.designer.saving"),
                  preview: t("design.designer.previewTitle"),
                  unsaved: t("design.designer.unsaved"),
                  saved: t("design.designer.allSaved"),
                  discard: t("design.designer.discard"),
                  viewOnly: t("design.designer.viewOnlyShort"),
                }}
              />
            </div>

            <LivePreview
              key={previewVersion}
              formId="appearance-form"
              previewPath={previewPath}
              sectionIds={businessSections.map((section) => section.id)}
              locale={locale}
              text={{
                title: t("design.designer.previewTitle"),
                note: t("design.designer.previewNote"),
                frame: t("design.designer.previewFrame"),
                width: t("design.designer.previewWidth"),
                desktop: t("design.designer.desktop"),
                tablet: t("design.designer.tablet"),
                mobile: t("design.designer.mobile"),
                updating: t("design.designer.updating"),
                openFull: t("design.designer.openFull"),
                close: t("design.designer.closePreview"),
                privateLabel: t("design.designer.private"),
              }}
            />
          </div>
        </section>

        <section className={designerStyles.pictures} aria-labelledby="media-h">
          <div className={designerStyles.picturesHead}>
            <div>
              <p className="eyebrow">{t("design.photos.eyebrow")}</p>
              <h2 id="media-h">{t("design.photos.title")}</h2>
              <p className={designerStyles.help}>
                {t("design.photos.summary")}
              </p>
            </div>
            <Link className="button primary" href={photosHref}>
              {t("photos.website.link")}
            </Link>
          </div>

          {!uploadsEnabled ? (
            <p className={designerStyles.callout} role="note">
              {t("design.photos.storageOff")}
            </p>
          ) : null}

          <ul className={designerStyles.pictureCards}>
            {(["logo", "hero"] as const).map((role) => {
              const current = media[role];
              return (
                <li className={designerStyles.pictureCard} key={role}>
                  <span
                    className={designerStyles.pictureThumb}
                    data-kind={role}
                    data-empty={current ? undefined : true}
                  >
                    {current ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={current.url}
                        alt={current.altText || t("design.media.fallbackAlt")}
                        lang={current.altText ? authoredTextLang : undefined}
                        style={{
                          objectPosition: `${current.focalX}% ${current.focalY}%`,
                        }}
                      />
                    ) : (
                      <PictureIcon kind={role === "logo" ? "logo" : "cover"} />
                    )}
                  </span>
                  <span className={designerStyles.pictureText}>
                    <strong>
                      {role === "logo"
                        ? t("design.photos.logo")
                        : t("design.photos.hero")}
                    </strong>
                    <span data-state={current ? "added" : "empty"}>
                      {current
                        ? t("design.photos.added")
                        : role === "logo"
                          ? t("design.photos.noLogo")
                          : t("design.photos.noHero")}
                    </span>
                  </span>
                </li>
              );
            })}
            <li className={designerStyles.pictureCard}>
              <span
                className={designerStyles.pictureThumb}
                data-kind="gallery"
                data-empty={galleryPeek.length ? undefined : true}
              >
                {galleryPeek.length ? (
                  galleryPeek.map((item) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={item.id}
                      src={item.url}
                      alt={item.altText || t("design.media.fallbackAlt")}
                      lang={item.altText ? authoredTextLang : undefined}
                      style={{
                        objectPosition: `${item.focalX}% ${item.focalY}%`,
                      }}
                    />
                  ))
                ) : (
                  <PictureIcon kind="gallery" />
                )}
              </span>
              <span className={designerStyles.pictureText}>
                <strong>
                  {t("design.photos.gallery", {
                    count: media.gallery.length,
                    max: mediaLimits.gallery,
                  })}
                </strong>
                <span data-state={media.gallery.length ? "added" : "empty"}>
                  {media.gallery.length
                    ? t("design.photos.added")
                    : t("design.photos.noGallery")}
                </span>
              </span>
            </li>
          </ul>
        </section>

        <p className="actions">
          <Link
            className="button primary"
            href={`/dashboard/business/${businessId}/preview` as Route}
          >
            {t("design.preview")}
          </Link>
          <Link
            className="button"
            href={`/dashboard/business/${businessId}` as Route}
          >
            {t("design.returnEditor")}
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
