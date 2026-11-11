import type { Route } from "next";
import Link from "next/link";
import { getTranslator } from "@/lib/i18n/server";
import { countOpenOwnerCorrections } from "@/modules/businesses/corrections";
import { countUnreadEnquiries } from "@/modules/businesses/inbox";
import type { MessageKey } from "@/lib/i18n/translate";
import { ActiveTabIntoView } from "./active-tab-into-view";
import { DashboardIcon } from "./dashboard-icons";
import styles from "./hub.module.css";

export type DashboardTab =
  | "overview"
  | "profile"
  | "website"
  | "photos"
  | "offers"
  | "events"
  | "updates"
  | "share"
  | "welsh"
  | "preview"
  | "inbox"
  | "corrections"
  | "insights"
  | "listing"
  | "operations";

const tabs: readonly {
  key: DashboardTab;
  path: string;
  label: MessageKey;
  /** Which kind of access the tab needs; `null` is open to every member. */
  needs: "design" | "operate" | "content" | null;
}[] = [
  { key: "overview", path: "", label: "hub.tab.overview", needs: null },
  {
    key: "profile",
    path: "/profile",
    label: "hub.tab.profile",
    needs: null,
  },
  {
    key: "website",
    path: "/website",
    label: "hub.tab.website",
    needs: "design",
  },
  {
    key: "photos",
    path: "/photos",
    label: "hub.tab.photos",
    needs: "design",
  },
  {
    key: "offers",
    path: "/offers",
    label: "hub.tab.offers",
    needs: "content",
  },
  {
    key: "events",
    path: "/events",
    label: "hub.tab.events",
    needs: "content",
  },
  {
    key: "updates",
    path: "/updates",
    label: "hub.tab.updates",
    needs: "content",
  },
  {
    // Links and printable sheets for the public page; every member may open
    // it, and the page itself decides whether results are shown.
    key: "share",
    path: "/share",
    label: "hub.tab.share",
    needs: null,
  },
  {
    key: "welsh",
    path: "/welsh",
    label: "hub.tab.welsh",
    needs: "design",
  },
  {
    key: "preview",
    path: "/preview",
    label: "hub.tab.preview",
    needs: null,
  },
  {
    key: "inbox",
    path: "/inbox",
    label: "hub.tab.inbox",
    needs: "operate",
  },
  {
    // Visitor suggestions. The page itself needs the profile permission,
    // which every role with the content permission also has.
    key: "corrections",
    path: "/corrections",
    label: "hub.tab.corrections",
    needs: "content",
  },
  {
    // Every member may open it; the page itself decides whether their role
    // includes analytics and says so plainly if not.
    key: "insights",
    path: "/insights",
    label: "hub.tab.insights",
    needs: null,
  },
  {
    // Every member may open it to see the listing's state; the page shows
    // the actions only to roles that can use them.
    key: "listing",
    path: "/listing",
    label: "hub.tab.listing",
    needs: null,
  },
  {
    key: "operations",
    path: "/operations",
    label: "hub.tab.operations",
    needs: "operate",
  },
];

type NavGroup = {
  key: "start" | "page" | "content" | "customers" | "business";
  /** Visible group heading; the first group (Overview) has none. */
  label: MessageKey | null;
  tabs: readonly DashboardTab[];
};

/**
 * How the tabs are grouped. Fifteen flat tabs overflowed every width, so the
 * same links are arranged into the jobs an owner comes here to do. Grouping
 * only changes presentation: every permitted link is still rendered, and
 * each page still runs its own authorisation.
 */
const groups: readonly NavGroup[] = [
  { key: "start", label: null, tabs: ["overview"] },
  {
    key: "page",
    label: "hub.navGroup.page",
    tabs: ["profile", "website", "photos", "welsh", "preview"],
  },
  {
    key: "content",
    label: "hub.navGroup.content",
    tabs: ["offers", "events", "updates", "operations"],
  },
  {
    key: "customers",
    label: "hub.navGroup.customers",
    tabs: ["inbox", "corrections", "share"],
  },
  {
    key: "business",
    label: "hub.navGroup.business",
    tabs: ["insights", "listing"],
  },
];

