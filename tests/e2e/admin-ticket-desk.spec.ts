import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/admin-session";

const demoBusinessId = "00000000-0000-4000-8000-000000000401";

test("signed-out visitors cannot reach the ticket desk or a ticket", async ({
  page,
}) => {
  await page.goto("/admin/tickets");
  await expect(page).toHaveURL(/\/login\?next=(?:\/|%2F)admin$/i);
  await page.goto("/admin/tickets/00000000-0000-4000-8000-0000000025ff");
  await expect(page).toHaveURL(/\/login\?next=(?:\/|%2F)admin$/i);
});

test("a public correction reaches the desk and is decided in place", async ({
  page,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(
    !email || !password,
    "This journey requires an ephemeral provisioned admin account.",
  );
  const details = `Desk e2e correction ${Date.now()}: the phone number is wrong.`;

  await page.goto(`/report/${demoBusinessId}`);
  await page.getByLabel("What's wrong?").selectOption("incorrect_details");
  await page.getByLabel("What should be corrected?").fill(details);
  await page.getByLabel("Correct public phone").fill("01443 555019");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText("Your report has been sent.")).toBeVisible();

  await signInAsAdmin(page, email!, password!);
  await page.goto("/admin/tickets");
  await expect(
    page.getByRole("heading", {
      name: "Claims, corrections and conflicts",
      level: 2,
    }),
  ).toBeVisible();
  const card = page.getByRole("listitem").filter({ hasText: details });
  await expect(card).toBeVisible();
  await expect(card.getByText("Public correction")).toBeVisible();

  // Unknown filters fall back to the default view instead of breaking.
  await page.goto("/admin/tickets?scope=%3Cx%3E&type=nope");
  await expect(page.getByRole("link", { name: "All types" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(card).toBeVisible();

  await card.getByRole("link", { name: "Review and decide" }).click();
  await expect(page).toHaveURL(/\/admin\/tickets\/[0-9a-f-]{36}$/);
  await expect(page.getByText(details)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Proposed changes to the public page" }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "01443 555019" })).toBeVisible();

  // A suggested decision is preselected and its effects are spelled out.
  await expect(
    page.getByRole("radio", { name: /Accept correction/ }),
  ).toBeChecked();
  await expect(
    page.getByText(/Public phone: .* becomes “01443 555019”/),
  ).toBeVisible();

  // Phone-width: no sideways scroll, no WCAG A/AA violations.
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);

  // Dismiss, so the shared demo business keeps its public details.
  await page.getByRole("radio", { name: /Dismiss with no action/ }).check();
  const submit = page.getByRole("button", { name: "Dismiss with no action" });
  await expect(submit).toBeDisabled();
  await page.getByLabel(/Decision note/).fill("Automated desk journey.");
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByText("Decision recorded.")).toBeVisible();
  await expect(
    page.getByText("Dismissed", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Automated desk journey.").first()).toBeVisible();

  await page.goto("/admin/tickets?scope=closed");
  await expect(
    page.getByRole("listitem").filter({ hasText: details }),
  ).toBeVisible();
  await page.goto("/admin/tickets");
  await expect(
    page.getByRole("listitem").filter({ hasText: details }),
  ).toHaveCount(0);
});

test("an unknown or malformed ticket shows the not-found page", async ({
  page,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!email || !password, "Requires the provisioned admin account.");
  await signInAsAdmin(page, email!, password!);
  for (const path of [
    "/admin/tickets/00000000-0000-4000-8000-0000000025ff",
    "/admin/tickets/not-a-ticket",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "We could not find that page." }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Reject/ })).toHaveCount(0);
  }
});
