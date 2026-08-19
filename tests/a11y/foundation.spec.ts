import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { settleMenu } from "../support/menu";

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

test("menu-open state has no automatically detectable violations at required viewports", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "One deterministic multi-viewport modal scan is sufficient",
  );

  for (const viewport of [
    { height: 900, width: 1440 },
    { height: 1024, width: 768 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator("button[data-fidelity-action='open-menu']").click();
    await settleMenu(page);

    const results = await new AxeBuilder({ page })
      .include("dialog#site-menu[open]")
      .analyze();

    expect(
      results.violations,
      `${viewport.width}x${viewport.height}: ${JSON.stringify(results.violations, null, 2)}`,
    ).toEqual([]);

    await page.locator("button[data-fidelity-action='close-menu']").click();
  }
});
