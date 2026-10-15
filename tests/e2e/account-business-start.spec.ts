import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_ACCOUNT_EMAIL;
const password = process.env.E2E_ACCOUNT_PASSWORD;

// Named so it runs before account-settings and homepage specs, which change
// the shared provisioned account's password.
test.skip(!email || !password, "provisioned E2E account is not configured");

async function signIn(page: Page) {
  // Sign-in is rate limited, so wait out a refusal and try again.
  for (let attempt = 1; ; attempt += 1) {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    try {
      await expect(page).toHaveURL(/\/account$/);
      return;
    } catch (error) {
      if (attempt >= 3) throw error;
      await page.waitForTimeout(11_000);
    }
  }
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
}

test("starting a business checks for duplicates as you type and previews the site", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/account/new-business");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Create your free business website.",
    }),
  ).toBeVisible();
  await expect(page.getByText("0 of 4 steps done")).toBeVisible();
  await expect(
    page.getByText("Pick a category to see how your site is laid out"),
  ).toBeVisible();
  await expectAccessible(page);

  // A quiet name is checked and reported as not listed yet.
  await page.getByLabel("Business name").fill("Zzyzx Nonexistent Trading");
  await expect(
    page.getByText("No similar business is listed yet"),
  ).toBeVisible();

  // The seeded fictional business is found despite "&", case and "Ltd".
  await page.getByLabel("Business name").fill("CWM COIL HEATING LTD");
  const panel = page.getByRole("heading", {
    name: "Is your business already listed?",
  });
  await expect(panel).toBeVisible();
  await expect(page.getByText("Same name", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Claim this business/ }).first(),
  ).toHaveAttribute("href", /\/claim\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("link", { name: /^View listing/ }).first(),
  ).toHaveAttribute("href", "/b/cwm-coil-heating");
  await expectAccessible(page);

  // Choosing a category and where the business is shows the starter design.
  await page.getByLabel("Narrow the categories").fill("plumb");
  await page.getByRole("radio", { name: /Plumbing/ }).check();
  await expect(page.getByText("Trusted local expertise")).toBeVisible();
  await expect(page.getByText("Opens with")).toBeVisible();
  await expect(page.getByText("Design: Bold & direct")).toBeVisible();
  await page.getByLabel("Where is it based?").selectOption({ index: 1 });
  await page.getByRole("radio", { name: /We travel to customers/ }).check();
  await expect(page.getByText("All steps done")).toBeVisible();
  await expectAccessible(page);

  // A likely duplicate must be answered before anything is created.
  await page.getByRole("button", { name: "Create my starter website" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "already listed" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "None of these is mine" }).click();
  await expect(
    page.getByText("We will create a separate listing for you"),
  ).toBeVisible();

  // Editing the name restarts the question.
  await page.getByLabel("Business name").fill("Zzyzx Nonexistent Trading");
  await expect(
    page.getByRole("alert").filter({ hasText: "already listed" }),
  ).toHaveCount(0);
});

test("a category with no match says so and the claim page explains what happens next", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/account/new-business");
  await page.getByLabel("Narrow the categories").fill("qqqq");
  await expect(page.getByText("No category matches “qqqq”.")).toBeVisible();

  await page.getByLabel("Business name").fill("Cwm Coil Heating");
  await page
    .getByRole("link", { name: /^Claim this business/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/claim\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Cwm & Coil Heating/ }),
  ).toBeVisible();
  await expect(page.getByText("You are claiming")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What happens next" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start a separate listing" }),
  ).toHaveAttribute("href", "/account/new-business");
  await expectAccessible(page);
});

test("the start journey and claim page are fully Welsh", async ({
  page,
  context,
  baseURL,
}) => {
  await signIn(page);
  await context.addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
  await page.goto("/account/new-business");
  await expect(page.getByText("0 o 4 cam wedi’u gwneud")).toBeVisible();
  await expect(page.getByText("Enwch eich busnes")).toBeVisible();
  await expect(page.getByText("Yr hyn a gewch, am ddim")).toBeVisible();
  await page.getByLabel("Enw’r busnes").fill("Cwm Coil Heating");
  await expect(
    page.getByRole("heading", {
      name: "A yw eich busnes eisoes wedi’i restru?",
    }),
  ).toBeVisible();
  await expect(page.getByText("Yr un enw")).toBeVisible();
  await expect(page.getByText("Is your business already listed?")).toHaveCount(
    0,
  );
  await expectAccessible(page);

  await page
    .getByRole("link", { name: /^Hawlio’r busnes hwn/ })
    .first()
    .click();
  await expect(page.getByText("Beth sy’n digwydd nesaf")).toBeVisible();
  await expect(page.getByText("What happens next")).toHaveCount(0);
  await expectAccessible(page);
});
