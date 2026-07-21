import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";

const email = process.env.E2E_ACCOUNT_EMAIL;
const password = process.env.E2E_ACCOUNT_PASSWORD;
const originalName = process.env.E2E_ACCOUNT_NAME;

test.skip(
  !email || !password || !originalName,
  "Account settings coverage requires an ephemeral provisioned account.",
);

// Better Auth rate-limits /sign-in* to 3 requests per 10 seconds by default.
// Signing in once per file (rather than once per test) keeps this suite
// comfortably under that limit and is faster besides.
const storageStatePath = path.join(
  os.tmpdir(),
  `ourvalleys-account-settings-e2e-${process.pid}.json`,
);

test.beforeAll(async ({ browser }) => {
  // `browser.newContext()` otherwise inherits the file-scoped `storageState`
  // default set below, which would try to read this same file before it's
  // been written.
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await context.storageState({ path: storageStatePath });
  await context.close();
});

test.use({ storageState: storageStatePath });

test.afterEach(async ({ page }) => {
  // The tests below mutate the shared provisioned fixture account (name,
  // marketing preference). Restore it so later spec files that sign in as
  // the same account see its original, provisioned state.
  await page.goto("/account/settings");
  const nameInput = page.getByLabel("Name", { exact: true });
  if ((await nameInput.count()) === 0) return;

  await nameInput.fill(originalName!);
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile updated.")).toBeVisible();

  const marketingSwitch = page.getByRole("switch", {
    name: "Email me about new features and local updates",
  });
  if ((await marketingSwitch.getAttribute("aria-checked")) === "true") {
    await marketingSwitch.click();
    await expect(page.getByText("opted out")).toBeVisible();
  }
});

test("a signed-in visitor can update their profile name and photo", async ({
  page,
}) => {
  await page.goto("/account/settings");

  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    originalName!,
  );

  await page.getByLabel("Name", { exact: true }).fill("Temporary Fixture Name");
  await page
    .getByLabel("Profile photo link")
    .fill("https://example.test/avatar.jpg");
  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page.getByText("Profile updated.")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Temporary Fixture Name",
  );
  await expect(page.getByLabel("Profile photo link")).toHaveValue(
    "https://example.test/avatar.jpg",
  );
});

test("the profile form rejects a non-https photo link", async ({ page }) => {
  await page.goto("/account/settings");

  await page
    .getByLabel("Profile photo link")
    .fill("http://example.test/avatar.jpg");
  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(
    page.getByText("Profile photo links must be a full https:// address."),
  ).toBeVisible();
});

test("a signed-in visitor can toggle their marketing preference", async ({
  page,
}) => {
  await page.goto("/account/settings");

  const marketingSwitch = page.getByRole("switch", {
    name: "Email me about new features and local updates",
  });
  await expect(marketingSwitch).toHaveAttribute("aria-checked", "false");

  await marketingSwitch.click();
  await expect(marketingSwitch).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("opted in")).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("switch", {
      name: "Email me about new features and local updates",
    }),
  ).toHaveAttribute("aria-checked", "true");
});

test("the danger zone requires the correct password and a typed confirmation before deleting", async ({
  page,
}) => {
  await page.goto("/account/settings");

  await page.getByRole("button", { name: "Delete account" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete your account?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Password")).toBeFocused();

  const confirmButton = dialog.getByRole("button", {
    name: "Permanently delete my account",
  });
  await expect(confirmButton).toBeDisabled();

  await dialog.getByLabel("Password").fill("definitely-the-wrong-password");
  await dialog.getByLabel(`Type DELETE to confirm`).fill("delete");
  await expect(confirmButton).toBeDisabled();

  await dialog.getByLabel(`Type DELETE to confirm`).fill("DELETE");
  await expect(confirmButton).toBeEnabled();

  await confirmButton.click();
  await expect(dialog.getByText("That password is incorrect.")).toBeVisible();

  // The account must still exist and the visitor must still be signed in —
  // this deliberately never exercises a real deletion against the shared
  // fixture account; that path is covered by the integration test suite.
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(page).toHaveURL(/\/account\/settings$/);
});
