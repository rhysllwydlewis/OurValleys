import type { Route } from "next";
import Link from "next/link";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import styles from "./hub.module.css";

export type DashboardTab =
  "overview" | "profile" | "website" | "preview" | "operations";

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
}: {
  businessId: string;
  current: DashboardTab;
  /** Can open the website designer (not the public demo). */
  canDesign: boolean;
  /** Can open the content and insights page. */
  canOperate: boolean;
}) {
  const { t } = await getTranslator();
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
              </Link>
            </li>
          ))}
      </ul>
    </nav>
  );
}
