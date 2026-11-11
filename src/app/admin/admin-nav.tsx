"use client";

import { usePathname } from "next/navigation";
import {
  WorkspaceNav,
  type WorkspaceNavGroup,
} from "@/components/workspace-nav/workspace-nav";
import type { WorkspaceIconName } from "@/components/workspace-nav/workspace-icons";

type AdminLink = {
  href: string;
  label: string;
  icon: WorkspaceIconName;
  exact?: boolean;
};

/**
 * The admin sections, grouped by the job an admin comes to do. The admin
 * area is English-only for now, like the rest of its pages.
 */
export const adminNavGroups: readonly {
  key: string;
  label: string | null;
  links: readonly AdminLink[];
}[] = [
  {
    key: "start",
    label: null,
    links: [
      { href: "/admin", label: "Overview", icon: "overview", exact: true },
      { href: "/admin/queue", label: "Review desk", icon: "queue" },
    ],
  },
  {
    key: "businesses",
    label: "Businesses",
    links: [
      { href: "/admin/businesses", label: "Businesses", icon: "business" },
      {
        href: "/admin/tickets",
        label: "Claims & corrections",
        icon: "tickets",
      },
      { href: "/admin/suggestions", label: "Suggestions", icon: "corrections" },
      { href: "/admin/import", label: "Import", icon: "import" },
      { href: "/admin/demand", label: "Unmet demand", icon: "demand" },
    ],
  },
  {
    key: "trust",
    label: "Trust and safety",
    links: [
      { href: "/admin/reports", label: "Reports", icon: "reports" },
      { href: "/admin/reviews", label: "Reviews", icon: "reviews" },
    ],
  },
  {
    key: "places",
    label: "Places and stories",
    links: [
      { href: "/admin/places", label: "Places", icon: "places" },
      {
        href: "/admin/place-suggestions",
        label: "Place suggestions",
        icon: "following",
      },
      { href: "/admin/categories", label: "Categories", icon: "categories" },
      { href: "/admin/guides", label: "Guides", icon: "guides" },
      { href: "/admin/stories", label: "Local news", icon: "stories" },
    ],
  },
  {
    key: "platform",
    label: "Platform",
    links: [
      { href: "/admin/users", label: "Users", icon: "users" },
      { href: "/admin/feature-flags", label: "Feature flags", icon: "flags" },
      { href: "/admin/audit-log", label: "Audit log", icon: "audit" },
    ],
  },
];

export function isAdminLinkActive(link: AdminLink, pathname: string) {
  return link.exact
    ? pathname === link.href
    : pathname === link.href || pathname.startsWith(`${link.href}/`);
}

type AdminNavProps = {
  readOnlyDemo?: boolean;
  /** Waiting-item counts keyed by link href. */
  badges?: Record<string, number>;
};

/**
 * The admin area's navigation. It only links: every admin page and action
 * still checks the admin session itself, so showing a link grants nothing.
 */
export function AdminNav({ readOnlyDemo = false, badges = {} }: AdminNavProps) {
  const pathname = usePathname();

  const groups: WorkspaceNavGroup[] = adminNavGroups
    .map((group) => ({
      key: group.key,
      label: group.label,
      // The public read-only demonstration only ever sees the overview.
      links: readOnlyDemo
        ? group.links.filter((link) => link.href === "/admin")
        : group.links,
    }))
    .map((group) => ({
      key: group.key,
      label: group.label,
      items: group.links.map((link) => {
        const count = badges[link.href] ?? 0;
        return {
          key: link.href,
          href: link.href,
          label: link.label,
          icon: link.icon,
          current: isAdminLinkActive(link, pathname),
          badge: count > 0 ? { count, label: `${count} waiting` } : null,
        };
      }),
    }));

  return (
    <WorkspaceNav
      ariaLabel="Admin sections"
      title="Administration"
      idPrefix="admin-nav"
      groups={groups}
    />
  );
}
