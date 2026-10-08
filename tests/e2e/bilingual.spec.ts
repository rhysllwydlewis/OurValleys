import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { publicDemoAccount } from "../../src/lib/demo-account";

test.describe("language negotiation", () => {
  test("defaults to English for an English browser", async ({ page }) => {
    await page.goto("/businesses");
    await expect(page.locator("header[lang]").first()).toHaveAttribute(
      "lang",
      "en-GB",
    );
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
      await expect(page.locator("header[lang]").first()).toHaveAttribute(
        "lang",
        "cy-GB",
      );
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
        .getByRole("button", { name: "English" })
        .click();
      await expect(page.locator("header[lang]").first()).toHaveAttribute(
        "lang",
        "en-GB",
      );
      await page.reload();
      await expect(page.locator("header[lang]").first()).toHaveAttribute(
        "lang",
        "en-GB",
      );
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

  await switcher.getByRole("button", { name: "Cymraeg" }).click();

  await expect(page).toHaveURL(/\/businesses\?q=cafe$/);
  await expect(page.locator("header[lang]").first()).toHaveAttribute(
    "lang",
    "cy-GB",
  );
  await expect(
    page.getByRole("link", { name: "Neidio i’r prif gynnwys" }),
  ).toBeAttached();
  await expect(
    page.getByRole("group", { name: "Iaith" }).first().getByRole("button", {
      name: "Cymraeg",
    }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.goto("/events");
  await expect(page.locator("header[lang]").first()).toHaveAttribute(
    "lang",
    "cy-GB",
  );
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
  baseURL,
}) => {
  await page
    .context()
    .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.locator("header[lang]").first()).toHaveAttribute(
    "lang",
    "cy-GB",
  );
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

test("the Welsh business directory translates the form, filters and results", async ({
  page,
  baseURL,
}) => {
  await page
    .context()
    .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
  await page.goto("/businesses?openNow=1&verified=1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Dewch o hyd i rywbeth defnyddiol gerllaw.",
  );
  await expect(page.getByLabel("Beth sydd ei angen arnoch?")).toBeVisible();
  await expect(page.getByLabel("Trefnu yn ôl")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Dileu’r hidlydd ar agor nawr" }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/Busnesau lleol/);
  await page.goto("/businesses?q=zzzzqqqq");
  await expect(
    page.getByRole("heading", {
      name: "Nid oes busnesau’n cyfateb i’r hidlwyr hyn.",
    }),
  ).toBeVisible();
});

test("the Welsh account journey pages and the events listing are translated", async ({
  page,
  baseURL,
}) => {
  await page
    .context()
    .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);

  await page.goto("/login");
  await expect(page).toHaveTitle(/Mewngofnodi/);
  await expect(page.locator("main")).toHaveAttribute("lang", "cy-GB");
  await expect(page.locator("aside h2").first()).toHaveAttribute(
    "lang",
    "en-GB",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Mewngofnodi i OurValleys." }),
  ).toBeVisible();
  await expect(page.getByLabel("Cyfeiriad e-bost")).toBeVisible();
  await expect(page.getByLabel("Cyfrinair")).toBeVisible();
  await page.getByLabel("Cyfeiriad e-bost").fill("nobody@example.test");
  await page.getByLabel("Cyfrinair").fill("not-the-password");
  await page.getByRole("button", { name: "Mewngofnodi", exact: true }).click();
  await expect(page.locator("p[role=alert]")).toContainText(
    /anghywir|Gormod o ymdrechion/,
  );

  await page.goto("/register");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Crëwch eich cyfrif am ddim.",
    }),
  ).toBeVisible();

  await page.goto("/forgot-password");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Wedi anghofio eich cyfrinair?",
    }),
  ).toBeVisible();

  await page.goto("/reset-password");
  await expect(
    page.getByRole("link", { name: "Gofyn am ddolen newydd" }),
  ).toBeVisible();

  await page.goto("/events?when=weekend");
  await expect(page).toHaveTitle(/Digwyddiadau lleol/);
  await expect(page.locator("main")).not.toHaveAttribute("lang", /./);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Dewch o hyd i’ch digwyddiad lleol nesaf.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Tynnu’r hidlydd dyddiad Y penwythnos hwn",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Chwilio digwyddiadau")).toBeVisible();
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
      .getByRole("button", { name: "Cymraeg" })
      .click();
    await expect(page).toHaveURL(/\/guides$/);
    await expect(page.locator("header[lang]").first()).toHaveAttribute(
      "lang",
      "cy-GB",
    );
  });
});

