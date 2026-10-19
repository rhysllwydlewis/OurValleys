import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/admin-session";

const slug = "a-test-guide-for-automated-checks";

function reviewDate(): string {
  return `${new Date().getUTCFullYear() + 1}-06-01`;
}

test("a platform admin can write, preview, publish, reorder and archive a guide in the studio", async ({
  page,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(
    !email || !password,
    "This journey requires an ephemeral provisioned admin account.",
  );

  // Taking a live guide offline asks for confirmation.
  page.on("dialog", (dialog) => void dialog.accept());
  await signInAsAdmin(page, email!, password!);

  // Move a leftover from an earlier failed run out of the way so the web
  // address is free.
  await page.goto("/admin/guides");
  await expect(page.getByRole("heading", { name: "Guides" })).toBeVisible();
  for (;;) {
    const leftover = page.getByRole("link", {
      name: "A test guide for automated checks",
    });
    if ((await leftover.count()) === 0) break;
    await leftover.first().click();
    await page.waitForURL(/\/admin\/guides\/[0-9a-f-]{36}/);
    const archive = page.getByRole("button", { name: "Archive", exact: true });
    if ((await archive.count()) > 0) {
      await archive.click();
      await expect(
        page.getByText("Archived. It is no longer public."),
      ).toBeVisible();
    }
    await page.getByLabel("Web address").fill(`leftover-${Date.now()}`);
    await page
      .getByLabel("Title", { exact: true })
      .fill("Archived leftover guide");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await page.goto("/admin/guides");
  }

  await page.getByRole("link", { name: "Write a new guide" }).click();
  await expect(page).toHaveURL(/\/admin\/guides\/new$/);

  await page
    .getByLabel("Title", { exact: true })
    .fill("A test guide for automated checks");
  await expect(page.getByLabel("Web address")).toHaveValue(slug);
  await page
    .getByLabel("Summary")
    .fill(
      "A guide created by an automated end-to-end check of the guides studio.",
    );
  await page.getByLabel("Area", { exact: true }).fill("Automated test area");
  await page.getByLabel("Author").fill("Automated test author");
  await page.getByLabel("Review by").fill(reviewDate());

  const first = page.getByRole("listitem", { name: /^Section 1/ });
  await first.getByLabel("Heading").fill("The first stop");
  await first
    .getByLabel("Text")
    .fill(
      "Begin on the high street.\n\nThen walk to the park and look around for a while.",
    );
  await first
    .getByLabel("Link to a page on this site (optional)")
    .fill("//evil.example");
  await first.getByLabel("Link wording").fill("Go there");

  // A refused save names the section and the field instead of a vague error.
  await page.getByRole("button", { name: "Create guide" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Not saved" }),
  ).toContainText("Section 1 link must be a path on this site");

  await first
    .getByLabel("Link to a page on this site (optional)")
    .fill("/businesses");
  await page.getByRole("button", { name: "Add a section" }).click();
  const second = page.getByRole("listitem", { name: /^Section 2/ });
  await second.getByLabel("Heading").fill("The second stop");
  await second
    .getByLabel("Text")
    .fill("Stop for a drink somewhere independent and ask what is good.");
  await page.getByRole("button", { name: "Add a local tip" }).click();
  const third = page.getByRole("listitem", { name: /^Section 3/ });
  await third.getByLabel("Heading").fill("Ask about the house special");
  await third
    .getByLabel("Text")
    .fill("Most independent places have a favourite they are proud of.");

  // The checklist is live: every required check is met.
  await expect(page.getByText("Every required check passes.")).toBeVisible();

  await page.getByRole("button", { name: "Create guide" }).click();
  await expect(page).toHaveURL(/\/admin\/guides\/[0-9a-f-]{36}(\?created=1)?$/);
  await expect(page.getByText("Saved.")).toBeVisible();

  // The preview shows the edit before it is saved.
  await page
    .getByLabel("Title", { exact: true })
    .fill("A test guide for automated checks");
  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(
    page.getByRole("heading", { name: "The first stop" }),
  ).toBeVisible();
  await expect(
    page
      .locator("#guide-panel-preview")
      .getByText("Local tip", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Write" }).click();

  // Unsaved edits are guarded: an in-app link asks before leaving, and
  // declining keeps the editor (and the text) where it is.
  await page
    .getByLabel("Summary")
    .fill(
      "A guide created by an automated end-to-end check of the guides studio. Edited.",
    );
  const prompts: string[] = [];
  page.removeAllListeners("dialog");
  page.on("dialog", (dialog) => {
    prompts.push(dialog.message());
    void dialog.dismiss();
  });
  await page.getByRole("link", { name: "Guides", exact: true }).first().click();
  await expect.poll(() => prompts.length).toBe(1);
  expect(prompts[0]).toContain("unsaved changes");
  await expect(page).toHaveURL(/\/admin\/guides\/[0-9a-f-]{36}/);
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "A test guide for automated checks",
  );
  page.removeAllListeners("dialog");
  page.on("dialog", (dialog) => void dialog.accept());

  // Reordering is announced and changes the order of the sections.
  await page.getByRole("button", { name: /Move “The second stop” up/ }).click();
  await expect(page.getByText("moved to position 1 of 3")).toBeAttached();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(
    page.getByText("Published. Readers can see it now."),
  ).toBeVisible();

  await page.goto(`/guides/${slug}`);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "A test guide for automated checks",
    }),
  ).toBeVisible();
  const contents = page.getByRole("navigation", { name: "In this guide" });
  await expect(contents.getByRole("listitem")).toHaveText([
    "The second stop",
    "The first stop",
    "Ask about the house special",
  ]);
  await expect(page.getByText("Local tip", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Go there/ })).toHaveAttribute(
    "href",
    "/businesses",
  );
  await expect(page.locator('a[href*="evil.example"]')).toHaveCount(0);
  expect(await page.content()).toContain('"@type":"Article"');

  await page.goto("/admin/guides");
  await page
    .getByRole("button", {
      name: "Archive: “A test guide for automated checks”",
    })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "was archived" }),
  ).toBeVisible();

  await page.goto(`/guides/${slug}`);
  await expect(
    page.getByRole("heading", { name: "We could not find that page." }),
  ).toBeVisible();

  // A brand-new guide fails the required checks, so there is nothing to publish.
  await page.goto("/admin/guides/new");
  await expect(
    page.getByText("4 required checks need attention."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish" })).toHaveCount(0);

  // At phone width the studio does not overflow and passes an axe scan.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Title", { exact: true })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((item) => item.id)).toEqual([]);
});

test("the studio is not shown to a signed-out visitor", async ({
  browser,
  baseURL,
}) => {
  const anonymous = await browser.newContext({ baseURL: baseURL! });
  const anonymousPage = await anonymous.newPage();
  const response = await anonymousPage.goto("/admin/guides/new");
  expect(response?.status()).toBeLessThan(500);
  await expect(
    anonymousPage.getByRole("button", { name: "Create guide" }),
  ).toHaveCount(0);
  await anonymous.close();
});
