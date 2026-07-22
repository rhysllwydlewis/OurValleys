import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { getPublicDemoAccountByEmail } from "@/lib/demo-account";
import {
  businessOperationsRoutePermissions,
  hasCompleteBusinessOperationsAccess,
} from "@/modules/businesses/operations-access";
import { canUserAccessBusiness } from "@/modules/businesses/permissions";

const operationsPathPattern =
  /^\/dashboard\/business\/([^/]+)\/operations(?:\/|$)/;

export async function proxy(request: NextRequest) {
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

    return NextResponse.next();
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
  ],
};
