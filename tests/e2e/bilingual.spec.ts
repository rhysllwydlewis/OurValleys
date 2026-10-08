import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("language negotiation", () => {
  test("defaults to English for an English browser", async ({ page }) => {
    await page.goto("/businesses");
    await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
    await expect(
      page.getByRole("link", { name: "Skip to main content" }),
    ).toBeAttached();
  });

  test.describe("Welsh browser", () => {
    test.use({ locale: "cy-GB" });

    test("renders Welsh chrome without any explicit choice", async ({
      page,
    }) => {
      await page.goto("/businesses");
      await expect(page.locator("html")).toHaveAttribute("lang", "cy-GB");
      await expect(
        page.getByRole("link", { name: "Neidio i’r prif gynnwys" }),
      ).toBeAttached();
      await expect(
        page
          .getByRole("navigation", { name: "Prif lywio" })
          .getByRole("link", { name: "Busnesau" }),
      ).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Llywio’r troedyn" }),
      ).toBeAttached();
    });

    test("an explicit English choice beats the browser language", async ({
      page,
    }) => {
      await page.goto("/businesses");
      await page
        .getByRole("group", { name: "Iaith" })
        .first()
        .getByRole("button", { name: /Newid i English/ })
        .click();
      await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
    });
  });
});

test("the visitor can switch language, keep their place and persist the choice", async ({
  page,
}) => {
  await page.goto("/businesses?q=cafe");
  const switcher = page.getByRole("group", { name: "Language" }).first();
  await expect(
    switcher.getByRole("button", { name: "English" }),
  ).toHaveAttribute("aria-pressed", "true");

  await switcher.getByRole("button", { name: "Switch to Cymraeg" }).click();

  await expect(page).toHaveURL(/\/businesses\?q=cafe$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "cy-GB");
  await expect(
    page.getByRole("link", { name: "Neidio i’r prif gynnwys" }),
  ).toBeAttached();
  await expect(
    page.getByRole("group", { name: "Iaith" }).first().getByRole("button", {
      name: "Cymraeg",
    }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.goto("/events");
  await expect(page.locator("html")).toHaveAttribute("lang", "cy-GB");
  await expect(
    page
      .getByRole("navigation", { name: "Llywio’r troedyn" })
      .getByRole("link", { name: "Digwyddiadau lleol" }),
  ).toBeVisible();

  const cookies = await page.context().cookies();
  const cookie = cookies.find((entry) => entry.name === "ov-locale");
  expect(cookie?.value).toBe("cy");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
});

test("the homepage hero, search and sign-in dialog are available in Welsh", async ({
  page,
}) => {
  await page
    .context()
    .addCookies([
      { name: "ov-locale", value: "cy", url: "http://127.0.0.1:3200" },
    ]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "cy-GB");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "ein Cymoedd.",
  );
  const search = page.getByRole("search", { name: "Chwilio busnesau lleol" });
  await expect(search.getByRole("button", { name: "Chwilio" })).toBeVisible();
  await expect(search.getByLabel("Ble?")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Camau cyflym" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Mewngofnodi" }).first().click();
  const dialog = page.getByRole("dialog", {
    name: "Mewngofnodi i OurValleys",
  });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the language toggle still works as a plain form post", async ({
    page,
  }) => {
    await page.goto("/guides");
    await page
      .getByRole("group", { name: "Language" })
      .first()
      .getByRole("button", { name: "Switch to Cymraeg" })
      .click();
    await expect(page).toHaveURL(/\/guides$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "cy-GB");
  });
});

for (const path of ["/", "/businesses", "/login"]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`Welsh ${path} has no WCAG A/AA violations (${scheme})`, async ({
      page,
    }) => {
      await page
        .context()
        .addCookies([
          { name: "ov-locale", value: "cy", url: "http://127.0.0.1:3200" },
        ]);
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        results.violations.map(
          (violation) =>
            `${violation.id}: ${violation.nodes
              .slice(0, 3)
              .map((node) => node.target.join(" "))
              .join("; ")}`,
        ),
      ).toEqual([]);
    });
  }
}
