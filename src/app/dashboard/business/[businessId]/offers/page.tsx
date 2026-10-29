import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { authoredTextLang } from "@/lib/i18n/business-copy";
import { LOCALE_DETAILS, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey, Translator } from "@/lib/i18n/translate";
import { isMediaStorageConfigured } from "@/lib/media-storage";
import { isPublicDemoEmail } from "@/lib/public-demo-policy";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import {
  listStudioOffers,
  type StudioOfferRow,
} from "@/modules/businesses/offer-studio";
import {
  actionsFor,
  countOffers,
  daysUntilEnd,
  daysUntilStart,
  extensionChoices,
  groupOffers,
  offerGuidance,
  offerState,
  offerStates,
  toLondonInput,
  type OfferState,
  type QuickAction,
} from "@/modules/businesses/offer-studio-model";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { ContentImageFields } from "../operations/sections/content-image-fields";
import { DashboardTabs } from "../_hub/dashboard-tabs";
import hubStyles from "../_hub/hub.module.css";
import { readDashboardTabAccess } from "../_hub/tab-access";
import { offerQuickAction, removeOfferStudioAction } from "./actions";
import { OfferEditor } from "./offer-editor";
import styles from "./offers.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("ostudio.metaTitle"),
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

const outcomeTones: Record<string, "ok" | "bad"> = {
  created: "ok",
  saved: "ok",
  published: "ok",
  resumed: "ok",
  paused: "ok",
  ended: "ok",
  extended: "ok",
  duplicated: "ok",
  removed: "ok",
  locked: "bad",
  forbidden: "bad",
  invalid: "bad",
  not_found: "bad",
  not_allowed: "bad",
  not_ready: "bad",
  already_ended: "bad",
  no_end: "bad",
  limit: "bad",
  unavailable: "bad",
  "picture-text": "bad",
};

