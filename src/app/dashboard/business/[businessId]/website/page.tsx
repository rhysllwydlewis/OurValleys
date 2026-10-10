import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import {
  accentName,
  authoredTextLang,
  layoutName,
  sectionLabel,
  templateCopy,
} from "@/lib/i18n/business-copy";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey, Translator } from "@/lib/i18n/translate";
import { isMediaStorageConfigured } from "@/lib/media-storage";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import {
  businessAccents,
  businessSections,
  businessTemplates,
  sectionCopyLimits,
} from "@/modules/businesses/appearance";
import {
  getBusinessAppearanceState,
  getBusinessPresentationContext,
} from "@/modules/businesses/appearance-repository";
import {
  listBusinessMedia,
  mediaLimits,
  type BusinessMediaItem,
  type BusinessMediaRole,
} from "@/modules/businesses/media";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import {
  moveMediaAction,
  reorderGalleryAction,
  removeMediaAction,
  resetAppearanceAction,
  saveAppearanceAction,
  updateMediaAction,
  uploadMediaAction,
} from "./actions";
import designerStyles from "./designer.module.css";
import { GalleryOrderEditor } from "./gallery-order-editor";
import { LivePreview } from "./live-preview";
import { SectionRows } from "./section-rows";

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

const focalOptions = [0, 25, 50, 75, 100] as const;

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

function focalLabel(t: Translator, value: number) {
  if (value === 0) return t("design.focal.start");
  if (value === 25) return t("design.focal.quarter");
  if (value === 50) return t("design.focal.centre");
  if (value === 75) return t("design.focal.threeQuarters");
  return t("design.focal.end");
}

function FocalSelect({
  t,
  name,
  label,
  defaultValue = 50,
}: {
  t: Translator;
  name: string;
  label: string;
  defaultValue?: number;
}) {
  return (
    <label>
      {label}
      <select name={name} defaultValue={String(defaultValue)}>
        {focalOptions.map((value) => (
          <option key={value} value={value}>
            {t("design.focal.option", { label: focalLabel(t, value), value })}
          </option>
        ))}
      </select>
    </label>
  );
}

function UploadForm({
  t,
  businessId,
  role,
  buttonLabel,
}: {
  t: Translator;
  businessId: string;
  role: BusinessMediaRole;
  buttonLabel: string;
}) {
  return (
    <form action={uploadMediaAction} className="media-upload">
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="role" value={role} />
      <label>
        {t("design.upload.choose")}
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          required
        />
      </label>
      <label>
        {role === "logo"
          ? t("design.upload.logoAlt")
          : t("design.upload.imageAlt")}
        <input
          type="text"
          name="altText"
          lang={authoredTextLang}
          maxLength={300}
          required={role !== "logo"}
          placeholder={
            role === "logo"
              ? t("design.upload.logoPlaceholder")
              : t("design.upload.imagePlaceholder")
          }
        />
      </label>
      <FocalSelect t={t} name="focalX" label={t("design.focal.horizontal")} />
      <FocalSelect t={t} name="focalY" label={t("design.focal.vertical")} />
      <button className="button primary" type="submit">
        {buttonLabel}
      </button>
    </form>
  );
}

