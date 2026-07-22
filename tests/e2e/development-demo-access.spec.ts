import { expect, test } from "@playwright/test";
import {
  publicAdminDemoAccount,
  publicBusinessDemoAccount,
} from "../../src/lib/demo-account";

test("public business-owner demo reaches the editable fictional business", async ({
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

  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page).toHaveURL(
    new RegExp(
      `/dashboard/business/${publicBusinessDemoAccount.businessId}$`,
    ),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Cwm & Coil Heating" }),
  ).toBeVisible();
  await expect(page.getByText("owner", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save profile draft" }),
  ).toBeVisible();
  await expect(page.getByText("View only", { exact: true })).toHaveCount(0);
});

test("public administrator demo reaches the protected admin dashboard", async ({
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

  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Admin" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Admin sections" }),
  ).toBeVisible();
});
