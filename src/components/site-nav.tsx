"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/auth/account-menu";
import { authClient } from "@/lib/auth-client";

/**
 * A homepage section id. On the homepage itself this resolves to an
 * in-page anchor; from any other route it resolves home-relative, so the
 * same primary nav works identically everywhere.
 */
function homeAnchorHref(pathname: string, id: string): Route {
  return (pathname === "/" ? `#${id}` : `/#${id}`) as Route;
}

export function SiteNavLinks() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  return (
    <>
      <a href={homeAnchorHref(pathname, "discover")}>Explore</a>
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
        href="/events"
        aria-current={pathname.startsWith("/events") ? "page" : undefined}
      >
        Events
      </Link>
      <Link
        href="/guides"
        aria-current={pathname.startsWith("/guides") ? "page" : undefined}
      >
        Guides
      </Link>
      <a href={homeAnchorHref(pathname, "for-business")}>For business</a>
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

export function SiteFooterAccountLink() {
  const { data: session } = authClient.useSession();

  if (session?.user) {
    return <Link href="/account">My account</Link>;
  }

  return <Link href="/login">Sign in</Link>;
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
