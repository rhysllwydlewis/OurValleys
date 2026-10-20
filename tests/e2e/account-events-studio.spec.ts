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
  await page.getByLabel("Business name").fill(`Events Test ${Date.now()}`);
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

// The shared account may own only five businesses, so clean up even when the
// journey fails part-way (including after the business was created but before
// its id was read) and would otherwise starve later specs.
test.afterEach(async () => {
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    await sql`delete from business where trading_name like 'Events Test %'`;
  } finally {
    await sql.end();
  }
});

test.describe.configure({ mode: "serial" });

test("a signed-out visitor is sent to sign in", async ({ page }) => {
  await page.goto(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/events`,
  );
  await expect(page).toHaveURL(/\/login/);
});

test("an owner plans, repeats, moves, cancels, copies and removes events", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(240_000);
  await signIn(page);
  const businessId = await createBusiness(page);

  // Bad ids and another business are not reachable.
  await page.goto("/dashboard/business/not-a-real-id/events");
  await expect(page.getByText("We could not find that page.")).toBeVisible();
  await page.goto(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/events`,
  );
  await expect(page.getByText("We could not find that page.")).toBeVisible();

  await page.goto(`/dashboard/business/${businessId}`);
  await page
    .getByRole("navigation", { name: "Business dashboard sections" })
    .getByRole("link", { name: "Events", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/dashboard/business/${businessId}/events$`),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Events" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No events yet" }),
  ).toBeVisible();
  await expectAccessible(page);

  // The live preview follows what is typed.
  await page.getByLabel("Event title").first().fill("Quiz night");
  const preview = page.getByRole("complementary", { name: "How it looks" });
  await expect(preview.getByText("Quiz night")).toBeVisible();

  // A refused form names the fields and keeps what was typed.
  await page.getByLabel("What is happening").first().fill("no");
  await page.getByLabel("Booking link (optional)").first().fill("not a link");
  await page.getByRole("button", { name: "Add event" }).click();
  await expect(page.getByRole("alert").first()).toContainText(
    "fix the highlighted fields",
  );
  await expect(page.locator("#new-event-description-err")).toHaveText(
    "Describe the event in at least 5 characters.",
  );
  await expect(page.locator("#new-event-bookingUrl-err")).toContainText(
    "full web address",
  );
  await expect(page.locator("#new-event-startsAt-err")).toHaveText(
    "Choose when the event starts.",
  );
  // The summary links to each failing field.
  await expect(page.getByRole("alert").first().getByRole("link")).toHaveCount(
    3,
  );
  await expect(page.getByLabel("Event title").first()).toHaveValue(
    "Quiz night",
  );

  // Fix it and add a weekly event with three dates, published.
  await page
    .getByLabel("What is happening")
    .first()
    .fill("A friendly quiz in the village hall with a raffle.");
  await page.getByLabel("Booking link (optional)").first().fill("");
  await page.getByLabel("Starts", { exact: true }).first().fill(inDays(3));
  await page.getByLabel("Repeats", { exact: true }).selectOption("weekly");
  await page.getByLabel("Number of dates").fill("3");
  await expect(preview.getByText("Repeats: 3 dates in all")).toBeVisible();
  await page
    .getByLabel("Visibility")
    .first()
    .selectOption({ label: "Published — visible until it is over" });
  await page.getByRole("button", { name: "Add event" }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "Repeating event added",
  );
  await expect(
    page.getByRole("heading", { name: /^Coming up \(3\)$/ }),
  ).toBeVisible();
  const rows = page.locator("li[id^='event-']");
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("Dates still to come: 3");
  await expect(rows.first()).toContainText("Say where it is");
  await expect(rows.first()).not.toContainText("Add a picture.");

  // Move the first date a week later, then pause and resume it.
  await rows
    .first()
    .getByRole("button", { name: /Move 1 week later/ })
    .click();
  await expect(page.getByRole("status").first()).toContainText(
    "moved to the new date",
  );
  await page
    .locator("li[id^='event-']")
    .first()
    .getByRole("button", { name: /^Pause/ })
    .click();
  await expect(page.getByRole("status").first()).toContainText("Event paused");
  await expect(
    page.getByRole("heading", { name: /^Paused \(1\)$/ }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: /^Paused/ })
    .locator("xpath=ancestor::section[1]")
    .getByRole("button", { name: /^Resume/ })
    .click();
  await expect(page.getByRole("status").first()).toContainText("Event resumed");

  // Edit one date and copy the wording to the rest of the series.
  const target = page.locator("li[id^='event-']").first();
  await target.getByText("Edit this event").click();
  await target.getByLabel("Event title").fill("Big quiz");
  await target.getByLabel("Where").fill("Village hall");
  await target.getByLabel(/Also update the other upcoming dates/).check();
  await target.getByRole("button", { name: "Save event" }).click();
  await expect(page.getByRole("status").first()).toContainText("Event saved.");
  await expect(
    page.locator("li[id^='event-']").filter({ hasText: "Big quiz" }),
  ).toHaveCount(3);

  // Cancel one date; the rest of the series is still managed.
  await page
    .locator("li[id^='event-']")
    .first()
    .getByRole("button", { name: /^Cancel event/ })
    .click();
  await expect(page.getByRole("status").first()).toContainText(
    "Event cancelled",
  );
  await expect(
    page.getByRole("heading", { name: /^Cancelled \(1\)$/ }),
  ).toBeVisible();
  const upcoming = page
    .getByRole("heading", { name: /^Coming up/ })
    .locator("xpath=ancestor::section[1]");
  await upcoming
    .getByRole("button", { name: /Cancel all upcoming dates \(2\)/ })
    .first()
    .click();
  await expect(page.getByRole("status").first()).toContainText(
    "All upcoming dates",
  );
  await expect(
    page.getByRole("heading", { name: /^Cancelled \(3\)$/ }),
  ).toBeVisible();

  // Reopen one as a draft and make a copy of another.
  const cancelled = page
    .getByRole("heading", { name: /^Cancelled/ })
    .locator("xpath=ancestor::section[1]");
  await cancelled
    .getByRole("button", { name: /^Reopen as draft/ })
    .first()
    .click();
  await expect(page.getByRole("status").first()).toContainText(
    "reopened as a draft",
  );
  await expect(
    page.getByRole("heading", { name: /^Drafts \(1\)$/ }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: /^Cancelled/ })
    .locator("xpath=ancestor::section[1]")
    .getByRole("button", { name: /^Make a copy/ })
    .first()
    .click();
  await expect(page.getByRole("status").first()).toContainText(
    "draft copy was added",
  );
  await expect(page.getByText("Big quiz (copy)").first()).toBeVisible();

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
    .locator("li[id^='event-']")
    .first();
  await draft.getByText("Edit this event").click();
  await draft.getByText("Remove this event").click();
  await expect(draft.getByText(/cannot be undone/)).toBeVisible();
  await draft.getByRole("button", { name: "Remove for good" }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "Event removed.",
  );

  // Welsh interface.
  await page
    .context()
    .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Digwyddiadau" }),
  ).toBeVisible();
});
