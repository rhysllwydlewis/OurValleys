import os from "node:os";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser } from "@playwright/test";
import {
  publicBusinessDemoAccount,
  publicDemoAccount,
} from "../../src/lib/demo-account";

const businessId = publicBusinessDemoAccount.businessId;
const hub = `/dashboard/business/${businessId}`;

const outsiderEmail = process.env.E2E_ACCOUNT_EMAIL;
const outsiderPassword = process.env.E2E_ACCOUNT_PASSWORD;

// This file is named so it runs before homepage.spec.ts, whose "rotate safely"
// test changes the shared provisioned account password.
// Sign-in is rate limited (3 per 10 seconds), so each account signs in once.
const ownerState = path.join(
  os.tmpdir(),
  `ov-owner-hub-owner-${process.pid}.json`,
);
const viewerState = path.join(
  os.tmpdir(),
  `ov-owner-hub-viewer-${process.pid}.json`,
);
const outsiderState = path.join(
  os.tmpdir(),
  `ov-owner-hub-outsider-${process.pid}.json`,
);

async function signIn(
  browser: Browser,
  email: string,
  password: string,
  file: string,
) {
  // Sign-in is rate limited, and earlier specs in a full run may have used the
  // window, so wait out a refusal and try again instead of failing the suite.
  for (let attempt = 1; ; attempt += 1) {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    try {
      await expect(page).toHaveURL(/\/account$/);
      await context.storageState({ path: file });
      await context.close();
      return;
    } catch (error) {
      await context.close();
      if (attempt >= 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 11_000));
    }
  }
}

test.beforeAll(async ({ browser }) => {
  // Two sign-ins, each allowed to wait out the sign-in rate limit.
  test.setTimeout(180_000);
  await signIn(
    browser,
    publicBusinessDemoAccount.email,
    publicBusinessDemoAccount.password,
    ownerState,
  );
  await signIn(
    browser,
    publicDemoAccount.email,
    publicDemoAccount.password,
    viewerState,
  );
  if (outsiderEmail && outsiderPassword) {
    await signIn(browser, outsiderEmail, outsiderPassword, outsiderState);
  }
});

test.describe("owner", () => {
  test.use({ storageState: ownerState });

  test("the hub shows next steps, performance, tools and a shared tab bar", async ({
    page,
  }) => {
    await page.goto(hub);
    await expect(
      page.getByRole("heading", { level: 1, name: "Cwm & Coil Heating" }),
    ).toBeVisible();

    const tabs = page.getByRole("navigation", {
      name: "Business dashboard sections",
    });
    await expect(tabs.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // The public demo cannot use the design or operations tools.
    await expect(
      tabs.getByRole("link", { name: "Website design" }),
    ).toHaveCount(0);

    await expect(
      page.getByRole("heading", { level: 2, name: "Your next steps" }),
    ).toBeVisible();
    // The demo owner's role does not include analytics, so none are read or shown.
    await expect(
      page.getByRole("heading", { level: 2, name: "How your page did" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Everything for your business",
      }),
    ).toBeVisible();
    // The old wall of empty forms now lives on its own page.
    await expect(
      page.getByLabel("Short summary (20–280 characters)"),
    ).toHaveCount(0);

    // A published business keeps its setup steps behind a disclosure.
    await expect(page.getByText("Show the setup steps")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Review and go live" }),
    ).toBeVisible();
  });

  test("the Profile tab holds the editing forms and returns to the overview", async ({
    page,
  }) => {
    await page.goto(hub);
    await page
      .getByRole("navigation", { name: "Business dashboard sections" })
      .getByRole("link", { name: "Profile" })
      .click();
    await expect(page).toHaveURL(new RegExp(`${hub}/profile$`));
    await expect(
      page.getByRole("heading", { level: 1, name: "Cwm & Coil Heating" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Build your profile" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Business dashboard sections" })
        .getByRole("link", { name: "Profile" }),
    ).toHaveAttribute("aria-current", "page");

    await page.getByRole("link", { name: "Back to overview" }).click();
    await expect(page).toHaveURL(new RegExp(`${hub}$`));
  });

  test("the Preview tab is part of the same tab bar", async ({ page }) => {
    await page.goto(`${hub}/preview`);
    await expect(
      page
        .getByRole("navigation", { name: "Business dashboard sections" })
        .getByRole("link", { name: "Preview" }),
    ).toHaveAttribute("aria-current", "page");
    await page.getByRole("link", { name: "Overview" }).click();
    await expect(page).toHaveURL(new RegExp(`${hub}$`));
  });

  test("an invalid business id is not found on the profile page", async ({
    page,
  }) => {
    const response = await page.goto("/dashboard/business/not-a-uuid/profile");
    expect(response?.status()).toBe(404);
  });

  test("the hub and profile page pass axe in English and Welsh", async ({
    page,
    baseURL,
  }) => {
    for (const route of [hub, `${hub}/profile`]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    }

    await page
      .context()
      .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
    await page.goto(hub);
    await expect(
      page.getByRole("heading", { level: 2, name: "Eich camau nesaf" }),
    ).toBeVisible();
    await expect(page.getByText("Your next steps")).toHaveCount(0);
    const welsh = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(welsh.violations.map((violation) => violation.id)).toEqual([]);
  });

  test("the hub has no horizontal scroll on a phone and the tab bar stays reachable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(hub);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
    await page.keyboard.press("Tab");
    const tabLink = page
      .getByRole("navigation", { name: "Business dashboard sections" })
      .getByRole("link", { name: "Overview" });
    await tabLink.focus();
    await expect(tabLink).toBeFocused();
  });
});

test.describe("viewer", () => {
  test.use({ storageState: viewerState });

  test("a viewer without analytics access gets no figures and no edit prompts", async ({
    page,
  }) => {
    await page.goto(hub);
    // The demo viewer's membership holds only the view permission.
    await expect(
      page.getByRole("heading", { level: 2, name: "How your page did" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 2, name: "Your next steps" }),
    ).toBeVisible();
    // No edit rights: no growth or setup prompts, and no operations link.
    await expect(page.getByText("Add your logo")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Full figures and trends" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Content & insights" }),
    ).toHaveCount(0);
  });
});

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the profile page sends a signed-out visitor to sign in", async ({
    request,
  }) => {
    const response = await request.get(`${hub}/profile`, { maxRedirects: 0 });
    expect([307, 308]).toContain(response.status());
    expect(response.headers().location).toContain("/login");
  });
});

test.describe("signed in without access to the business", () => {
  test.skip(
    !outsiderEmail || !outsiderPassword,
    "Needs the ephemeral provisioned account.",
  );
  test.use({ storageState: outsiderState });

  test("the hub and profile page are not found for a non-member", async ({
    page,
  }) => {
    for (const route of [hub, `${hub}/profile`]) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(404);
      await expect(page.getByText("Your next steps")).toHaveCount(0);
    }
  });
});
