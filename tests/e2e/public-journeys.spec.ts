import { expect, test } from "@playwright/test";

const demoBusinessId = "00000000-0000-4000-8000-000000000401";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`business discovery is responsive at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/businesses");
    await expect(
      page.getByRole("heading", { name: "Find something useful nearby." }),
    ).toBeVisible();
    await expect(page.getByText("Cwm & Coil Heating")).toBeVisible();
    await expect(
      page.getByText("Fictional demo", { exact: true }).first(),
    ).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });

  test(`generated business website is responsive at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/b/cwm-coil-heating");
    await expect(
      page.getByText("Fictional demonstration business."),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Cwm & Coil Heating",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("Boiler care visits")).toBeVisible();
    await expect(page.getByText("Serving Tonypandy")).toBeVisible();
    await expect(page.getByText("Not independently verified")).toBeVisible();
    await expect(page.getByText("Powered by OurValleys")).toBeVisible();
    const businessHeader = page.getByRole("banner");
    await expect(
      businessHeader.getByRole("link", { name: /Cwm & Coil Heating/ }),
    ).toBeVisible();
    await expect(
      businessHeader.getByRole("link", { name: "OurValleys home" }),
    ).toHaveCount(0);
    const businessNavigation = businessHeader.getByRole("navigation", {
      name: "Business page sections",
    });
    await expect(
      businessNavigation.getByRole("link", { name: "About" }),
    ).toBeVisible();
    await expect(
      businessNavigation.getByRole("link", { name: "Services" }),
    ).toBeVisible();
    await expect(
      businessNavigation.getByRole("link", { name: "Gallery" }),
    ).toHaveCount(0);
    await expect(
      businessNavigation.getByRole("link", { name: "Location" }),
    ).toBeVisible();
    await expect(
      businessNavigation.getByRole("link", { name: "Hours" }),
    ).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
}

test("published site renders the structured Phases 7-9 content", async ({
  request,
}) => {
  const response = await request.get("/b/cwm-coil-heating");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain("Free fictional heating check conversation");
  expect(html).toContain("Fictional home-heating question session");
  expect(html).toContain("Demonstration boiler-care visit");
  expect(html).toContain("Example areas covered");
  expect(html).toContain("Send an enquiry");
});

test("the generated business website supports keyboard bypass navigation", async ({
  page,
}) => {
  await page.goto("/b/cwm-coil-heating", { waitUntil: "networkidle" });
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page.locator("#business-skip-target")).toBeFocused();
});

test("directory keyboard order reaches search with visible focus", async ({
  page,
}) => {
  await page.goto("/businesses");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  const homeLink = page
    .getByRole("banner")
    .getByRole("link", { name: "OurValleys home", exact: true });
  const query = page.getByLabel("What do you need?");
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(homeLink).toBeFocused();
  for (let step = 0; step < 6; step += 1) {
    const focused = await query.evaluate(
      (element) => element === document.activeElement,
    );
    if (focused) break;
    await page.keyboard.press("Tab");
  }
  await expect(query).toBeFocused();
  expect(
    await query.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe("none");
});

test("directory has a useful zero-results state", async ({ page }) => {
  await page.goto("/businesses?q=no-such-service");
  await expect(
    page.getByRole("heading", { name: "No businesses match these filters." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Clear search" })).toBeVisible();
});

test("business enquiry is private, consented and purpose-specific", async ({
  page,
}) => {
  await page.goto("/b/cwm-coil-heating/contact?kind=enquiry");
  await expect(
    page.getByRole("heading", { name: "Contact Cwm & Coil Heating" }),
  ).toBeVisible();
  await page.getByLabel("Your name").fill("Fictional Browser Visitor");
  await page.getByLabel("Email address").fill("browser.visitor@example.test");
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill(
      "Please send fictional information for the automated browser journey.",
    );
  await page
    .getByLabel(/I agree that OurValleys may send this message/)
    .check();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Cwm & Coil Heating has received your message.",
    }),
  ).toBeVisible();
});

test("events are syndicated from one business source", async ({ request }) => {
  const response = await request.get("/events");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain("Upcoming local events.");
  expect(html).toContain("Fictional home-heating question session");
  expect(html).toContain("Cwm &amp; Coil Heating");
});

test("published businesses expose a stable printable QR code", async ({
  page,
  request,
}) => {
  await page.goto("/b/cwm-coil-heating/qr");
  await expect(
    page.getByRole("heading", { name: "QR code for Cwm & Coil Heating" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /QR code linking/ }),
  ).toBeVisible();
  const image = await request.get("/b/cwm-coil-heating/qr/image");
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toContain("image/svg+xml");
  expect(await image.text()).toContain("<svg");
});

test("published businesses provide an evidence-rich claim route", async ({
  page,
}) => {
  await page.goto(`/claim/${demoBusinessId}`);
  await expect(
    page.getByRole("heading", { name: "Request access to Cwm & Coil Heating" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Your connection to the business"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit ownership claim" }),
  ).toBeVisible();
});

test("unpublished or unknown businesses render a private not-found state", async ({
  page,
}) => {
  await page.goto("/b/not-a-published-business");
  await expect(
    page.getByRole("heading", {
      name: "This published business page does not exist.",
    }),
  ).toBeVisible();
  const robots = await page
    .locator('meta[name="robots"]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("content") ?? ""),
    );
  expect(robots.length).toBeGreaterThan(0);
  expect(robots.every((directive) => directive.includes("noindex"))).toBe(true);
});
