import type { MessageKey } from "@/lib/i18n/translate";
import type { WorkspaceIconName } from "@/components/workspace-nav/workspace-icons";

export type AccountSection =
  "home" | "saved" | "following" | "notifications" | "privacy" | "settings";

export const accountNavGroups: readonly {
  key: string;
  label: MessageKey | null;
  items: readonly {
    key: AccountSection;
    href: string;
    label: MessageKey;
    icon: WorkspaceIconName;
  }[];
}[] = [
  {
    key: "start",
    label: null,
    items: [
      {
        key: "home",
        href: "/account",
        label: "accountNav.home",
        icon: "home",
      },
    ],
  },
  {
    key: "yours",
    label: "accountNav.group.yours",
    items: [
      {
        key: "saved",
        href: "/account/saved",
        label: "accountNav.saved",
        icon: "saved",
      },
      {
        key: "following",
        href: "/account/following",
        label: "accountNav.following",
        icon: "following",
      },
      {
        key: "notifications",
        href: "/account/notifications",
        label: "accountNav.notifications",
        icon: "notifications",
      },
    ],
  },
  {
    key: "account",
    label: "accountNav.group.account",
    items: [
      {
        key: "privacy",
        href: "/account/privacy",
        label: "accountNav.privacy",
        icon: "privacy",
      },
      {
        key: "settings",
        href: "/account/settings",
        label: "accountNav.settings",
        icon: "settings",
      },
    ],
  },
];
