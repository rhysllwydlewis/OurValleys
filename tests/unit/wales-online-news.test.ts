import { describe, expect, it, vi } from "vitest";
import { parseWalesOnlineRss } from "../../src/modules/news/rss";
import {
  listWalesOnlineNews,
  WALES_ONLINE_RSS_URLS,
} from "../../src/modules/news/wales-online";

const sampleFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>WalesOnline News</title>
    <item>
      <title>RCT &amp; Valleys update</title>
      <link>http://www.walesonline.co.uk/news/wales-news/example-story-123#comments</link>
      <guid>story-123</guid>
      <pubDate>Wed, 22 Jul 2026 12:30:00 GMT</pubDate>
    </item>
    <item>
      <title>Duplicate story</title>
      <link>https://www.walesonline.co.uk/news/wales-news/example-story-123</link>
      <guid>duplicate</guid>
    </item>
    <item>
      <title><![CDATA[<strong>Second</strong>&nbsp;local &ndash; headline]]></title>
      <link>https://walesonline.co.uk/news/local-news/second-story-456</link>
      <guid>story-456</guid>
      <pubDate>not-a-date</pubDate>
    </item>
    <item>
      <title>Untrusted source</title>
      <link>https://example.com/copied-story</link>
    </item>
    <item>
      <title>Credential-bearing source</title>
      <link>https://reader:password@www.walesonline.co.uk/news/unsafe</link>
    </item>
    <item>
      <title>Unexpected port</title>
      <link>https://www.walesonline.co.uk:444/news/unsafe</link>
    </item>
  </channel>
</rss>`;

describe("WalesOnline RSS parsing", () => {
  it("returns only unique, source-validated headline records", () => {
    const items = parseWalesOnlineRss(sampleFeed);

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      id: "https://www.walesonline.co.uk/news/wales-news/example-story-123",
      title: "RCT & Valleys update",
      url: "https://www.walesonline.co.uk/news/wales-news/example-story-123",
      publishedAt: new Date("2026-07-22T12:30:00.000Z"),
    });
    expect(items[1]).toEqual({
      id: "https://walesonline.co.uk/news/local-news/second-story-456",
      title: "Second local – headline",
      url: "https://walesonline.co.uk/news/local-news/second-story-456",
      publishedAt: null,
    });
  });

  it("honours a bounded result limit", () => {
    expect(parseWalesOnlineRss(sampleFeed, 1)).toHaveLength(1);
    expect(parseWalesOnlineRss(sampleFeed, 0)).toHaveLength(2);
  });

  it("rejects unexpectedly large feed responses", () => {
    expect(() => parseWalesOnlineRss("x".repeat(2_000_001))).toThrow(
      "exceeded the accepted size",
    );
  });
});

describe("WalesOnline RSS retrieval", () => {
  it("tries the supplied section feed before the resilience fallback", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(sampleFeed, {
          status: 200,
          headers: { "content-type": "application/rss+xml" },
        }),
      );
    const checkedAt = new Date("2026-07-22T18:00:00.000Z");

    const result = await listWalesOnlineNews({
      fetchImplementation: fetchMock as unknown as typeof fetch,
      now: () => checkedAt,
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(
      WALES_ONLINE_RSS_URLS,
    );
    expect(result.state).toBe("ready");
    expect(result.items).toHaveLength(2);
    expect(result.fetchedAt).toBe(checkedAt);
  });

  it("returns an honest unavailable state for invalid or oversized responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("<html>Not RSS</html>", { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response("", {
          status: 200,
          headers: { "content-length": "2000001" },
        }),
      );

    const result = await listWalesOnlineNews({
      fetchImplementation: fetchMock as unknown as typeof fetch,
    });

    expect(result).toMatchObject({ state: "unavailable", items: [] });
    expect(fetchMock).toHaveBeenCalledTimes(WALES_ONLINE_RSS_URLS.length);
  });
});
