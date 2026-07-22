import "server-only";
import {
  parseWalesOnlineRss,
  type WalesOnlineNewsItem,
} from "@/modules/news/rss";

export const WALES_ONLINE_RSS_URL =
  "https://www.walesonline.co.uk/news/?service=rss";

const RSS_REVALIDATE_SECONDS = 15 * 60;
const RSS_TIMEOUT_MILLISECONDS = 8_000;

export type WalesOnlineNewsResult = {
  state: "ready" | "unavailable";
  items: WalesOnlineNewsItem[];
  fetchedAt: Date;
};

type WalesOnlineNewsOptions = {
  fetchImplementation?: typeof fetch;
  now?: () => Date;
};

export async function listWalesOnlineNews(
  options: WalesOnlineNewsOptions = {},
): Promise<WalesOnlineNewsResult> {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const now = options.now ?? (() => new Date());

  try {
    const response = await fetchImplementation(WALES_ONLINE_RSS_URL, {
      headers: {
        Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
        "User-Agent": "OurValleys development news reader",
      },
      next: { revalidate: RSS_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(RSS_TIMEOUT_MILLISECONDS),
    });

    if (!response.ok) {
      return { state: "unavailable", items: [], fetchedAt: now() };
    }

    const xml = await response.text();
    if (!/<(?:rss|feed)\b/i.test(xml)) {
      return { state: "unavailable", items: [], fetchedAt: now() };
    }

    return {
      state: "ready",
      items: parseWalesOnlineRss(xml),
      fetchedAt: now(),
    };
  } catch {
    return { state: "unavailable", items: [], fetchedAt: now() };
  }
}
