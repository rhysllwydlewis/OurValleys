import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { publicBusinessDemoAccount } from "../../src/lib/demo-account";

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

async function createBusiness(page: Page): Promise<string> {
  await page.goto("/account/new-business");
  await page.getByLabel("Business name").fill(`Offers Test ${Date.now()}`);
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

/** A `datetime-local` value this many days from now (the zone is UK time). */
function inDays(days: number): string {
  const when = new Date(Date.now() + days * 86_400_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${when.getFullYear()}-${p(when.getMonth() + 1)}-${p(when.getDate())}T12:00`;
}

test.describe.configure({ mode: "serial" });

test("a signed-out visitor is sent to sign in", async ({ page }) => {
  await page.goto(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/offers`,
  );
  await expect(page).toHaveURL(/\/login/);
});

test("an owner plans, extends, pauses, copies, ends and removes offers", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(240_000);
  await signIn(page);
  const businessId = await createBusiness(page);

  // Bad ids and another business are not reachable.
  await page.goto("/dashboard/business/not-a-real-id/offers");
  await expect(page.getByText("We could not find that page.")).toBeVisible();
  await page.goto(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/offers`,
  );
  await expect(page.getByText("We could not find that page.")).toBeVisible();

  await page.goto(`/dashboard/business/${businessId}`);
  await page
    .getByRole("navigation", { name: "Business dashboard sections" })
    .getByRole("link", { name: "Offers", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/dashboard/business/${businessId}/offers$`),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Offers" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No offers yet" }),
  ).toBeVisible();
  await expectAccessible(page);

  // The live preview follows what is typed.
  await page.getByLabel("Offer title").first().fill("Free boiler check");
  const preview = page.getByRole("complementary", { name: "How it looks" });
  await expect(preview.getByText("Free boiler check")).toBeVisible();

  // A refused form names the fields and keeps what was typed.
  await page.getByLabel("What is on offer").first().fill("no");
  await page.getByLabel("Link (optional)").first().fill("not a link");
  await page.getByRole("button", { name: "Add offer" }).click();
  await expect(page.getByRole("alert").first()).toContainText(
    "fix the highlighted fields",
  );
  await expect(
    page.getByText("Describe the offer in at least 5 characters."),
  ).toBeVisible();
  await expect(page.getByText(/full web address/)).toBeVisible();
  await expect(page.getByLabel("Offer title").first()).toHaveValue(
    "Free boiler check",
  );

  // Fix it and publish with an end date a few days away.
  await page
    .getByLabel("What is on offer")
    .first()
    .fill("A free boiler safety check with any annual service booked.");
  await page.getByLabel("Link (optional)").first().fill("");
  await page.getByLabel("Ends (optional)").first().fill(inDays(3));
  await page
    .getByLabel("Visibility")
    .first()
    .selectOption({ label: "Published — visible between its dates" });
  await page.getByRole("button", { name: "Add offer" }).click();
  await expect(page.getByRole("status").first()).toContainText("Offer added.");
  await expect(
    page.getByRole("heading", { name: /^Live now \(1\)$/ }),
  ).toBeVisible();
  const row = page.locator("li[id^='offer-']").first();
  await expect(row).toContainText("Free boiler check");
  await expect(row).toContainText(/Ends in 3 days/);
  await expect(row).toContainText("This offer ends within a week.");
  // Uploads are off here, so no tip asks for a picture.
  await expect(row).not.toContainText("Add a picture.");
  await expect(row).toContainText("Add a link so people can book");

  // Extend, pause and resume.
  await row.getByRole("button", { name: /Extend 14 days/ }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "Offer extended.",
  );
  await expect(page.locator("li[id^='offer-']").first()).toContainText(
    /Ends in 1[67] days/,
  );
  await page
    .locator("li[id^='offer-']")
    .first()
    .getByRole("button", { name: /^Pause/ })
    .click();
  await expect(page.getByRole("status").first()).toContainText("Offer paused");
  await expect(
    page.getByRole("heading", { name: /^Paused \(1\)$/ }),
  ).toBeVisible();
  await page
    .locator("li[id^='offer-']")
    .first()
    .getByRole("button", { name: /^Resume/ })
    .click();
  await expect(page.getByRole("status").first()).toContainText(
    "Offer resumed.",
  );

  // Edit the dates and terms that the old form could not change.
  const live = page.locator("li[id^='offer-']").first();
  await live.getByText("Edit this offer").click();
  await live
    .getByLabel("Terms and conditions (optional)")
    .fill("Weekdays only.");
  await live.getByLabel("Link (optional)").fill("https://example.test/book");
  await live.getByLabel("Button wording").fill("Book now");
  await expect(
    live.getByRole("complementary").getByText("Book now"),
  ).toBeVisible();
  await live.getByRole("button", { name: "Save offer" }).click();
  await expect(page.getByRole("status").first()).toContainText("Offer saved.");

  // Make a copy: a draft with no dates.
  await page
    .locator("li[id^='offer-']")
    .first()
    .getByRole("button", { name: /^Make a copy/ })
    .click();
  await expect(page.getByRole("status").first()).toContainText(
    "draft copy was added",
  );
  await expect(
    page.getByRole("heading", { name: /^Drafts \(1\)$/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Free boiler check (copy)").first(),
  ).toBeVisible();

  // End the live one now; it moves to Ended and can only be copied.
  await page
    .getByRole("heading", { name: /^Live now/ })
    .locator("xpath=ancestor::section[1]")
    .getByRole("button", { name: /^End now/ })
    .click();
  await expect(page.getByRole("status").first()).toContainText("Offer ended.");
  const ended = page
    .getByRole("heading", { name: /^Ended \(1\)$/ })
    .locator("xpath=ancestor::section[1]");
  await expect(
    ended.getByRole("button", { name: /^Make a copy/ }),
  ).toBeVisible();
  await expect(ended.getByRole("button", { name: /^Pause/ })).toHaveCount(0);

  // Phone width: no sideways scroll, still accessible.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expectAccessible(page);
  await page.setViewportSize({ width: 1280, height: 900 });

  // Removing asks first.
  const draft = page
    .getByRole("heading", { name: /^Drafts/ })
    .locator("xpath=ancestor::section[1]")
    .locator("li[id^='offer-']")
    .first();
  await draft.getByText("Edit this offer").click();
  await draft.getByText("Remove this offer").click();
  await expect(draft.getByText(/cannot be undone/)).toBeVisible();
  await draft.getByRole("button", { name: "Remove for good" }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "Offer removed.",
  );
  await expect(page.locator("li[id^='offer-']")).toHaveCount(1);

  // Welsh interface.
  await page
    .context()
    .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Cynigion" }),
  ).toBeVisible();

  // The shared account may own only five businesses; leave room for others.
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    await sql`delete from business where id = ${businessId}`;
  } finally {
    await sql.end();
  }
});
