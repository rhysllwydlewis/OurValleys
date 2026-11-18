import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const policies = [
  {
    path: "/policies/privacy",
    heading: "Privacy notice",
    section: "What we collect",
  },
  {
    path: "/policies/terms",
    heading: "Platform terms",
    section: "What OurValleys is",
  },
  {
    path: "/policies/accessibility",
    heading: "Accessibility statement",
    section: "Known limits",
  },
  {
    path: "/policies/content-guidelines",
    heading: "Content guidelines",
    section: "Offers, events and updates",
  },
  {
    path: "/policies/corrections",
    heading: "Complaints and corrections",
    section: "How to complain",
  },
  {
    path: "/policies/advertising",
    heading: "Advertising policy",
    section: "Paid is not verified",
  },
] as const;

for (const policy of policies) {
  test.describe(policy.path, () => {
    test("renders its sections and passes the accessibility checks", async ({
      page,
    }) => {
      await page.goto(policy.path);
      await expect(
        page.getByRole("heading", { level: 1, name: policy.heading }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: policy.section }),
      ).toBeVisible();
      // A policy is several headed sections, not one wall of text.
      expect(
        await page.getByRole("heading", { level: 2 }).count(),
      ).toBeGreaterThan(5);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });

    test("does not scroll sideways on a phone", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(policy.path);
      await expect(
        page.getByRole("heading", { level: 1, name: policy.heading }),
      ).toBeVisible();
      const widths = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        window: window.innerWidth,
      }));
      expect(widths.document).toBeLessThanOrEqual(widths.window);
    });
  });
}

test("every policy is linked from the footer and the index", async ({
  page,
}) => {
  await page.goto("/policies");
  for (const policy of policies) {
    await expect(
      page.locator(`main a[href="${policy.path}"]`),
      policy.path,
    ).toHaveCount(1);
    await expect(
      page.locator(`footer a[href="${policy.path}"]`),
      policy.path,
    ).toHaveCount(1);
  }
});

test("the accessibility statement links to the display settings", async ({
  page,
}) => {
  await page.goto("/policies/accessibility");
  await expect(
    page.getByRole("link", { name: /display/i }).first(),
  ).toBeVisible();
  await expect(page.locator('main a[href="/display"]')).toHaveCount(1);
});
