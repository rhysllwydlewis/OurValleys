import { expect, test } from "@playwright/test";

test("offline page is a noindex bilingual fallback with a retry link", async ({
  page,
}) => {
  await page.goto("/offline");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(2);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(page.getByRole("link", { name: "Try again" })).toHaveAttribute(
    "href",
    "/",
  );
  await expect(
    page.getByRole("link", { name: "Rhoi cynnig arall arni" }),
  ).toHaveAttribute("href", "/");
});

test("service worker serves the offline page when a navigation fails", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // A reload lets the now-active worker control the page.
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);

  await context.setOffline(true);
  await page.goto("/directory").catch(() => {});
  await expect(page).toHaveTitle(/You are offline/);
  await context.setOffline(false);
});
