import type { Route } from "next";
import Link from "next/link";
import { getTranslator } from "@/lib/i18n/server";
import { countUnreadEnquiries } from "@/modules/businesses/inbox";
import type { MessageKey } from "@/lib/i18n/translate";
import styles from "./hub.module.css";

export type DashboardTab =
  | "overview"
  | "profile"
  | "website"
  | "photos"
  | "offers"
  | "events"
  | "welsh"
  | "preview"
  | "inbox"
  | "insights"
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
    // Every member may open it; the page itself decides whether their role
    // includes analytics and says so plainly if not.
    key: "insights",
    path: "/insights",
    label: "hub.tab.insights",
    needs: null,
  },
  {
    key: "operations",
    path: "/operations",
    label: "hub.tab.operations",
    needs: "operate",
  },
];

/**
 * One tab bar shared by every business dashboard page. It only links; each
 * page still runs its own authorisation, so showing a tab grants nothing.
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
  return (
    <nav className={styles.tabs} aria-label={t("hub.tabsAria")}>
      <ul className={styles.tabList}>
        {tabs
          .filter(
            (tab) =>
              tab.needs === null ||
              (tab.needs === "design"
                ? canDesign
                : tab.needs === "content"
                  ? (canContent ?? canOperate)
                  : canOperate),
          )
          .map((tab) => (
            <li key={tab.key}>
              <Link
                className={styles.tab}
                href={`/dashboard/business/${businessId}${tab.path}` as Route}
                aria-current={tab.key === current ? "page" : undefined}
              >
                {t(tab.label)}
                {tab.key === "inbox" && unread > 0 ? (
                  <>
                    <span className={styles.tabBadge} aria-hidden="true">
                      {unread > 99 ? "99+" : unread}
                    </span>
                    <span className="sr-only">
                      {" "}
                      {t("inbox.tabBadge", { count: unread })}
                    </span>
                  </>
                ) : null}
              </Link>
            </li>
          ))}
      </ul>
    </nav>
  );
}
