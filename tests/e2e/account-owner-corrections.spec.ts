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
  await page.getByLabel("Business name").fill(`Corrections Test ${Date.now()}`);
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

test("a signed-out visitor is sent to sign in", async ({ page }) => {
  await page.goto(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/corrections`,
  );
  await expect(page).toHaveURL(/\/login/);
});

test("the public form asks for hours and a new address, and says where the report goes", async ({
  page,
}) => {
  await page.goto(`/report/${publicBusinessDemoAccount.businessId}`);
  await expect(page.getByText(/go to the business first/)).toBeVisible();
  await page.getByLabel("What's wrong?").selectOption("closed_or_moved");
  await expect(
    page.getByLabel("Address or where it has moved to"),
  ).toBeVisible();
  await expect(page.getByLabel("Correct public phone")).toHaveCount(0);
  await page.getByLabel("What's wrong?").selectOption("incorrect_details");
  await expect(page.getByLabel("Correct public phone")).toBeVisible();
  await expect(
    page.getByLabel("Opening hours you believe are right"),
  ).toBeVisible();
  await page.getByLabel("What's wrong?").selectOption("inappropriate_content");
  await expect(page.getByLabel("Correct public phone")).toHaveCount(0);
  await expectAccessible(page);
});

test("an owner reviews visitor suggestions: apply, handle, decline and escalate", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(240_000);
  await signIn(page);
  const businessId = await createBusiness(page);
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    const insert = (
      reason: string,
      reportReason: string,
      risk: string,
      extra: Record<string, unknown>,
    ) =>
      sql`insert into business_ticket (business_id, type, reason, evidence, risk_level)
        values (${businessId}, 'correction', ${reason},
          ${sql.json({ reportReason, ...extra } as never)}, ${risk})`;
    await insert(
      "The phone number has changed.",
      "incorrect_details",
      "standard",
      {
        changes: { publicPhone: "01443 555019" },
      },
    );
    await insert(
      "Opening hours are wrong now.",
      "incorrect_details",
      "standard",
      {
        notes: { hours: "Mon–Fri 8–6", address: "2 New Road" },
      },
    );
    await insert("They have closed down.", "closed_or_moved", "standard", {});
    await insert("This is rude.", "inappropriate_content", "high", {});

    await page.goto(`/dashboard/business/${businessId}`);
    const tabs = page.getByRole("navigation", {
      name: "Business dashboard sections",
    });
    await expect(tabs.getByRole("link", { name: /Suggestions/ })).toContainText(
      "3 waiting",
    );
    await tabs.getByRole("link", { name: /Suggestions/ }).click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Suggestions from visitors",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Waiting for you (3)" }),
    ).toBeVisible();
    // An admin-only report never reaches the owner.
    await expect(page.getByText("This is rude.")).toHaveCount(0);
    await expectAccessible(page);

    // Apply a structured change: the public phone changes.
    const phone = page
      .getByRole("listitem")
      .filter({ hasText: "The phone number has changed." });
    await expect(phone.getByText("01443 555019")).toBeVisible();
    await phone.getByLabel("Note for your records (optional)").fill("Checked.");
    await phone.getByRole("button", { name: "Apply to my page" }).click();
    await expect(page.getByRole("status").first()).toContainText(
      "Applied. Your public page now shows the change.",
    );
    const [applied] =
      await sql`select public_phone from business where id = ${businessId}`;
    expect(applied?.public_phone).toBe("01443 555019");

    // Notes-only suggestions cannot be applied, only handled.
    const notes = page
      .getByRole("listitem")
      .filter({ hasText: "Opening hours are wrong now." });
    await expect(notes.getByText("Mon–Fri 8–6")).toBeVisible();
    await expect(
      notes.getByRole("button", { name: "Apply to my page" }),
    ).toHaveCount(0);
    await notes.getByRole("button", { name: "Mark as handled" }).click();
    await expect(page.getByRole("status").first()).toContainText(
      "Marked as handled.",
    );

    // Escalate one: it moves to the team and the owner can no longer decide it.
    const closed = page
      .getByRole("listitem")
      .filter({ hasText: "They have closed down." });
    await closed.getByRole("button", { name: "Ask a reviewer" }).click();
    await expect(page.getByRole("status").first()).toContainText(
      "Passed to an OurValleys reviewer.",
    );
    const withTeam = page
      .getByRole("listitem")
      .filter({ hasText: "They have closed down." });
    await expect(
      withTeam.getByText("With an OurValleys reviewer"),
    ).toBeVisible();
    await expect(
      withTeam.getByRole("button", { name: "Ask a reviewer" }),
    ).toHaveCount(0);
    await expect(withTeam.getByRole("button", { name: "Decline" })).toHaveCount(
      0,
    );
    // A reviewer closes it: it leaves the owner's list and shows as closed.
    await sql`update business_ticket set status = 'resolved', resolution_action = 'approve_claim'
      where business_id = ${businessId} and reason = 'They have closed down.'`;
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "No suggestions waiting" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recently decided" }),
    ).toBeVisible();
    await expect(page.getByText("Closed by a reviewer")).toBeVisible();

    // A tampered outcome is ignored rather than rendered.
    await page.goto(
      `/dashboard/business/${businessId}/corrections?outcome=constructor`,
    );
    await expect(page.getByRole("status")).toHaveCount(0);

    // Another business's suggestions are not reachable.
    await page.goto(
      `/dashboard/business/${publicBusinessDemoAccount.businessId}/corrections`,
    );
    await expect(page.getByText("We could not find that page.")).toBeVisible();

    // Phone width: no sideways scroll.
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(`/dashboard/business/${businessId}/corrections`);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await expectAccessible(page);
    await page.setViewportSize({ width: 1280, height: 900 });

    // Welsh interface.
    await page
      .context()
      .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "Awgrymiadau gan ymwelwyr" }),
    ).toBeVisible();
  } finally {
    // The shared account may own only five businesses; leave room for others.
    await sql`delete from business where id = ${businessId}`;
    await sql.end();
  }
});
