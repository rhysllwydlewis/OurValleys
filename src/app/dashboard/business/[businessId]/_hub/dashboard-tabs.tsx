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
  /** Hidden for the public development demo, which cannot use these tools. */
  toolOnly: boolean;
}[] = [
  { key: "overview", path: "", label: "hub.tab.overview", toolOnly: false },
  {
    key: "profile",
    path: "/profile",
    label: "hub.tab.profile",
    toolOnly: false,
  },
  {
    key: "website",
    path: "/website",
    label: "hub.tab.website",
    toolOnly: true,
  },
  {
    key: "preview",
    path: "/preview",
    label: "hub.tab.preview",
    toolOnly: false,
  },
  {
    key: "operations",
    path: "/operations",
    label: "hub.tab.operations",
    toolOnly: true,
  },
];

/**
 * One tab bar shared by every business dashboard page. It only links; each
 * page still runs its own authorisation, so showing a tab grants nothing.
 */
export async function DashboardTabs({
  businessId,
  current,
  showTools,
}: {
  businessId: string;
  current: DashboardTab;
  showTools: boolean;
}) {
  const { t } = await getTranslator();
  return (
    <nav className={styles.tabs} aria-label={t("hub.tabsAria")}>
      <ul className={styles.tabList}>
        {tabs
          .filter((tab) => showTools || !tab.toolOnly)
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
