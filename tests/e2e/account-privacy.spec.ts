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

test("a resident sees what is held, switches a notice off, and the choice stops that notice", async ({
  page,
}) => {
  await page.goto("/account/privacy");
  await expect(page).toHaveURL(/\/login\?next=/);

  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    const [row]: { id: string }[] =
      await sql`select id from auth_user where email = ${email!}`;
    const userId = row!.id;
    await sql`delete from resident_notice_mute where user_id = ${userId}`;
    await sql`delete from account_notification where user_id = ${userId}`;
    await sql`
      insert into account_notification (user_id, kind, params, dedupe_key)
      values (${userId}, 'place_digest', ${sql.json({ count: 1 })}, 'e2e-privacy-1')`;

    await signIn(page);
    await page.goto("/account/privacy");
    await expect(
      page.getByRole("heading", { level: 1, name: "Privacy and notices" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What we hold about you" }),
    ).toBeVisible();
    await expect(
      page.getByText("Notifications in your inbox").locator(".."),
    ).toContainText("1");
    await expectAccessible(page);

    const digest = page.getByRole("checkbox", { name: /Saved places summary/ });
    await expect(digest).toBeChecked();
    await digest.uncheck();
    await page.getByRole("button", { name: "Save my choices" }).click();
    await expect(page.getByRole("status")).toHaveText(
      "Your choices are saved.",
    );
    await expect(
      page.getByRole("checkbox", { name: /Saved places summary/ }),
    ).not.toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: /Saved search results/ }),
    ).toBeChecked();

    const muted = await sql`
      select kind from resident_notice_mute where user_id = ${userId}`;
    expect(muted.map((r) => r.kind)).toEqual(["place_digest"]);

    // Switching it back on restores it.
    await page.getByRole("checkbox", { name: /Saved places summary/ }).check();
    await page.getByRole("button", { name: "Save my choices" }).click();
    await expect(
      page.getByRole("checkbox", { name: /Saved places summary/ }),
    ).toBeChecked();
    const after = await sql`
      select kind from resident_notice_mute where user_id = ${userId}`;
    expect(after).toHaveLength(0);

    // The data download is offered and carries the notices.
    const download = await page.request.get("/api/account/export");
    expect(download.status()).toBe(200);
    const body = await download.json();
    expect(body.notifications.length).toBeGreaterThanOrEqual(1);
    expect(body.mutedNoticeKinds).toEqual([]);
  } finally {
    await sql`delete from account_notification where dedupe_key = 'e2e-privacy-1'`;
    await sql.end();
  }
});

test("the privacy page reflows on a phone with no sideways scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto("/account/privacy");
  await expect(
    page.getByRole("heading", { name: "Notices in your notification centre" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expectAccessible(page);
});
