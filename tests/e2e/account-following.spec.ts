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

test("a signed-out visitor is sent to sign in, and a resident sees what a saved business posted and can mute it", async ({
  page,
}) => {
  await page.goto("/account/following");
  await expect(page).toHaveURL(/\/login\?next=/);

  const sql = postgres(databaseUrl!, { max: 1 });
  let userId = "";
  let businessId = "";
  let updateId = "";
  try {
    const [row]: { id: string }[] =
      await sql`select id from auth_user where email = ${email!}`;
    userId = row!.id;
    const [target]: { id: string; trading_name: string }[] =
      await sql`select id, trading_name from business where slug = 'cwm-coil-heating'`;
    businessId = target!.id;
    await sql`delete from resident_saved_business where user_id = ${userId}`;
    await sql`delete from account_notification where user_id = ${userId}`;
    await sql`insert into resident_saved_business (user_id, business_id) values (${userId}, ${businessId})`;
    const [update]: { id: string }[] = await sql`
      insert into business_update (business_id, title, body, status, published_at)
      values (${businessId}, 'E2E follow update', 'Our e2e follow update body.', 'published', now())
      returning id`;
    updateId = update!.id;
    await sql`
      insert into account_notification (user_id, kind, params, href, dedupe_key)
      values (${userId}, 'followed_update', ${sql.json({ business: target!.trading_name, title: "E2E follow update" })}, ${`/b/cwm-coil-heating/updates?update=${updateId}`}, 'e2e-follow-1')`;

    await signIn(page);

    // The notification centre shows the notice and links to the page.
    await page.goto("/account/notifications");
    await expect(
      page.getByRole("heading", {
        name: `${target!.trading_name} posted an update`,
      }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Choose which saved businesses tell you" })
      .click();
    await expect(page).toHaveURL(/\/account\/following$/);

    await expect(
      page.getByRole("heading", { level: 1, name: "From your businesses" }),
    ).toBeVisible();
    const item = page
      .getByTestId("following-item")
      .filter({ hasText: "E2E follow update" });
    await expect(item).toHaveCount(1);
    await expect(item).toHaveAttribute("data-kind", "update");
    await expect(
      item.getByText("Fictional demonstration business"),
    ).toBeVisible();
    await expectAccessible(page);

    // Mute the business: the switch changes and the state is announced.
    const row2 = page.getByTestId("following-business");
    await expect(row2).toHaveAttribute("data-notify", "on");
    await row2.getByRole("button", { name: /Turn off notices for/ }).click();
    await expect(
      page.getByText("Notices turned off for that business."),
    ).toBeVisible();
    await expect(page.getByTestId("following-business")).toHaveAttribute(
      "data-notify",
      "off",
    );
    await page
      .getByTestId("following-business")
      .getByRole("button", { name: /Turn on notices for/ })
      .click();
    await expect(page.getByTestId("following-business")).toHaveAttribute(
      "data-notify",
      "on",
    );

    // Reflow and keyboard reach at a phone width.
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/account/following");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  } finally {
    if (userId) {
      await sql`delete from resident_saved_business where user_id = ${userId}`;
      await sql`delete from account_notification where user_id = ${userId}`;
    }
    if (updateId) await sql`delete from business_update where id = ${updateId}`;
    await sql.end();
  }
});
