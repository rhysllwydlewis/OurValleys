/**
 * The three fictional guides the deploy seed publishes so the guides directory
 * is not empty before real editorial content exists. They stay visible and
 * labelled as fictional, but, like the fictional business, they are never
 * advertised to search engines.
 */
export const fixtureGuideIds = {
  coffee: "00000000-0000-4000-8000-000000002001",
  porth: "00000000-0000-4000-8000-000000002002",
  trails: "00000000-0000-4000-8000-000000002003",
} as const;

const fixtureGuideIdSet: ReadonlySet<string> = new Set(
  Object.values(fixtureGuideIds),
);

export function isFixtureGuideId(id: string): boolean {
  return fixtureGuideIdSet.has(id);
}
