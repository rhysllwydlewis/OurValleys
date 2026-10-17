import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { publicBusinessDemoAccount } from "../../src/lib/demo-account";

const email = process.env.E2E_ACCOUNT_EMAIL;
const password = process.env.E2E_ACCOUNT_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

// Named so it runs before the homepage spec, whose "rotate safely" test
// changes the shared provisioned account's password.
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
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
}

async function createBusiness(page: Page): Promise<string> {
  await page.goto("/account/new-business");
  await page.getByLabel("Business name").fill(`Inbox Test ${Date.now()}`);
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

/** A published business is needed to receive enquiries, so write them directly. */
async function seedEnquiries(businessId: string) {
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    const rows: [string, string, string | null, string, string, string][] = [
      [
        "quote",
        "Gwen Parry",
        "gwen@example.test",
        "Boiler quote please, three bedroom house near Treorchy.",
        "new",
        "2 hours",
      ],
      [
        "callback",
        "Ifor Williams",
        null,
        "Please ring me about my annual gas service.",
        "new",
        "5 days",
      ],
      [
        "enquiry",
        "Ceri Evans",
        "ceri@example.test",
        "My radiators are cold at the top, do they need bleeding?",
        "read",
        "1 day",
      ],
      [
        "enquiry",
        "Cheap Seo Co",
        "seo@example.test",
        "Top of Google for ninety nine pounds.",
        "spam",
        "3 days",
      ],
      [
        "enquiry",
        "Rhian Thomas",
        "rhian@example.test",
        "Thank you for fixing our boiler last week.",
        "replied",
        "9 days",
      ],
    ];
    for (const [
      index,
      [kind, name, mail, message, status, age],
    ] of rows.entries()) {
      await sql`
        insert into business_enquiry
          (business_id, kind, sender_name, sender_email, sender_phone, message,
           consent_accepted, status, source, dedupe_key, submitted_at, retention_expires_at)
        values
          (${businessId}, ${kind}, ${name}, ${mail}, ${mail ? null : "07700 900222"},
           ${message}, true, ${status}, 'e2e-inbox', ${`e2e-inbox-${businessId}-${index}`},
           now() - ${age}::interval, now() + interval '20 months')`;
    }
  } finally {
    await sql.end();
  }
}

test.describe.configure({ mode: "serial" });
let businessId = "";
let inbox = "";

const sections = (page: Page) =>
  page.getByRole("navigation", { name: "Business dashboard sections" });
const box = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Choose which enquiries to show" })
    .getByRole("link", { name: new RegExp(`^${name}`) });

