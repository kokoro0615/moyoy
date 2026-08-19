import { expect, test } from "@playwright/test";

const requiredViewports = [
  { height: 900, label: "1440x900", width: 1440 },
  { height: 1024, label: "768x1024", width: 768 },
  { height: 844, label: "390x844", width: 390 },
  { height: 900, label: "200%-reflow-720px", width: 720 },
  { height: 844, label: "400%-reflow-360px", width: 360 },
] as const;

test("serves the static production candidate without opening release boundaries", async ({
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
  await expect(
    page.locator("main[data-page='moyoy-lp'][data-ready='true']"),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(page.getByText("NEWS", { exact: true })).toHaveCount(0);
  // DA-ASSET-01 ships the Adobe Fonts kit named in the source. The kit only answers
  // origins registered in the Adobe Fonts web project, so an unregistered build origin
  // gets one 412 and falls back to the local subsets. That single, self-clearing
  // response is the only third-party console entry this release tolerates; registering
  // the deploy origin removes it. See docs/open-questions.md Q-05.
  const kitDomainAuthorisation = /412|use\.typekit\.net/;
  expect(consoleErrors.filter((entry) => !kitDomainAuthorisation.test(entry))).toEqual(
    [],
  );
  expect(failedRequests.filter((entry) => !kitDomainAuthorisation.test(entry))).toEqual(
    [],
  );
});

test("disallows crawlers before explicit production release", async ({ request }) => {
  const response = await request.get("/robots.txt");

  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Disallow: /");
});

for (const viewport of requiredViewports) {
  test(`has no horizontal page overflow at ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const response = await page.goto("/", { waitUntil: "networkidle" });

    expect(response?.status()).toBe(200);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
