import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { publicDemoAccount } from "../../src/lib/demo-account";

const execFileAsync = promisify(execFile);

const viewports = [
  { name: "desktop", width: 1440, height: 900, maximumHeroHeight: 620 },
  { name: "tablet", width: 768, height: 1024, maximumHeroHeight: 660 },
  { name: "mobile", width: 390, height: 844, maximumHeroHeight: 660 },
] as const;

for (const viewport of viewports) {
  test(`premium homepage is intentionally designed at ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Everything local, all in one place.",
      }),
    ).toBeVisible();
    await expect(page.getByLabel("What are you looking for?")).toBeVisible();
    await expect(page.getByLabel("Where?")).toBeVisible();
    await expect(page.getByText("Cwm & Coil Heating").first()).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "One profile. A complete local presence.",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("About this demonstration:", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "A website for every local business" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Explore without an account" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Create an account", exact: true }),
    ).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

    const hero = await page
      .locator('section[aria-labelledby="home-title"]')
      .boundingBox();
    expect(hero).not.toBeNull();
    expect(hero?.height).toBeLessThanOrEqual(viewport.maximumHeroHeight);

    if (viewport.name !== "tablet") {
      const screenshot = await page.screenshot({ fullPage: true });
      await testInfo.attach(`homepage-${viewport.name}`, {
        body: screenshot,
        contentType: "image/png",
      });
    }
  });
}

test("universal search works without an account", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("What are you looking for?").fill("plumbing");
  await page.getByLabel("Where?").selectOption("tonypandy");
  await page.getByRole("button", { name: "Search", exact: true }).click();

  await expect(page).toHaveURL(/\/businesses\?q=plumbing&place=tonypandy/);
  await expect(page.getByText("Cwm & Coil Heating")).toBeVisible();
});

test("sign-in dialog clears credentials, errors and restores focus", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page
    .getByRole("banner")
    .getByRole("link", { name: "Sign in", exact: true });
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Sign in to OurValleys" });
  await expect(dialog).toBeVisible();

  const email = dialog.getByLabel("Email address");
  const password = dialog.getByLabel("Password");
  await expect(email).toBeFocused();
  await email.fill("nobody@example.test");
  await password.fill("not-a-real-password");
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(dialog.getByRole("alert")).toContainText(
    "email address or password is incorrect",
  );
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(password).toHaveAttribute("aria-invalid", "true");

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Email address")).toHaveValue("");
  await expect(dialog.getByLabel("Password")).toHaveValue("");
  await expect(dialog.getByRole("alert")).toHaveCount(0);
});

test("sign-in dialog locks and restores background scroll, and fits without its own scrollbar at a typical viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const trigger = page
    .getByRole("banner")
    .getByRole("link", { name: "Sign in", exact: true });
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Sign in to OurValleys" });
  await expect(dialog).toBeVisible();

  await expect(page.locator("html")).toHaveCSS("overflow", "hidden");
  const startScroll = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 1000);
  await expect(page.evaluate(() => window.scrollY)).resolves.toBe(startScroll);

  const dialogFit = await dialog.evaluate((element) => ({
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));
  expect(dialogFit.scrollHeight).toBeLessThanOrEqual(dialogFit.clientHeight);

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
});

test("homepage sign-in has a dedicated route fallback without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/");
  const trigger = page
    .getByRole("banner")
    .getByRole("link", { name: "Sign in", exact: true });
  await expect(trigger).toHaveAttribute("href", "/login?next=/account");
  await trigger.click();

  await expect(page).toHaveURL(/\/login\?next=(?:\/|%2F)account$/i);
  await expect(
    page.getByRole("heading", { name: "Sign in to OurValleys." }),
  ).toBeVisible();
  await context.close();
});

test("dedicated sign-in fallback exposes the complete form", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Sign in to OurValleys." }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(
    page.getByText("Public discovery does not require an account"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "View the fictional business dashboard",
    }),
  ).toBeVisible();
});

test("public demo details fill without submitting and reach a view-only dashboard", async ({
  page,
}) => {
  await page.goto("/login?next=/account");
  await page.getByRole("button", { name: "Fill demo details" }).click();

  await expect(page.getByLabel("Email address")).toHaveValue(
    publicDemoAccount.email,
  );
  await expect(page.getByLabel("Password")).toHaveValue(
    publicDemoAccount.password,
  );
  await expect(page).toHaveURL(/\/login\?next=(?:\/|%2F)account$/i);
  await expect(page.getByText("Demo details added")).toHaveText(
    "Demo details added. Review them, then select Sign in.",
  );

  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  const firstName = publicDemoAccount.name.split(" ")[0];
  await expect(
    page.getByRole("heading", { name: `Welcome back, ${firstName}.` }),
  ).toBeVisible();
  await expect(
    page.getByText(publicDemoAccount.email, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Viewer", { exact: true })).toBeVisible();
  await expect(page.getByText("Fictional demo", { exact: true })).toBeVisible();

  await page
    .getByRole("link", { name: "Open business dashboard", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/dashboard/business/${publicDemoAccount.businessId}$`),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Cwm & Coil Heating" }),
  ).toBeVisible();
  await expect(page.getByText("View only", { exact: true })).toBeVisible();
  await expect(
    page.getByText("cannot edit or publish", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save profile draft" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Nothing publishes automatically." }),
  ).toBeVisible();
});

