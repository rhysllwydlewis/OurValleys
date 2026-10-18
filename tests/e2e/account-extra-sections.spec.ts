import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_ACCOUNT_EMAIL;
const password = process.env.E2E_ACCOUNT_PASSWORD;

// Named so it runs before the homepage spec, whose "rotate safely" test
// changes the shared provisioned account's password.
test.skip(!email || !password, "provisioned E2E account is not configured");

async function signIn(page: Page) {
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

async function createBusiness(page: Page): Promise<string> {
  await page.goto("/account/new-business");
  await page
    .getByLabel("Business name")
    .fill(`Extra Sections Test ${Date.now()}`);
  await page.getByLabel("Narrow the categories").fill("plumb");
  await page.getByRole("radio", { name: /Plumbing/ }).check();
  await page
    .getByRole("combobox", { name: "Where is it based?" })
    .selectOption({ index: 1 });
  await page.getByRole("radio", { name: /We travel to customers/ }).check();
  await page.getByRole("button", { name: "Create my starter website" }).click();
  await expect(page).toHaveURL(/\/dashboard\/business\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop()!;
}

test.describe.configure({ mode: "serial" });
let businessId = "";

test("an owner builds, edits, reorders and hides extra sections", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  businessId = await createBusiness(page);
  await page.goto(
    `/dashboard/business/${businessId}/operations#extra-sections`,
  );

  const area = page.locator("section#extra-sections:not([aria-busy])");
  const cards = area.locator("article[aria-labelledby^='extra-heading-']");
  await expect(
    area.getByRole("heading", { name: "Making these sections work for you" }),
  ).toBeVisible();
  await expect(
    area.getByText("No extra sections yet."),
  ).toBeVisible();
  // A plumber is pointed at the areas it covers before anything is added.
  await expect(
    area.getByText(/suit this kind of business/).locator(".."),
  ).toContainText("Areas covered");

  // Add a FAQ: one answered question, one with no answer.
  await area
    .locator("summary", { hasText: "Add frequently asked questions" })
    .click();
  const faqForm = area
    .locator("form")
    .filter({ has: page.locator("input[name='sectionType'][value='faq']") });
  await faqForm.getByLabel("Question").nth(0).fill("Do you give free quotes?");
  await faqForm
    .getByLabel("Answer")
    .nth(0)
    .fill("Yes, for any job in the valley.");
  await faqForm.getByLabel("Question").nth(1).fill("Do you work weekends?");
  await faqForm.getByRole("button", { name: "Add this section" }).click();
  await expect(page).toHaveURL(/outcome=section-saved/);
  await expect(page.getByText("Category section saved.")).toBeVisible();
  const faq = cards.filter({ hasText: "Frequently asked questions" });
  await expect(faq).toHaveCount(1);
  await expect(faq.getByText("2 entries")).toBeVisible();
  // Guidance notices the unanswered question and the thin list.
  await expect(
    area.getByText(/1 question in “Frequently asked questions” has no answer/),
  ).toBeVisible();

  // A row with an answer but no question is refused, not dropped.
  await faq.locator("summary", { hasText: "Edit this section" }).click();
  await faq.getByLabel("Answer").nth(2).fill("An answer with no question");
  await faq.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/outcome=extra-entry-name/);
  await expect(page.getByText(/Row 3 has text but no name/)).toBeVisible();

  // Add a treatments list with prices.
  await area
    .locator("summary", { hasText: "Add treatments or services with prices" })
    .click();
  const priceForm = area.locator("form").filter({
    has: page.locator("input[name='sectionType'][value='treatments']"),
  });
  await priceForm
    .getByLabel("Treatment or service")
    .nth(0)
    .fill("Boiler service");
  await priceForm.getByLabel("Time and price").nth(0).fill("1 hour · £85");
  await priceForm.getByRole("button", { name: "Add this section" }).click();
  await expect(cards).toHaveCount(2);

  // Move the price list above the questions, then back.
  await area
    .getByRole("button", { name: "Move Treatments and prices up" })
    .click();
  await expect(page.getByText("Section moved.")).toBeVisible();
  const headings = () =>
    area
      .locator("article h3")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.firstChild?.textContent),
      );
  expect(await headings()).toEqual([
    "Treatments and prices",
    "Frequently asked questions",
  ]);
  await expect(
    area.getByRole("button", { name: "Move Treatments and prices up" }),
  ).toBeDisabled();

  // The private preview shows both, with the question closed until opened.
  await page.goto(`/dashboard/business/${businessId}/preview`);
  const questions = page.locator("section[data-extra-type='faq']");
  await expect(
    questions.getByRole("heading", { name: "Frequently asked questions" }),
  ).toBeVisible();
  const answer = questions.getByText("Yes, for any job in the valley.");
  await expect(answer).toBeHidden();
  await questions.getByText("Do you give free quotes?").click();
  await expect(answer).toBeVisible();
  // The unanswered question is still listed, but has nothing to open.
  await expect(questions.getByText("Do you work weekends?")).toBeVisible();
  const prices = page.locator("section[data-extra-type='treatments']");
  await expect(prices.getByText("Boiler service")).toBeVisible();
  await expect(prices.getByText("£85")).toBeVisible();
  await expectAccessible(page);

  // Hide the questions: gone from the preview, kept in the editor.
  await page.goto(
    `/dashboard/business/${businessId}/operations#extra-sections`,
  );
  await area
    .getByRole("button", {
      name: "Hide Frequently asked questions from visitors",
    })
    .click();
  await expect(page.getByText("Section hidden from visitors.")).toBeVisible();
  await expect(faq.getByText("Hidden from visitors")).toBeVisible();
  await page.goto(`/dashboard/business/${businessId}/preview`);
  await expect(page.locator("section[data-extra-type='faq']")).toHaveCount(0);
  await expect(prices).toBeVisible();

  // Removal needs a confirmation.
  await page.goto(
    `/dashboard/business/${businessId}/operations#extra-sections`,
  );
  await faq.locator("summary", { hasText: "Edit this section" }).click();
  await faq.locator("summary", { hasText: "Remove section" }).click();
  await faq.getByRole("button", { name: "Yes, remove this section" }).click();
  await expect(page.getByText("Section removed.")).toBeVisible();
  await expect(cards).toHaveCount(1);
  await expectAccessible(page);
});

test("the editor and the section stay usable on a phone and in Welsh", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto(
    `/dashboard/business/${businessId}/operations#extra-sections`,
  );
  const area = page.locator("section#extra-sections:not([aria-busy])");
  await expect(area.getByText("Boiler service", { exact: true })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await expectAccessible(page);

  await page
    .context()
    .addCookies([{ name: "ov-locale", value: "cy", url: page.url() }]);
  await page.reload();
  await expect(
    page.locator("section#extra-sections").getByText("Cofnod").first(),
  ).toBeVisible();
});
