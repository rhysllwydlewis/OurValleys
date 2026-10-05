import { expect, test } from "@playwright/test";

test("directory search offers keyboard-operable suggestions", async ({
  page,
}) => {
  await page.goto("/businesses");
  const input = page.getByRole("combobox", { name: "What do you need?" });
  await input.fill("cwm coil");

  const listbox = page.getByRole("listbox", { name: "Search suggestions" });
  await expect(listbox).toBeVisible();
  await expect(
    listbox.getByRole("option", { name: /Cwm & Coil Heating/ }),
  ).toBeVisible();
  await expect(input).toHaveAttribute("aria-expanded", "true");

  await input.press("Escape");
  await expect(listbox).toBeHidden();

  await input.press("ArrowDown");
  await expect(listbox).toBeVisible();
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/b\/cwm-coil-heating/);
});

test("the plain search form still submits without choosing a suggestion", async ({
  page,
}) => {
  await page.goto("/businesses");
  const input = page.getByRole("combobox", { name: "What do you need?" });
  await input.fill("heating");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/businesses\?.*q=heating/);
});

test("homepage search suggestions are not clipped by the glass bar", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("combobox", {
    name: "What are you looking for?",
  });
  await input.fill("tonypandy");
  const option = page
    .getByRole("listbox", { name: "Search suggestions" })
    .getByRole("option")
    .first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(page).toHaveURL(/\/places\/tonypandy/);
});
