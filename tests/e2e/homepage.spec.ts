import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`premium homepage is intentionally designed at ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Everything local, all in one place.",
      }),
    ).toBeVisible();
    await expect(page.getByLabel("What are you looking for?")).toBeVisible();
    await expect(page.getByLabel("Where?")).toBeVisible();
    await expect(page.getByText("Cwm & Coil Heating").first()).toBeVisible();
    await expect(
      page.getByText("Fictional demo", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "A website for every local business" }),
    ).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

    if (viewport.name !== "tablet") {
      const screenshot = await page.screenshot({ fullPage: true });
      await testInfo.attach(`homepage-${viewport.name}`, {
        body: screenshot,
        contentType: "image/png",
      });
    }
  });
}

test("universal search works without an account", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("What are you looking for?").fill("plumbing");
  await page.getByLabel("Where?").selectOption("tonypandy");
  await page.getByRole("button", { name: "Search", exact: true }).click();

  await expect(page).toHaveURL(/\/businesses\?q=plumbing&place=tonypandy/);
  await expect(page.getByText("Cwm & Coil Heating")).toBeVisible();
});

test("sign-in dialog traps the journey safely and restores focus", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Sign in" });
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Sign in to OurValleys" });
  await expect(dialog).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View sign-in status" }),
  ).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("dedicated sign-in fallback works without modal state", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Account access is not open yet." }),
  ).toBeVisible();
  await expect(
    page.getByText("No credentials have been submitted or stored"),
  ).toBeVisible();
});

test("reduced motion preserves every important homepage section", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.locator("[data-home-root]")).toHaveAttribute(
    "data-motion",
    "reduced",
  );
  await expect(
    page.getByRole("heading", { name: "What do you need today?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Guide concepts for the Valleys" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A website for every local business" }),
  ).toBeVisible();

  const animationDuration = await page
    .locator("[data-home-parallax] img")
    .evaluate((element) => getComputedStyle(element).animationDuration);
  expect(Number.parseFloat(animationDuration)).toBeLessThanOrEqual(0.001);
});

test("mobile homepage stays within measured payload budgets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const payload = await page.evaluate(() => {
    const resources = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    const sizeOf = (entry: PerformanceResourceTiming) =>
      entry.encodedBodySize || entry.transferSize;

    return {
      javascript: resources
        .filter(
          (entry) =>
            entry.initiatorType === "script" ||
            entry.name.includes("/_next/static/chunks/"),
        )
        .reduce((total, entry) => total + sizeOf(entry), 0),
      imagery: resources
        .filter(
          (entry) =>
            entry.initiatorType === "img" ||
            entry.name.includes("/_next/image"),
        )
        .reduce((total, entry) => total + sizeOf(entry), 0),
    };
  });

  expect(payload.javascript).toBeLessThan(500_000);
  expect(payload.imagery).toBeLessThan(350_000);
});
