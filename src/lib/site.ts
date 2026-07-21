const FALLBACK_SITE_URL = "http://localhost:3000";

export function getSiteUrl(
  value: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
): URL {
  const url = new URL(value ?? FALLBACK_SITE_URL);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

export function getPublicSitemapPaths(): readonly string[] {
  return ["/", "/businesses", "/events", "/b/cwm-coil-heating"] as const;
}

export const protectedIndexingPaths = [
  "/api/",
  "/dashboard/",
  "/login/",
  "/health/",
  "/admin",
  "/admin/",
  "/account",
  "/account/",
  "/claim/",
  "/register",
  "/register/",
  "/forgot-password",
  "/forgot-password/",
  "/reset-password",
  "/reset-password/",
] as const;
