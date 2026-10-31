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

  // The reader journey around the story: archive, feed, homepage, place filter.
  await page.goto("/news/archive");
  await expect(
    page.getByRole("heading", { name: "Local news archive", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  await expect(page.getByText("Sponsored").first()).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("lang", "en-GB");
  const archiveAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(archiveAxe.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(0);
  await page.setViewportSize({ width: 1280, height: 800 });

  const feed = await page.request.get("/news/feed.xml");
  expect(feed.status()).toBe(200);
  expect(feed.headers()["content-type"]).toContain("atom+xml");
  const feedXml = await feed.text();
  expect(feedXml).toContain(title);
  expect(feedXml).toContain(`/news/${slug}`);

  await page.goto("/");
  await expect(page.getByTestId("home-stories")).toContainText(title);

  // Withdrawing it removes the page and the news-page entry.
  await page.goto("/admin/stories");
  const row = page.getByRole("row").filter({ hasText: title });
  await row.getByRole("button", { name: /^Move to draft/ }).click();
  await expect(page.getByRole("status")).toContainText("was moved to draft");
  expect(await (await page.request.get(`/news/${slug}`)).text()).toContain(
    "Story not found",
  );
  expect(await (await page.request.get("/news/feed.xml")).text()).not.toContain(
    slug,
  );

  await page.reload();
  await page
    .getByRole("row")
    .filter({ hasText: title })
    .getByRole("button", { name: /^Delete draft/ })
    .click();
  await expect(page.getByRole("status")).toContainText("was deleted");
});

test("the story archive survives mangled links and offers a feed", async ({
  page,
}) => {
  for (const query of [
    "?page=abc",
    "?page=-4&place=%3Cscript%3E",
    "?place=no-such-place",
    "?page=99999",
  ]) {
    const response = await page.goto(`/news/archive${query}`);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "Local news archive", level: 1 }),
    ).toBeVisible();
  }
  await page.goto("/news/archive");
  await expect(
    page.locator('link[rel="alternate"][type="application/atom+xml"]'),
  ).toHaveAttribute("href", /\/news\/feed\.xml$/);
  const feed = await page.request.get("/news/feed.xml");
  expect(feed.status()).toBe(200);
  expect(await feed.text()).toContain(
    '<feed xmlns="http://www.w3.org/2005/Atom">',
  );
});

test("a platform admin can schedule a story, see it held back, and cancel the schedule", async ({
  page,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(
    !email || !password,
    "This journey requires an ephemeral provisioned admin account.",
  );
  const scheduledTitle = "A scheduled story for automated checks";
  const scheduledSlug = "a-scheduled-story-for-automated-checks";

  page.on("dialog", (dialog) => void dialog.accept());
  await signInAsAdmin(page, email!, password!);

  // Clear a leftover from an earlier failed run.
  await page.goto("/admin/stories");
  for (;;) {
    const leftover = page.getByRole("link", { name: scheduledTitle });
    if ((await leftover.count()) === 0) break;
    const row = page.getByRole("row").filter({ has: leftover.first() });
    const draftDelete = row.getByRole("button", { name: /^Delete draft/ });
    if ((await draftDelete.count()) === 0) {
      await row
        .getByRole("button", { name: /^(Cancel schedule|Move to draft)/ })
        .first()
        .click();
      await expect(page.getByRole("status")).toContainText("draft");
      await page.reload();
      continue;
    }
    await draftDelete.click();
    await expect(page.getByRole("status")).toContainText("was deleted");
    await page.reload();
  }

  await page.goto("/admin/stories/new");
  await page.getByLabel("Headline", { exact: true }).fill(scheduledTitle);
  await page
    .getByLabel("Summary", { exact: true })
    .fill("A story used by an automated check of scheduled publishing.");
  await page
    .getByLabel("Story text", { exact: true })
    .fill(
      "The first paragraph says what will happen in the valley.\n\nThe second paragraph says why it matters to people nearby.",
    );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/stories\/[0-9a-f-]{36}\?created=1/);

  // A picture needs somewhere to be stored; without storage the studio says so
  // plainly instead of failing, and a description is still required.
  await page.getByLabel("Choose a picture").setInputFiles({
    name: "valley.png",
    mimeType: "image/png",
    buffer: Buffer.from("not really a picture"),
  });
  await expect(
    page.getByRole("button", { name: "Upload picture" }),
  ).toBeDisabled();
  await page.getByLabel("Describe the picture").fill("A view of the valley");
  await page.getByRole("button", { name: "Upload picture" }).click();
  await expect(page.getByRole("alert")).toContainText(
    /not set up|Could not|Describe|picture/i,
  );

  // A time in the past is refused; a time two days ahead is accepted.
  const fmt = (offsetMs: number) => {
    const at = new Date(Date.now() + offsetMs);
    const shifted = new Date(at.getTime() - at.getTimezoneOffset() * 60_000);
    return shifted.toISOString().slice(0, 16);
  };
  await page.getByLabel("Go live at").fill(fmt(-3_600_000));
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "at least five minutes from now",
  );
  await page.getByLabel("Go live at").fill(fmt(2 * 86_400_000));
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(page.getByRole("status").first()).toContainText("Scheduled for");
  await expect(page.getByText("Scheduled", { exact: true })).toBeVisible();

  // Held back from readers until its time.
  expect(
    await (await page.request.get(`/news/${scheduledSlug}`)).text(),
  ).toContain("Story not found");
  expect(await (await page.request.get("/news/feed.xml")).text()).not.toContain(
    scheduledSlug,
  );

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.goto("/admin/stories");
  const row = page.getByRole("row").filter({ hasText: scheduledTitle });
  await expect(row).toContainText("Goes live");
  await row.getByRole("button", { name: /^Cancel schedule/ }).click();
  await expect(page.getByRole("status")).toContainText("returned to draft");
  await page.reload();
  await page
    .getByRole("row")
    .filter({ hasText: scheduledTitle })
    .getByRole("button", { name: /^Delete draft/ })
    .click();
  await expect(page.getByRole("status")).toContainText("was deleted");
});
