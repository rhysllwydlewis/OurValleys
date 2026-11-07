export type FollowKind = "updates" | "offers" | "events" | "calendar";

export type FollowOption = {
  kind: FollowKind;
  /** Site-relative path of the feed. */
  path: string;
  /** Absolute address a reader app pastes in. */
  address: string;
  /** A one-tap link for apps that register a scheme (calendar only). */
  subscribeHref?: string;
  /** Items now in the feed; null when the count could not be read. */
  count: number | null;
};

/**
 * The ways to follow one business. The calendar subscription uses the
 * `webcal` scheme so a phone offers to add it; the plain https address is
 * kept for apps that want it pasted. Slugs are lower-case URL-safe strings,
 * but the path is encoded anyway so the address can never be mangled.
 */
export function buildFollowOptions(input: {
  origin: string;
  slug: string;
  counts: {
    updates: number | null;
    offers: number | null;
    events: number | null;
  };
}): FollowOption[] {
  const base = `/b/${encodeURIComponent(input.slug)}`;
  const origin = input.origin.replace(/\/+$/, "");
  const make = (
    kind: FollowKind,
    path: string,
    count: number | null,
  ): FollowOption => {
    const address = `${origin}${path}`;
    return {
      kind,
      path,
      address,
      count,
      ...(kind === "calendar"
        ? { subscribeHref: address.replace(/^https?:/, "webcal:") }
        : {}),
    };
  };
  return [
    make("updates", `${base}/updates/feed.xml`, input.counts.updates),
    make("offers", `${base}/offers/feed.xml`, input.counts.offers),
    make("events", `${base}/events/feed.xml`, input.counts.events),
    make("calendar", `${base}/events/feed.ics`, input.counts.events),
  ];
}
