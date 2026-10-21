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

async function createBusiness(page: Page): Promise<string> {
  await page.goto("/account/new-business");
  await page.getByLabel("Business name").fill(`Hours Test ${Date.now()}`);
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

test("an owner previews their hours and fills the week with quick actions", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page);
  const businessId = await createBusiness(page);
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    // A starter site has no location until it is published; give it one so
    // the hours editor is available.
    const [place] = await sql`select id from place order by slug limit 1`;
    await sql`insert into business_location (business_id, place_id, location_type, is_primary)
      values (${businessId}, ${place!.id}, 'service_area', true)`;

    await page.goto(`/dashboard/business/${businessId}/operations#hours`);
    const hours = page.locator("#hours");
    await expect(
      hours.getByRole("heading", {
        name: "How visitors see your hours right now",
      }),
    ).toBeVisible();
    // No hours yet: the preview says so and shows no open/closed status.
    await expect(hours.getByText("No opening hours are set")).toBeVisible();
    await expect(hours.getByTestId("open-status")).toHaveCount(0);

    // Quick fill refuses to copy an empty Monday and says why.
    const copy = hours.getByRole("button", {
      name: "Copy Monday to Tuesday–Friday",
    });
    // With no rules saved every day starts ticked as closed.
    await page.getByRole("checkbox", { name: "Monday closed" }).uncheck();
    await page.getByRole("textbox", { name: "Monday opens" }).fill("09:00");
    await copy.click();
    await expect(hours.getByRole("status")).toContainText(
      "Add Monday’s opening and closing times first",
    );

    await page.getByRole("textbox", { name: "Monday closes" }).fill("17:30");
    await copy.click();
    await expect(hours.getByRole("status")).toContainText(
      "Monday’s hours copied to Tuesday–Friday",
    );
    for (const day of ["Tuesday", "Wednesday", "Thursday", "Friday"]) {
      await expect(
        page.getByRole("textbox", { name: `${day} opens` }),
      ).toHaveValue("09:00");
      await expect(
        page.getByRole("textbox", { name: `${day} closes` }),
      ).toHaveValue("17:30");
    }
    // The weekend is already closed, so that quick fill says nothing changed.
    await page
      .getByRole("button", { name: "Close Saturday and Sunday" })
      .click();
    await expect(hours.getByRole("status")).toContainText("already match");

    // Nothing is saved until the owner presses save.
    await page.reload();
    await expect(hours.getByText("No opening hours are set")).toBeVisible();

    await page.getByRole("checkbox", { name: "Monday closed" }).uncheck();
    await page.getByRole("textbox", { name: "Monday opens" }).fill("09:00");
    await page.getByRole("textbox", { name: "Monday closes" }).fill("17:30");
    await copy.click();
    await page
      .getByRole("button", { name: "Close Saturday and Sunday" })
      .click();
    await page.getByRole("button", { name: "Save weekly hours" }).click();

    // The preview now lists the next seven days and a live status.
    await expect(hours.getByTestId("open-status")).toBeVisible();
    await expect(
      hours.getByRole("heading", { name: "The next seven days" }),
    ).toBeVisible();
    await expect(hours.locator("ol > li")).toHaveCount(7);
    await expect(hours.locator("ol")).toContainText("09:00–17:30");

    const results = await new AxeBuilder({ page })
      .include("#hours")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map(
        (violation) =>
          `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`,
      ),
    ).toEqual([]);

    // Nothing wider than the screen on a phone.
    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  } finally {
    // The shared account may own only five businesses; leave room for others.
    await sql`delete from business where id = ${businessId}`;
    await sql.end();
  }
});
