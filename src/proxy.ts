import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  isLocale,
  LOCALE_OVERRIDE_HEADER,
  LOCALE_QUERY_PARAM,
} from "@/lib/i18n/config";
import { getAuth } from "@/lib/auth";
import { getPublicDemoAccountByEmail } from "@/lib/demo-account";
import {
  businessOperationsRoutePermissions,
  hasCompleteBusinessOperationsAccess,
} from "@/modules/businesses/operations-access";
import { canUserAccessBusiness } from "@/modules/businesses/permissions";

const operationsPathPattern =
  /^\/dashboard\/business\/([^/]+)\/operations(?:\/|$)/;

const protectedPathPattern =
  /^\/(?:admin(?:\/|$)|claim\/[^/]+$|dashboard\/business\/[^/]+\/(?:operations|website)(?:\/|$))/;

/**
 * Forwards a valid `?lang=cy|en` as a request header so the one server-side
 * locale lookup can honour it for this request. It never writes a cookie, and
 * the header is always replaced or removed so a client cannot inject it.
 */
function withLocaleOverride(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(LOCALE_OVERRIDE_HEADER);
  const lang = request.nextUrl.searchParams.get(LOCALE_QUERY_PARAM);
  if (isLocale(lang)) requestHeaders.set(LOCALE_OVERRIDE_HEADER, lang);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function proxy(request: NextRequest) {
  if (!protectedPathPattern.test(request.nextUrl.pathname)) {
    return withLocaleOverride(request);
  }
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    const publicDemo = getPublicDemoAccountByEmail(session?.user.email);
    const pathname = request.nextUrl.pathname;

    if (publicDemo?.key === "admin" && pathname !== "/admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    if (publicDemo && pathname.startsWith("/claim/")) {
      return NextResponse.redirect(new URL("/businesses", request.url));
    }

    if (
      publicDemo &&
      pathname.startsWith("/dashboard/business/") &&
      (pathname.includes("/operations") || pathname.includes("/website"))
    ) {
      const restrictedSegment = pathname.includes("/operations")
        ? "/operations"
        : "/website";
      const dashboardPath =
        pathname.split(restrictedSegment, 1)[0] ?? "/account";
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }

    const operationsMatch = pathname.match(operationsPathPattern);
    if (operationsMatch && session?.user) {
      const businessId = operationsMatch[1];
      if (!businessId) {
        return NextResponse.redirect(new URL("/account", request.url));
      }

      const permissionResults = await Promise.all(
        businessOperationsRoutePermissions.map((permission) =>
          canUserAccessBusiness({
            userId: session.user.id,
            businessId,
            permission,
          }),
        ),
      );

      if (!hasCompleteBusinessOperationsAccess(permissionResults)) {
        return NextResponse.redirect(
          new URL(`/dashboard/business/${businessId}`, request.url),
        );
      }
    }

    return withLocaleOverride(request);
  } catch {
    return new NextResponse("Protected access is temporarily unavailable.", {
      status: 503,
    });
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/claim/:businessId",
    "/dashboard/business/:businessId/operations/:path*",
    "/dashboard/business/:businessId/website/:path*",
    // Any page opened with a language link; skips APIs and static files.
    {
      source: "/((?!api/|_next/|.*\\..*).*)",
      has: [{ type: "query", key: "lang" }],
    },
  ],
};
