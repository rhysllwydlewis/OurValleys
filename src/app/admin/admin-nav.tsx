"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin.module.css";

const links: { href: Route; label: string; exact?: boolean }[] = [
  { href: "/admin" as Route, label: "Overview", exact: true },
  { href: "/admin/queue" as Route, label: "Review desk" },
  { href: "/admin/businesses" as Route, label: "Businesses" },
  { href: "/admin/import" as Route, label: "Import" },
  { href: "/admin/reports" as Route, label: "Reports" },
  { href: "/admin/reviews" as Route, label: "Reviews" },
  { href: "/admin/suggestions" as Route, label: "Suggestions" },
  { href: "/admin/tickets" as Route, label: "Claims & corrections" },
  { href: "/admin/users" as Route, label: "Users" },
  { href: "/admin/categories" as Route, label: "Categories" },
  { href: "/admin/places" as Route, label: "Places" },
  { href: "/admin/guides" as Route, label: "Guides" },
  { href: "/admin/feature-flags" as Route, label: "Feature flags" },
  { href: "/admin/audit-log" as Route, label: "Audit log" },
];

type AdminNavProps = {
  readOnlyDemo?: boolean;
  /** Waiting-item counts keyed by link href. */
  badges?: Record<string, number>;
};

export function AdminNav({ readOnlyDemo = false, badges = {} }: AdminNavProps) {
  const pathname = usePathname();
  const visibleLinks = readOnlyDemo ? links.slice(0, 1) : links;

  return (
    <nav className={styles.nav} aria-label="Admin sections">
      {visibleLinks.map((link) => {
        const isActive = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {link.label}
            {badges[link.href] ? (
              <span className={styles.navBadge}>
                <span aria-hidden="true">{badges[link.href]}</span>
                <span className="sr-only">, {badges[link.href]} waiting</span>
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