test("a signed-out visitor is sent to sign in", async ({ page }) => {
  await page.goto(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/inbox`,
  );
  await expect(page).toHaveURL(/\/login/);
});

test("an owner works through the inbox: read, template, search, bulk, spam, delete", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await signIn(page);
  businessId = await createBusiness(page);
  await seedEnquiries(businessId);
  inbox = `/dashboard/business/${businessId}/inbox`;

  await page.goto("/dashboard/business/not-a-real-id/inbox");
  await expect(page.getByText("We could not find that page.")).toBeVisible();
  // Another business's inbox is not reachable by a non-member.
  await page.goto(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/inbox`,
  );
  await expect(page.getByText("We could not find that page.")).toBeVisible();

  await page.goto(inbox);
  await expect(
    page.getByRole("heading", { level: 1, name: "Enquiries" }),
  ).toBeVisible();
  await expect(box(page, "To do")).toContainText("3");
  await expect(box(page, "Unread")).toContainText("2");
  await expect(box(page, "Spam")).toContainText("1");
  await expect(box(page, "All")).toContainText("5");
  await expect(sections(page)).toContainText("2 unread");
  await expect(page.getByText("Choose an enquiry")).toBeVisible();

  // Opening an unread enquiry reads it and updates the badge.
  await page.getByRole("link", { name: /Open the enquiry from Gwen/ }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "Gwen Parry" }),
  ).toBeVisible();
  await expect(
    page.getByRole("article").getByText("Boiler quote please"),
  ).toBeVisible();
  await expect(sections(page)).toContainText("1 unread");
  await expect(box(page, "Unread")).toContainText("1");

  // A template fills the box but sends nothing.
  await page.getByRole("button", { name: "Quote: what we need" }).click();
  const reply = page.getByLabel("Your reply to Gwen Parry");
  await expect(reply).toHaveValue(/Hello Gwen Parry,[\s\S]*quote/);
  await expect(page.getByRole("button", { name: "Send reply" })).toBeVisible();
  await expect(box(page, "Replied")).toContainText("1");

  // Someone with no email address cannot be replied to from here.
  await page.getByRole("link", { name: /Open the enquiry from Ifor/ }).click();
  await expect(page.getByText(/did not leave an email address/)).toBeVisible();
  await expect(page.getByRole("link", { name: "07700 900222" })).toBeVisible();

  // Search is literal and filters the list.
  await page.goto(inbox);
  await page.getByLabel("Search enquiries").fill("radiators");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText("1 enquiry", { exact: true })).toBeVisible();
  await expect(page.getByText("Ceri Evans").first()).toBeVisible();
  await expect(page.getByText("Gwen Parry")).toHaveCount(0);
  await page.getByLabel("Search enquiries").fill("%");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText("No enquiries match that search.")).toBeVisible();
  await page.getByRole("link", { name: "Clear search" }).click();

  // Bulk: archive two at once.
  await page.getByLabel("Select the enquiry from Ifor Williams").check();
  await page.getByLabel("Select the enquiry from Ceri Evans").check();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(page.getByText("2 enquiries updated.")).toBeVisible();
  await expect(box(page, "Done")).toContainText("2");
  await expect(box(page, "To do")).toContainText("1");
  await expect(page.getByRole("button", { name: "Mark read" })).toBeVisible();

  // Nothing ticked is a clear message, not a silent no-op.
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(
    page.getByText("Tick at least one enquiry first."),
  ).toBeVisible();

  // Spam can be undone from its own box.
  await box(page, "Spam").click();
  await page.getByRole("link", { name: /Open the enquiry from Cheap/ }).click();
  await page.getByRole("button", { name: "Not spam" }).click();
  await expect(page.getByText("Marked as read.")).toBeVisible();
  await expect(box(page, "Spam")).toContainText("0");

  // Delete needs a confirmation and removes only that enquiry.
  await box(page, "All").click();
  await page.getByRole("link", { name: /Open the enquiry from Rhian/ }).click();
  await page.getByText("Delete this enquiry…").click();
  await page.getByRole("button", { name: "Yes, delete it" }).click();
  await expect(page.getByText("The enquiry has been deleted.")).toBeVisible();
  await expect(box(page, "All")).toContainText("4");
  await expect(page.getByText("Rhian Thomas")).toHaveCount(0);

  await page.getByRole("link", { name: /Open the enquiry from Gwen/ }).click();
  await expectAccessible(page);
});

test("on a phone the list and the open enquiry take turns", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto(inbox);
  await expect(page.getByLabel("Select all on this page")).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("link", { name: /Open the enquiry from Gwen/ }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "Gwen Parry" }),
  ).toBeVisible();
  await expect(page.getByLabel("Select all on this page")).toBeHidden();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expectAccessible(page);

  await page.getByRole("link", { name: "Back to the list" }).click();
  await expect(page.getByLabel("Select all on this page")).toBeVisible();
});

test("the inbox reads in Welsh", async ({ page, context }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await context.addCookies([
    { name: "ov-locale", value: "cy", url: page.url() },
  ]);
  await page.goto(inbox);
  await expect(
    page.getByRole("heading", { level: 1, name: "Ymholiadau" }),
  ).toBeVisible();
  await expect(page.getByText("Chwilio ymholiadau")).toBeVisible();
});
