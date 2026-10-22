import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

const email = process.env.E2E_ACCOUNT_EMAIL;
const password = process.env.E2E_ACCOUNT_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

test.skip(
  !email || !password || !databaseUrl,
  "provisioned E2E account or database is not configured",
);

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
  expect(
    results.violations.map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`,
    ),
  ).toEqual([]);
}

async function createBusiness(page: Page, name: string): Promise<string> {
  await page.goto("/account/new-business");
  await page.getByLabel("Business name").fill(name);
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

function ukDayFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toLocaleDateString("en-CA", {
    timeZone: "Europe/London",
  });
}

test.describe.configure({ mode: "serial" });

test("a signed-out visitor is sent to sign in", async ({ page }) => {
  await page.goto(
    "/dashboard/business/00000000-0000-4000-8000-000000000001/listing",
  );
  await expect(page).toHaveURL(/\/login/);
});

test("an owner reads their listing, confirms, pauses, closes for a while and guards deletion", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const name = `Listing Test ${Date.now()}`;
  await signIn(page);
  const businessId = await createBusiness(page, name);
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    await page.goto(`/dashboard/business/${businessId}`);
    await page.getByRole("link", { name: "Listing", exact: true }).click();
    await expect(page).toHaveURL(/\/listing$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Is your page up to date?" }),
    ).toBeVisible();
    // A starter site is not public yet, and a confirmation date is scheduled.
    await expect(
      page.getByRole("heading", { name: "Your page is not public yet" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What happens next" }),
    ).toBeVisible();
    await expect(page.getByText("Confirm you are still trading")).toBeVisible();
    await expectAccessible(page);

    // Confirm trading.
    await page.getByRole("button", { name: "Yes, I am still trading" }).click();
    await expect(page.getByRole("status").first()).toContainText(
      "confirmed for another 12 months",
    );

    // Pause then resume.
    await page.getByRole("button", { name: "Pause my page" }).click();
    await expect(
      page.getByRole("heading", { name: "Your page is paused" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Pause my page" }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Resume my page" }).click();
    await expect(
      page.getByRole("heading", { name: "Your page is not public yet" }),
    ).toBeVisible();

    // A closure needs a date, and the date must not be in the past.
    const until = page.getByLabel("Closed until the end of");
    await until.evaluate((input: HTMLInputElement) => {
      input.removeAttribute("required");
      input.removeAttribute("min");
    });
    await page.getByRole("button", { name: "Mark as closed for now" }).click();
    await expect(page.getByRole("alert").first()).toContainText(
      "Choose a date first",
    );
    await until.evaluate((input: HTMLInputElement) => {
      input.removeAttribute("required");
      input.removeAttribute("min");
    });
    await until.fill(ukDayFromNow(-2));
    await page.getByRole("button", { name: "Mark as closed for now" }).click();
    await expect(page.getByRole("alert").first()).toContainText(
      "Choose today or a later day",
    );

    await page.getByLabel("Closed until the end of").fill(ukDayFromNow(5));
    await page.getByRole("button", { name: "Mark as closed for now" }).click();
    await expect(
      page.getByRole("heading", { name: "You are closed for now" }),
    ).toBeVisible();
    await expect(
      page.getByText("Your closure ends and the page reopens"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Resume my page" }).click();
    await expect(
      page.getByRole("heading", { name: "Your page is not public yet" }),
    ).toBeVisible();

    // Reminder choices persist.
    const digest = page.getByRole("checkbox", {
      name: "Email me a weekly summary of visits and enquiries",
    });
    await digest.check();
    await page.getByRole("button", { name: "Save email choices" }).click();
    await expect(page.getByRole("status").first()).toContainText(
      "email choices are saved",
    );
    await expect(digest).toBeChecked();

    // Deleting needs the business name, and a wrong name changes nothing.
    const danger = page.getByRole("region", { name: "Closing for good" });
    await danger
      .getByLabel(/Type .* to confirm/)
      .last()
      .fill("Not my business");
    await danger.getByRole("button", { name: "Request deletion" }).click();
    await expect(page.getByRole("alert").first()).toContainText(
      "name you typed does not match",
    );
    await expect(
      page.getByRole("heading", { name: "Your page is not public yet" }),
    ).toBeVisible();

    await page
      .getByRole("region", { name: "Closing for good" })
      .getByLabel(/Type .* to confirm/)
      .last()
      .fill(name.toLowerCase());
    await page
      .getByRole("region", { name: "Closing for good" })
      .getByRole("button", { name: "Request deletion" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Deletion requested" }),
    ).toBeVisible();
    await expect(
      page.getByText("Your page and its data are deleted for good"),
    ).toBeVisible();
    await expectAccessible(page);

    // The owner can change their mind.
    await page.getByRole("button", { name: "Cancel deletion" }).click();
    await expect(
      page.getByRole("heading", { name: "Your page is not public yet" }),
    ).toBeVisible();

    // Phone width: no sideways scroll and the danger zone is reachable.
    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await expectAccessible(page);

    // An unknown outcome in the address shows nothing.
    await page.goto(
      `/dashboard/business/${businessId}/listing?outcome=constructor`,
    );
    await expect(page.locator("main [role=alert]")).toHaveCount(0);
    await expect(page.locator("main [role=status]")).toHaveCount(0);
  } finally {
    await sql`delete from business where id = ${businessId}`;
    await sql.end();
  }
});
