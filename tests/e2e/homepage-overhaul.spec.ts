import { expect, test } from "@playwright/test";

test("homepage presents one connected local discovery story", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Local life should feel joined up." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: /Home & trades Local help for jobs at home/,
    }),
  ).toHaveAttribute("href", "/businesses?q=plumbing");
  await expect(
    page.getByRole("heading", { name: "Ideas for the days ahead" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Explore the Valleys by area." }),
  ).toBeVisible();
  await expect(
    page.getByText("Event previews use the public lifecycle projection.", {
      exact: false,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", {
      name: "View Fictional home-heating question session",
    }),
  ).toHaveAttribute("href", "/events/00000000-0000-4000-8000-000000001201");
  await expect(
    page
      .locator("#areas")
      .getByRole("link", { name: /Aberdare.*Explore area/ }),
  ).toHaveAttribute("href", "/places/aberdare");
  await expect(
    page.getByRole("link", { name: /Independent coffee across the Valleys/ }),
  ).toHaveAttribute("href", "/guides/independent-coffee-across-the-valleys");
});

test("profile-to-website story remains navigable", async ({ page }) => {
  await page.goto("/");

  const businessStory = page.locator("#for-business");
  await expect(
    businessStory.getByText("Maintain one profile", { exact: true }),
  ).toBeVisible();
  await expect(
    businessStory.getByText("Appear across local discovery", { exact: true }),
  ).toBeVisible();
  await expect(
    businessStory.getByText("Publish a polished website", { exact: true }),
  ).toBeVisible();
  await expect(
    businessStory.getByRole("link", { name: "View the full demonstration" }),
  ).toHaveAttribute("href", "/b/cwm-coil-heating");
});

test("each guide shows the picture for its own subject", async ({ page }) => {
  await page.goto("/");
  const guides = page.locator("#guides");
  const pictureOf = (name: RegExp) =>
    guides.getByRole("link", { name }).locator("img").getAttribute("src");
  // These were once assigned by position, which put the café on the walk.
  expect(await pictureOf(/Valley trails for a clear day/)).toContain(
    "guide-trails",
  );
  expect(await pictureOf(/Independent coffee across the Valleys/)).toContain(
    "guide-coffee",
  );
  expect(await pictureOf(/A practical afternoon in Porth/)).toContain(
    "guide-place",
  );
  await expect(
    guides.getByRole("link", { name: /Valley trails for a clear day/ }),
  ).toContainText("5 minute read");
});

test("section headings keep their 'all' link beside them on a wide screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  for (const [heading, link] of [
    ["Ideas for the days ahead", "All events"],
    ["Useful local guides", "All guides"],
  ] as const) {
    const headingBox = (await page
      .getByRole("heading", { name: heading })
      .boundingBox())!;
    const linkBox = (await page
      .getByRole("link", { name: link, exact: true })
      .boundingBox())!;
    // Beside the heading (to its right, overlapping its row), not under it.
    expect(linkBox.x).toBeGreaterThan(headingBox.x + headingBox.width);
    expect(linkBox.y).toBeLessThan(headingBox.y + headingBox.height);
  }
});

test("the homepage says what visitors can rely on and invites a business into a free slot", async ({
  page,
}) => {
  await page.goto("/");
  const promises = page.getByRole("list", { name: "What you can rely on" });
  await expect(promises.getByRole("listitem")).toHaveCount(4);
  await expect(promises).toContainText("Free to browse");
  await expect(promises).toContainText("Your location stays on your device.");

  const recent = page.locator("section[aria-labelledby='home-new-title']");
  const slots = await recent.getByRole("listitem").count();
  // Three slots: real businesses first, the invitation only when one is free.
  expect(slots).toBeLessThanOrEqual(3);
  const invite = recent.getByRole("link", { name: "List your business" });
  if ((await invite.count()) > 0) {
    await expect(invite).toHaveAttribute("href", "/account/new-business");
    await expect(
      recent.getByRole("link", { name: "Know a good one? Suggest it" }),
    ).toHaveAttribute("href", "/suggest-a-business");
  }

  await expect(
    page
      .locator("#for-business")
      .getByRole("link", { name: "List your business free" }),
  ).toHaveAttribute("href", "/account/new-business");
});

test("the homepage footer reaches every public section and switches language", async ({
  page,
}) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  const explore = footer.getByRole("navigation", {
    name: "Explore OurValleys",
  });
  for (const [name, href] of [
    ["Businesses", "/businesses"],
    ["Places", "/places"],
    ["Map", "/map"],
    ["Events", "/events"],
    ["Offers", "/offers"],
    ["Guides", "/guides"],
    ["News", "/news"],
  ] as const) {
    await expect(
      explore.getByRole("link", { name, exact: true }),
    ).toHaveAttribute("href", href);
  }
  await expect(
    footer.getByRole("link", { name: "Suggest a business" }),
  ).toHaveAttribute("href", "/suggest-a-business");
  await expect(footer.getByRole("link", { name: /Back to top/ })).toBeVisible();

  // The active language is readable on the dark footer (it once vanished).
  const active = footer.locator("button[aria-pressed='true']");
  await expect(active).toBeVisible();
  const colours = await active.evaluate((element) => ({
    label: getComputedStyle(element.querySelector("span")!).color,
    button: getComputedStyle(element).color,
  }));
  expect(colours.label).toBe(colours.button);
});
