import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { isMediaStorageConfigured } from "@/lib/media-storage";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import {
  businessAccents,
  businessSections,
  businessTemplates,
} from "@/modules/businesses/appearance";
import {
  getBusinessAppearance,
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
  removeMediaAction,
  resetAppearanceAction,
  saveAppearanceAction,
  updateMediaAction,
  uploadMediaAction,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Website design and photos",
};

const outcomeMessages: Record<string, { tone: "ok" | "warn"; text: string }> = {
  saved: { tone: "ok", text: "Your website appearance has been saved." },
  reset: { tone: "ok", text: "The safe default appearance has been restored." },
  uploaded: { tone: "ok", text: "The image has been uploaded safely." },
  "media-saved": {
    tone: "ok",
    text: "The image description and focal point have been saved.",
  },
  moved: { tone: "ok", text: "The gallery order has been updated." },
  unchanged: {
    tone: "ok",
    text: "That image is already at the end of the gallery.",
  },
  removed: { tone: "ok", text: "The image has been removed." },
  invalid: {
    tone: "warn",
    text: "That change was not valid. Check the image, description and focal point.",
  },
  limit: {
    tone: "warn",
    text: "You have reached the free image allowance for that slot.",
  },
  disabled: {
    tone: "warn",
    text: "Image uploads are not available in this environment yet.",
  },
  forbidden: {
    tone: "warn",
    text: "Your membership cannot edit this business.",
  },
  missing: {
    tone: "warn",
    text: "That image no longer exists. The page has been refreshed safely.",
  },
  unavailable: {
    tone: "warn",
    text: "The change could not be saved. Please try again shortly.",
  },
};

const focalOptions = [0, 25, 50, 75, 100] as const;

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

function focalLabel(value: number) {
  if (value === 0) return "Start / top";
  if (value === 25) return "Quarter";
  if (value === 50) return "Centre";
  if (value === 75) return "Three quarters";
  return "End / bottom";
}

function FocalSelect({
  name,
  label,
  defaultValue = 50,
}: {
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
            {focalLabel(value)} ({value}%)
          </option>
        ))}
      </select>
    </label>
  );
}

function UploadForm({
  businessId,
  role,
  buttonLabel,
}: {
  businessId: string;
  role: BusinessMediaRole;
  buttonLabel: string;
}) {
  return (
    <form action={uploadMediaAction} className="media-upload">
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="role" value={role} />
      <label>
        Choose an image
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          required
        />
      </label>
      <label>
        {role === "logo"
          ? "Logo description (optional)"
          : "Image description for screen-reader users"}
        <input
          type="text"
          name="altText"
          maxLength={300}
          required={role !== "logo"}
          placeholder={
            role === "logo"
              ? "The business logo"
              : "For example: our shopfront on Dunraven Street"
          }
        />
      </label>
      <FocalSelect name="focalX" label="Horizontal focus" />
      <FocalSelect name="focalY" label="Vertical focus" />
      <button className="button primary" type="submit">
        {buttonLabel}
      </button>
    </form>
  );
}

