import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signInAsAdmin } from "./helpers/admin-session";

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

test.skip(!email || !password, "provisioned E2E admin is not configured");

const nav = (page: Page) =>
  page.getByRole("navigation", { name: "Admin sections" });

test("the admin sections are grouped in a sidebar that marks the current one and keeps the header on one line", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInAsAdmin(page, email!, password!);
  await page.goto("/admin");

  for (const group of [
    "Businesses",
    "Trust and safety",
    "Places and stories",
    "Platform",
  ]) {
    await expect(nav(page).getByRole("list", { name: group })).toBeVisible();
  }

  // Places and Place suggestions share a prefix; only the open one is current.
  await nav(page).getByRole("link", { name: "Place suggestions" }).click();
  await expect(page).toHaveURL(/\/admin\/place-suggestions$/);
  await expect(
    nav(page).getByRole("link", { name: "Place suggestions" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    nav(page).getByRole("link", { name: "Places" }),
  ).not.toHaveAttribute("aria-current", "page");
  await expect(nav(page).locator('[aria-current="page"]')).toHaveCount(1);

  // The sidebar sits beside the page.
  const navBox = (await nav(page).boundingBox())!;
  const headingBox = (await page
    .getByRole("heading", { level: 1, name: "Admin" })
    .boundingBox())!;
  expect(navBox.x + navBox.width).toBeLessThanOrEqual(headingBox.x);

  // With the extra Admin link the site header still fits on one line, in
  // English and with the longer Welsh labels.
  const headerOnOneLine = async () => {
    const tops = await page
      .locator(".site-header nav")
      .first()
      .locator("a")
      .evaluateAll((links) =>
        links.map((link) => Math.round(link.getBoundingClientRect().top)),
      );
    expect(tops.length).toBe(11);
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(4);
  };
  await headerOnOneLine();

  const results = await new AxeBuilder({ page })
    .include('nav[aria-label="Admin sections"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);

  // Welsh: switch with the real switcher (a signed-in account's saved
  // language wins over the cookie), and always switch back so later admin
  // tests see English.
  const switcher = page.getByRole("group", { name: /Iaith|Language/ }).first();
  await switcher.getByRole("button", { name: "Cymraeg" }).click();
  try {
    await expect(
      page
        .getByRole("group", { name: /Iaith|Language/ })
        .first()
        .getByRole("button", { name: "Cymraeg" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.goto("/admin");
    await expect(page.locator("header[lang]").first()).toHaveAttribute(
      "lang",
      "cy-GB",
    );
    await headerOnOneLine();
  } finally {
    await page
      .getByRole("group", { name: /Iaith|Language/ })
      .first()
      .getByRole("button", { name: "English" })
      .click();
    await expect(page.locator("header[lang]").first()).toHaveAttribute(
      "lang",
      "en-GB",
    );
  }
});

test("on a phone the strip brings the current section into view after in-page navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAsAdmin(page, email!, password!);
  await page.goto("/admin");
  await expect(
    nav(page).getByRole("link", { name: "Overview" }),
  ).toHaveAttribute("aria-current", "page");

  // The admin layout persists across client-side navigation, so the strip
  // is not remounted; it must still reveal the newly current section, as
  // when following a review-desk item to another admin page.
  await page.evaluate(() =>
    (
      window as unknown as { next: { router: { push(href: string): void } } }
    ).next.router.push("/admin/audit-log"),
  );
  await expect(page).toHaveURL(/\/admin\/audit-log$/);
  const audit = nav(page).getByRole("link", { name: "Audit log" });
  await expect(audit).toHaveAttribute("aria-current", "page");
  await expect(audit).toBeInViewport({ ratio: 1 });
});
