import { getTranslator } from "@/lib/i18n/server";
import { countOpenOwnerCorrections } from "@/modules/businesses/corrections";
import { countUnreadEnquiries } from "@/modules/businesses/inbox";
import { WorkspaceNav } from "@/components/workspace-nav/workspace-nav";
import { groups, tabs, type DashboardTab } from "./dashboard-nav-model";

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
    <WorkspaceNav
      ariaLabel={t("hub.tabsAria")}
      title={t("hub.navTitle")}
      idPrefix="dashboard-nav"
      groups={visibleGroups.map((group) => ({
        key: group.key,
        label: group.label ? t(group.label) : null,
        items: group.tabs.map((tab) => ({
          key: tab.key,
          href: `/dashboard/business/${businessId}${tab.path}`,
          label: t(tab.label),
          icon: tab.key,
          current: tab.key === current,
          badge: badgeFor(tab.key),
        })),
      }))}
    />
  );
}
