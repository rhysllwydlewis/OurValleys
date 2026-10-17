import type { Route } from "next";
import Link from "next/link";
import { getTranslator } from "@/lib/i18n/server";
import { countUnreadEnquiries } from "@/modules/businesses/inbox";
import type { MessageKey } from "@/lib/i18n/translate";
import styles from "./hub.module.css";

export type DashboardTab =
  "overview" | "profile" | "website" | "preview" | "inbox" | "operations";

const tabs: readonly {
  key: DashboardTab;
  path: string;
  label: MessageKey;
  /** Which kind of access the tab needs; `null` is open to every member. */
  needs: "design" | "operate" | null;
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
  unread: knownUnread,
}: {
  businessId: string;
  current: DashboardTab;
  /** Can open the website designer (not the public demo). */
  canDesign: boolean;
  /** Can open the content and insights page. */
  canOperate: boolean;
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
              (tab.needs === "design" ? canDesign : canOperate),
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
