import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { getPublicDemoAccountByEmail } from "@/lib/demo-account";

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
