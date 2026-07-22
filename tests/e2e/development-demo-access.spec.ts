import { expect, test } from "@playwright/test";
import {
  publicAdminDemoAccount,
  publicBusinessDemoAccount,
} from "../../src/lib/demo-account";

test("public business-owner demo reaches only its restricted fictional business", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByRole("button", { name: publicBusinessDemoAccount.buttonLabel })
    .click();

  await expect(page.getByLabel("Email address")).toHaveValue(
    publicBusinessDemoAccount.email,
  );
  await expect(page.getByLabel("Password")).toHaveValue(
    publicBusinessDemoAccount.password,
  );
  const rememberMe = page.getByLabel("Keep me signed in on this device");
  await expect(rememberMe).not.toBeChecked();
  await rememberMe.check();

  const signInRequestPromise = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      request.url().includes("/api/auth/sign-in/email"),
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const signInRequest = await signInRequestPromise;
  expect(signInRequest.postDataJSON()).toMatchObject({ rememberMe: false });

  const dashboardPath = `/dashboard/business/${publicBusinessDemoAccount.businessId}`;
  await expect(page).toHaveURL(new RegExp(`${dashboardPath}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Cwm & Coil Heating" }),
  ).toBeVisible();
  await expect(page.getByText("owner", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save profile draft" }),
  ).toBeVisible();
  await expect(page.getByText("View only", { exact: true })).toHaveCount(0);

  await page.goto(`${dashboardPath}/operations`);
  await expect(page).toHaveURL(new RegExp(`${dashboardPath}$`));
  await page.goto(`${dashboardPath}/website`);
  await expect(page).toHaveURL(new RegExp(`${dashboardPath}$`));

  await page.goto("/account");
  await expect(
    page.getByText("Cwm & Coil Heating", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open business dashboard" }),
  ).toHaveCount(1);
  await expect(page.getByText("Rhondda Home Tutoring")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Account settings" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Create another business" }),
  ).toHaveCount(0);

  await page.goto("/account/settings");
  await expect(
    page.getByRole("heading", { name: "Public demo settings are read-only." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete account" }),
  ).toHaveCount(0);

  const accountMutation = await page.request.post("/api/auth/update-user", {
    data: { name: "Changed public demo" },
  });
  expect(accountMutation.status()).toBe(403);

  await page.goto("/account/new-business");
  await expect(
    page.getByRole("heading", {
      name: "Public demo accounts cannot create businesses.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create my starter website" }),
  ).toHaveCount(0);
});

test("public administrator demo sees only a sanitised non-mutating overview", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByRole("button", { name: publicAdminDemoAccount.buttonLabel })
    .click();

  await expect(page.getByLabel("Email address")).toHaveValue(
    publicAdminDemoAccount.email,
  );
  await expect(page.getByLabel("Password")).toHaveValue(
    publicAdminDemoAccount.password,
  );
  await expect(
    page.getByLabel("Keep me signed in on this device"),
  ).not.toBeChecked();

  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Admin" }),
  ).toBeVisible();
  const adminNavigation = page.getByRole("navigation", {
    name: "Admin sections",
  });
  await expect(adminNavigation).toBeVisible();
  await expect(
    page.getByText("Read-only public admin demonstration"),
  ).toBeVisible();
  await expect(
    adminNavigation.getByRole("link", { name: "Overview" }),
  ).toBeVisible();
  await expect(
    adminNavigation.getByRole("link", { name: "Users" }),
  ).toHaveCount(0);

  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByText("Read-only public admin demonstration"),
  ).toBeVisible();

  const adminRead = await page.request.get("/api/auth/admin/list-users");
  expect(adminRead.status()).toBe(403);
  const adminMutation = await page.request.post(
    "/api/auth/admin/public-demo-mutation-check",
    { data: {} },
  );
  expect(adminMutation.status()).toBe(403);

  await page.goto("/account");
  await expect(
    page.getByRole("heading", {
      name: "This demonstration has no business dashboards.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Account settings" }),
  ).toHaveCount(0);

  await page.goto("/account/settings");
  await expect(
    page.getByRole("heading", { name: "Public demo settings are read-only." }),
  ).toBeVisible();

  await page.goto("/account/new-business");
  await expect(
    page.getByRole("heading", {
      name: "Public demo accounts cannot create businesses.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create my starter website" }),
  ).toHaveCount(0);
});
