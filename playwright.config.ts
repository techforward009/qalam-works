import { defineConfig, devices } from "@playwright/test";

// Use PLAYWRIGHT_CHROMIUM_PATH when explicitly set (e.g. sandbox CI),
// otherwise let Playwright resolve its own installed browser.
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const launchOptions = CHROMIUM
  ? { executablePath: CHROMIUM, args: ["--no-sandbox", "--disable-setuid-sandbox"] }
  : { args: ["--no-sandbox", "--disable-setuid-sandbox"] };

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    launchOptions,
  },
  projects: [
    {
      name: "desktop-chrome",
      use: {
        viewport: { width: 1280, height: 800 },
        launchOptions,
      },
    },
    {
      name: "mobile-android",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 393, height: 851 },
        isMobile: true,
        launchOptions,
      },
    },
  ],
  webServer: {
    command: "npm run build && npm start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
