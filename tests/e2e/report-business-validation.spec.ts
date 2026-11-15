import { expect, test } from "@playwright/test";

const businessId = "00000000-0000-4000-8000-000000000401";

test("an empty correction report is stopped with a clear message", async ({
  page,
}) => {
  await page.goto(`/report/${businessId}`);
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.locator("form .field-error")).toContainText(
    "Please say what is wrong, or add a suggested detail, before sending.",
  );
  await expect(page.getByLabel("What should be corrected?")).toBeFocused();
  await expect(page.getByText("Your report has been sent.")).toHaveCount(0);
});

test("a closed-or-moved report needs no further words", async ({ page }) => {
  await page.goto(`/report/${businessId}`);
  await page.getByLabel("What's wrong?").selectOption("closed_or_moved");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText("Your report has been sent.")).toBeVisible();
});
