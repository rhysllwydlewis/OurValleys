import { getTranslator } from "@/lib/i18n/server";
import { countUnreadNotifications } from "@/modules/residents/notifications";
import {
  WorkspaceNav,
  type WorkspaceNavGroup,
} from "@/components/workspace-nav/workspace-nav";
import { accountNavGroups, type AccountSection } from "./account-nav-model";

/**
 * The shared navigation for the resident account pages. It only links; each
 * page still checks the session itself. `userId` is the signed-in person's
 * own id, used only to count their own unread notifications. Public demo
 * accounts pass `demo`: they get no count and no settings link, because
 * their account settings are disabled.
 */
export async function AccountNav({
  current,
  userId,
  demo = false,
  unread: knownUnread,
}: {
  current: AccountSection;
  userId: string;
  demo?: boolean;
  /** The unread count, when the page has already read it. */
  unread?: number;
}) {
  const { t } = await getTranslator();
  const unread = demo
    ? 0
    : (knownUnread ?? (await countUnreadNotifications(userId)));

  const groups: WorkspaceNavGroup[] = accountNavGroups.map((group) => ({
    key: group.key,
    label: group.label ? t(group.label) : null,
    items: group.items
      .filter((item) => !(demo && item.key === "settings"))
      .map((item) => ({
        key: item.key,
        href: item.href,
        label: t(item.label),
        icon: item.icon,
        current: item.key === current,
        badge:
          item.key === "notifications" && unread > 0
            ? {
                count: unread,
                label: t("accountNav.unread", { count: unread }),
              }
            : null,
      })),
  }));

  return (
    <WorkspaceNav
      ariaLabel={t("accountNav.aria")}
      title={t("accountNav.title")}
      idPrefix="account-nav"
      groups={groups}
    />
  );
}
