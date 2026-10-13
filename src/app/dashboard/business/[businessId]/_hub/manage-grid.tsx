import type { Route } from "next";
import Link from "next/link";
import type { MessageKey, Translator } from "@/lib/i18n/translate";
import {
  ownerHubHref,
  type OwnerHubTarget,
} from "@/modules/businesses/owner-hub";
import styles from "./hub.module.css";

type Tile = {
  key: string;
  title: MessageKey;
  body: MessageKey;
  /** Route builder; `null` href means the tile is shown but not linked. */
  href: string | null;
  badge?: string;
  disabledNote?: MessageKey;
};

export function ManageGrid({
  businessId,
  slug,
  live,
  waitingEnquiries,
  showTools,
  t,
}: {
  businessId: string;
  slug: string | null;
  live: boolean;
  waitingEnquiries: number;
  /** False for the public development demo, which cannot open these tools. */
  showTools: boolean;
  t: Translator;
}) {
  const operations = (target: OwnerHubTarget | "menu" | "team") =>
    target === "menu" || target === "team"
      ? `/dashboard/business/${businessId}/operations#${target}`
      : ownerHubHref(businessId, target);

  const tiles: Tile[] = [
    {
      key: "profile",
      title: "hub.manage.profile.title",
      body: "hub.manage.profile.body",
      href: ownerHubHref(businessId, "profile"),
    },
  ];
  if (showTools) {
    tiles.push(
      {
        key: "website",
        title: "hub.manage.website.title",
        body: "hub.manage.website.body",
        href: ownerHubHref(businessId, "website"),
      },
      {
        key: "media",
        title: "hub.manage.media.title",
        body: "hub.manage.media.body",
        href: ownerHubHref(businessId, "media"),
      },
      {
        key: "inbox",
        title: "hub.manage.inbox.title",
        body: "hub.manage.inbox.body",
        href: operations("inbox"),
        badge:
          waitingEnquiries > 0
            ? t("hub.manage.badgeWaiting", { count: waitingEnquiries })
            : undefined,
      },
      {
        key: "offers",
        title: "hub.manage.offers.title",
        body: "hub.manage.offers.body",
        href: operations("offers"),
      },
      {
        key: "events",
        title: "hub.manage.events.title",
        body: "hub.manage.events.body",
        href: operations("events"),
      },
      {
        key: "menu",
        title: "hub.manage.menu.title",
        body: "hub.manage.menu.body",
        href: operations("menu"),
      },
      {
        key: "team",
        title: "hub.manage.team.title",
        body: "hub.manage.team.body",
        href: operations("team"),
      },
    );
  }
  if (slug) {
    tiles.push(
      {
        key: "public",
        title: "hub.manage.public.title",
        body: "hub.manage.public.body",
        href: live ? `/b/${slug}` : null,
        disabledNote: "hub.manage.notLive",
      },
      {
        key: "qr",
        title: "hub.manage.qr.title",
        body: "hub.manage.qr.body",
        href: live ? `/b/${slug}/qr` : null,
        disabledNote: "hub.manage.notLive",
      },
    );
  }

  return (
    <section className={styles.manage} aria-labelledby="hub-manage-heading">
      <p className="eyebrow">{t("hub.manage.eyebrow")}</p>
      <h2 id="hub-manage-heading">{t("hub.manage.title")}</h2>
      <ul className={styles.tiles}>
        {tiles.map((tile) => (
          <li key={tile.key}>
            {tile.href ? (
              <Link className={styles.tile} href={tile.href as Route}>
                <strong>
                  {t(tile.title)}
                  {tile.badge ? (
                    <span className={styles.tileBadge}>{tile.badge}</span>
                  ) : null}
                </strong>
                <span>{t(tile.body)}</span>
              </Link>
            ) : (
              <div className={`${styles.tile} ${styles.tileDisabled}`}>
                <strong>{t(tile.title)}</strong>
                <span>{t(tile.body)}</span>
                {tile.disabledNote ? (
                  <span className={styles.tileMuted}>
                    {t(tile.disabledNote)}
                  </span>
                ) : null}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
