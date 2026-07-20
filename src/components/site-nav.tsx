"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SiteNavLinks() {
  const pathname = usePathname();

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
        href="/account"
        aria-current={
          pathname === "/account" || pathname.startsWith("/dashboard")
            ? "page"
            : undefined
        }
      >
        My account
      </Link>
    </>
  );
}

export function SiteHeaderAccountAction() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  if (session?.user) {
    return (
      <Link className="site-header__action" href="/account">
        Account
      </Link>
    );
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
