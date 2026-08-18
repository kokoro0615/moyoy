import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4173";
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests",
  outputDir: "test-results",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.001,
    },
  },
  snapshotPathTemplate:
    "{testDir}/visual/__screenshots__/{arg}-{projectName}-{platform}{ext}",
  use: {
    baseURL,
    colorScheme: "light",
    locale: "ja-JP",
    screenshot: "only-on-failure",
    serviceWorkers: "block",
    timezoneId: "Asia/Tokyo",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "corepack pnpm start:test",
    reuseExistingServer: false,
    stderr: "pipe",
    stdout: "pipe",
    timeout: 120_000,
    url: `${baseURL}/robots.txt`,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { height: 900, width: 1440 } },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { height: 900, width: 1440 },
      },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"], viewport: { height: 900, width: 1440 } },
    },
    {
      name: "visual-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { height: 900, width: 1440 } },
    },
    {
      name: "fidelity-chromium",
      use: {
        ...devices["Desktop Chrome"],
        deviceScaleFactor: 1,
        locale: "ja-JP",
        timezoneId: "Asia/Tokyo",
        viewport: { height: 900, width: 1440 },
      },
    },
  ],
});
