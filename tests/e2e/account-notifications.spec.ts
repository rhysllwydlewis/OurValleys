import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

const email = process.env.E2E_ACCOUNT_EMAIL;
const password = process.env.E2E_ACCOUNT_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

// Named so it runs before account-settings and homepage specs, which change
// the shared provisioned account's password.
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

test("a signed-out visitor is sent to sign in, and a resident can read, filter and dismiss notifications", async ({
  page,
}) => {
  await page.goto("/account/notifications");
  await expect(page).toHaveURL(/\/login\?next=/);

  const sql = postgres(databaseUrl!, { max: 1 });
  let userId = "";
  try {
    const [row]: { id: string }[] =
      await sql`select id from auth_user where email = ${email!}`;
    userId = row!.id;
    await sql`delete from account_notification where user_id = ${userId}`;
    await sql`
      insert into account_notification (user_id, kind, params, href, dedupe_key)
      values
        (${userId}, 'saved_search_results', ${sql.json({ query: "bakery", count: 3 })}, '/search?q=bakery', 'e2e-1'),
        (${userId}, 'place_digest', ${sql.json({ count: 1 })}, '/account/saved', 'e2e-2'),
        (${userId}, 'owner_digest', ${sql.json({ business: "E2E Plumbing", views: 12, enquiries: 2, awaiting: 1 })}, '/dashboard', 'e2e-3')`;

    await signIn(page);

    // The account menu says there is something unread.
    await page.getByRole("button", { name: /Account, 3 unread/ }).click();
    await expect(
      page.getByRole("link", { name: "Notifications, 3 unread" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Notifications, 3 unread" }).click();
    await expect(page).toHaveURL(/\/account\/notifications$/);

    await expect(
      page.getByRole("heading", { level: 1, name: "Notifications" }),
    ).toBeVisible();
    await expect(page.getByText("3 unread in total")).toBeVisible();
    await expect(page.getByTestId("notification")).toHaveCount(3);
    await expect(
      page.getByRole("heading", { name: "3 new results for “bakery”" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "1 new thing from your saved places" }),
    ).toBeVisible();
    await expectAccessible(page);

    // An unsupported outcome value is ignored, not rendered.
    await page.goto("/account/notifications?outcome=__proto__");
    await expect(page.getByTestId("notification")).toHaveCount(3);
    await page.goto("/account/notifications");

    // Filter to the owner group.
    await page.getByRole("link", { name: "My businesses" }).click();
    await expect(page.getByTestId("notification")).toHaveCount(1);
    await expect(
      page.getByRole("heading", {
        name: "Your weekly summary for E2E Plumbing",
      }),
    ).toBeVisible();

    // Mark it read: it stays, no longer new, and the unread count drops.
    await page.getByRole("button", { name: "Mark as read" }).click();
    await expect(page.getByText("Done.")).toBeVisible();
    await expect(page.getByTestId("notification")).toHaveAttribute(
      "data-read",
      "true",
    );
    await expect(page.getByText("2 unread in total")).toBeVisible();

    // Mark all read, then clear the read ones: the empty state appears.
    await page.getByRole("link", { name: "All", exact: true }).click();
    await page.getByRole("button", { name: "Mark all as read" }).click();
    await expect(page.getByText("You are all caught up")).toBeVisible();
    await page
      .getByRole("button", { name: "Clear read notifications" })
      .click();
    await expect(page.getByText("Nothing here yet")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Go to saved items" }),
    ).toBeVisible();
    await expectAccessible(page);

    // One more, dismissed on its own.
    await sql`
      insert into account_notification (user_id, kind, params, dedupe_key)
      values (${userId}, 'place_digest', ${sql.json({ count: 2 })}, 'e2e-4')`;
    await page.reload();
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page.getByText("Nothing here yet")).toBeVisible();
  } finally {
    if (userId) {
      await sql`delete from account_notification where user_id = ${userId}`;
    }
    await sql.end();
  }
});

test("the inbox reads in Welsh and holds up on a phone", async ({ page }) => {
  const sql = postgres(databaseUrl!, { max: 1 });
  let userId = "";
  try {
    const [row]: { id: string }[] =
      await sql`select id from auth_user where email = ${email!}`;
    userId = row!.id;
    await sql`delete from account_notification where user_id = ${userId}`;
    await sql`
      insert into account_notification (user_id, kind, params, href, dedupe_key)
      values (${userId}, 'saved_search_results', ${sql.json({ query: "bakery", count: 2 })}, '/search?q=bakery', 'e2e-cy')`;

    await signIn(page);
    await page.setViewportSize({ width: 390, height: 800 });
    await page.context().addCookies([
      {
        name: "ov-locale",
        value: "cy",
        url: page.url(),
      },
    ]);
    await page.goto("/account/notifications");
    await expect(
      page.getByRole("heading", { level: 1, name: "Hysbysiadau" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "2 canlyniad newydd ar gyfer “bakery”",
      }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await expectAccessible(page);
  } finally {
    if (userId) {
      await sql`delete from account_notification where user_id = ${userId}`;
    }
    await sql.end();
  }
});
