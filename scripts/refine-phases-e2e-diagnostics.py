from pathlib import Path

path = Path("tests/e2e/public-journeys.spec.ts")
text = path.read_text()
old = '''    await expect(
      page.getByText("Free fictional heating check conversation"),
    ).toBeVisible();
    await expect(
      page.getByText("Fictional home-heating question session"),
    ).toBeVisible();
    await expect(
      page.getByText("Demonstration boiler-care visit"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Example areas covered" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Send an enquiry" }).first(),
    ).toBeVisible();
'''
if text.count(old) != 1:
    raise SystemExit("public operations assertion block changed")
text = text.replace(old, "", 1)
old_nav = '''    await expect(
      businessNavigation.getByRole("link", { name: "Offers" }),
    ).toBeVisible();
    await expect(
      businessNavigation.getByRole("link", { name: "Events" }),
    ).toBeVisible();
    await expect(
      businessNavigation.getByRole("link", { name: "Menu" }),
    ).toBeVisible();
'''
if text.count(old_nav) != 1:
    raise SystemExit("public operations navigation block changed")
text = text.replace(old_nav, "", 1)
anchor = '''test("the generated business website supports keyboard bypass navigation", async ({
  page,
}) => {
'''
insert = '''test("published site shows a current business offer", async ({ page }) => {
  await page.goto("/b/cwm-coil-heating");
  await expect(
    page.getByText("Free fictional heating check conversation"),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Business page sections" })
      .getByRole("link", { name: "Offers" }),
  ).toBeVisible();
});

test("published site syndicates an upcoming business event", async ({ page }) => {
  await page.goto("/b/cwm-coil-heating");
  await expect(
    page.getByText("Fictional home-heating question session"),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Business page sections" })
      .getByRole("link", { name: "Events" }),
  ).toBeVisible();
});

test("published site renders a structured menu", async ({ page }) => {
  await page.goto("/b/cwm-coil-heating");
  await expect(page.getByText("Demonstration boiler-care visit")).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Business page sections" })
      .getByRole("link", { name: "Menu" }),
  ).toBeVisible();
});

test("published site renders a bounded category feature", async ({ page }) => {
  await page.goto("/b/cwm-coil-heating");
  await expect(
    page.getByRole("heading", { name: "Example areas covered" }),
  ).toBeVisible();
});

test("published site exposes the configured enquiry action", async ({ page }) => {
  await page.goto("/b/cwm-coil-heating");
  await expect(
    page.getByRole("link", { name: "Send an enquiry" }).first(),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Business page sections" })
      .getByRole("link", { name: "Contact" }),
  ).toBeVisible();
});

'''
if text.count(anchor) != 1:
    raise SystemExit("browser test insertion anchor changed")
path.write_text(text.replace(anchor, insert + anchor, 1))
Path("browser-debug.txt").unlink(missing_ok=True)
Path("browser-debug.html").unlink(missing_ok=True)
