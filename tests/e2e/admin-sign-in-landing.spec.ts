import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/admin-session";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test.skip(
  !adminEmail || !adminPassword,
  "the provisioned E2E admin account is not configured",
);

test("the platform admin lands on the admin area after signing in, and the sign-in pages carry a signed-in admin there", async ({
  page,
}) => {
  // The helper also covers two-step enrolment and the authenticator-code step,
  // and requires the admin area, not the account page, at the end.
  await signInAsAdmin(page, adminEmail!, adminPassword!);
  await expect(page).toHaveURL(/\/admin$/);

  // Already signed in: the sign-in and register pages send the admin on to the
  // admin area, as they send everyone else to their account.
  await page.goto("/login");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/register");
  await expect(page).toHaveURL(/\/admin$/);

  // A specific page that was asked for still wins.
  await page.goto("/login?next=/account/saved");
  await expect(page).toHaveURL(/\/account\/saved$/);
});
