import base from "./playwright.config";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  ...base,
  testDir: "/home/user/OurValleys/tests/e2e",
  use: {
    ...base.use,
    baseURL: "http://127.0.0.1:3000",
    launchOptions: { executablePath: "/opt/pw-browsers/chromium" },
  },
  reporter: [["line"]],
});
