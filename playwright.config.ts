import { existsSync } from "fs";
import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const PRE_INSTALLED_CHROMIUM = "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use this container's pre-installed Chromium build rather than
        // downloading one that matches the installed @playwright/test
        // version exactly. Harmless if the path doesn't exist (e.g. CI),
        // in which case Playwright falls back to its own managed browser.
        launchOptions: {
          executablePath: existsSync(PRE_INSTALLED_CHROMIUM) ? PRE_INSTALLED_CHROMIUM : undefined,
        },
      },
    },
  ],
});
