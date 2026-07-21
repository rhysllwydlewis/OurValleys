import { expect, test } from "@playwright/test";
import { publicDemoAccount } from "../../src/lib/demo-account";

async function signInViaFullPage(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(publicDemoAccount.email);
  await page.getByLabel("Password").fill(publicDemoAccount.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);
}

async function openAccountMenuPanel(page: import("@playwright/test").Page) {
  const trigger = page
    .getByRole("banner")
    .getByRole("button", { name: "Account" });
  await trigger.click();
  const panelId = await trigger.getAttribute("aria-controls");
  if (!panelId) throw new Error("Account menu trigger has no aria-controls.");
  return { trigger, panel: page.locator(`#${panelId}`) };
}

test("a signed-in visitor can sign out from the global header on any page", async ({
  page,
}) => {
  await signInViaFullPage(page);

  await page.goto("/businesses");
  const trigger = page
    .getByRole("banner")
    .getByRole("button", { name: "Account" });
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  const { panel } = await openAccountMenuPanel(page);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(panel.getByText(publicDemoAccount.email)).toBeVisible();
  await expect(panel.getByRole("link", { name: "My account" })).toBeVisible();

  await panel.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page
      .getByRole("banner")
      .getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
});

test("the account menu closes on Escape and on an outside click", async ({
  page,
}) => {
  await signInViaFullPage(page);
  await page.goto("/businesses");

  const { trigger, panel } = await openAccountMenuPanel(page);
  await expect(panel.getByRole("link", { name: "My account" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();

  const { panel: reopenedPanel } = await openAccountMenuPanel(page);
  await expect(
    reopenedPanel.getByRole("link", { name: "My account" }),
  ).toBeVisible();
  await page.mouse.click(10, 400);
  await expect(reopenedPanel).toHaveCount(0);
});

test("a signed-in visitor can sign out from the homepage's own header", async ({
  page,
}) => {
  await signInViaFullPage(page);
  await page.goto("/");

  const { panel } = await openAccountMenuPanel(page);
  await panel.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page
      .getByRole("banner")
      .getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
});
