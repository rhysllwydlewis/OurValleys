import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Automated WCAG 2.0/2.1 A and AA scans of the key public routes.
 *
 * Known pre-existing violations are tracked explicitly in `knownViolations`
 * so the gate is green today and blocks regressions. Remove an entry as soon
 * as the underlying defect is fixed; the test fails if a listed violation no
 * longer occurs so the allow-list only ever shrinks.
 */
const routes = [
  { name: "home", path: "/" },
  { name: "business directory", path: "/businesses" },
  { name: "business page", path: "/b/cwm-coil-heating" },
  { name: "events", path: "/events" },
  { name: "offers", path: "/offers" },
  { name: "places", path: "/places" },
  { name: "guides", path: "/guides" },
  { name: "sign in", path: "/login" },
  { name: "register", path: "/register" },
] as const;

const schemes = ["light", "dark"] as const;

/** Map of `${route.path}|${scheme}` to the axe rule ids tolerated there. */
const knownViolations: Record<string, readonly string[]> = {};

for (const route of routes) {
  for (const scheme of schemes) {
    test(`${route.name} has no new WCAG A/AA violations (${scheme})`, async ({
      page,
    }) => {
      await page.emulateMedia({
        colorScheme: scheme,
        reducedMotion: "reduce",
      });
      await page.goto(route.path);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const tolerated = knownViolations[`${route.path}|${scheme}`] ?? [];
      const found = results.violations.map((violation) => violation.id);
      const unexpected = results.violations
        .filter((violation) => !tolerated.includes(violation.id))
        .map(
          (violation) =>
            `${violation.id} (${violation.impact}): ${violation.nodes
              .slice(0, 3)
              .map((node) => node.target.join(" "))
              .join("; ")}`,
        );
      expect(unexpected, "new accessibility violations").toEqual([]);
      const stale = tolerated.filter((id) => !found.includes(id));
      expect(stale, "allow-listed violations that no longer occur").toEqual([]);
    });
  }
}
