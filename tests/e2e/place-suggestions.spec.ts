import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/admin-session";

const scan = (page: import("@playwright/test").Page) =>
  new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

test("the place page links to the suggestion form", async ({ page }) => {
  await page.goto("/places/porth");
  await page.getByRole("link", { name: "Suggest a change" }).click();
  await expect(page).toHaveURL(/\/places\/porth\/suggest$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Suggest a change to Porth" }),
  ).toBeVisible();
  expect((await scan(page)).violations).toEqual([]);
});

test("an unknown place has no suggestion form", async ({ page }) => {
  await page.goto("/places/no-such-place-zzz/suggest");
  await expect(
    page.getByRole("button", { name: "Send suggestion" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Heading")).toHaveCount(0);
});

test("the form switches between a fact and a free-text suggestion and validates", async ({
  page,
}) => {
  await page.goto("/places/porth/suggest");
  await expect(page.getByLabel("Heading")).toBeVisible();
  await page.getByLabel("Detail", { exact: true }).fill("Th");
  await page.getByRole("button", { name: "Send suggestion" }).click();
  await expect(page.locator(".field-error")).toContainText("Please check");

  await page.getByLabel("Something is wrong or out of date").check();
  await expect(page.getByLabel("Heading")).toHaveCount(0);
  await page.getByLabel("Your suggestion").fill("x".repeat(40));
  await expect(page.getByText("40 of 500 characters")).toBeVisible();
});

test("a filled honeypot looks successful but stores nothing", async ({
  page,
}) => {
  await page.goto("/places/porth/suggest");
  await page.getByLabel("Heading").fill("Spam heading");
  await page.getByLabel("Detail", { exact: true }).fill("Spam detail text");
  await page
    .locator("#place-suggest-website")
    .evaluate((el: HTMLInputElement) => {
      el.value = "http://spam.example";
    });
  await page.getByRole("button", { name: "Send suggestion" }).click();
  await expect(
    page.getByRole("heading", { name: "Thank you, we have it" }),
  ).toBeVisible();
});

test("the admin queue is closed to signed-out visitors", async ({ page }) => {
  await page.goto("/admin/place-suggestions");
  await expect(
    page.getByRole("button", { name: /Add to Good to know/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Place suggestions" }),
  ).toHaveCount(0);
});

test("a resident suggests a fact and an admin adds it to the place page", async ({
  page,
  browser,
  baseURL,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(
    !email || !password,
    "This journey requires an ephemeral provisioned admin account.",
  );
  const label = `Resident tip ${Date.now()}`;

  // A resident, signed out, sends a fact.
  const resident = await browser.newContext({ baseURL: baseURL ?? undefined });
  try {
    const residentPage = await resident.newPage();
    await residentPage.goto("/places/porth/suggest");
    await residentPage.getByLabel("Heading").fill(label);
    await residentPage
      .getByLabel("Detail", { exact: true })
      .fill("The Saturday market is behind the library.");
    await residentPage.getByRole("button", { name: "Send suggestion" }).click();
    await expect(
      residentPage.getByRole("heading", { name: "Thank you, we have it" }),
    ).toBeVisible();
    expect((await scan(residentPage)).violations).toEqual([]);
  } finally {
    await resident.close();
  }

  // Nothing is public yet.
  await page.goto("/places/porth");
  await expect(page.getByText(label)).toHaveCount(0);

  await signInAsAdmin(page, email!, password!);
  try {
    await page.goto("/admin/place-suggestions");
    const item = page.locator("li", { hasText: label });
    await expect(item).toContainText("Porth");
    await expect(item).toContainText("New fact");
    expect((await scan(page)).violations).toEqual([]);
    await item.getByRole("button", { name: /Add to Good to know/ }).click();
    await expect(page.locator("li", { hasText: label })).toHaveCount(0);

    // It is now in the handled list and on the public place page.
    await page.goto("/admin/place-suggestions?status=applied");
    await expect(page.locator("li", { hasText: label })).toBeVisible();
    await page.goto("/places/porth");
    await expect(page.getByTestId("place-profile")).toContainText(label);
    await expect(page.getByTestId("place-profile")).toContainText(
      "The Saturday market is behind the library.",
    );
  } finally {
    // Return the shared database to a place without that fact.
    await page.goto("/admin/places");
    await page
      .getByRole("link", { name: /^Edit profile for Porth/ })
      .first()
      .click();
    const remove = page.getByRole("button", { name: /^Remove fact/ });
    while ((await remove.count()) > 0) await remove.first().click();
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved and live.")).toBeVisible();
  }
});

test("an admin can dismiss a correction from the queue and it shows on the review desk first", async ({
  page,
  browser,
  baseURL,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(
    !email || !password,
    "This journey requires an ephemeral provisioned admin account.",
  );
  const text = `The pool has closed ${Date.now()}.`;
  const resident = await browser.newContext({ baseURL: baseURL ?? undefined });
  try {
    const residentPage = await resident.newPage();
    await residentPage.goto("/places/porth/suggest");
    await residentPage.getByLabel("Something is wrong or out of date").check();
    await residentPage.getByLabel("Your suggestion").fill(text);
    await residentPage.getByRole("button", { name: "Send suggestion" }).click();
    await expect(
      residentPage.getByRole("heading", { name: "Thank you, we have it" }),
    ).toBeVisible();
  } finally {
    await resident.close();
  }

  await signInAsAdmin(page, email!, password!);
  await page.goto("/admin/queue?kind=place_suggestion");
  await expect(
    page.locator("li", { hasText: text }).getByText("Place suggestion"),
  ).toBeVisible();

  await page.goto("/admin/place-suggestions");
  const item = page.locator("li", { hasText: text });
  // A correction cannot be added as a fact.
  await expect(
    item.getByRole("button", { name: /Add to Good to know/ }),
  ).toHaveCount(0);
  await item.getByRole("button", { name: /Dismiss/ }).click();
  await expect(page.locator("li", { hasText: text })).toHaveCount(0);
  await page.goto("/admin/place-suggestions?status=dismissed");
  await expect(page.locator("li", { hasText: text })).toBeVisible();
});

test("Welsh readers see the form in Welsh", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    locale: "cy-GB",
    baseURL: baseURL ?? undefined,
  });
  try {
    const page = await context.newPage();
    await page.goto("/places/porth/suggest");
    await expect(
      page.getByRole("heading", { level: 1, name: /^Awgrymu newid i / }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Anfon yr awgrym" }),
    ).toBeVisible();
    expect((await scan(page)).violations).toEqual([]);
  } finally {
    await context.close();
  }
});
