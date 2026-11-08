import { gzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";

/**
 * Performance budgets for the public pages (docs/90-lean-pages.md).
 *
 * A production build measured every page at about 300 KB of HTML (80 KB
 * compressed) because the whole message catalogue was embedded in it, and 270
 * KB of CSS because routes loaded each other's stylesheets. These checks keep
 * both from creeping back. Budgets are deliberately loose (about 2x today) so
 * ordinary content growth does not trip them; a regression to the old shape
 * exceeds them several times over.
 */
const routes = [
  "/",
  "/businesses",
  "/events",
  "/map",
  "/search?q=heating",
  "/b/cwm-coil-heating",
];

const HTML_GZIP_BUDGET = 40 * 1024;
const CSS_RAW_BUDGET = 160 * 1024;

for (const path of routes) {
  test(`stays within budget: ${path}`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    const html = await response.text();

    // The strings are no longer part of the document.
    expect(html).not.toContain("homex.needEyebrow");
    expect(gzipSync(html).length).toBeLessThan(HTML_GZIP_BUDGET);

    const stylesheets = [
      ...new Set(
        [...html.matchAll(/href="(\/_next\/static\/[^"]+\.css)"/g)].map(
          (match) => match[1] as string,
        ),
      ),
    ];
    let cssBytes = 0;
    for (const href of stylesheets) {
      cssBytes += (await (await request.get(href)).body()).length;
    }
    expect(cssBytes).toBeLessThan(CSS_RAW_BUDGET);
  });
}

test("the message catalogue is one immutable, shared script", async ({
  request,
}) => {
  const first = await (await request.get("/events")).text();
  const second = await (await request.get("/businesses")).text();
  const address = /src="(\/i18n\/en\.[0-9a-f]{12}\.js)"/.exec(first)?.[1];
  expect(address).toBeTruthy();
  expect(second).toContain(`src="${address}"`);

  const script = await request.get(address as string);
  expect(script.status()).toBe(200);
  expect(script.headers()["cache-control"]).toContain("immutable");
  expect(await script.text()).toContain("__OURVALLEYS_MESSAGES__");
});

test("changing language needs no reload and keeps the page working", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  let loads = 0;
  page.on("load", () => (loads += 1));

  await page.goto("/events", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Find your next local event.",
    }),
  ).toBeVisible();
  const loadsBefore = loads;

  await page
    .getByRole("button", { name: /Cymraeg/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Dewch o hyd i’ch digwyddiad lleol nesaf.",
    }),
  ).toBeVisible();
  // Client components switch too, well inside the 3 s after which the page
  // would fall back to reloading (so a reload would fail this check).
  await expect(page.getByRole("group", { name: "Iaith" })).toBeVisible({
    timeout: 2000,
  });
  expect(loads).toBe(loadsBefore);

  await page
    .getByRole("button", { name: /English/ })
    .first()
    .click();
  await expect(page.getByRole("group", { name: "Language" })).toBeVisible({
    timeout: 2000,
  });
  expect(loads).toBe(loadsBefore);
  expect(failures).toEqual([]);
});
