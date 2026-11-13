/**
 * The homepage has three stock guide pictures and guides have none of their
 * own yet. Choosing by position put the café picture on a walking guide, so
 * the picture is matched to what the guide is about, and only falls back to
 * position when nothing in its address says.
 */
const guidePictures = {
  coffee: "/home/guide-coffee.webp",
  place: "/home/guide-place.webp",
  trails: "/home/guide-trails.webp",
} as const;

const topics: readonly [RegExp, keyof typeof guidePictures][] = [
  [/coffee|cafe|caffi|food|eat|bak|bwyd/, "coffee"],
  [/trail|walk|hik|cycl|outdoor|park|llwybr|cerdded/, "trails"],
  [/afternoon|town|village|high-street|shop|market|tref|pentref/, "place"],
];

const fallbackOrder = [
  guidePictures.place,
  guidePictures.trails,
  guidePictures.coffee,
] as const;

export function pickGuideImage(slug: string, index: number): string {
  const address = slug.toLowerCase();
  for (const [pattern, topic] of topics) {
    if (pattern.test(address)) return guidePictures[topic];
  }
  return fallbackOrder[Math.abs(index) % fallbackOrder.length]!;
}
