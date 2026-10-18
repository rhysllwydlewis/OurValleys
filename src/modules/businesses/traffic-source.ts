/**
 * Where a visit to a business website came from, as a small fixed set of
 * labels. Only the label is ever sent or stored: never the referring address,
 * path or query, so the owner learns "most people found you through the
 * directory" without the platform recording anyone's browsing trail.
 *
 * Pure and dependency-free so the browser (to classify) and the server (to
 * validate and to describe) share one definition.
 */
export const trafficSources = [
  "qr",
  "directory",
  "search",
  "map",
  "whats_on",
  "news_guides",
  "home",
  "search_engine",
  "social",
  "other_site",
  "direct",
] as const;

export type TrafficSource = (typeof trafficSources)[number];

const sourceSet = new Set<string>(trafficSources);

export function isTrafficSource(value: string): value is TrafficSource {
  return sourceSet.has(value);
}

/**
 * Turns whatever a client sent into a known label. Values recorded before this
 * set existed ("directory", "direct", "qr") are already members; anything else
 * is an unknown site rather than free text that could be shown to an owner.
 */
export function normaliseTrafficSource(
  value: string | null | undefined,
): TrafficSource {
  const text = value?.trim().toLowerCase();
  if (!text) return "direct";
  return isTrafficSource(text) ? text : "other_site";
}

/**
 * A brand that lives on many country domains (google.com, google.co.uk,
 * yahoo.co.jp): the brand label followed by a plausible public suffix, so
 * "google.evil.example" is not mistaken for Google.
 */
function brandHost(brand: string): RegExp {
  return new RegExp(`(^|\\.)${brand}\\.(com|(co|com)\\.[a-z]{2}|[a-z]{2,3})$`);
}

const searchEngineHosts = [
  brandHost("google"),
  brandHost("yahoo"),
  brandHost("yandex"),
  /(^|\.)(bing|duckduckgo|startpage|qwant)\.com$/,
  /(^|\.)ecosia\.org$/,
  /(^|\.)search\.brave\.com$/,
];

const socialHosts = [
  brandHost("pinterest"),
  brandHost("nextdoor"),
  /(^|\.)(facebook|instagram|twitter|linkedin|whatsapp|tiktok|reddit|youtube)\.com$/,
  /^(fb\.com|fb\.me|t\.co|x\.com|wa\.me|lnkd\.in|youtu\.be|bsky\.app)$/,
  /^l\.(facebook|instagram)\.com$/,
];

function hostMatches(host: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(host));
}

/** First path segment of an on-site page to the label for that part of the site. */
function internalSource(pathname: string): TrafficSource {
  const segment = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  switch (segment) {
    case undefined:
      return "home";
    case "businesses":
    case "categories":
    case "places":
      return "directory";
    case "search":
      return "search";
    case "map":
      return "map";
    case "events":
    case "offers":
      return "whats_on";
    case "news":
    case "guides":
      return "news_guides";
    default:
      return "direct";
  }
}

/**
 * Classifies a visit. `referrer` is `document.referrer`; `ownHost` is the
 * site's own host (`location.host`). An unreadable or empty referrer, or the
 * visitor's own business page, is "direct". `explicit` (the `?source=qr` on
 * the printed QR code) always wins.
 */
export function classifyTrafficSource(input: {
  referrer: string | null | undefined;
  ownHost: string;
  explicit?: string | null;
}): TrafficSource {
  if (input.explicit === "qr") return "qr";
  const referrer = input.referrer?.trim();
  if (!referrer) return "direct";
  let url: URL;
  try {
    url = new URL(referrer);
  } catch {
    return "direct";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "direct";
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const own = input.ownHost
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
  if (host === own) {
    // Other pages on the site (a business's own menu, say) are not a way in.
    return internalSource(url.pathname);
  }
  if (hostMatches(host, searchEngineHosts)) return "search_engine";
  if (hostMatches(host, socialHosts)) return "social";
  return "other_site";
}

export type SourceBreakdownRow = {
  source: TrafficSource;
  count: number;
  /** Whole percent of all attributed visits, rounded; rows may not sum to 100. */
  percent: number;
};

/**
 * Orders raw per-source counts for display: largest first, ties in the fixed
 * `trafficSources` order, labels folded onto the known set, zero rows dropped.
 */
export function buildSourceBreakdown(
  rows: ReadonlyArray<{ source: string; count: number }>,
): SourceBreakdownRow[] {
  const totals = new Map<TrafficSource, number>();
  for (const row of rows) {
    if (row.count <= 0) continue;
    const source = normaliseTrafficSource(row.source);
    totals.set(source, (totals.get(source) ?? 0) + row.count);
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()]
    .map(([source, count]) => ({
      source,
      count,
      percent: sum === 0 ? 0 : Math.round((count / sum) * 100),
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        trafficSources.indexOf(a.source) - trafficSources.indexOf(b.source),
    );
}
