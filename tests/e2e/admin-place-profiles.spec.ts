import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/admin-session";

const aboutEn = "A fictional paragraph written by an automated test.";
const aboutCy = "Paragraff dychmygol a ysgrifennwyd gan brawf awtomataidd.";

test("a signed-out visitor cannot reach a place profile editor", async ({
  page,
}) => {
  const response = await page.goto(
    "/admin/places/00000000-0000-4000-8000-000000000001",
  );
  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByRole("button", { name: "Save profile" })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("About (English)")).toHaveCount(0);
});

test("a place without a profile shows only its summary", async ({ page }) => {
  await page.goto("/places/tonypandy");
  await expect(page.getByTestId("place-profile")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("an admin writes a place profile in both languages and readers see it", async ({
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

  await signInAsAdmin(page, email!, password!);
  try {
    await page.goto("/admin/places");
    await page
      .getByRole("link", { name: /^Edit profile for Tonypandy/ })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Tonypandy", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("0 of 5")).toBeVisible();

    await page.getByLabel("Welsh summary").fill("Crynodeb prawf Cymraeg.");
    await page.getByLabel("About (English)").fill(aboutEn);
    await page.getByLabel("About (Welsh)").fill(aboutCy);
    await page.getByRole("button", { name: "Add a fact" }).click();
    await page.getByLabel("Label 1", { exact: true }).fill("Market day");
    await page.getByLabel("Label 1 (Welsh)").fill("Diwrnod marchnad");
    await page.getByLabel("Detail 1", { exact: true }).fill("Saturday");
    await page.getByLabel("Detail 1 (Welsh)").fill("Dydd Sadwrn");
    await page.getByRole("button", { name: "Add a fact" }).click();
    await page.getByLabel("Label 2", { exact: true }).fill("Parking");
    await page.getByLabel("Detail 2", { exact: true }).fill("Free after 6pm");

    // Reorder: move the second fact up, then back down.
    await page.getByRole("button", { name: "Move fact 2 up" }).click();
    await expect(page.getByLabel("Label 1", { exact: true })).toHaveValue(
      "Parking",
    );
    await page.getByRole("button", { name: "Move fact 1 down" }).click();
    await expect(page.getByLabel("Label 1", { exact: true })).toHaveValue(
      "Market day",
    );

    // Live preview in both languages, with English fall-back marked.
    const preview = page.getByTestId("profile-preview");
    await expect(preview).toContainText(aboutEn);
    await page
      .getByRole("group", { name: "Preview language" })
      .getByRole("button", { name: "Cymraeg" })
      .click();
    await expect(preview).toContainText(aboutCy);
    await expect(preview).toContainText("Diwrnod marchnad");
    await expect(preview).toContainText("Free after 6pm");
    await expect(preview).toContainText("Dydd Sadwrn");

    const editorScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(editorScan.violations).toEqual([]);

    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved and live.")).toBeVisible();

    // English readers.
    await page.goto("/places/tonypandy");
    const profile = page.getByTestId("place-profile");
    await expect(profile).toContainText(aboutEn);
    await expect(profile).toContainText("Market day");
    await expect(profile).toContainText("Saturday");
    await expect(profile).not.toContainText(aboutCy);
    const publicScan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(publicScan.violations).toEqual([]);

    // Welsh readers get the Welsh text, with English fall-back for the fact
    // that has no Welsh wording.
    const welshContext = await browser.newContext({
      locale: "cy-GB",
      baseURL: baseURL ?? undefined,
    });
    try {
      const welshPage = await welshContext.newPage();
      await welshPage.goto("/places/tonypandy");
      const welshProfile = welshPage.getByTestId("place-profile");
      await expect(welshProfile).toContainText(aboutCy);
      await expect(welshProfile).toContainText("Dydd Sadwrn");
      await expect(welshProfile).toContainText("Free after 6pm");
      await expect(
        welshPage.getByText("Crynodeb prawf Cymraeg."),
      ).toBeVisible();
    } finally {
      await welshContext.close();
    }
  } finally {
    // Clean up so the shared database returns to a place with no profile.
    await page.goto("/admin/places");
    await page
      .getByRole("link", { name: /^Edit profile for Tonypandy/ })
      .first()
      .click();
    await page.getByLabel("Welsh summary").fill("");
    await page.getByLabel("About (English)").fill("");
    await page.getByLabel("About (Welsh)").fill("");
    // However far the journey got, remove every fact that was added.
    const remove = page.getByRole("button", { name: /^Remove fact/ });
    while ((await remove.count()) > 0) await remove.first().click();
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved and live.")).toBeVisible();
    await page.goto("/places/tonypandy");
    await expect(page.getByTestId("place-profile")).toHaveCount(0);
  }
});

test("a fact needs both a label and a detail", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(
    !email || !password,
    "This journey requires an ephemeral provisioned admin account.",
  );

  await signInAsAdmin(page, email!, password!);
  await page.goto("/admin/places");
  await page
    .getByRole("link", { name: /^Edit profile for Tonypandy/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Add a fact" }).click();
  await page.getByLabel("Label 1", { exact: true }).fill("Parking");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText(/missing its label or value/)).toBeVisible();

  // A row with only Welsh wording is reported, not silently dropped.
  await page.getByLabel("Label 1", { exact: true }).fill("");
  await page.getByLabel("Label 1 (Welsh)").fill("Parcio");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText(/missing its label or value/)).toBeVisible();
  await page.goto("/places/tonypandy");
  await expect(page.getByTestId("place-profile")).toHaveCount(0);
});
