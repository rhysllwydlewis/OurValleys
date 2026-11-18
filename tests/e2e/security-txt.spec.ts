import { expect, test } from "@playwright/test";

test("security.txt is served as plain text with a contact and an expiry", async ({
  request,
}) => {
  const response = await request.get("/.well-known/security.txt");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");
  const body = await response.text();
  expect(body).toMatch(/^Contact: https:\/\//m);
  expect(body).toMatch(/^Expires: \d{4}-\d{2}-\d{2}T/m);
});
