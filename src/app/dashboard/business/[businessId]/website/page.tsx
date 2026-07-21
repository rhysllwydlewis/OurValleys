import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { isMediaStorageConfigured } from "@/lib/media-storage";
import {
  businessAccents,
  businessSections,
  businessTemplates,
} from "@/modules/businesses/appearance";
import { getBusinessAppearance } from "@/modules/businesses/appearance-repository";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import { listBusinessMedia, mediaLimits } from "@/modules/businesses/media";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import {
  removeMediaAction,
  saveAppearanceAction,
  uploadMediaAction,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Website design and photos",
};

const outcomeMessages: Record<string, { tone: "ok" | "warn"; text: string }> = {
  saved: { tone: "ok", text: "Your changes have been saved." },
  removed: { tone: "ok", text: "The image has been removed." },
  invalid: {
    tone: "warn",
    text: "That change was not valid. Check the file type and try again.",
  },
  limit: {
    tone: "warn",
    text: "You have reached the image allowance for that slot.",
  },
  disabled: {
    tone: "warn",
    text: "Image uploads are not available in this environment yet.",
  },
  forbidden: {
    tone: "warn",
    text: "Your membership cannot edit this business.",
  },
  unavailable: {
    tone: "warn",
    text: "The change could not be saved. Please try again shortly.",
  },
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

  const [appearance, media, memberships] = await Promise.all([
    getBusinessAppearance(businessId),
    listBusinessMedia(businessId),
    listAccessibleBusinesses(session.user.id),
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
            Choose an approved template and colour, decide which sections show
            and in what order, and add your photographs. Every choice stays
            mobile-safe and accessible, and you can preview before anything
            publishes.
          </p>
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
          <h2 id="appearance-h">Template, colour and sections</h2>
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
              <legend>Colour</legend>
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
              <legend>Sections and order</legend>
              <p className="trust-note">
                Hidden sections keep their content and can be shown again at any
                time. Navigation follows the visible sections.
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
                </div>
              ))}
            </fieldset>

            {canEdit ? (
              <button className="button primary" type="submit">
                Save appearance
              </button>
            ) : null}
          </form>
        </section>

        <section className="business-section" aria-labelledby="media-h">
          <p className="eyebrow">Photographs</p>
          <h2 id="media-h">Logo, hero image and gallery</h2>
          <p className="trust-note">
            Your website can publish without photographs, but a real business
            image helps customers recognise and trust you. JPEG, PNG or WebP, up
            to 5MB. Free allowance: {mediaLimits.logo} logo, {mediaLimits.hero}{" "}
            hero image and {mediaLimits.gallery} gallery images.
          </p>

          {!uploadsEnabled ? (
            <p className="inline-empty" role="note">
              Image uploads are not switched on in this environment yet. Your
              website uses tasteful placeholders until then — nothing else is
              affected.
            </p>
          ) : null}

          {(["logo", "hero"] as const).map((role) => {
            const current = media[role];
            return (
              <div className="detail-panel media-panel" key={role}>
                <h3>{role === "logo" ? "Logo" : "Hero image"}</h3>
                {current ? (
                  <div className="media-item">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={current.url} alt={current.altText} />
                    {canEdit ? (
                      <form action={removeMediaAction}>
                        <input
                          type="hidden"
                          name="businessId"
                          value={businessId}
                        />
                        <input
                          type="hidden"
                          name="mediaId"
                          value={current.id}
                        />
                        <button className="button" type="submit">
                          Remove
                        </button>
                      </form>
                    ) : null}
                  </div>
                ) : (
                  <p className="inline-empty">
                    No {role === "logo" ? "logo" : "hero image"} yet — a
                    placeholder is shown.
                  </p>
                )}
                {canEdit && uploadsEnabled ? (
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
                      Describe the image (alt text)
                      <input
                        type="text"
                        name="altText"
                        maxLength={300}
                        placeholder="For example: our shopfront on Dunraven Street"
                      />
                    </label>
                    <button className="button primary" type="submit">
                      Upload {role === "logo" ? "logo" : "hero image"}
                    </button>
                  </form>
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
                {media.gallery.map((item) => (
                  <figure className="media-item" key={item.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.altText} />
                    {item.altText ? (
                      <figcaption>{item.altText}</figcaption>
                    ) : null}
                    {canEdit ? (
                      <form action={removeMediaAction}>
                        <input
                          type="hidden"
                          name="businessId"
                          value={businessId}
                        />
                        <input type="hidden" name="mediaId" value={item.id} />
                        <button className="button" type="submit">
                          Remove
                        </button>
                      </form>
                    ) : null}
                  </figure>
                ))}
              </div>
            ) : (
              <p className="inline-empty">No gallery images yet.</p>
            )}
            {canEdit &&
            uploadsEnabled &&
            media.gallery.length < mediaLimits.gallery ? (
              <form action={uploadMediaAction} className="media-upload">
                <input type="hidden" name="businessId" value={businessId} />
                <input type="hidden" name="role" value="gallery" />
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
                  Caption / description (alt text)
                  <input type="text" name="altText" maxLength={300} />
                </label>
                <button className="button primary" type="submit">
                  Add to gallery
                </button>
              </form>
            ) : null}
          </div>
        </section>

        <p>
          <Link
            className="button"
            href={`/dashboard/business/${businessId}/preview` as Route}
          >
            Preview your website
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
