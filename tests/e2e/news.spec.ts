import { expect, test } from "@playwright/test";

test("news route keeps external reporting clearly attributed", async ({
  page,
}) => {
  await page.goto("/news");

  await expect(
    page.getByRole("heading", { name: "Latest news from across Wales." }),
  ).toBeVisible();
  await expect(
    page.getByText(/WalesOnline supplies these headlines through its RSS feed/),
  ).toBeVisible();

  const feedLink = page.getByRole("link", {
    name: "Open the WalesOnline RSS feed",
  });
  await expect(feedLink).toHaveAttribute(
    "href",
    "https://www.walesonline.co.uk/news/?service=rss",
  );
  await expect(feedLink).toHaveAttribute("target", "_blank");
  await expect(feedLink).toHaveAttribute(
    "rel",
    /noopener.*noreferrer.*external/,
  );

  await expect(
    page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "News" }),
  ).toHaveAttribute("aria-current", "page");
});

test("news redesign remains inside desktop and mobile viewports", async ({
  page,
}, testInfo) => {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/news");

    const pageShell = page.getByTestId("news-page");
    await expect(pageShell).toBeVisible();

    const bounds = await pageShell.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect(
      (bounds?.x ?? 0) + (bounds?.width ?? viewport.width),
    ).toBeLessThanOrEqual(viewport.width + 1);

    await testInfo.attach(`news-${viewport.name}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  }
});

test("mobile news uses the compact accessible navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/news");

  const desktopNavigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  const mobileNavigation = page.getByRole("navigation", {
    name: "Mobile navigation",
  });

  await expect(desktopNavigation).toBeHidden();
  await expect(mobileNavigation).toBeHidden();

  await page.getByLabel("Open navigation menu").click();

  await expect(mobileNavigation).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { name: "News" }),
  ).toHaveAttribute("aria-current", "page");
});
