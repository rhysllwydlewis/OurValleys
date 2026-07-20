import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 900, maximumHeroHeight: 620 },
  { name: "tablet", width: 768, height: 1024, maximumHeroHeight: 660 },
  { name: "mobile", width: 390, height: 844, maximumHeroHeight: 660 },
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

    const hero = await page
      .locator('section[aria-labelledby="home-title"]')
      .boundingBox();
    expect(hero).not.toBeNull();
    expect(hero?.height).toBeLessThanOrEqual(viewport.maximumHeroHeight);

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

test("sign-in dialog submits safely and restores focus", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Sign in" });
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Sign in to OurValleys" });
  await expect(dialog).toBeVisible();

  const email = dialog.getByLabel("Email address");
  await expect(email).toBeFocused();
  await email.fill("nobody@example.test");
  await dialog.getByLabel("Password").fill("not-a-real-password");
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(dialog.getByRole("alert")).toContainText(
    "email address or password is incorrect",
  );

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("dedicated sign-in fallback exposes the complete form", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Sign in to OurValleys." }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByText("Public discovery does not require an account")).toBeVisible();
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
    .locator("[data-home-parallax] > div")
    .evaluate((element) => getComputedStyle(element).animationDuration);
  expect(Number.parseFloat(animationDuration)).toBeLessThanOrEqual(0.001);
});

test("mobile homepage stays within measured payload budgets", async ({ page }) => {
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
            entry.name.includes("/_next/image") ||
            entry.name.includes("/home/"),
        )
        .reduce((total, entry) => total + sizeOf(entry), 0),
    };
  });

  expect(payload.javascript).toBeLessThan(500_000);
  expect(payload.imagery).toBeLessThan(350_000);
});
