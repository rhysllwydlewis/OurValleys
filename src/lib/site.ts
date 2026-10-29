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

type PageUrlOptions = {
  title: string;
  description?: string;
  locale: string;
  types?: Record<string, string>;
};

/**
 * Canonical URL and matching Open Graph block for a page. The root layout's
 * defaults point at "/", and metadata merges shallowly per top-level key, so
 * every page that does not set `alternates` / `openGraph` itself would claim
 * the homepage as its canonical URL. `openGraph` replaces the root block
 * wholesale, so the shared fields are repeated here.
 */
export function pageUrlMetadata(
  path: string,
  { title, description, locale, types }: PageUrlOptions,
) {
  return {
    alternates: { canonical: path, ...(types ? { types } : {}) },
    openGraph: {
      type: "website" as const,
      locale,
      siteName: "OurValleys",
      title,
      ...(description ? { description } : {}),
      url: path,
    },
  };
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
  "/invitations/",
  "/register",
  "/register/",
  "/forgot-password",
  "/forgot-password/",
  "/reset-password",
  "/reset-password/",
  "/unsubscribe/",
] as const;
