import { expect, test } from "@playwright/test";

async function signInViaDialog(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/");
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Sign in", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Sign in to OurValleys" });
  await dialog.getByLabel("Email address").fill(email);
  await dialog.getByLabel("Password").fill(password);
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
}

test("a platform admin can author, publish and archive a guide", async ({
  page,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(
    !email || !password,
    "This journey requires an ephemeral provisioned admin account.",
  );

  await signInViaDialog(page, email!, password!);

  await page.goto("/admin/guides");
  await expect(page.getByRole("heading", { name: "Guides" })).toBeVisible();

  await page.getByRole("button", { name: "Add guide" }).click();
  await page.getByLabel("Title").fill("A test guide for automated checks");
  await page.getByLabel("Slug").fill("a-test-guide-for-automated-checks");
  await page
    .getByLabel("Summary")
    .fill("A guide created by an automated end-to-end check.");
  await page.getByLabel("Area label").fill("Automated test area");
  await page.getByLabel("Reading time").fill("2 minute read");
  await page.getByLabel("Author").fill("Automated test author");
  await page.getByLabel("Heading").fill("A test section");
  await page
    .getByLabel("Body")
    .fill("Body copy long enough to satisfy the minimum length rule.");
  await page.getByLabel("Link (path starting with /)").fill("/businesses");
  await page.getByLabel("Link label").fill("Search businesses");
  await page.getByRole("button", { name: "Create guide" }).click();

  await expect(
    page.getByRole("cell", { name: "A test guide for automated checks" }),
  ).toBeVisible();

  const row = page.getByRole("row", {
    name: /A test guide for automated checks/,
  });
  await row.getByRole("button", { name: "Publish" }).click();
  await expect(row.getByText("Published")).toBeVisible();

  await page.goto("/guides/a-test-guide-for-automated-checks");
  await expect(
    page.getByRole("heading", { name: "A test guide for automated checks" }),
  ).toBeVisible();

  await page.goto("/admin/guides");
  const publishedRow = page.getByRole("row", {
    name: /A test guide for automated checks/,
  });
  await publishedRow.getByRole("button", { name: "Archive" }).click();
  await expect(publishedRow.getByText("Archived")).toBeVisible();

  await page.goto("/guides/a-test-guide-for-automated-checks");
  await expect(
    page.getByRole("heading", { name: "We could not find that page." }),
  ).toBeVisible();
});
