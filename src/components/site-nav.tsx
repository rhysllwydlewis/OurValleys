"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/auth/account-menu";
import { authClient } from "@/lib/auth-client";

export function SiteNavLinks() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  return (
    <>
      <Link
        href="/businesses"
        aria-current={
          pathname === "/businesses" || pathname.startsWith("/b/")
            ? "page"
            : undefined
        }
      >
        Businesses
      </Link>
      <Link
        href="/news"
        aria-current={pathname.startsWith("/news") ? "page" : undefined}
      >
        News
      </Link>
      <Link
        href="/account"
        aria-current={
          pathname === "/account" || pathname.startsWith("/dashboard")
            ? "page"
            : undefined
        }
      >
        My account
      </Link>
      {session?.user.role === "admin" ? (
        <Link
          href={"/admin" as Route}
          aria-current={pathname.startsWith("/admin") ? "page" : undefined}
        >
          Admin
        </Link>
      ) : null}
    </>
  );
}

export function SiteHeaderAccountAction() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  if (session?.user) {
    return <AccountMenu triggerClassName="site-header__action" />;
  }

  return (
    <Link
      className="site-header__action"
      href={`/login?next=${encodeURIComponent(pathname || "/account")}`}
    >
      Sign in
    </Link>
  );
}
