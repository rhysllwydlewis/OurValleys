import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/admin-session";

const title = "A scheduled story for automated checks";
const slug = "a-scheduled-story-for-automated-checks";

/** A UK wall-clock `YYYY-MM-DDTHH:mm` some minutes from now. */
function londonInput(minutesAhead: number): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(Date.now() + minutesAhead * 60_000))
    .replace(" ", "T");
}

test("an admin can schedule a story, see it stay private, and cancel", async ({
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
  for (;;) {
    const leftover = page.getByRole("link", { name: title });
    if ((await leftover.count()) === 0) break;
    const row = page.getByRole("row").filter({ has: leftover.first() });
    const draftDelete = row.getByRole("button", { name: /^Delete draft/ });
    if ((await draftDelete.count()) === 0) {
      await row.getByRole("button", { name: /^Archive/ }).click();
      await page.reload();
      await row.getByRole("button", { name: /^Restore to draft/ }).click();
      await page.reload();
      continue;
    }
    await draftDelete.click();
    await expect(page.getByRole("status")).toContainText("was deleted");
    await page.reload();
  }

  await page.goto("/admin/stories/new");
  // The schedule and picture panels need a saved story.
  await expect(page.getByLabel("Go live at (UK time)")).toHaveCount(0);
  await page.getByLabel("Headline", { exact: true }).fill(title);
  await page
    .getByLabel("Summary", { exact: true })
    .fill("A story created to check scheduling in the news studio.");
  await page
    .getByLabel("Story text", { exact: true })
    .fill(
      "The first paragraph says what will happen in the valley soon.\n\nThe second paragraph says why that matters to people who live here.",
    );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/stories\/[0-9a-f-]{36}\?created=1/);

  // Too soon is refused with a plain message and the story stays a draft.
  const when = page.getByLabel("Go live at (UK time)");
  await when.fill(londonInput(2));
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(
    page.locator('[role="alert"]', { hasText: "at least 10 minutes" }),
  ).toBeVisible();

  // A valid time schedules it; it stays private.
  await when.fill(londonInput(180));
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(page.getByRole("status").first()).toContainText("Scheduled");
  await page.reload();
  await expect(page.getByText(/Goes live/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish now", exact: true }),
  ).toBeVisible();
  expect(await (await page.request.get(`/news/${slug}`)).text()).toContain(
    "Story not found",
  );

  // The list says it is scheduled.
  await page.goto("/admin/stories");
  await expect(page.getByRole("row").filter({ hasText: title })).toContainText(
    "Scheduled",
  );

  // The picture panel explains itself and refuses a missing file.
  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(page.getByRole("group", { name: "Picture" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Upload picture" }),
  ).toHaveCount(0);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);

  // Mobile: no horizontal scroll in the studio.
  await page.setViewportSize({ width: 390, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(0);
  await page.setViewportSize({ width: 1280, height: 800 });

  // Cancel the schedule, then delete the draft.
  await page.getByRole("button", { name: "Cancel schedule" }).click();
  await expect(page.getByRole("status").first()).toContainText("draft");
  await page.goto("/admin/stories");
  await page
    .getByRole("row")
    .filter({ hasText: title })
    .getByRole("button", { name: /^Delete draft/ })
    .click();
  await expect(page.getByRole("status")).toContainText("was deleted");
});
