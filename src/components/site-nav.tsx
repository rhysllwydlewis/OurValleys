"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/auth/account-menu";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n/client";

/**
 * A homepage section id. On the homepage itself this resolves to an
 * in-page anchor; from any other route it resolves home-relative, so the
 * same primary nav works identically everywhere.
 */
function homeAnchorHref(pathname: string, id: string): Route {
  return (pathname === "/" ? `#${id}` : `/#${id}`) as Route;
}

export function SiteNavLinks() {
  const t = useT();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  return (
    <>
      <a href={homeAnchorHref(pathname, "discover")}>{t("nav.explore")}</a>
      <Link
        href="/businesses"
        aria-current={
          pathname === "/businesses" || pathname.startsWith("/b/")
            ? "page"
            : undefined
        }
      >
        {t("nav.businesses")}
      </Link>
      <Link
        href="/map"
        aria-current={pathname.startsWith("/map") ? "page" : undefined}
      >
        {t("nav.map")}
      </Link>
      <Link
        href="/search"
        aria-current={pathname.startsWith("/search") ? "page" : undefined}
      >
        {t("nav.search")}
      </Link>
      <Link
        href="/news"
        aria-current={pathname.startsWith("/news") ? "page" : undefined}
      >
        {t("nav.news")}
      </Link>
      <Link
        href="/events"
        aria-current={pathname.startsWith("/events") ? "page" : undefined}
      >
        {t("nav.events")}
      </Link>
      <Link
        href="/offers"
        aria-current={pathname.startsWith("/offers") ? "page" : undefined}
      >
        {t("nav.offers")}
      </Link>
      <Link
        href="/guides"
        aria-current={pathname.startsWith("/guides") ? "page" : undefined}
      >
        {t("nav.guides")}
      </Link>
      <a href={homeAnchorHref(pathname, "for-business")}>
        {t("nav.forBusiness")}
      </a>
      <Link
        href="/account"
        aria-current={
          pathname === "/account" || pathname.startsWith("/dashboard")
            ? "page"
            : undefined
        }
      >
        {t("nav.myAccount")}
      </Link>
      {session?.user.role === "admin" ? (
        <Link
          href={"/admin" as Route}
          aria-current={pathname.startsWith("/admin") ? "page" : undefined}
        >
          {t("nav.admin")}
        </Link>
      ) : null}
    </>
  );
}

export function SiteFooterAccountLink() {
  const t = useT();
  const { data: session } = authClient.useSession();

  if (session?.user) {
    return <Link href="/account">{t("nav.myAccount")}</Link>;
  }

  return <Link href="/login">{t("header.signIn")}</Link>;
}

export function SiteHeaderAccountAction() {
  const t = useT();
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
      {t("header.signIn")}
    </Link>
  );
}
