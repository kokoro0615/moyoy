import { expect, test } from "@playwright/test";

const requiredViewports = [
  { height: 900, label: "1440x900", width: 1440 },
  { height: 1024, label: "768x1024", width: 768 },
  { height: 844, label: "390x844", width: 390 },
] as const;

test("serves a non-indexable static foundation without production assets", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()}`);
  });

  const response = await page.goto("/", { waitUntil: "networkidle" });

  expect(response?.status()).toBe(200);
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.locator('main[data-foundation-only="true"]')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(page.locator("img, picture, video")).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

test("disallows crawlers until production content is approved", async ({ request }) => {
  const response = await request.get("/robots.txt");

  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Disallow: /");
});

for (const viewport of requiredViewports) {
  test(`keeps the foundation bounded at ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const response = await page.goto("/", { waitUntil: "networkidle" });

    expect(response?.status()).toBe(200);
    await expect(page.locator('main[data-foundation-only="true"]')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
