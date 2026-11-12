"use client";

import { usePathname } from "next/navigation";
import {
  WorkspaceNav,
  type WorkspaceNavGroup,
} from "@/components/workspace-nav/workspace-nav";
import { adminNavGroups, isAdminLinkActive } from "./admin-nav-model";

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