test("provisioned credentials sign in, rotate safely and revoke sessions", async ({
  page,
}) => {
  const email = process.env.E2E_ACCOUNT_EMAIL;
  const password = process.env.E2E_ACCOUNT_PASSWORD;
  const name = process.env.E2E_ACCOUNT_NAME;

  test.skip(
    !email || !password || !name,
    "The successful authentication journey requires an ephemeral provisioned account.",
  );

  await page.goto("/");
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Sign in", exact: true })
    .click();

  const dialog = page.getByRole("dialog", { name: "Sign in to OurValleys" });
  await dialog.getByLabel("Email address").fill(email!);
  await dialog.getByLabel("Password").fill(password!);
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page).toHaveURL(/\/account$/);
  const firstName = name!.split(" ")[0];
  await expect(
    page.getByRole("heading", { name: `Welcome back, ${firstName}.` }),
  ).toBeVisible();
  await expect(page.getByText(email!, { exact: true })).toBeVisible();

  const rotatedPassword = `${password}R1`;
  const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const provisioning = await execFileAsync(pnpmCommand, ["auth:provision"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ACCOUNT_EMAIL: email,
      ACCOUNT_NAME: name,
      ACCOUNT_PASSWORD: rotatedPassword,
    },
    encoding: "utf8",
  });

  expect(String(provisioning.stdout)).not.toContain(email!);
  expect(String(provisioning.stderr)).not.toContain(email!);
  expect(String(provisioning.stdout)).not.toContain(rotatedPassword);
  expect(String(provisioning.stderr)).not.toContain(rotatedPassword);

  await page.reload();
  await expect(page).toHaveURL(/\/login\?next=(?:\/|%2F)account$/i);

  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password").fill(rotatedPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page
      .getByRole("banner")
      .getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
});

test("reduced motion preserves every important homepage section", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.locator("[data-home-root]")).toHaveAttribute(
    "data-motion",
    "reduced",
  );
  await expect(
    page.getByRole("heading", { name: "What do you need today?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Useful local guides" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A website for every local business" }),
  ).toBeVisible();

  const animationDuration = await page
    .locator("[data-home-parallax] > div")
    .evaluate((element) => getComputedStyle(element).animationDuration);
  expect(Number.parseFloat(animationDuration)).toBeLessThanOrEqual(0.001);
});

test("mobile homepage stays within measured payload budgets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const payload = await page.evaluate(() => {
    const resources = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    const sizeOf = (entry: PerformanceResourceTiming) =>
      entry.encodedBodySize || entry.transferSize;

    return {
      javascript: resources
        .filter(
          (entry) =>
            entry.initiatorType === "script" ||
            entry.name.includes("/_next/static/chunks/"),
        )
        .reduce((total, entry) => total + sizeOf(entry), 0),
      imagery: resources
        .filter(
          (entry) =>
            entry.initiatorType === "img" ||
            entry.name.includes("/_next/image") ||
            entry.name.includes("/home/"),
        )
        .reduce((total, entry) => total + sizeOf(entry), 0),
    };
  });

  expect(payload.javascript).toBeLessThan(500_000);
  expect(payload.imagery).toBeLessThan(350_000);
});