function MediaEditor({
  businessId,
  item,
  canEdit,
  galleryIndex,
  galleryCount,
}: {
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
        alt={item.altText || "Business image"}
        style={{ objectPosition: `${item.focalX}% ${item.focalY}%` }}
      />
      {canEdit ? (
        <>
          <form action={updateMediaAction} className="media-upload">
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="mediaId" value={item.id} />
            <label>
              Image description
              <input
                type="text"
                name="altText"
                maxLength={300}
                required={item.role !== "logo"}
                defaultValue={item.altText}
              />
            </label>
            <FocalSelect
              name="focalX"
              label="Horizontal focus"
              defaultValue={item.focalX}
            />
            <FocalSelect
              name="focalY"
              label="Vertical focus"
              defaultValue={item.focalY}
            />
            <button className="button" type="submit">
              Save image settings
            </button>
          </form>

          {item.role === "gallery" &&
          galleryIndex !== undefined &&
          galleryCount !== undefined ? (
            <div className="actions" aria-label="Gallery order controls">
              <form action={moveMediaAction}>
                <input type="hidden" name="businessId" value={businessId} />
                <input type="hidden" name="mediaId" value={item.id} />
                <input type="hidden" name="direction" value="up" />
                <button
                  className="button"
                  type="submit"
                  disabled={galleryIndex === 0}
                >
                  Move earlier
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
                  Move later
                </button>
              </form>
            </div>
          ) : null}

          <form action={removeMediaAction}>
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="mediaId" value={item.id} />
            <button className="button" type="submit">
              Remove image
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

  const [appearance, media, memberships, context] = await Promise.all([
    getBusinessAppearance(businessId),
    listBusinessMedia(businessId),
    listAccessibleBusinesses(session.user.id),
    getBusinessPresentationContext(businessId),
  ]);
  const membership = memberships.find((entry) => entry.id === businessId);
  const uploadsEnabled = isMediaStorageConfigured();
  const outcome = outcomeMessages[(await searchParams).outcome ?? ""];
  const orderIndex = new Map(
    appearance.sectionOrder.map((id, index) => [id, index + 1]),
  );

  return (
    <>
      <SiteHeader />
      <main className="dashboard-shell">
        <nav className="business-breadcrumb" aria-label="Breadcrumb">
          <Link href={`/dashboard/business/${businessId}` as Route}>
            <span aria-hidden="true">← </span>
            Business dashboard
          </Link>
        </nav>

        <section className="dashboard-hero">
          <p className="eyebrow">Website design and photos</p>
          <h1>Make {membership?.tradingName ?? "your website"} your own.</h1>
          <p className="lead">
            Choose a tested template and accessible colour, arrange complete
            sections, select approved layouts and add real photographs. The same
            settings drive the private preview and published website.
          </p>
          {context ? (
            <p className="trust-note">
              Category variant: <strong>{context.category.name}</strong>. The
              website keeps the selected template while adapting its visual
              details to the business category.
            </p>
          ) : null}
          {outcome ? (
            <p
              className={outcome.tone === "ok" ? "inline-empty" : "trust-note"}
              role="status"
            >
              {outcome.text}
            </p>
          ) : null}
          {!canEdit ? (
            <p className="trust-note" role="note">
              Your membership can view these settings but not change them.
            </p>
          ) : null}
        </section>

        <section className="business-section" aria-labelledby="appearance-h">
          <p className="eyebrow">Appearance</p>
          <h2 id="appearance-h">Template, colour, sections and layouts</h2>
          <form action={saveAppearanceAction} className="appearance-form">
            <input type="hidden" name="businessId" value={businessId} />

            <fieldset disabled={!canEdit}>
              <legend>Website template</legend>
              {businessTemplates.map((template) => (
                <label className="choice-row" key={template.key}>
                  <input
                    type="radio"
                    name="templateKey"
                    value={template.key}
                    defaultChecked={appearance.templateKey === template.key}
                  />
                  <span>
                    <strong>{template.name}</strong> — {template.description}
                  </span>
                </label>
              ))}
            </fieldset>

            <fieldset disabled={!canEdit}>
              <legend>Accessible colour</legend>
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
                  <span>{accent.name}</span>
                </label>
              ))}
            </fieldset>

            <fieldset disabled={!canEdit}>
              <legend>Sections, order and approved layout</legend>
              <p className="trust-note">
                Hiding a section preserves its content. Navigation follows the
                visible order automatically, so there is no separate menu to
                maintain.
              </p>
              {businessSections.map((section) => (
                <div className="choice-row" key={section.id}>
                  <label>
                    <input
                      type="checkbox"
                      name={`visible-${section.id}`}
                      defaultChecked={
                        !appearance.hiddenSections.includes(section.id)
                      }
                    />{" "}
                    Show {section.label}
                  </label>
                  <label>
                    Position{" "}
                    <select
                      name={`position-${section.id}`}
                      defaultValue={String(orderIndex.get(section.id) ?? 1)}
                    >
                      {businessSections.map((_, index) => (
                        <option key={index + 1} value={index + 1}>
                          {index + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Layout{" "}
                    <select
                      name={`layout-${section.id}`}
                      defaultValue={appearance.sectionLayouts[section.id]}
                    >
                      {section.layouts.map((layout) => (
                        <option key={layout.key} value={layout.key}>
                          {layout.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}
            </fieldset>

            {canEdit ? (
              <button className="button primary" type="submit">
                Save appearance
              </button>
            ) : null}
          </form>

          {canEdit ? (
            <form action={resetAppearanceAction} className="save-row">
              <input type="hidden" name="businessId" value={businessId} />
              <button className="button" type="submit">
                Reset to safe default
              </button>
            </form>
          ) : null}
        </section>

        <section className="business-section" aria-labelledby="media-h">
          <p className="eyebrow">Photographs</p>
          <h2 id="media-h">Logo, hero image and ordered gallery</h2>
          <p className="trust-note">
            JPEG, PNG or WebP only, up to 5MB. The server checks the actual file
            signature and image dimensions before storage. Set a focal point so
            important details remain visible on desktop and mobile. Free
            allowance: {mediaLimits.logo} logo, {mediaLimits.hero} hero image
            and {mediaLimits.gallery} gallery images.
          </p>

          {!uploadsEnabled ? (
            <p className="inline-empty" role="note">
              Image storage is not configured in this environment. The website
              uses deliberate category-aware placeholders and all appearance
              controls continue to work.
            </p>
          ) : null}

          {(["logo", "hero"] as const).map((role) => {
            const current = media[role];
            return (
              <div className="detail-panel media-panel" key={role}>
                <h3>{role === "logo" ? "Logo" : "Hero image"}</h3>
                {current ? (
                  <MediaEditor
                    businessId={businessId}
                    item={current}
                    canEdit={canEdit}
                  />
                ) : (
                  <p className="inline-empty">
                    No {role === "logo" ? "logo" : "hero image"} yet — a
                    deliberate placeholder is shown.
                  </p>
                )}
                {canEdit && uploadsEnabled ? (
                  <UploadForm
                    businessId={businessId}
                    role={role}
                    buttonLabel={
                      current
                        ? `Replace ${role === "logo" ? "logo" : "hero image"}`
                        : `Upload ${role === "logo" ? "logo" : "hero image"}`
                    }
                  />
                ) : null}
              </div>
            );
          })}

          <div className="detail-panel media-panel">
            <h3>
              Gallery ({media.gallery.length} of {mediaLimits.gallery})
            </h3>
            {media.gallery.length > 0 ? (
              <div className="media-grid">
                {media.gallery.map((item, index) => (
                  <MediaEditor
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
              <p className="inline-empty">No gallery images yet.</p>
            )}
            {canEdit &&
            uploadsEnabled &&
            media.gallery.length < mediaLimits.gallery ? (
              <UploadForm
                businessId={businessId}
                role="gallery"
                buttonLabel="Add to gallery"
              />
            ) : null}
          </div>
        </section>

        <p className="actions">
          <Link
            className="button primary"
            href={`/dashboard/business/${businessId}/preview` as Route}
          >
            Preview the finished website
          </Link>
          <Link
            className="button"
            href={`/dashboard/business/${businessId}` as Route}
          >
            Return to content editor
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
