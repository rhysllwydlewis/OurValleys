export type AtomEntry = {
  id: string;
  title: string;
  url: string;
  updated: Date;
  published?: Date;
  summary: string;
};

export type AtomFeed = {
  id: string;
  title: string;
  subtitle: string;
  selfUrl: string;
  alternateUrl: string;
  updated: Date;
  entries: readonly AtomEntry[];
};

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/** Escapes text for XML and strips characters XML 1.0 forbids. */
export function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/[&<>"']/g, (char) => XML_ESCAPES[char] ?? char);
}

export function truncateForFeed(value: string, limit = 300): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
}

function entryXml(entry: AtomEntry): string {
  return [
    "  <entry>",
    `    <id>${escapeXml(entry.id)}</id>`,
    `    <title>${escapeXml(entry.title)}</title>`,
    `    <link rel="alternate" href="${escapeXml(entry.url)}"/>`,
    `    <updated>${entry.updated.toISOString()}</updated>`,
    ...(entry.published
      ? [`    <published>${entry.published.toISOString()}</published>`]
      : []),
    `    <summary>${escapeXml(entry.summary)}</summary>`,
    "  </entry>",
  ].join("\n");
}

export function buildAtomFeed(feed: AtomFeed): string {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <id>${escapeXml(feed.id)}</id>`,
    `  <title>${escapeXml(feed.title)}</title>`,
    `  <subtitle>${escapeXml(feed.subtitle)}</subtitle>`,
    `  <link rel="self" type="application/atom+xml" href="${escapeXml(feed.selfUrl)}"/>`,
    `  <link rel="alternate" href="${escapeXml(feed.alternateUrl)}"/>`,
    `  <updated>${feed.updated.toISOString()}</updated>`,
    ...feed.entries.map(entryXml),
    "</feed>",
    "",
  ].join("\n");
}

export const ATOM_HEADERS = {
  "Content-Type": "application/atom+xml; charset=utf-8",
  "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
} as const;

export function feedUnavailableResponse(what: string): Response {
  return new Response(`${what} are temporarily unavailable`, {
    status: 503,
    headers: { "Retry-After": "300" },
  });
}
