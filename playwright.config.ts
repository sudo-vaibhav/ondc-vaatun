import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, ".env") });

// For local development, use localhost
// For CI/ngrok testing, use the SUBSCRIBER_ID domain
const useNgrok = process.env.USE_NGROK === "true" || process.env.CI;
const baseURL = useNgrok
  ? `https://${
      process.env.SUBSCRIBER_ID ||
      (() => {
        throw new Error(
          "SUBSCRIBER_ID is not defined in environment variables"
        );
      })()
    }`
  : "http://localhost:3000";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel - disabled to avoid ngrok rate limits */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Limit workers to avoid ngrok rate limits (360 req/min) */
  workers: process.env.CI ? 1 : 2,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [["html", { open: "never" }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Skip ngrok browser warning page */
    extraHTTPHeaders: {
      "ngrok-skip-browser-warning": "true",
    },
  },

  /* Configure projects - only Chromium to reduce test time and avoid ngrok rate limits */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },

    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: useNgrok
    ? {
        command: "pnpm build && pnpm start & pnpm ngrok",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      }
    : {
        command: "pnpm dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
