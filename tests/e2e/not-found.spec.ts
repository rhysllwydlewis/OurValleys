import { expect, test } from "@playwright/test";

test("an unknown route renders the on-brand OurValleys 404 page", async ({
  page,
}) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);

  await expect(page.getByRole("banner")).toBeVisible();
  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", { name: "We could not find that page." }),
  ).toBeVisible();

  await expect(main.getByRole("link", { name: "Return home" })).toHaveAttribute(
    "href",
    "/",
  );
  await expect(
    main.getByRole("link", { name: "Browse businesses" }),
  ).toHaveAttribute("href", "/businesses");

  await main.getByRole("link", { name: "Browse businesses" }).click();
  await expect(page).toHaveURL(/\/businesses$/);
});
