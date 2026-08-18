/* eslint-disable @typescript-eslint/no-require-imports -- LHCI 0.15.1 loads this configuration as CommonJS. */
const { chromium } = require("@playwright/test");

module.exports = {
  ci: {
    collect: {
      chromePath: chromium.executablePath(),
      numberOfRuns: 3,
      puppeteerLaunchOptions: {
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      },
      puppeteerScript: "scripts/lhci-puppeteer.cjs",
      settings: {
        preset: "desktop",
      },
      startServerCommand: "corepack pnpm start:test",
      startServerReadyPattern: "Ready in|Ready",
      startServerReadyTimeout: 120_000,
      url: ["http://127.0.0.1:4173/"],
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:performance": ["error", { minScore: 0.9 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "total-blocking-time": ["error", { maxNumericValue: 200 }],
      },
    },
    upload: {
      outputDir: "artifacts/lhci",
      target: "filesystem",
    },
  },
};
