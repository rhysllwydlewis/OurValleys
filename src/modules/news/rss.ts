const MAX_RSS_LENGTH = 2_000_000;
const DEFAULT_ITEM_LIMIT = 12;
const MAX_ITEM_LIMIT = 30;
const WALES_ONLINE_HOSTS = new Set([
  "walesonline.co.uk",
  "www.walesonline.co.uk",
]);

export type WalesOnlineNewsItem = {
  id: string;
  title: string;
  url: string;
  publishedAt: Date | null;
};

function decodeXmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
  };

  return value.replace(
    /&(#x?[0-9a-f]+|amp|apos|gt|lt|quot);/gi,
    (match, entity: string) => {
      if (!entity.startsWith("#")) {
        return namedEntities[entity.toLowerCase()] ?? match;
      }

      const isHex = entity[1]?.toLowerCase() === "x";
      const parsed = Number.parseInt(
        entity.slice(isHex ? 2 : 1),
        isHex ? 16 : 10,
      );
      if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 0x10ffff) {
        return match;
      }

      return String.fromCodePoint(parsed);
    },
  );
}

function cleanFeedText(value: string | null): string {
  if (!value) return "";

  return decodeXmlEntities(
    value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function readTag(itemXml: string, tagName: string): string | null {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = itemXml.match(
    new RegExp(
      `<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`,
      "i",
    ),
  );
  return match?.[1] ?? null;
}

function normaliseWalesOnlineUrl(rawValue: string | null): string | null {
  const candidate = cleanFeedText(rawValue);
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (!WALES_ONLINE_HOSTS.has(url.hostname.toLowerCase())) return null;
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    url.protocol = "https:";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function parsePublishedAt(rawValue: string | null): Date | null {
  const candidate = cleanFeedText(rawValue);
  if (!candidate) return null;
  const value = new Date(candidate);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function parseWalesOnlineRss(
  xml: string,
  requestedLimit = DEFAULT_ITEM_LIMIT,
): WalesOnlineNewsItem[] {
  if (xml.length > MAX_RSS_LENGTH) {
    throw new Error("The WalesOnline RSS response exceeded the accepted size.");
  }

  const limit = Math.min(
    MAX_ITEM_LIMIT,
    Math.max(1, Math.trunc(requestedLimit) || DEFAULT_ITEM_LIMIT),
  );
  const items: WalesOnlineNewsItem[] = [];
  const seenUrls = new Set<string>();
  const itemPattern = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi;

  for (const match of xml.matchAll(itemPattern)) {
    const itemXml = match[1] ?? "";
    const title = cleanFeedText(readTag(itemXml, "title")).slice(0, 220);
    const url = normaliseWalesOnlineUrl(readTag(itemXml, "link"));

    if (!title || !url || seenUrls.has(url)) continue;

    const guid = cleanFeedText(readTag(itemXml, "guid"));
    items.push({
      id: guid || url,
      title,
      url,
      publishedAt: parsePublishedAt(readTag(itemXml, "pubDate")),
    });
    seenUrls.add(url);

    if (items.length >= limit) break;
  }

  return items;
}