function MediaEditor({
  t,
  businessId,
  item,
  canEdit,
  galleryIndex,
  galleryCount,
}: {
  t: Translator;
  businessId: string;
  item: BusinessMediaItem;
  canEdit: boolean;
  galleryIndex?: number;
  galleryCount?: number;
}) {
  return (
    <figure className="media-item">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.url}
        alt={item.altText || t("design.media.fallbackAlt")}
        style={{ objectPosition: `${item.focalX}% ${item.focalY}%` }}
      />
      {canEdit ? (
        <>
          <form action={updateMediaAction} className="media-upload">
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="mediaId" value={item.id} />
            <label>
              {t("design.media.description")}
              <input
                type="text"
                name="altText"
                lang={authoredTextLang}
                maxLength={300}
                required={item.role !== "logo"}
                defaultValue={item.altText}
              />
            </label>
            <FocalSelect
              t={t}
              name="focalX"
              label={t("design.focal.horizontal")}
              defaultValue={item.focalX}
            />
            <FocalSelect
              t={t}
              name="focalY"
              label={t("design.focal.vertical")}
              defaultValue={item.focalY}
            />
            <button className="button" type="submit">
              {t("design.media.saveSettings")}
            </button>
          </form>

          {item.role === "gallery" &&
          galleryIndex !== undefined &&
          galleryCount !== undefined ? (
            <div
              className="actions"
              aria-label={t("design.media.orderControls")}
            >
              <form action={moveMediaAction}>
                <input type="hidden" name="businessId" value={businessId} />
                <input type="hidden" name="mediaId" value={item.id} />
                <input type="hidden" name="direction" value="up" />
                <button
                  className="button"
                  type="submit"
                  disabled={galleryIndex === 0}
                >
                  {t("design.media.moveEarlier")}
                </button>
              </form>
              <form action={moveMediaAction}>
                <input type="hidden" name="businessId" value={businessId} />
                <input type="hidden" name="mediaId" value={item.id} />
                <input type="hidden" name="direction" value="down" />
                <button
                  className="button"
                  type="submit"
                  disabled={galleryIndex === galleryCount - 1}
                >
                  {t("design.media.moveLater")}
                </button>
              </form>
            </div>
          ) : null}

          <form action={removeMediaAction}>
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="mediaId" value={item.id} />
            <button className="button" type="submit">
              {t("design.media.remove")}
            </button>
          </form>
        </>
      ) : null}
    </figure>
  );
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
  const outcome = outcomeMessages[(await searchParams).outcome ?? ""];
  // Any saved change to the appearance or pictures remounts the preview, so a
  // server action that redirects back here never leaves an old frame showing.
  const previewVersion = JSON.stringify([
    appearance,
    [media.logo, media.hero, ...media.gallery].map((item) =>
      item ? [item.id, item.url, item.focalX, item.focalY, item.altText] : null,
    ),
  ]);
  return (
    <>
      <SiteHeader />
      <main className="dashboard-shell" lang={LOCALE_DETAILS[locale].htmlLang}>
        <nav className="business-breadcrumb" aria-label={t("dash.breadcrumb")}>
          <Link href={`/dashboard/business/${businessId}` as Route}>
            <span aria-hidden="true">← </span>
            {t("design.back")}
          </Link>
        </nav>

        <section className="dashboard-hero">
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
          {context ? (
            <p className="trust-note">
              {t("design.categoryPrefix")}{" "}
              <strong lang={categoryLang}>{categoryLabel}</strong>
              {t("design.categorySuffix")}
            </p>
          ) : null}
          {outcome ? (
            <p
              className={outcome.tone === "ok" ? "inline-empty" : "trust-note"}
              role="status"
            >
              {t(outcome.key)}
            </p>
          ) : null}
          {!canEdit ? (
            <p className="trust-note" role="note">
              {t("design.viewOnly")}
            </p>
          ) : null}
        </section>

        <section
          className={`business-section ${designerStyles.wide}`}
          aria-labelledby="appearance-h"
        >
          <p className="eyebrow">{t("design.appearance.eyebrow")}</p>
          <h2 id="appearance-h">{t("design.appearance.title")}</h2>
          <div className={designerStyles.layout}>
            <form
              action={saveAppearanceAction}
              className="appearance-form"
              id="appearance-form"
            >
              <input type="hidden" name="businessId" value={businessId} />

              <fieldset disabled={!canEdit}>
                <legend>{t("design.appearance.templateLegend")}</legend>
                {businessTemplates.map((template) => {
                  const copy = templateCopy(t, template.key);
                  return (
                    <label className="choice-row" key={template.key}>
                      <input
                        type="radio"
                        name="templateKey"
                        value={template.key}
                        defaultChecked={appearance.templateKey === template.key}
                      />
                      <span>
                        <strong>{copy.name}</strong> — {copy.description}
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              <fieldset disabled={!canEdit}>
                <legend>{t("design.appearance.colourLegend")}</legend>
                {businessAccents.map((accent) => (
                  <label className="choice-row" key={accent.key}>
                    <input
                      type="radio"
                      name="accentKey"
                      value={accent.key}
                      defaultChecked={appearance.accentKey === accent.key}
                    />
                    <span
                      className="accent-swatch"
                      style={{ background: accent.primary }}
                      aria-hidden="true"
                    />
                    <span>{accentName(t, accent.key)}</span>
                  </label>
                ))}
              </fieldset>

              <fieldset disabled={!canEdit}>
                <legend>{t("design.appearance.sectionsLegend")}</legend>
                <p className="trust-note">
                  {t("design.appearance.sectionsNote")}
                </p>
                {!designSaved && context ? (
                  <p className="inline-empty" role="note">
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

              {canEdit ? (
                <button className="button primary" type="submit">
                  {t("design.appearance.save")}
                </button>
              ) : null}
            </form>
            <LivePreview
              key={previewVersion}
              formId="appearance-form"
              previewPath={`/dashboard/business/${businessId}/preview`}
              sectionIds={businessSections.map((section) => section.id)}
              locale={locale}
              text={{
                title: t("design.designer.previewTitle"),
                note: t("design.designer.previewNote"),
                frame: t("design.designer.previewFrame"),
                width: t("design.designer.previewWidth"),
                desktop: t("design.designer.desktop"),
                mobile: t("design.designer.mobile"),
                updating: t("design.designer.updating"),
              }}
            />
          </div>

          {canEdit ? (
            <form action={resetAppearanceAction} className="save-row">
              <input type="hidden" name="businessId" value={businessId} />
              <button className="button" type="submit">
                {t("design.appearance.reset")}
              </button>
            </form>
          ) : null}
        </section>

        <section className="business-section" aria-labelledby="media-h">
          <p className="eyebrow">{t("design.photos.eyebrow")}</p>
          <h2 id="media-h">{t("design.photos.title")}</h2>
          <p className="trust-note">
            {t("design.photos.note", {
              logo: mediaLimits.logo,
              hero: mediaLimits.hero,
              gallery: mediaLimits.gallery,
            })}
          </p>

          {!uploadsEnabled ? (
            <p className="inline-empty" role="note">
              {t("design.photos.storageOff")}
            </p>
          ) : null}

          {(["logo", "hero"] as const).map((role) => {
            const current = media[role];
            return (
              <div className="detail-panel media-panel" key={role}>
                <h3>
                  {role === "logo"
                    ? t("design.photos.logo")
                    : t("design.photos.hero")}
                </h3>
                {current ? (
                  <MediaEditor
                    t={t}
                    businessId={businessId}
                    item={current}
                    canEdit={canEdit}
                  />
                ) : (
                  <p className="inline-empty">
                    {role === "logo"
                      ? t("design.photos.noLogo")
                      : t("design.photos.noHero")}
                  </p>
                )}
                {canEdit && uploadsEnabled ? (
                  <UploadForm
                    t={t}
                    businessId={businessId}
                    role={role}
                    buttonLabel={
                      current
                        ? role === "logo"
                          ? t("design.photos.replaceLogo")
                          : t("design.photos.replaceHero")
                        : role === "logo"
                          ? t("design.photos.uploadLogo")
                          : t("design.photos.uploadHero")
                    }
                  />
                ) : null}
              </div>
            );
          })}

          <div className="detail-panel media-panel">
            <h3>
              {t("design.photos.gallery", {
                count: media.gallery.length,
                max: mediaLimits.gallery,
              })}
            </h3>
            {canEdit && media.gallery.length > 1 ? (
              <GalleryOrderEditor
                businessId={businessId}
                action={reorderGalleryAction}
                items={media.gallery.map((item) => ({
                  id: item.id,
                  url: item.url,
                  altText: item.altText,
                }))}
              />
            ) : null}
            {media.gallery.length > 0 ? (
              <div className="media-grid">
                {media.gallery.map((item, index) => (
                  <MediaEditor
                    t={t}
                    businessId={businessId}
                    item={item}
                    canEdit={canEdit}
                    galleryIndex={index}
                    galleryCount={media.gallery.length}
                    key={item.id}
                  />
                ))}
              </div>
            ) : (
              <p className="inline-empty">{t("design.photos.noGallery")}</p>
            )}
            {canEdit &&
            uploadsEnabled &&
            media.gallery.length < mediaLimits.gallery ? (
              <UploadForm
                t={t}
                businessId={businessId}
                role="gallery"
                buttonLabel={t("design.photos.addGallery")}
              />
            ) : null}
          </div>
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
