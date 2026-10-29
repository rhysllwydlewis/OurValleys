import { describe, expect, it } from "vitest";
import {
  buildShareResults,
  fitNameSize,
  isShareChannel,
  parsePrintKind,
  qrDestinations,
  parsePrintLocale,
  parseShareImageShape,
  shareHandOff,
  shareUrl,
} from "./share-kit-model";
import { firstEncodableDestination } from "./qr-code";
import { campaignSources, readCampaignSource } from "./traffic-source";

describe("shareUrl", () => {
  it("labels a link with its channel", () => {
    expect(shareUrl("https://example.test", "cwm-coil", "whatsapp")).toBe(
      "https://example.test/b/cwm-coil?source=whatsapp",
    );
  });

  it("leaves the plain link unlabelled", () => {
    expect(
      shareUrl(new URL("https://example.test/x"), "cwm-coil", "plain"),
    ).toBe("https://example.test/b/cwm-coil");
  });

  it("encodes an unexpected slug instead of changing the path", () => {
    expect(shareUrl("https://example.test", "a/b?c", "print")).toBe(
      "https://example.test/b/a%2Fb%3Fc?source=print",
    );
  });

  it("only ever produces labels the public page accepts", () => {
    for (const channel of [
      "whatsapp",
      "facebook",
      "instagram",
      "email",
      "print",
    ] as const) {
      const url = new URL(shareUrl("https://example.test", "x", channel));
      expect(readCampaignSource(url.searchParams.get("source"))).toBe(channel);
      expect(isShareChannel(channel)).toBe(true);
    }
  });
});

describe("readCampaignSource", () => {
  it("accepts known labels in any case", () => {
    expect(readCampaignSource(" QR ")).toBe("qr");
    expect(readCampaignSource("Print")).toBe("print");
  });

  it("does not throw on a repeated parameter and reads the first value", () => {
    expect(readCampaignSource(["print", "qr"])).toBe("print");
    expect(readCampaignSource(["nope", "qr"])).toBeNull();
    expect(readCampaignSource([])).toBeNull();
  });

  it("ignores everything else so free text cannot reach the results", () => {
    for (const value of [
      "direct",
      "search_engine",
      "<script>",
      "",
      "constructor",
      null,
      undefined,
    ]) {
      expect(readCampaignSource(value)).toBeNull();
    }
  });
});

describe("shareHandOff", () => {
  const base = {
    url: "https://e.test/b/x?source=email",
    message: "Hello & welcome",
    subject: "Visit us",
  };

  it("builds a WhatsApp link with the message and address encoded", () => {
    const hand = shareHandOff({ ...base, channel: "whatsapp" });
    expect(hand?.href.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(hand!.href.split("text=")[1]!)).toBe(
      "Hello & welcome https://e.test/b/x?source=email",
    );
  });

  it("builds a Facebook share link from the address only", () => {
    const hand = shareHandOff({ ...base, channel: "facebook" });
    expect(hand?.href).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(base.url)}`,
    );
  });

  it("builds an email draft with a subject and body", () => {
    const hand = shareHandOff({ ...base, channel: "email" });
    expect(hand?.href.startsWith("mailto:?subject=Visit%20us&body=")).toBe(
      true,
    );
  });

  it("has no web address for Instagram or print", () => {
    expect(shareHandOff({ ...base, channel: "instagram" })).toBeNull();
    expect(shareHandOff({ ...base, channel: "print" })).toBeNull();
  });
});

describe("print and image parsing", () => {
  it("accepts only known layouts", () => {
    expect(parsePrintKind("poster")).toBe("poster");
    expect(parsePrintKind("cards")).toBe("cards");
    expect(parsePrintKind("../etc")).toBeNull();
    expect(parsePrintKind(undefined)).toBeNull();
  });

  it("prints in English unless Welsh is asked for", () => {
    expect(parsePrintLocale("cy")).toBe("cy");
    expect(parsePrintLocale("fr")).toBe("en");
    expect(parsePrintLocale(undefined)).toBe("en");
  });

  it("falls back to the wide image", () => {
    expect(parseShareImageShape("square")).toBe("square");
    expect(parseShareImageShape("story")).toBe("story");
    expect(parseShareImageShape("huge")).toBe("wide");
    expect(parseShareImageShape(null)).toBe("wide");
  });

  it("steps the name size down for long names", () => {
    const sizes = { large: 100, medium: 70, small: 50 };
    expect(fitNameSize("Cwm Coil", sizes)).toBe(100);
    expect(fitNameSize("The Welsh Valleys Heating Company", sizes)).toBe(70);
    expect(fitNameSize("A".repeat(60), sizes)).toBe(50);
  });
});

describe("buildShareResults", () => {
  it("keeps every channel, in order, and sums shared visits", () => {
    const results = buildShareResults([
      { source: "direct", count: 10, percent: 50 },
      { source: "whatsapp", count: 6, percent: 30 },
      { source: "print", count: 4, percent: 20 },
    ]);
    expect(results.rows.map((row) => row.source)).toEqual([...campaignSources]);
    expect(results.shared).toBe(10);
    expect(results.total).toBe(20);
    expect(results.best).toBe("whatsapp");
  });

  it("reports no best channel when nothing was shared", () => {
    const results = buildShareResults([
      { source: "direct", count: 3, percent: 100 },
    ]);
    expect(results.shared).toBe(0);
    expect(results.best).toBeNull();
    expect(buildShareResults([]).total).toBe(0);
  });
});

describe("qrDestinations", () => {
  it("lists the labelled address first and the plain one last", () => {
    const [labelled, qr, plain] = qrDestinations("https://e.test", "cwm");
    expect(labelled).toBe("https://e.test/b/cwm?source=print");
    expect(qr).toBe("https://e.test/b/cwm?source=qr");
    expect(plain).toBe("https://e.test/b/cwm");
  });

  it("drops to a shorter address when the label would not fit the encoder", () => {
    const slug = "a".repeat(78);
    const candidates = qrDestinations("https://ourvalleys.co.uk", slug);
    // The labelled address is over the encoder's limit; the plain one fits.
    expect(firstEncodableDestination(candidates)).toBe(candidates[2]);
    expect(firstEncodableDestination(["x".repeat(500)])).toBeNull();
  });
});
