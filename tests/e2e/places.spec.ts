import { expect, test } from "@playwright/test";

test("the places directory groups places by council area with business counts", async ({
  page,
}) => {
  await page.goto("/places");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Start with somewhere local.",
    }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("list", { name: "Coverage at a glance" })
      .or(page.getByLabel("Coverage at a glance")),
  ).toBeVisible();

  // The founding area is open and shows the seeded business against Tonypandy.
  await expect(
    page.getByRole("heading", { level: 2, name: "Rhondda Cynon Taf" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Tonypandy, 1 business$/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Treorchy, No businesses yet$/ }),
  ).toBeVisible();

  // Areas with no businesses yet are collapsed until opened.
  const torfaen = page.locator("details", {
    has: page.getByRole("heading", { level: 2, name: "Torfaen" }),
  });
  await expect(torfaen).not.toHaveAttribute("open", "");
  await torfaen.locator("summary").click();
  await expect(torfaen).toHaveAttribute("open", "");
});

test("searching finds a place by name, Welsh name or alias and can be cleared", async ({
  page,
}) => {
  await page.goto("/places");
  await page.getByLabel("Find a place").fill("tonypandy");
  await page.getByRole("button", { name: "Find" }).click();
  await expect(page).toHaveURL(/\/places\?q=tonypandy/);
  await expect(
    page.getByRole("heading", { level: 2, name: "1 place" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Tonypandy, 1 business$/ }),
  ).toBeVisible();
  // Search results say where the place sits.
  await expect(
    page.getByText("Rhondda Cynon Taf · Rhondda Fawr"),
  ).toBeVisible();

  await page.getByRole("link", { name: "Remove search tonypandy" }).click();
  await expect(page).toHaveURL(/\/places$/);

  await page.goto("/places?q=zzzzqqqq");
  await expect(
    page.getByRole("heading", { name: "No places match your search." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Clear the filters" }).click();
  await expect(page).toHaveURL(/\/places$/);
});

test("filters keep each other and unknown values are ignored", async ({
  page,
}) => {
  await page.goto("/places?active=1");
  await expect(
    page.getByRole("link", { name: /^Tonypandy, 1 business$/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /^Treorchy/ })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Remove the businesses-only filter" }),
  ).toBeVisible();

  await page
    .getByRole("navigation", { name: "Jump to a council area" })
    .getByRole("link", { name: "Torfaen" })
    .click();
  await expect(page).toHaveURL(/area=torfaen/);
  await expect(page).toHaveURL(/active=1/);

  const response = await page.goto("/places?area=%2e%2e%2fetc&q=%25");
  expect(response?.status()).toBe(200);
});

test("a valley page includes the businesses in the towns inside it", async ({
  page,
}) => {
  await page.goto("/places/rhondda-fawr");
  await expect(
    page.getByRole("heading", { level: 1, name: "Rhondda Fawr" }),
  ).toBeVisible();
  const trail = page.getByRole("navigation", { name: "Where this place sits" });
  await expect(
    trail.getByRole("link", { name: "Rhondda Cynon Taf" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Places in Rhondda Fawr" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "Cwm & Coil Heating" }),
  ).toBeVisible();
  await expect(page.getByText("In Tonypandy")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "See it on the map" }),
  ).toHaveAttribute("href", "/map?place=rhondda-fawr");

  // A sibling valley does not claim the business.
  await page.goto("/places/rhondda-fach");
  await expect(
    page.getByRole("heading", { level: 3, name: "Cwm & Coil Heating" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Suggest a business" }),
  ).toBeVisible();
});

test("the directory place filter widens to the places inside it", async ({
  page,
}) => {
  await page.goto("/businesses?place=rhondda-cynon-taf");
  await expect(
    page.getByRole("link", { name: /Cwm & Coil Heating/ }).first(),
  ).toBeVisible();
});

test("the places pages work in Welsh and without horizontal scrolling on a phone", async ({
  page,
  context,
}) => {
  const baseURL = test.info().project.use.baseURL;
  if (!baseURL) throw new Error("A base URL is required.");
  await context.addCookies([{ name: "ov-locale", value: "cy", url: baseURL }]);
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/places");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Dechreuwch gyda rhywle lleol.",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Dod o hyd i le")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Tonypandy, 1 busnes$/ }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  await page.goto("/places/rhondda-fawr");
  await expect(page.getByText("Lleoedd yn Rhondda Fawr")).toBeVisible();
});
