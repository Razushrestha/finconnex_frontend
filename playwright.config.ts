import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL?.trim() || "http://localhost:3000";
// Only skip auto-start when explicitly set — otherwise Playwright boots the app.
const skipWebServer = process.env.E2E_SKIP_WEBSERVER === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts|public\.spec\.ts|auth-guard\.spec\.ts/,
    },
    {
      name: "public",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /public\.spec\.ts|auth-guard\.spec\.ts/,
      // Serial + one worker avoids Turbopack cold-compile 404 races.
      fullyParallel: false,
      workers: 1,
    },
  ],
  webServer: skipWebServer
    ? undefined
    : {
        command: process.env.CI
          ? "npx next start -p 3000"
          : "npx next dev -p 3000",
        url: `${baseURL}/login`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
