import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("has no automatically detectable accessibility violations", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test("has no automatically detectable violations at 390x844", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "One deterministic mobile axe scan is sufficient",
  );
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/", { waitUntil: "networkidle" });
  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
