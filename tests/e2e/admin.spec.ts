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

test("signed-out visitors are redirected away from the admin area", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=(?:\/|%2F)admin$/i);
});

test("a signed-in non-admin sees a clear restricted-access state, not the admin nav", async ({
  page,
}) => {
  const email = process.env.E2E_ACCOUNT_EMAIL;
  const password = process.env.E2E_ACCOUNT_PASSWORD;
  test.skip(
    !email || !password,
    "This journey requires an ephemeral provisioned non-admin account.",
  );

  await signInViaDialog(page, email!, password!);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", {
      name: "This area is for platform admins only.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Audit log" })).toHaveCount(0);
});

test("a platform admin can review and approve a pending business, which then appears in public discovery", async ({
  page,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(
    !email || !password,
    "This journey requires an ephemeral provisioned admin account.",
  );

  await signInViaDialog(page, email!, password!);

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "1 Awaiting review" }),
  ).toBeVisible();

  await page.goto("/admin/businesses?status=pending_review");
  await page.getByRole("link", { name: "Rhondda Home Tutoring" }).click();
  await expect(
    page.getByRole("heading", { name: "Rhondda Home Tutoring" }),
  ).toBeVisible();
  await expect(page.getByText("Pending Review", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Approve and publish" }).click();
  await expect(page.getByText("Published.")).toBeVisible();

  await page.goto("/businesses?q=tutoring");
  await expect(
    page.getByRole("heading", { name: "Rhondda Home Tutoring" }),
  ).toBeVisible();
});