function formatWhen(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

function whenLine(
  offer: StudioOfferRow,
  state: OfferState,
  now: Date,
  locale: Locale,
  t: Translator,
): string {
  const end = offer.endsAt ? formatWhen(offer.endsAt, locale) : null;
  const start = offer.startsAt ? formatWhen(offer.startsAt, locale) : null;
  if (state === "removed") return t("ostudio.when.removed");
  if (state === "ended" && end) return t("ostudio.when.endedOn", { date: end });
  if (state === "scheduled" && start) {
    const days = daysUntilStart(offer, now) ?? 0;
    if (days <= 0) return t("ostudio.when.startsToday", { date: start });
    if (days === 1) return t("ostudio.when.startsTomorrow", { date: start });
    return t("ostudio.when.startsIn", { days, date: start });
  }
  if (end) {
    const days = daysUntilEnd(offer, now);
    if (state === "live" && days !== null) {
      if (days <= 0) {
        return t("ostudio.when.endsToday", { date: end });
      }
      if (days === 1) return t("ostudio.when.endsTomorrow", { date: end });
      if (days <= 30) return t("ostudio.when.endsIn", { days, date: end });
    }
    return t("ostudio.when.endsOn", { date: end });
  }
  if (start) return t("ostudio.when.startsOn", { date: start });
  return state === "live"
    ? t("ostudio.when.noEnd")
    : t("ostudio.when.unscheduled");
}

function actionKey(action: QuickAction): MessageKey {
  return `ostudio.act.${action === "extend" ? "extend7" : action}` as MessageKey;
}

function QuickActionForm({
  t,
  businessId,
  offer,
  action,
  days,
}: {
  t: Translator;
  businessId: string;
  offer: StudioOfferRow;
  action: QuickAction;
  days?: number;
}) {
  const label = t(
    days ? (`ostudio.act.extend${days}` as MessageKey) : actionKey(action),
  );
  return (
    <form action={offerQuickAction}>
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="offerId" value={offer.id} />
      <input type="hidden" name="action" value={action} />
      {days ? <input type="hidden" name="days" value={days} /> : null}
      <button
        className="button"
        type="submit"
        aria-label={t("ostudio.act.named", {
          action: label,
          title: offer.title,
        })}
      >
        {label}
      </button>
    </form>
  );
}

async function OfferRow({
  t,
  locale,
  businessId,
  offer,
  now,
  canEdit,
  uploadsEnabled,
}: {
  t: Translator;
  locale: Locale;
  businessId: string;
  offer: StudioOfferRow;
  now: Date;
  canEdit: boolean;
  uploadsEnabled: boolean;
}) {
  const state = offerState(offer, now);
  // Tips about publishing or pictures only help someone who can act on them,
  // and a picture tip makes no sense while uploads are switched off.
  const guidance =
    canEdit && state !== "removed"
      ? offerGuidance(offer, now).filter(
          (item) => uploadsEnabled || item.code !== "noPicture",
        )
      : [];
  const actions = actionsFor(state);
  // A removed offer is read-only whatever the member's permissions.
  const mayChange = canEdit && state !== "removed";
  const lang = authoredTextLang || undefined;
  return (
    <li className={styles.offer} id={`offer-${offer.id}`}>
      <div className={styles.offerTop}>
        {offer.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.thumb}
            src={offer.image.url}
            alt={offer.image.altText}
            lang={lang}
            loading="lazy"
          />
        ) : (
          <span className={styles.thumbEmpty} aria-hidden="true">
            ◌
          </span>
        )}
        <div>
          <h3 className={styles.offerTitle}>
            <span lang={lang}>{offer.title}</span>
            <span className={styles.badge} data-state={state}>
              {t(`ostudio.state.${state}` as MessageKey)}
            </span>
          </h3>
          <p className={styles.when}>
            {whenLine(offer, state, now, locale, t)}
          </p>
          <p className={styles.excerpt} lang={lang}>
            {offer.description.length > 160
              ? `${offer.description.slice(0, 157)}…`
              : offer.description}
          </p>
        </div>
      </div>
      {guidance.length > 0 ? (
        <ul className={styles.guidance}>
          {guidance.map((item) => (
            <li key={item.code} data-level={item.level}>
              <strong>
                {item.level === "attention"
                  ? t("ostudio.guide.labelAttention")
                  : t("ostudio.guide.label")}
                :
              </strong>{" "}
              {t(`ostudio.guide.${item.code}` as MessageKey)}
            </li>
          ))}
        </ul>
      ) : null}
      {mayChange ? (
        <div className={styles.actions}>
          {actions.map((action) =>
            action === "extend" ? (
              offer.endsAt ? (
                extensionChoices.map((days) => (
                  <QuickActionForm
                    key={`extend-${days}`}
                    t={t}
                    businessId={businessId}
                    offer={offer}
                    action="extend"
                    days={days}
                  />
                ))
              ) : null
            ) : (
              <QuickActionForm
                key={action}
                t={t}
                businessId={businessId}
                offer={offer}
                action={action}
              />
            ),
          )}
        </div>
      ) : null}
      <details className={styles.more}>
        <summary className="button">
          {mayChange
            ? t("ostudio.act.edit")
            : t(`ostudio.state.${state}` as MessageKey)}
        </summary>
        <div className={styles.moreBody}>
          <OfferEditor
            key={`${offer.id}:${offer.updatedAt.getTime()}`}
            businessId={businessId}
            offerId={offer.id}
            expectedUpdatedAt={offer.updatedAt.getTime()}
            idPrefix={`edit-${offer.id}`}
            canEdit={mayChange}
            initial={{
              title: offer.title,
              description: offer.description,
              terms: offer.terms ?? "",
              actionUrl: offer.actionUrl ?? "",
              actionLabel: offer.actionLabel ?? "",
              startsAt: toLondonInput(offer.startsAt),
              endsAt: toLondonInput(offer.endsAt),
              status: offer.status,
            }}
            imageUrl={offer.image?.url ?? null}
            imageAlt={offer.image?.altText ?? ""}
            submitLabel={t("ostudio.form.save")}
            defaultStatusOptions={["draft", "active", "hidden"]}
            picture={
              <ContentImageFields
                idPrefix={`edit-${offer.id}`}
                image={offer.image}
                canEdit={mayChange}
                uploadsEnabled={uploadsEnabled}
                noun="offer"
              />
            }
          />
          {mayChange ? (
            <details className={styles.removeBox}>
              <summary className={`button ${styles.danger}`}>
                {t("ostudio.act.remove")}
              </summary>
              <form
                action={removeOfferStudioAction}
                className={styles.removeBody}
              >
                <input type="hidden" name="businessId" value={businessId} />
                <input type="hidden" name="offerId" value={offer.id} />
                <p>{t("ostudio.act.removeWarning")}</p>
                <button className={`button ${styles.danger}`} type="submit">
                  {t("ostudio.act.removeConfirm")}
                </button>
              </form>
            </details>
          ) : null}
        </div>
      </details>
    </li>
  );
}

