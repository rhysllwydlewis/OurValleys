import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const wcag = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Welsh news, policies and not-found pages", () => {
  test.use({ locale: "cy-GB" });

  test("news is Welsh, with the feed's own headlines marked English", async ({
    page,
  }) => {
    await page.goto("/news");
    await expect(page).toHaveTitle(/Newyddion diweddaraf o Gymru/);
    await expect(page.getByTestId("news-page")).toHaveAttribute(
      "lang",
      "cy-GB",
    );
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Newyddion o’r Cymoedd ac o bob rhan o Gymru.",
      }),
    ).toBeVisible();
    // Nothing of the page's own wording is left in English.
    await expect(page.getByText("Latest news")).toHaveCount(0);
    await expect(page.getByText("Return home")).toHaveCount(0);
    // Every headline taken from the English feed says so.
    for (const heading of await page
      .locator("main h2[lang], main h3[lang]")
      .all()) {
      await expect(heading).toHaveAttribute("lang", "en-GB");
    }
    // The source link is still attributed and safe.
    await expect(
      page.getByRole("link", { name: "WalesOnline", exact: true }),
    ).toHaveAttribute("href", "https://www.walesonline.co.uk/news/");

    const results = await new AxeBuilder({ page }).withTags(wcag).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test("the policies list and a policy page use Welsh chrome", async ({
    page,
  }) => {
    await page.goto("/policies");
    await expect(page).toHaveTitle(/Polisïau/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Polisïau OurValleys." }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Hysbysiad preifatrwydd" }),
    ).toBeVisible();
    await expect(page.getByText("Read policy")).toHaveCount(0);
    let results = await new AxeBuilder({ page }).withTags(wcag).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);

    await page.goto("/policies/privacy");
    await expect(page).toHaveTitle(/Hysbysiad preifatrwydd/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Hysbysiad preifatrwydd" }),
    ).toBeVisible();
    await expect(page.getByRole("note")).toContainText("Saesneg yn unig");
    // The legal wording is English and says so to assistive technology.
    await expect(page.locator(".policy-sections")).toHaveAttribute(
      "lang",
      "en-GB",
    );
    await expect(
      page.getByRole("heading", { name: "What we collect" }),
    ).toBeVisible();
    results = await new AxeBuilder({ page }).withTags(wcag).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test("an unknown route shows the Welsh not-found page", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await expect(page).toHaveTitle(/Heb ddod o hyd i’r dudalen/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Doedd dim modd dod o hyd i’r dudalen honno.",
      }),
    ).toBeVisible();
    await expect(page.locator("main")).toHaveAttribute("lang", "cy-GB");
    await expect(
      page.getByRole("link", { name: "Pori busnesau" }).first(),
    ).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(wcag).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe("English stays unchanged", () => {
  test("news, policies and not-found keep their English wording", async ({
    page,
  }) => {
    await page.goto("/policies");
    await expect(
      page.getByRole("heading", { level: 1, name: "OurValleys policies." }),
    ).toBeVisible();
    await page.goto("/policies/privacy");
    await expect(page.getByRole("note")).toHaveCount(0);
    await page.goto("/this-page-does-not-exist");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "We could not find that page.",
      }),
    ).toBeVisible();
  });
});
