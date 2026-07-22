import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { isPublicDemoEmail } from "@/lib/demo-account";

function unavailableResponse() {
  return NextResponse.json(
    { error: "Authentication is not configured." },
    { status: 503 },
  );
}

function publicDemoAccessDeniedResponse() {
  return NextResponse.json(
    {
      error: "This operation is unavailable to public demonstration accounts.",
    },
    { status: 403 },
  );
}

function isAdminApiPath(pathname: string): boolean {
  return (
    pathname === "/api/auth/admin" || pathname.startsWith("/api/auth/admin/")
  );
}

async function requestsPersistentPublicDemoSession(
  request: Request,
  pathname: string,
): Promise<boolean> {
  if (!pathname.endsWith("/sign-in/email")) return false;

  const payload = (await request
    .clone()
    .json()
    .catch(() => null)) as { email?: unknown; rememberMe?: unknown } | null;
  const email = typeof payload?.email === "string" ? payload.email : null;

  return isPublicDemoEmail(email) && payload?.rememberMe !== false;
}

export async function GET(request: Request) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    const pathname = new URL(request.url).pathname;

    if (isPublicDemoEmail(session?.user.email) && isAdminApiPath(pathname)) {
      return publicDemoAccessDeniedResponse();
    }

    return await toNextJsHandler(auth).GET(request);
  } catch {
    return unavailableResponse();
  }
}

export async function POST(request: Request) {
  try {
    const auth = getAuth();
    const pathname = new URL(request.url).pathname;

    if (await requestsPersistentPublicDemoSession(request, pathname)) {
      return publicDemoAccessDeniedResponse();
    }

    const session = await auth.api.getSession({ headers: request.headers });

    // Public demo credentials may create and end their own short-lived session,
    // but they must not alter the shared identity, credentials, linked accounts
    // or Better Auth administrator state through the catch-all API.
    if (
      isPublicDemoEmail(session?.user.email) &&
      !pathname.endsWith("/sign-out")
    ) {
      return publicDemoAccessDeniedResponse();
    }

    return await toNextJsHandler(auth).POST(request);
  } catch {
    return unavailableResponse();
  }
}
