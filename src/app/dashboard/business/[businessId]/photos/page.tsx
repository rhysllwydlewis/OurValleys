import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { authoredTextLang } from "@/lib/i18n/business-copy";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey, Translator } from "@/lib/i18n/translate";
import { isMediaStorageConfigured } from "@/lib/media-storage";
import { isPublicDemoEmail } from "@/lib/public-demo-policy";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import {
  loadBusinessMedia,
  mediaLimits,
  type BusinessMediaItem,
} from "@/modules/businesses/media";
import { maxImageBytes } from "@/modules/businesses/media-validation";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import {
  assessAltText,
  objectPositionFor,
  photoCompleteness,
  recommendedGallery,
} from "@/modules/businesses/photo-studio-model";
import { GalleryOrderEditor } from "../website/gallery-order-editor";
import { DashboardTabs } from "../_hub/dashboard-tabs";
import hubStyles from "../_hub/hub.module.css";
import { readDashboardTabAccess } from "../_hub/tab-access";
import {
  makeCoverPhotoAction,
  movePhotoAction,
  removePhotoAction,
  reorderPhotosAction,
  savePhotoAction,
  uploadPhotoAction,
} from "./actions";
import { PhotoEditor } from "./photo-editor";
import { PhotoUploader } from "./photo-uploader";
import styles from "./photos.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("photos.metaTitle"),
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

const outcomes: Record<string, { tone: "ok" | "bad"; key: MessageKey }> = {
  uploaded: { tone: "ok", key: "photos.outcome.uploaded" },
  "photo-saved": { tone: "ok", key: "photos.outcome.photo-saved" },
  "cover-set": { tone: "ok", key: "photos.outcome.cover-set" },
  moved: { tone: "ok", key: "photos.outcome.moved" },
  removed: { tone: "ok", key: "photos.outcome.removed" },
  unchanged: { tone: "ok", key: "photos.outcome.unchanged" },
  stale: { tone: "bad", key: "photos.outcome.stale" },
  invalid: { tone: "bad", key: "photos.outcome.invalid" },
  undescribed: { tone: "bad", key: "photos.outcome.undescribed" },
  limit: { tone: "bad", key: "photos.outcome.limit" },
  disabled: { tone: "bad", key: "photos.outcome.disabled" },
  forbidden: { tone: "bad", key: "photos.outcome.forbidden" },
  missing: { tone: "bad", key: "photos.outcome.missing" },
  unavailable: { tone: "bad", key: "photos.outcome.unavailable" },
};

function HiddenIds({
  businessId,
  mediaId,
}: {
  businessId: string;
  mediaId: string;
}) {
  return (
    <>
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="mediaId" value={mediaId} />
    </>
  );
}

function RemoveControl({
  t,
  businessId,
  mediaId,
}: {
  t: Translator;
  businessId: string;
  mediaId: string;
}) {
  return (
    <details className={styles.remove}>
      <summary className="button">{t("photos.remove.summary")}</summary>
      <form action={removePhotoAction} className={styles.removeBody}>
        <HiddenIds businessId={businessId} mediaId={mediaId} />
        <p>{t("photos.remove.warning")}</p>
        <button className={`button ${styles.danger}`} type="submit">
          {t("photos.remove.confirm")}
        </button>
      </form>
    </details>
  );
}

function EditablePhoto({
  businessId,
  item,
  canEdit,
}: {
  businessId: string;
  item: BusinessMediaItem;
  canEdit: boolean;
}) {
  return (
    <PhotoEditor
      // Remount when the saved photo changes (a different photo became the
      // cover, or a save came back) so the form never shows stale state.
      key={`${item.id}:${item.altText}:${item.focalX}:${item.focalY}`}
      businessId={businessId}
      canEdit={canEdit}
      action={savePhotoAction}
      photo={{
        id: item.id,
        role: item.role,
        url: item.url,
        altText: item.altText,
        focalX: item.focalX,
        focalY: item.focalY,
      }}
    />
  );
}

