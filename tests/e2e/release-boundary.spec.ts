import { expect, test } from "@playwright/test";
import sharp from "sharp";

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

/**
 * Both artboards are resolved against the viewport with `zoom`, so the single invariant
 * that proves the canvas reached the window is that the artboard starts at x 0 and is
 * exactly as wide as the viewport. When the ratio behind `zoom` fails to compute — which
 * is what shipping Safari did with the `atan2()` form this replaced — the artboard falls
 * back to its authored 375 px / 1200 px width and `margin-inline: auto` centres it, so
 * the whole page gains a paper gutter down both edges. This runs on every engine because
 * the failure was engine-specific and invisible to a Chromium-only check.
 */
for (const width of [360, 375, 390, 402, 430, 639, 720, 768, 1200, 1440, 2560]) {
  test(`resolves the artboard against the full ${width}px window`, async ({ page }) => {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/", { waitUntil: "networkidle" });

    const measurement = await page.evaluate(() => {
      const box = document.querySelector(".page-artboard")!.getBoundingClientRect();
      return { left: box.x, viewport: window.innerWidth, width: box.width };
    });

    expect(measurement.left, `${width}px left gutter`).toBeCloseTo(0, 0);
    expect(measurement.width, `${width}px artboard width`).toBeCloseTo(
      measurement.viewport,
      0,
    );
  });
}

/**
 * DA-MEDIA-01 pins each chapter photograph with a real `position: fixed` plate inside a
 * masked window. WebKit stops applying that mask to the composited layer once the window
 * scrolls out of view, which painted the chapter photograph across the paper hero and
 * bled the chapter tone into the strips iOS Safari draws its toolbars over. The window
 * now carries an explicit `clip-path`, and the check is a pixel read rather than a
 * geometry read because the defect was in compositing, not in layout.
 */
for (const viewport of [
  { height: 844, label: "390x844", width: 390 },
  { height: 900, label: "1440x900", width: 1440 },
]) {
  test(`holds every chapter plate inside its window at ${viewport.label}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "networkidle" });

    const frame = await page.screenshot({
      clip: {
        height: 120,
        width: Math.min(160, viewport.width),
        x: 0,
        y: Math.round(viewport.height * 0.35),
      },
    });
    const { channels } = await sharp(frame).removeAlpha().stats();
    const [red, green, blue] = channels.map((channel) => channel.mean);

    // The paper ground is #ece7d8; the darkest chapter tone behind the plate is #12281d.
    expect(red, `${viewport.label} red`).toBeGreaterThan(200);
    expect(green, `${viewport.label} green`).toBeGreaterThan(195);
    expect(blue, `${viewport.label} blue`).toBeGreaterThan(180);
  });
}
