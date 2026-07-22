import "server-only";
import {
  MAX_RSS_BYTES,
  parseWalesOnlineRss,
  type WalesOnlineNewsItem,
} from "@/modules/news/rss";

export const WALES_ONLINE_RSS_URL =
  "https://www.walesonline.co.uk/news/?service=rss";
export const WALES_ONLINE_RSS_FALLBACK_URL =
  "https://www.walesonline.co.uk/?service=rss";
export const WALES_ONLINE_RSS_URLS = [
  WALES_ONLINE_RSS_URL,
  WALES_ONLINE_RSS_FALLBACK_URL,
] as const;

const RSS_REVALIDATE_SECONDS = 15 * 60;
const RSS_TIMEOUT_MILLISECONDS = 6_000;

export type WalesOnlineNewsResult = {
  state: "ready" | "unavailable";
  items: WalesOnlineNewsItem[];
  fetchedAt: Date;
};

type WalesOnlineNewsOptions = {
  fetchImplementation?: typeof fetch;
  now?: () => Date;
};

function decodeRssBytes(bytes: Uint8Array): string | null {
  const xml = new TextDecoder().decode(bytes);
  return /<(?:rss|feed)\b/i.test(xml) ? xml : null;
}

async function readRssBody(response: Response): Promise<string | null> {
  const declaredLength = Number.parseInt(
    response.headers.get("content-length") ?? "",
    10,
  );
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RSS_BYTES) {
    return null;
  }

  if (!response.body) {
    const body = new Uint8Array(await response.arrayBuffer());
    return body.byteLength <= MAX_RSS_BYTES ? decodeRssBytes(body) : null;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_RSS_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return decodeRssBytes(body);
}

export async function listWalesOnlineNews(
  options: WalesOnlineNewsOptions = {},
): Promise<WalesOnlineNewsResult> {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const now = options.now ?? (() => new Date());

  for (const feedUrl of WALES_ONLINE_RSS_URLS) {
    try {
      const response = await fetchImplementation(feedUrl, {
        headers: {
          Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
          "User-Agent": "OurValleys development RSS headline reader",
        },
        next: { revalidate: RSS_REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(RSS_TIMEOUT_MILLISECONDS),
      });

      if (!response.ok) continue;
      const xml = await readRssBody(response);
      if (!xml) continue;

      return {
        state: "ready",
        items: parseWalesOnlineRss(xml),
        fetchedAt: now(),
      };
    } catch {
      continue;
    }
  }

  return { state: "unavailable", items: [], fetchedAt: now() };
}
