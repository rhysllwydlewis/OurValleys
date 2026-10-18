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
  await page.getByLabel("Business name").fill(`Welsh Test ${Date.now()}`);
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

/** Services reach the table when a site is published, so write two directly. */
async function seedServices(businessId: string) {
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    await sql`
      insert into service (business_id, name, description, sort_order)
      values
        (${businessId}, 'Boiler service', 'A yearly safety check.', 0),
        (${businessId}, 'Leak repair', 'Fast repairs for dripping pipes.', 1)
      on conflict do nothing`;
    await sql`
      insert into business_offer (business_id, title, description, status)
      values (${businessId}, 'Spring boiler check', 'Ten percent off a yearly check.', 'active')`;
  } finally {
    await sql.end();
  }
}

test.describe.configure({ mode: "serial" });

test("a signed-out visitor is sent to sign in", async ({ page }) => {
  await page.goto(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/welsh`,
  );
  await expect(page).toHaveURL(/\/login/);
});

test("an owner writes the Welsh version, sees progress, and loses nothing on an error", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await signIn(page);
  const businessId = await createBusiness(page);
  await seedServices(businessId);

  // Another business's Welsh editor and a bad id are not reachable.
  await page.goto("/dashboard/business/not-a-real-id/welsh");
  await expect(page.getByText("We could not find that page.")).toBeVisible();
  await page.goto(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/welsh`,
  );
  await expect(page.getByText("We could not find that page.")).toBeVisible();

  await page.goto(`/dashboard/business/${businessId}`);
  await page
    .getByRole("navigation", { name: "Business dashboard sections" })
    .getByRole("link", { name: "Welsh version" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/dashboard/business/${businessId}/welsh$`),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Your website in Welsh" }),
  ).toBeVisible();
  await expect(page.getByText("Nothing translated yet")).toBeVisible();
  await expect(page.getByText("A yearly safety check.")).toBeVisible();
  await expectAccessible(page);

  // Over the limit: the counter warns, the save is refused, typed text stays.
  const summary = page.getByLabel("Cymraeg (Welsh)").first();
  const tooLong = "a".repeat(300);
  await summary.fill(tooLong);
  await expect(page.getByText("300 of 280")).toBeVisible();
  await page.getByRole("button", { name: "Save Welsh version" }).click();
  await expect(page.getByRole("alert").first()).toContainText(
    "Some fields need attention",
  );
  await expect(summary).toHaveValue(tooLong);
  await expectAccessible(page);

  // The refusal clears as soon as the text is shortened, for sight and for
  // screen readers alike.
  await expect(page.getByText(/This is too long/)).toBeVisible();
  await summary.fill("Plymwr lleol.");
  await expect(page.getByText(/This is too long/)).toHaveCount(0);
  await expect(summary).not.toHaveAttribute("aria-invalid", "true");

  // A valid save.
  await summary.fill("Plymwr lleol yn gwasanaethu’r cymoedd.");
  await page
    .getByLabel("Service name in Welsh")
    .first()
    .fill("Gwasanaeth boeler");
  await page
    .getByLabel("Service description in Welsh")
    .first()
    .fill("Archwiliad diogelwch blynyddol.");
  await page
    .getByLabel("Offer title in Welsh")
    .first()
    .fill("Archwiliad boeler y gwanwyn");
  await page.getByRole("button", { name: "Save Welsh version" }).click();
  await expect(page.getByRole("status").first()).toContainText("Saved.");
  await expect(page.getByText(/\d+ of \d+ parts in Welsh/)).toBeVisible();

  // It persists across a reload.
  await page.reload();
  await expect(page.getByLabel("Cymraeg (Welsh)").first()).toHaveValue(
    "Plymwr lleol yn gwasanaethu’r cymoedd.",
  );
  await expect(page.getByLabel("Service name in Welsh").first()).toHaveValue(
    "Gwasanaeth boeler",
  );
  await expect(page.getByLabel("Offer title in Welsh").first()).toHaveValue(
    "Archwiliad boeler y gwanwyn",
  );

  // Clearing everything puts the page back to English only.
  await page.getByLabel("Cymraeg (Welsh)").first().fill("");
  await page.getByLabel("Service name in Welsh").first().fill("");
  await page.getByLabel("Service description in Welsh").first().fill("");
  await page.getByLabel("Offer title in Welsh").first().fill("");
  // Controlled fields can be reset by hydration; confirm the values stuck.
  await expect(page.getByLabel("Cymraeg (Welsh)").first()).toHaveValue("");
  await expect(page.getByLabel("Service name in Welsh").first()).toHaveValue(
    "",
  );
  await expect(
    page.getByLabel("Service description in Welsh").first(),
  ).toHaveValue("");
  await page.getByRole("button", { name: "Save Welsh version" }).click();
  await expect(page.getByRole("status").first()).toContainText("English only");

  // Phone width: no sideways scroll, still accessible.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expectAccessible(page);
});

test("the Welsh interface of the editor and a Welsh reader's business page use the owner's Welsh", async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const sql = postgres(databaseUrl!, { max: 1 });
  let businessId = "";
  try {
    const [row] = await sql`
      select id from business where slug = 'cwm-coil-heating' limit 1`;
    businessId = row!.id as string;
    await sql`
      insert into business_translation (business_id, locale, summary, description)
      values (${businessId}, 'cy', 'Gwres canolog olew a boeleri ar gyfer y cymoedd.', 'Disgrifiad Cymraeg hir.')
      on conflict (business_id, locale) do update
        set summary = excluded.summary, description = excluded.description`;

    // English readers are unaffected.
    await page.goto("/b/cwm-coil-heating");
    await expect(page.getByText("Gwres canolog olew a boeleri")).toHaveCount(0);

    // Welsh readers see the owner's Welsh, tagged as Welsh.
    await context.addCookies([
      { name: "ov-locale", value: "cy", url: baseURL! },
    ]);
    await page.goto("/b/cwm-coil-heating");
    const lead = page
      .getByText("Gwres canolog olew a boeleri ar gyfer y cymoedd.")
      .first();
    await expect(lead).toBeVisible();
    await expect(lead).toHaveAttribute("lang", "cy-GB");
    await expect(page.getByText("Disgrifiad Cymraeg hir.")).toBeVisible();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "Gwres canolog olew a boeleri ar gyfer y cymoedd.",
    );
    await expectAccessible(page);

    // The directory card and search use it too.
    await page.goto("/businesses?q=boeleri");
    await expect(
      page.getByText("Gwres canolog olew a boeleri ar gyfer y cymoedd."),
    ).toBeVisible();
  } finally {
    if (businessId) {
      await sql`delete from business_translation where business_id = ${businessId}`;
    }
    await sql.end();
  }
});

test("a Welsh reader sees an offer's Welsh title, tagged as Welsh, while English readers do not", async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const sql = postgres(databaseUrl!, { max: 1 });
  let offerId = "";
  try {
    const [row] = await sql`
      select id from business where slug = 'cwm-coil-heating' limit 1`;
    const [offer] = await sql`
      insert into business_offer (business_id, title, description, status)
      values (${row!.id as string}, 'Autumn radiator flush', 'Fictional offer for the Welsh offers test.', 'active')
      returning id`;
    offerId = offer!.id as string;
    await sql`
      insert into offer_translation (offer_id, locale, title)
      values (${offerId}, 'cy', 'Fflysio rheiddiaduron yr hydref')`;

    await page.goto("/offers?q=Autumn+radiator");
    await expect(page.getByText("Autumn radiator flush")).toBeVisible();
    await expect(page.getByText("Fflysio rheiddiaduron")).toHaveCount(0);

    await context.addCookies([
      { name: "ov-locale", value: "cy", url: baseURL! },
    ]);
    await page.goto("/offers?q=Autumn+radiator");
    const title = page.getByText("Fflysio rheiddiaduron yr hydref").first();
    await expect(title).toBeVisible();
    await expect(title.locator("xpath=ancestor::h3[1]")).toHaveAttribute(
      "lang",
      "cy-GB",
    );
    await expectAccessible(page);

    await page.goto("/b/cwm-coil-heating");
    await expect(
      page.getByRole("heading", { name: "Fflysio rheiddiaduron yr hydref" }),
    ).toHaveAttribute("lang", "cy-GB");
  } finally {
    if (offerId) await sql`delete from business_offer where id = ${offerId}`;
    await sql.end();
  }
});

test("an owner translates an event and a menu once, and the editor keeps what was typed", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await signIn(page);
  const businessId = await createBusiness(page);
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    const [group] = await sql`
      insert into business_menu_group (business_id, name, description)
      values (${businessId}, 'Soups', 'Made each morning.') returning id`;
    await sql`
      insert into business_menu_item (business_id, group_id, name, description, price_display)
      values (${businessId}, ${group!.id as string}, 'Leek broth', 'Slow cooked with barley.', '£7')`;
    const seriesId = crypto.randomUUID();
    for (const days of [3, 10]) {
      await sql`
        insert into business_event (business_id, title, description, starts_at, status, series_id)
        values (${businessId}, 'Singing evening', 'Bring a friend and a song.', now() + ${`${days} days`}::interval, 'active', ${seriesId})`;
    }
  } finally {
    await sql.end();
  }

  await page.goto(`/dashboard/business/${businessId}/welsh`);
  await expect(
    page.getByRole("heading", { level: 2, name: "Events" }),
  ).toBeVisible();
  await expect(page.getByText("Repeats on 2 upcoming dates")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Menu" }),
  ).toBeVisible();
  await expectAccessible(page);

  // An over-long item name is refused and what was typed stays.
  const itemName = page.getByLabel("Item name in Welsh");
  const tooLong = "c".repeat(130);
  await itemName.fill(tooLong);
  await expect(itemName).toHaveValue(tooLong);
  await page.getByRole("button", { name: "Save Welsh version" }).click();
  await expect(page.getByRole("alert").first()).toContainText(
    "Some fields need attention",
  );
  await expect(itemName).toHaveValue(tooLong);

  await itemName.fill("Cawl cennin");
  await expect(itemName).toHaveValue("Cawl cennin");
  await page.getByLabel("Section name in Welsh").fill("Cawliau");
  await page.getByLabel("Event title in Welsh").fill("Noson ganu");
  await page
    .getByLabel("Event description in Welsh")
    .fill("Dewch â ffrind a chân.");
  await page.getByRole("button", { name: "Save Welsh version" }).click();
  await expect(page.getByRole("status").first()).toContainText("Saved.");

  await page.reload();
  await expect(page.getByLabel("Event title in Welsh")).toHaveValue(
    "Noson ganu",
  );
  await expect(page.getByLabel("Item name in Welsh")).toHaveValue(
    "Cawl cennin",
  );
  await expect(page.getByText("Event: Singing evening").first()).toBeVisible();

  // Phone width: no sideways scroll, still accessible.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expectAccessible(page);
});

test("a Welsh reader sees an event and a menu in the owner's Welsh, tagged as Welsh, while English readers do not", async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const sql = postgres(databaseUrl!, { max: 1 });
  let eventId = "";
  let groupId = "";
  try {
    const [row] = await sql`
      select id from business where slug = 'cwm-coil-heating' limit 1`;
    const businessId = row!.id as string;
    const [event] = await sql`
      insert into business_event (business_id, title, description, starts_at, status)
      values (${businessId}, 'Valley lantern walk', 'Fictional event for the Welsh events test.', now() + interval '4 days', 'active')
      returning id`;
    eventId = event!.id as string;
    await sql`
      insert into event_translation (event_id, locale, title)
      values (${eventId}, 'cy', 'Taith llusernau’r cwm')`;
    const [group] = await sql`
      insert into business_menu_group (business_id, name)
      values (${businessId}, 'Lantern suppers') returning id`;
    groupId = group!.id as string;
    const [item] = await sql`
      insert into business_menu_item (business_id, group_id, name, price_display)
      values (${businessId}, ${groupId}, 'Lantern stew', '£8') returning id`;
    await sql`
      insert into menu_group_translation (group_id, locale, name)
      values (${groupId}, 'cy', 'Swperau llusern')`;
    await sql`
      insert into menu_item_translation (item_id, locale, name)
      values (${item!.id as string}, 'cy', 'Stiw llusern')`;

    // English readers are unaffected.
    await page.goto(`/events/${eventId}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Valley lantern walk" }),
    ).toBeVisible();
    await expect(page.getByText("Taith llusernau")).toHaveCount(0);
    await page.goto("/b/cwm-coil-heating/menu");
    await expect(page.getByText("Lantern stew").first()).toBeVisible();
    await expect(page.getByText("Stiw llusern")).toHaveCount(0);

    await context.addCookies([
      { name: "ov-locale", value: "cy", url: baseURL! },
    ]);

    // The agenda, search and the detail page.
    await page.goto("/events?q=llusernau");
    const row_ = page.getByText("Taith llusernau’r cwm").first();
    await expect(row_).toBeVisible();
    await expect(row_.locator("xpath=ancestor::h4[1]")).toHaveAttribute(
      "lang",
      "cy-GB",
    );
    await expectAccessible(page);
    await page.goto(`/events/${eventId}`);
    const heading = page.getByRole("heading", {
      level: 1,
      name: "Taith llusernau’r cwm",
    });
    await expect(heading).toHaveAttribute("lang", "cy-GB");
    await expect(
      page.getByText("Fictional event for the Welsh events test."),
    ).toBeVisible();
    await expectAccessible(page);

    // The business page's events and the printable menu page.
    await page.goto("/b/cwm-coil-heating");
    await expect(
      page.getByRole("heading", { name: "Taith llusernau’r cwm" }),
    ).toHaveAttribute("lang", "cy-GB");
    await page.goto("/b/cwm-coil-heating/menu");
    await expect(
      page.getByRole("heading", { name: "Swperau llusern" }),
    ).toHaveAttribute("lang", "cy-GB");
    const stew = page.getByText("Stiw llusern").first();
    await expect(stew).toBeVisible();
    await expect(stew).toHaveAttribute("lang", "cy-GB");
    // Prices are the owner's, unchanged.
    await expect(page.getByText("£8").first()).toBeVisible();
    await expectAccessible(page);
  } finally {
    if (eventId) await sql`delete from business_event where id = ${eventId}`;
    if (groupId) {
      await sql`delete from business_menu_group where id = ${groupId}`;
    }
    await sql.end();
  }
});