export default async function BusinessOffersPage({
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

  // Drafts, paused offers and their terms are private, so opening the studio
  // needs the content permission itself, not just membership.
  const canManage = await canUserAccessBusiness({
    userId: session.user.id,
    businessId: id,
    permission: businessPermissions.manageContent,
  });
  if (!canManage) notFound();

  const isDemo = isPublicDemoEmail(session.user.email);
  const [tabAccess, memberships, result] = await Promise.all([
    readDashboardTabAccess({
      userId: session.user.id,
      businessId: id,
      isPublicDemo: isDemo,
    }),
    listAccessibleBusinesses(session.user.id).catch(() => []),
    listStudioOffers(id),
  ]);
  const summary = memberships.find((item) => item.id === id);
  if (!summary) notFound();

  if (result.status === "unavailable") {
    return (
      <>
        <SiteHeader />
        <main className={`dashboard-shell ${hubStyles.wide}`} lang={htmlLang}>
          <p className={styles.notice} data-tone="bad" role="alert">
            {t("ostudio.unavailable")}
          </p>
        </main>
        <SiteFooter />
      </>
    );
  }

  const canEdit = !isDemo;
  const uploadsEnabled = isMediaStorageConfigured();
  const now = new Date();
  const offers = result.offers;
  const groups = groupOffers(offers, now);
  const counts = countOffers(offers, now);
  const requested = (await searchParams).outcome ?? "";
  // Own keys only: `?outcome=constructor` must not find an inherited member.
  const tone = Object.hasOwn(outcomeTones, requested)
    ? outcomeTones[requested]
    : undefined;
  const lang = authoredTextLang || undefined;

  return (
    <>
      <SiteHeader />
      <main className={`dashboard-shell ${hubStyles.wide}`} lang={htmlLang}>
        <nav className="business-breadcrumb" aria-label={t("dash.breadcrumb")}>
          <Link href={`/dashboard/business/${id}` as Route}>
            <span aria-hidden="true">← </span>
            {t("ostudio.back")}
          </Link>
        </nav>
        <header className={hubStyles.header}>
          <div>
            <p className="eyebrow">{t("ostudio.eyebrow")}</p>
            <h1>{t("ostudio.title")}</h1>
            <p className="lead">
              <span lang={lang}>{summary.tradingName}</span>
              {" · "}
              {t("ostudio.lead")}
            </p>
          </div>
        </header>
        <DashboardTabs
          businessId={id}
          current="offers"
          canDesign={tabAccess.canDesign}
          canOperate={tabAccess.canOperate}
          canContent={tabAccess.canContent}
        />

        {tone ? (
          <p
            className={styles.notice}
            data-tone={tone}
            role={tone === "bad" ? "alert" : "status"}
          >
            {t(`ostudio.outcome.${requested}` as MessageKey)}
          </p>
        ) : null}
        {isDemo ? (
          <p className={styles.notice} role="status">
            {t("ostudio.demo")}
          </p>
        ) : null}

        <ul className={styles.summary} aria-label={t("ostudio.summary.aria")}>
          {offerStates
            .filter((state) => state !== "removed" || counts.removed > 0)
            .map((state) => (
              <li key={state} className={styles.summaryItem} data-state={state}>
                <strong>{counts[state]}</strong>
                <span>{t(`ostudio.summary.${state}` as MessageKey)}</span>
              </li>
            ))}
        </ul>

        {canEdit ? (
          <details className={styles.panel} open={offers.length === 0}>
            <summary className="button primary">
              {t("ostudio.new.summary")}
            </summary>
            <div className={styles.moreBody}>
              <OfferEditor
                key={`new:${requested}`}
                businessId={id}
                idPrefix="new-offer"
                canEdit
                initial={{
                  title: "",
                  description: "",
                  terms: "",
                  actionUrl: "",
                  actionLabel: "",
                  startsAt: "",
                  endsAt: "",
                  status: "draft",
                }}
                imageUrl={null}
                imageAlt=""
                submitLabel={t("ostudio.form.create")}
                defaultStatusOptions={["draft", "active"]}
                picture={
                  <ContentImageFields
                    idPrefix="new-offer"
                    image={null}
                    canEdit
                    uploadsEnabled={uploadsEnabled}
                    noun="offer"
                  />
                }
              />
            </div>
          </details>
        ) : null}

        {offers.length === 0 ? (
          <section className={styles.empty} aria-labelledby="offers-empty">
            <h2 id="offers-empty">{t("ostudio.empty.title")}</h2>
            <p>{t("ostudio.empty.body")}</p>
          </section>
        ) : null}

        {offerStates.map((state) =>
          groups[state].length === 0 ? null : (
            <section
              key={state}
              className={styles.group}
              aria-labelledby={`group-${state}`}
            >
              <header className={styles.groupHead}>
                <h2 id={`group-${state}`}>
                  {t(`ostudio.group.${state}` as MessageKey)} (
                  {groups[state].length})
                </h2>
                <p>{t(`ostudio.group.${state}Hint` as MessageKey)}</p>
              </header>
              <ul className={styles.list}>
                {groups[state].map((offer) => (
                  <OfferRow
                    key={offer.id}
                    t={t}
                    locale={locale}
                    businessId={id}
                    offer={offers.find((row) => row.id === offer.id)!}
                    now={now}
                    canEdit={canEdit}
                    uploadsEnabled={uploadsEnabled}
                  />
                ))}
              </ul>
            </section>
          ),
        )}
      </main>
      <SiteFooter />
    </>
  );
}
