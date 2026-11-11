import type { Route } from "next";
import Link from "next/link";
import { getTranslator } from "@/lib/i18n/server";
import { countOpenOwnerCorrections } from "@/modules/businesses/corrections";
import { countUnreadEnquiries } from "@/modules/businesses/inbox";
import { ActiveTabIntoView } from "./active-tab-into-view";
import { DashboardIcon } from "./dashboard-icons";
import { groups, tabs, type DashboardTab } from "./dashboard-nav-model";
import styles from "./hub.module.css";

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
