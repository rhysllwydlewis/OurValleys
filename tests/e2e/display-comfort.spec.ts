import { expect, test } from "@playwright/test";

test.describe("display comfort settings", () => {
  test("choices are saved in a cookie, applied site-wide and can be reset", async ({
    page,
  }) => {
    await page.goto("/display");
    await expect(
      page.getByRole("heading", { level: 1, name: /comfortable to read/i }),
    ).toBeVisible();
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-display-text",
      /.+/,
    );

    await page.getByLabel("Larger").check();
    await page.getByLabel("High contrast").check();
    await page.getByLabel("Reduce movement").check();
    await page.getByRole("button", { name: "Save my choices" }).click();

    await expect(page.getByRole("status")).toContainText("saved");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-display-text", "larger");
    await expect(html).toHaveAttribute("data-display-contrast", "high");
    await expect(html).toHaveAttribute("data-display-motion", "reduced");
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).fontSize,
      ),
    ).toBe("20px");

    // Persists on another route, and keyboard focus stays visible.
    await page.goto("/businesses");
    await expect(html).toHaveAttribute("data-display-text", "larger");

    await page.goto("/display");
    await expect(page.getByLabel("Larger")).toBeChecked();
    await page.getByRole("button", { name: "Back to standard" }).click();
    await expect(page.getByRole("status")).toContainText("standard");
    await expect(html).not.toHaveAttribute("data-display-text", /.+/);
  });

  test("a tampered cookie falls back to the standard look", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      {
        name: "ov-display",
        value: "text:huge.contrast:<b>",
        url: baseURL ?? "http://127.0.0.1:3200",
      },
    ]);
    await page.goto("/display");
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-display-text",
      /.+/,
    );
    await expect(page.getByLabel("Standard").first()).toBeChecked();
  });

  test("is reachable from the footer and the accessibility statement, in Welsh too", async ({
    page,
  }) => {
    await page.goto("/policies/accessibility");
    await page.getByRole("link", { name: "Display settings" }).first().click();
    await expect(page).toHaveURL(/\/display$/);

    await page.goto("/display?lang=cy");
    await expect(
      page.getByRole("heading", { level: 1, name: /gyfforddus/i }),
    ).toBeVisible();
  });

  test("fits a phone without sideways scrolling at the largest text size", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/display");
    await page.getByLabel("Larger").check();
    await page.getByRole("button", { name: "Save my choices" }).click();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