test("the Welsh account menu, account hub and owner dashboard are translated", async ({
  page,
  baseURL,
}) => {
  await page
    .context()
    .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);

  await page.goto("/login");
  await page.getByLabel("Cyfeiriad e-bost").fill(publicDemoAccount.email);
  await page.getByLabel("Cyfrinair").fill(publicDemoAccount.password);
  await page.getByRole("button", { name: "Mewngofnodi", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);

  const firstName = publicDemoAccount.name.split(" ")[0];
  await expect(page).toHaveTitle(/Eich cyfrif/);
  await expect(
    page.getByRole("heading", { level: 1, name: `Croeso’n ôl, ${firstName}.` }),
  ).toBeVisible();
  await expect(page.locator("main[lang=cy-GB]")).toBeVisible();
  await expect(page.getByText("Aelod ers")).toBeVisible();
  await expect(page.getByText("Gwyliwr", { exact: true })).toBeVisible();

  const trigger = page
    .getByRole("banner")
    .getByRole("button", { name: "Cyfrif" });
  await trigger.click();
  const panel = page.getByTestId("account-menu-panel");
  await expect(panel).toHaveAttribute("lang", "cy-GB");
  await expect(panel.getByRole("link", { name: "Fy nghyfrif" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Allgofnodi" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page
    .getByRole("link", { name: "Agor dangosfwrdd y busnes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Cwm & Coil Heating" }),
  ).toBeVisible();
  // The business name was typed by its owner, so it is not marked as Welsh.
  await expect(
    page.getByRole("heading", { level: 1, name: "Cwm & Coil Heating" }),
  ).toHaveAttribute("lang", "");
  await expect(page.getByText("Gwylio’n unig", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Y drafft cyfredol a gadwyd" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Adolygu a mynd yn fyw" }),
  ).toBeVisible();
  await expect(page.getByText("Rhestr wirio sefydlu")).toBeVisible();
  // Nothing the viewer sees on the dashboard is left in English.
  await expect(page.getByText("Setup checklist")).toHaveCount(0);
  await expect(page.getByText("Publish readiness")).toHaveCount(0);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);

  await page.goto("/account/new-business");
  await expect(
    page.getByRole("heading", {
      name: "Ni all cyfrifon arddangos cyhoeddus greu busnesau.",
    }),
  ).toBeVisible();

  await page.goto("/account/settings");
  await expect(page).toHaveTitle(/Gosodiadau’r cyfrif/);
  await expect(page.locator("main[lang=cy-GB]:not([aria-busy])")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Gosodiadau’r cyfrif" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Mae gosodiadau’r demo cyhoeddus yn ddarllen yn unig.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("switch", {
      name: "E-bostiwch fi os caiff digwyddiad a gadwyd ei ganslo",
    }),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Nid yw dileu’r cyfrif ar gael" }),
  ).toBeVisible();
  // Nothing on the settings page is left in English.
  await expect(page.getByText("Account overview")).toHaveCount(0);
  await expect(page.getByText("Save profile")).toHaveCount(0);
  const settingsAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(settingsAxe.violations.map((violation) => violation.id)).toEqual([]);

  await page.goto("/account/saved");
  await expect(page).toHaveTitle(/Busnesau, digwyddiadau a lleoedd a gadwyd/);
  await expect(page.locator("main[lang=cy-GB]:not([aria-busy])")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Nid yw eitemau a gadwyd ar gael yn yr arddangosfa gyhoeddus.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Creu eich cyfrif rhad ac am ddim" }),
  ).toBeVisible();
  const savedAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(savedAxe.violations.map((violation) => violation.id)).toEqual([]);
});

for (const path of [
  "/",
  "/businesses",
  "/login",
  "/register",
  "/forgot-password",
  "/events",
]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`Welsh ${path} has no WCAG A/AA violations (${scheme})`, async ({
      page,
      baseURL,
    }) => {
      await page
        .context()
        .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
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
