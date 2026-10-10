import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const welshRoutes = [
  { name: "search results", path: "/search?q=heating" },
  { name: "suggest a business", path: "/suggest-a-business" },
  { name: "business website", path: "/b/cwm-coil-heating" },
  { name: "business QR page", path: "/b/cwm-coil-heating/qr" },
  {
    name: "event report",
    path: "/report/event/00000000-0000-4000-8000-000000001201",
  },
] as const;

test.describe("Welsh business website and public forms", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page
      .context()
      .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("search is translated and keeps owner text in English", async ({
    page,
  }) => {
    await page.goto("/search?q=heating");
    await expect(page).toHaveTitle(/Chwilio OurValleys/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Dewch o hyd i unrhyw beth lleol, mewn un chwiliad.",
      }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Beth rydych chi’n chwilio amdano?"),
    ).toBeVisible();
    await expect(page.getByText(/canlyniad ar gyfer/)).toBeVisible();

    await page.goto("/search?q=zzzz-no-such-thing");
    await expect(page.getByText("Dim canlyniadau")).toBeVisible();

    await page.goto("/search");
    await expect(
      page.getByRole("heading", { name: "Rhowch o leiaf ddau nod." }),
    ).toBeVisible();
  });

  test("the suggestion form is Welsh and reports validation in Welsh", async ({
    page,
  }) => {
    await page.goto("/suggest-a-business?q=Caffi");
    await expect(page).toHaveTitle(/Awgrymu busnes lleol/);
    await expect(page.getByLabel("Enw’r busnes")).toHaveValue("Caffi");
    await expect(
      page.getByRole("button", { name: "Anfon yr awgrym" }),
    ).toBeVisible();
    await expect(page.getByText("Send suggestion")).toHaveCount(0);
  });

  test("the generated business website uses Welsh wording and marks owner text as English", async ({
    page,
  }) => {
    await page.goto("/b/cwm-coil-heating");
    await expect(
      page
        .getByRole("navigation", { name: "Adrannau tudalen y busnes" })
        .first(),
    ).toBeAttached();
    await expect(
      page.getByRole("heading", { name: "Gwasanaethau" }),
    ).toBeVisible();
    await expect(page.getByText("Tryloyw yn ôl dyluniad.")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Dod o hyd i fwy o fusnesau lleol" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveAttribute(
      "lang",
      "en-GB",
    );
    await expect(page.getByText("Transparent by design.")).toHaveCount(0);
    // The whole generated shell, header and footer included, is Welsh.
    await expect(
      page.locator("div[lang=cy-GB]", { has: page.locator("footer") }).first(),
    ).toBeAttached();
  });

  test("the QR page and the event report page are Welsh", async ({ page }) => {
    await page.goto("/b/cwm-coil-heating/qr");
    await expect(page.locator("div[lang=cy-GB] > header")).toBeAttached();
    await expect(
      page.getByRole("button", { name: "Argraffu’r dudalen hon" }),
    ).toBeVisible();
    await page.goto("/report/event/00000000-0000-4000-8000-000000001201");
    await expect(
      page.getByRole("button", { name: "Anfon yr adroddiad" }),
    ).toBeVisible();
    await expect(page.getByLabel("Beth sydd o’i le?")).toBeVisible();
  });

  for (const route of welshRoutes) {
    test(`${route.name} has no WCAG A/AA violations in Welsh`, async ({
      page,
    }) => {
      await page.goto(route.path);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }
});

test("the English business website and forms are unchanged", async ({
  page,
}) => {
  await page.goto("/b/cwm-coil-heating");
  await expect(page.getByText("Transparent by design.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Services" })).toBeVisible();
  await page.goto("/suggest-a-business");
  await expect(
    page.getByRole("button", { name: "Send suggestion" }),
  ).toBeVisible();
  await page.goto("/search?q=heating");
  await expect(page.getByText(/results? for/)).toBeVisible();
});
