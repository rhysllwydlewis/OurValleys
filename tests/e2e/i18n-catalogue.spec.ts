import { expect, test } from "@playwright/test";

// The message catalogue is a script the page loads from `/i18n/<locale>.<hash>.js`.
// If it reaches the browser unreadable (for example compressed with no
// `Content-Encoding` header, which Next.js 16.4.5 and later cause when a route
// handler sets its own), every translation is missing, the page cannot hydrate
// and it reloads in a loop. Unit tests call the route in isolation and cannot
// see that, so this goes through the real server.
test.describe("message catalogue delivery", () => {
  test("reaches the browser intact, whatever encodings it accepts", async ({
    page,
    request,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/");
    const source = await page
      .locator('script[src^="/i18n/"]')
      .first()
      .getAttribute("src");
    expect(source).toMatch(/^\/i18n\/[a-z]{2}\.[0-9a-f]{12}\.js$/);

    // Playwright decodes by the response's own `Content-Encoding`; a body that
    // is still compressed after that, or a header that is missing, shows up as
    // text that does not start with the script.
    for (const encoding of ["identity", "gzip", "br", "gzip, deflate, br"]) {
      const response = await request.get(source ?? "", {
        headers: { "accept-encoding": encoding },
      });
      expect(response.ok(), encoding).toBe(true);
      expect(await response.text(), encoding).toMatch(
        /^\(globalThis\.__OURVALLEYS_MESSAGES__=/,
      );
    }

    // The page itself ran the script and started cleanly.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const store = (
            globalThis as unknown as {
              __OURVALLEYS_MESSAGES__?: Record<string, unknown>;
            }
          ).__OURVALLEYS_MESSAGES__;
          return Object.keys(store ?? {});
        }),
      )
      .toContain("en");
    expect(errors).toEqual([]);
  });
});
