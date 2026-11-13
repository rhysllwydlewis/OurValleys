import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/admin-session";

test("a signed-out visitor cannot read content insights", async ({ page }) => {
  const response = await page.goto("/admin/insights");
  expect(response?.status()).toBeLessThan(500);
  await expect(
    page.getByRole("heading", { name: "Content insights" }),
  ).toHaveCount(0);
});

test("the beacon refuses unknown kinds and unknown items", async ({
  request,
}) => {
  const bad = await request.post("/api/editorial-view", {
    data: { kind: "offer", itemId: "00000000-0000-4000-8000-000000000001" },
  });
  expect(bad.status()).toBe(400);
  const unknown = await request.post("/api/editorial-view", {
    data: { kind: "place", itemId: "00000000-0000-4000-8000-000000000001" },
  });
  expect(unknown.status()).toBe(200);
  expect(await unknown.json()).toEqual({ accepted: false });
});

test("opening a place counts once and an admin sees it in content insights", async ({
  page,
  browser,
  baseURL,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(
    !email || !password,
    "This journey requires an ephemeral provisioned admin account.",
  );

  const beacon = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/editorial-view") &&
      response.request().method() === "POST",
  );
  await page.goto("/places/tonypandy");
  expect((await beacon).status()).toBe(200);

  const admin = await browser.newContext({ baseURL });
  const adminPage = await admin.newPage();
  try {
    await signInAsAdmin(adminPage, email!, password!);
    await adminPage.goto("/admin/insights?days=7");
    await expect(
      adminPage.getByRole("heading", { name: "Content insights", level: 2 }),
    ).toBeVisible();
    await expect(
      adminPage.getByRole("link", { name: "Last 7 days" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      adminPage.getByRole("link", { name: "Tonypandy", exact: true }).first(),
    ).toBeVisible();
    await expect(adminPage.getByText("Opens per day")).toBeVisible();
    await expect(
      adminPage.getByRole("navigation").getByRole("link", {
        name: "Content insights",
      }),
    ).toHaveAttribute("aria-current", "page");

    await adminPage.goto("/admin/insights?days=bogus");
    await expect(
      adminPage.getByRole("link", { name: "Last 30 days" }),
    ).toHaveAttribute("aria-current", "page");

    const scan = await new AxeBuilder({ page: adminPage })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);

    await adminPage.setViewportSize({ width: 390, height: 844 });
    const overflow = await adminPage.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  } finally {
    await admin.close();
  }
});
