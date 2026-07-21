"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin.module.css";

const links: { href: Route; label: string; exact?: boolean }[] = [
  { href: "/admin" as Route, label: "Overview", exact: true },
  { href: "/admin/businesses" as Route, label: "Businesses" },
  { href: "/admin/reports" as Route, label: "Reports" },
  { href: "/admin/tickets" as Route, label: "Claims & corrections" },
  { href: "/admin/users" as Route, label: "Users" },
  { href: "/admin/categories" as Route, label: "Categories" },
  { href: "/admin/places" as Route, label: "Places" },
  { href: "/admin/audit-log" as Route, label: "Audit log" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Admin sections">
      {links.map((link) => {
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
          </Link>
        );
      })}
    </nav>
  );
}