function GalleryTile({
  t,
  businessId,
  item,
  index,
  total,
  canEdit,
}: {
  t: Translator;
  businessId: string;
  item: BusinessMediaItem;
  index: number;
  total: number;
  canEdit: boolean;
}) {
  const needsDescription =
    assessAltText(item.altText, "gallery").level === "needs-work";
  const name =
    item.altText.trim() || t("photos.tile.fallbackName", { n: index + 1 });
  return (
    <li className={styles.tile} id={`photo-${item.id}`}>
      <div className={styles.tileImage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.url}
          alt={item.altText}
          style={{
            objectPosition: objectPositionFor({
              x: item.focalX,
              y: item.focalY,
            }),
          }}
        />
        {needsDescription ? (
          <span className={styles.badge} data-tone="warn">
            {t("photos.tile.needsDescription")}
          </span>
        ) : null}
      </div>
      <p className={styles.tileMeta}>
        <span className={styles.tileName} lang={authoredTextLang || undefined}>
          {name}
        </span>
        <span className={styles.tilePosition}>
          {t("photos.tile.position", { n: index + 1, total })}
        </span>
      </p>
      <details className={styles.tileDetails}>
        <summary className="button">{t("photos.tile.edit")}</summary>
        <div className={styles.tileBody}>
          <EditablePhoto
            businessId={businessId}
            item={item}
            canEdit={canEdit}
          />
          {canEdit ? (
            <div className={styles.tileActions}>
              <form action={makeCoverPhotoAction}>
                <HiddenIds businessId={businessId} mediaId={item.id} />
                <button className="button" type="submit">
                  {t("photos.action.makeCover")}
                </button>
              </form>
              <div
                className={styles.order}
                role="group"
                aria-label={t("photos.action.orderAria")}
              >
                <form action={movePhotoAction}>
                  <HiddenIds businessId={businessId} mediaId={item.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button
                    className="button"
                    type="submit"
                    disabled={index === 0}
                  >
                    {t("photos.action.moveEarlier")}
                  </button>
                </form>
                <form action={movePhotoAction}>
                  <HiddenIds businessId={businessId} mediaId={item.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    className="button"
                    type="submit"
                    disabled={index === total - 1}
                  >
                    {t("photos.action.moveLater")}
                  </button>
                </form>
              </div>
              <RemoveControl t={t} businessId={businessId} mediaId={item.id} />
            </div>
          ) : null}
        </div>
      </details>
    </li>
  );
}

export default async function BusinessPhotosPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ outcome?: string }>;
}) {
  const { locale, t } = await getTranslator();
  const htmlLang = LOCALE_DETAILS[locale].htmlLang;
  const session = await readSession();
  if (!session) redirect("/login?next=/account");

  const { businessId } = await params;
  const parsedBusinessId = z.uuid().safeParse(businessId);
  if (!parsedBusinessId.success) notFound();
  const id = parsedBusinessId.data;

  const canView = await canUserAccessBusiness({
    userId: session.user.id,
    businessId: id,
    permission: businessPermissions.view,
  });
  if (!canView) notFound();

  const isDemo = isPublicDemoEmail(session.user.email);
  const [canEditProfile, tabAccess, memberships, media] = await Promise.all([
    canUserAccessBusiness({
      userId: session.user.id,
      businessId: id,
      permission: businessPermissions.editProfile,
    }),
    readDashboardTabAccess({
      userId: session.user.id,
      businessId: id,
      isPublicDemo: isDemo,
    }),
    listAccessibleBusinesses(session.user.id).catch(() => []),
    // A failed read must not look like "no photos": that would offer uploads
    // that replace a logo or cover which is merely hidden.
    loadBusinessMedia(id).catch(() => null),
  ]);
  const summary = memberships.find((item) => item.id === id);
  if (!summary) notFound();
  if (!media) {
    return (
      <>
        <SiteHeader />
        <main className={`dashboard-shell ${hubStyles.wide}`} lang={htmlLang}>
          <p className={styles.notice} data-tone="bad" role="alert">
            {t("photos.unavailable")}
          </p>
        </main>
        <SiteFooter />
      </>
    );
  }

  const canEdit = canEditProfile && !isDemo;
  const uploadsEnabled = isMediaStorageConfigured();
  const canUpload = canEdit && uploadsEnabled;
  const requestedOutcome = (await searchParams).outcome ?? "";
  // Own keys only: `?outcome=constructor` must not find an inherited member.
  const outcome = Object.hasOwn(outcomes, requestedOutcome)
    ? outcomes[requestedOutcome]
    : undefined;
  const completeness = photoCompleteness(media);
  const galleryFull = media.gallery.length >= mediaLimits.gallery;

  return (
    <>
      <SiteHeader />
      <main className={`dashboard-shell ${hubStyles.wide}`} lang={htmlLang}>
        <nav className="business-breadcrumb" aria-label={t("dash.breadcrumb")}>
          <Link href={`/dashboard/business/${id}` as Route}>
            <span aria-hidden="true">← </span>
            {t("photos.back")}
          </Link>
        </nav>
        <header className={hubStyles.header}>
          <div>
            <p className="eyebrow">{t("photos.eyebrow")}</p>
            <h1>{t("photos.title")}</h1>
            <p className="lead">
              <span lang={authoredTextLang || undefined}>
                {summary.tradingName}
              </span>
              {" · "}
              {t("photos.lead")}
            </p>
          </div>
        </header>
        <DashboardTabs
          businessId={id}
          current="photos"
          canDesign={tabAccess.canDesign}
          canOperate={tabAccess.canOperate}
        />

        {outcome ? (
          <p
            className={styles.notice}
            data-tone={outcome.tone}
            role={outcome.tone === "bad" ? "alert" : "status"}
          >
            {t(outcome.key)}
          </p>
        ) : null}
        {isDemo ? (
          <p className={styles.notice} role="status">
            {t("photos.demo")}
          </p>
        ) : !canEditProfile ? (
          <p className={styles.notice} role="status">
            {t("photos.readOnly")}
          </p>
        ) : !uploadsEnabled ? (
          <p className={styles.notice} role="status">
            {t("photos.storageOff")}
          </p>
        ) : null}

        <div className={styles.layout}>
          <div className={styles.main}>
            <section className={styles.section} aria-labelledby="cover-h">
              <header className={styles.sectionHead}>
                <h2 id="cover-h">{t("photos.cover.title")}</h2>
                <p>{t("photos.cover.hint")}</p>
              </header>
              {media.hero ? (
                <div className={styles.featured} id={`photo-${media.hero.id}`}>
                  <EditablePhoto
                    businessId={id}
                    item={media.hero}
                    canEdit={canEdit}
                  />
                  {canEdit ? (
                    <div className={styles.tileActions}>
                      <RemoveControl
                        t={t}
                        businessId={id}
                        mediaId={media.hero.id}
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className={styles.empty}>{t("photos.cover.empty")}</p>
              )}
              {canUpload ? (
                <details className={styles.uploadDetails}>
                  <summary className="button">
                    {media.hero
                      ? t("photos.upload.replaceCover")
                      : t("photos.upload.cover")}
                  </summary>
                  <PhotoUploader
                    businessId={id}
                    role="hero"
                    action={uploadPhotoAction}
                    title={
                      media.hero
                        ? t("photos.upload.replaceCover")
                        : t("photos.upload.cover")
                    }
                    maxBytes={maxImageBytes}
                    replaces={media.hero !== null}
                  />
                </details>
              ) : null}
            </section>

            <section className={styles.section} aria-labelledby="gallery-h">
              <header className={styles.sectionHead}>
                <h2 id="gallery-h">
                  {t("photos.gallery.title", {
                    count: media.gallery.length,
                    max: mediaLimits.gallery,
                  })}
                </h2>
                <p>{t("photos.gallery.hint")}</p>
              </header>
              {canEdit && media.gallery.length > 1 ? (
                <GalleryOrderEditor
                  businessId={id}
                  action={reorderPhotosAction}
                  items={media.gallery.map((item) => ({
                    id: item.id,
                    url: item.url,
                    altText: item.altText,
                  }))}
                />
              ) : null}
              {media.gallery.length > 0 ? (
                <ul className={styles.tiles}>
                  {media.gallery.map((item, index) => (
                    <GalleryTile
                      key={item.id}
                      t={t}
                      businessId={id}
                      item={item}
                      index={index}
                      total={media.gallery.length}
                      canEdit={canEdit}
                    />
                  ))}
                </ul>
              ) : (
                <p className={styles.empty}>{t("photos.gallery.empty")}</p>
              )}
              {canUpload && !galleryFull ? (
                <details className={styles.uploadDetails}>
                  <summary className="button">
                    {t("photos.upload.gallery")}
                  </summary>
                  <PhotoUploader
                    businessId={id}
                    role="gallery"
                    action={uploadPhotoAction}
                    title={t("photos.upload.gallery")}
                    maxBytes={maxImageBytes}
                    replaces={false}
                  />
                </details>
              ) : null}
              {canEdit && galleryFull ? (
                <p className={styles.empty}>
                  {t("photos.gallery.full", { max: mediaLimits.gallery })}
                </p>
              ) : null}
            </section>

            <section className={styles.section} aria-labelledby="logo-h">
              <header className={styles.sectionHead}>
                <h2 id="logo-h">{t("photos.logo.title")}</h2>
                <p>{t("photos.logo.hint")}</p>
              </header>
              {media.logo ? (
                <div className={styles.featured} id={`photo-${media.logo.id}`}>
                  <EditablePhoto
                    businessId={id}
                    item={media.logo}
                    canEdit={canEdit}
                  />
                  {canEdit ? (
                    <div className={styles.tileActions}>
                      <RemoveControl
                        t={t}
                        businessId={id}
                        mediaId={media.logo.id}
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className={styles.empty}>{t("photos.logo.empty")}</p>
              )}
              {canUpload ? (
                <details className={styles.uploadDetails}>
                  <summary className="button">
                    {media.logo
                      ? t("photos.upload.replaceLogo")
                      : t("photos.upload.logo")}
                  </summary>
                  <PhotoUploader
                    businessId={id}
                    role="logo"
                    action={uploadPhotoAction}
                    title={
                      media.logo
                        ? t("photos.upload.replaceLogo")
                        : t("photos.upload.logo")
                    }
                    maxBytes={maxImageBytes}
                    replaces={media.logo !== null}
                  />
                </details>
              ) : null}
            </section>
          </div>

          <aside
            className={styles.aside}
            aria-label={t("photos.progress.title")}
          >
            <section className={styles.card}>
              <h2>{t("photos.progress.title")}</h2>
              <p className={styles.progressText}>
                {t("photos.progress.text", {
                  done: completeness.done,
                  total: completeness.total,
                })}
              </p>
              <div
                className={styles.progressTrack}
                role="img"
                aria-label={t("photos.progress.aria", {
                  percent: completeness.percent,
                })}
              >
                <div
                  className={styles.progressFill}
                  style={{ width: `${completeness.percent}%` }}
                />
              </div>
              <ul className={styles.checklist}>
                {completeness.items.map((item) => (
                  <li key={item.id}>
                    <span
                      className={styles.mark}
                      data-done={item.done ? "true" : "false"}
                      aria-hidden="true"
                    >
                      {item.done ? "✓" : ""}
                    </span>
                    <span className={styles.markText}>
                      {t(`photos.check.${item.id}`, {
                        have: item.have ?? 0,
                        want:
                          item.id === "gallery"
                            ? recommendedGallery
                            : (item.want ?? 0),
                      })}
                    </span>
                    <span className={styles.state}>
                      {item.done
                        ? t("photos.check.done")
                        : t("photos.check.todo")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section className={styles.card}>
              <h2>{t("photos.tips.title")}</h2>
              <ul className={styles.tips}>
                <li>{t("photos.tips.one")}</li>
                <li>{t("photos.tips.two")}</li>
                <li>{t("photos.tips.three")}</li>
              </ul>
              <Link
                className="button"
                href={`/dashboard/business/${id}/preview` as Route}
              >
                {t("photos.viewSite")}
              </Link>
            </section>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
