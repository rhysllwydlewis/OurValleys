import type { Locale } from "@/lib/i18n/config";
import {
  campaignSources,
  type CampaignSource,
  type SourceBreakdownRow,
} from "./traffic-source";

/**
 * Pure rules for the owner Share kit: which links an owner can hand out, how
 * a link carries its label, what the print layouts are and how the results
 * are summed. Nothing here reads the database or the request.
 */

/** Channels that get a labelled link; "plain" is the unlabelled website link. */
export const shareChannels = [
  "whatsapp",
  "facebook",
  "instagram",
  "email",
  "print",
] as const satisfies ReadonlyArray<CampaignSource>;

export type ShareChannel = (typeof shareChannels)[number];

const channelSet = new Set<string>(shareChannels);

export function isShareChannel(value: string): value is ShareChannel {
  return channelSet.has(value);
}

/** The address to hand out. Labelled links carry `?source=<channel>`. */
export function shareUrl(
  base: string | URL,
  slug: string,
  channel: ShareChannel | "plain",
): string {
  const url = new URL(`/b/${encodeURIComponent(slug)}`, base);
  if (channel !== "plain") url.searchParams.set("source", channel);
  return url.toString();
}

/**
 * Addresses to try for a printed QR code, best first: labelled for print, the
 * ordinary QR label, then plain. The caller keeps the first that fits the
 * encoder, so a very long business name loses its label rather than its code.
 */
export function qrDestinations(base: string | URL, slug: string): string[] {
  const labelled = shareUrl(base, slug, "print");
  const qr = new URL(labelled);
  qr.searchParams.set("source", "qr");
  return [labelled, qr.toString(), shareUrl(base, slug, "plain")];
}

export type ShareHandOff = { href: string };

/**
 * A ready-made link that opens the channel's own share screen with the
 * message filled in, or null when the channel has no web share address
 * (Instagram, print). The owner still presses send there: nothing is posted
 * or emailed by this site.
 */
export function shareHandOff(input: {
  channel: ShareChannel;
  url: string;
  message: string;
  subject: string;
}): ShareHandOff | null {
  switch (input.channel) {
    case "whatsapp":
      return {
        href: `https://wa.me/?text=${encodeURIComponent(`${input.message} ${input.url}`)}`,
      };
    case "facebook":
      return {
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(input.url)}`,
      };
    case "email":
      return {
        href: `mailto:?subject=${encodeURIComponent(input.subject)}&body=${encodeURIComponent(`${input.message}\n\n${input.url}`)}`,
      };
    default:
      return null;
  }
}

/** Print layouts. Sizes are in the stylesheet; the keys are the URL segment. */
export const printKinds = ["poster", "window", "table", "cards"] as const;
export type PrintKind = (typeof printKinds)[number];

const printKindSet = new Set<string>(printKinds);

export function parsePrintKind(value: string | undefined): PrintKind | null {
  return value && printKindSet.has(value) ? (value as PrintKind) : null;
}

/** A printed sheet is in one language; English unless Welsh is asked for. */
export function parsePrintLocale(value: string | undefined): Locale {
  return value === "cy" ? "cy" : "en";
}

export const shareImageShapes = {
  wide: { width: 1200, height: 630 },
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
} as const;

export type ShareImageShape = keyof typeof shareImageShapes;

export function parseShareImageShape(
  value: string | null | undefined,
): ShareImageShape {
  return value === "square" || value === "story" ? value : "wide";
}

/**
 * Shrinks a name to fit a fixed box: long names get a smaller type size
 * rather than being cut off. Sizes are in pixels for the share image.
 */
export function fitNameSize(
  name: string,
  sizes: { large: number; medium: number; small: number },
): number {
  const length = [...name.trim()].length;
  if (length <= 18) return sizes.large;
  if (length <= 34) return sizes.medium;
  return sizes.small;
}

export type ShareResults = {
  rows: { source: CampaignSource; count: number }[];
  /** Visits that arrived through a link or code the owner handed out. */
  shared: number;
  /** All attributed visits in the period. */
  total: number;
  /** The label with the most visits, or null when nothing was shared yet. */
  best: CampaignSource | null;
};

/**
 * Picks the share-kit labels out of the all-sources breakdown, in the fixed
 * campaign order, with zero rows kept so the owner sees every channel.
 */
export function buildShareResults(
  breakdown: ReadonlyArray<SourceBreakdownRow>,
): ShareResults {
  const counts = new Map(breakdown.map((row) => [row.source, row.count]));
  const rows = campaignSources.map((source) => ({
    source,
    count: counts.get(source) ?? 0,
  }));
  const shared = rows.reduce((sum, row) => sum + row.count, 0);
  const total = breakdown.reduce((sum, row) => sum + row.count, 0);
  let best: CampaignSource | null = null;
  let bestCount = 0;
  for (const row of rows) {
    if (row.count > bestCount) {
      best = row.source;
      bestCount = row.count;
    }
  }
  return { rows, shared, total, best };
}
