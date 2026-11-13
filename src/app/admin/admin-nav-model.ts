import type { WorkspaceIconName } from "@/components/workspace-nav/workspace-icons";

export type AdminLink = {
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
      {
        href: "/admin/insights",
        label: "Content insights",
        icon: "insights",
      },
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