const tabByKey = new Map(tabs.map((tab) => [tab.key, tab]));

/**
 * One grouped navigation shared by every business dashboard page: a sticky
 * sidebar on wide screens and a scrolling strip on narrow ones. It only
 * links; each page still runs its own authorisation, so showing a tab grants
 * nothing.
 */
export async function DashboardTabs({
  businessId,
  current,
  canDesign,
  canOperate,
  canContent,
  unread: knownUnread,
}: {
  businessId: string;
  current: DashboardTab;
  /** Can open the website designer (not the public demo). */
  canDesign: boolean;
  /** Can open the content and insights page. */
  canOperate: boolean;
  /**
   * Can open the offers studio. Anyone who can open the whole content and
   * insights page can too, so pages that do not know can leave it out.
   */
  canContent?: boolean;
  /** Unread enquiries, when the page already has the number. */
  unread?: number;
}) {
  const { t } = await getTranslator();
  // Only people who can open the inbox are told how much is waiting in it.
  const unread =
    knownUnread ?? (canOperate ? await countUnreadEnquiries(businessId) : 0);
  const showCorrections = canContent ?? canOperate;
  const suggestions = showCorrections
    ? await countOpenOwnerCorrections(businessId)
    : 0;

  const allowed = (tab: (typeof tabs)[number]) =>
    tab.needs === null ||
    (tab.needs === "design"
      ? canDesign
      : tab.needs === "content"
        ? (canContent ?? canOperate)
        : canOperate);

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      tabs: group.tabs
        .map((key) => tabByKey.get(key))
        .filter((tab): tab is (typeof tabs)[number] => !!tab && allowed(tab)),
    }))
    .filter((group) => group.tabs.length > 0);

  const badgeFor = (key: DashboardTab) => {
    if (key === "inbox" && unread > 0) {
      return { count: unread, label: t("inbox.tabBadge", { count: unread }) };
    }
    if (key === "corrections" && suggestions > 0) {
      return {
        count: suggestions,
        label: t("corr.tabBadge", { count: suggestions }),
      };
    }
    return null;
  };

  return (
    <nav
      className={`${styles.tabs} dashboard-nav`}
      aria-label={t("hub.tabsAria")}
      data-dashboard-nav=""
    >
      <p className={styles.navTitle} aria-hidden="true">
        {t("hub.navTitle")}
      </p>
      <div className={styles.navGroups} data-dashboard-nav-scroll="">
        {visibleGroups.map((group) => {
          const headingId = `dashboard-nav-${group.key}`;
          return (
            <div className={styles.navGroup} key={group.key}>
              {group.label ? (
                <p className={styles.navGroupLabel} id={headingId}>
                  {t(group.label)}
                </p>
              ) : null}
              <ul
                className={styles.tabList}
                aria-labelledby={group.label ? headingId : undefined}
              >
                {group.tabs.map((tab) => {
                  const badge = badgeFor(tab.key);
                  return (
                    <li key={tab.key}>
                      <Link
                        className={styles.tab}
                        href={
                          `/dashboard/business/${businessId}${tab.path}` as Route
                        }
                        aria-current={tab.key === current ? "page" : undefined}
                      >
                        <DashboardIcon
                          name={tab.key}
                          className={styles.tabIcon}
                        />
                        <span className={styles.tabLabel}>{t(tab.label)}</span>
                        {badge ? (
                          <>
                            <span
                              className={styles.tabBadge}
                              aria-hidden="true"
                            >
                              {badge.count > 99 ? "99+" : badge.count}
                            </span>
                            <span className="sr-only"> {badge.label}</span>
                          </>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <ActiveTabIntoView />
    </nav>
  );
}
