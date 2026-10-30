import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/admin-session";

const title = "A test story for automated checks";
const slug = "a-test-story-for-automated-checks";

test("a signed-out visitor cannot reach the local news studio", async ({
  page,
}) => {
  const response = await page.goto("/admin/stories/new");
  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByLabel("Headline")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
});

test("a story that does not exist is a not-found page", async ({ page }) => {
  // Like the other detail pages, a missing story renders the not-found page
  // behind the streaming loading boundary, so it is kept out of search instead.
  await page.goto("/news/no-such-story-anywhere");
  await expect(page).toHaveTitle(/Story not found/);
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("a platform admin can write, preview, publish and withdraw a local story", async ({
  page,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(
    !email || !password,
    "This journey requires an ephemeral provisioned admin account.",
  );

  page.on("dialog", (dialog) => void dialog.accept());
  await signInAsAdmin(page, email!, password!);

  // Clear a leftover from an earlier failed run.
  await page.goto("/admin/stories");
  await expect(page.getByRole("heading", { name: "Local news" })).toBeVisible();
  for (;;) {
    const leftover = page.getByRole("link", { name: title });
    if ((await leftover.count()) === 0) break;
    const row = page.getByRole("row").filter({ has: leftover.first() });
    const draftDelete = row.getByRole("button", { name: /^Delete draft/ });
    if ((await draftDelete.count()) === 0) {
      const toDraft = row.getByRole("button", { name: /^Move to draft/ });
      if ((await toDraft.count()) > 0) await toDraft.click();
      else await row.getByRole("button", { name: /^Restore to draft/ }).click();
      await expect(page.getByRole("status")).toContainText("draft");
      await page.reload();
      continue;
    }
    await draftDelete.click();
    await expect(page.getByRole("status")).toContainText("was deleted");
    await page.reload();
  }

  await page.getByRole("link", { name: "Write a story" }).click();
  await expect(page).toHaveURL(/\/admin\/stories\/new$/);

  await page.getByLabel("Headline", { exact: true }).fill(title);
  await expect(page.getByLabel("Web address")).toHaveValue(slug);
  await page
    .getByLabel("Summary", { exact: true })
    .fill("A story created by an automated check of the local news studio.");

  // A body that is too short is refused with a plain message.
  await page.getByLabel("Story text", { exact: true }).fill("Too short.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.locator('[role="alert"]', { hasText: "Story text is too short" }),
  ).toBeVisible();

  await page
    .getByLabel("Story text", { exact: true })
    .fill(
      "The first paragraph says what happened in the valley today.\n\n## Why it matters\nThe second paragraph says why it matters, <b>with no markup</b>.",
    );
  await page
    .getByLabel("Sponsorship note (optional)")
    .fill("Supplied by the library service.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/stories\/[0-9a-f-]{36}\?created=1/);
  await expect(page.getByText("Story created and saved.")).toBeVisible();

  // Preview shows text only.
  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(
    page.getByRole("heading", { name: title, level: 1 }),
  ).toBeVisible();
  await expect(
    page.locator("#story-panel-preview").getByText("<b>with no markup</b>"),
  ).toBeVisible();

  // Not public while a draft.
  expect(await (await page.request.get(`/news/${slug}`)).text()).toContain(
    "Story not found",
  );

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Published.")).toBeVisible();

  const published = await page.goto(`/news/${slug}`);
  expect(published?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: title, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Why it matters", level: 2 }),
  ).toBeVisible();
  // Markup typed by an author is shown as text, never run.
  await expect(page.locator("article b")).toHaveCount(0);
  expect(
    (
      await page
        .locator('script[type="application/ld+json"]')
        .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ""))
    ).join(" "),
  ).toContain("NewsArticle");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);

  // Mobile: no horizontal scroll.
  await page.setViewportSize({ width: 390, height: 800 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto("/news");
  const block = page.getByTestId("local-stories");
  await expect(block).toContainText(title);
  // Sponsored stories are labelled in the list as well as on the page.
  await expect(block).toContainText("Sponsored");
  await block.getByRole("link", { name: title }).click();
  await expect(page).toHaveURL(new RegExp(`/news/${slug}$`));

  // Withdrawing it removes the page and the news-page entry.
  await page.goto("/admin/stories");
  const row = page.getByRole("row").filter({ hasText: title });
  await row.getByRole("button", { name: /^Move to draft/ }).click();
  await expect(page.getByRole("status")).toContainText("was moved to draft");
  expect(await (await page.request.get(`/news/${slug}`)).text()).toContain(
    "Story not found",
  );

  await page.reload();
  await page
    .getByRole("row")
    .filter({ hasText: title })
    .getByRole("button", { name: /^Delete draft/ })
    .click();
  await expect(page.getByRole("status")).toContainText("was deleted");
});
