import { expect, test } from "@playwright/test";

const regressionFrames = [
  { height: 900, snapshot: "foundation.png", width: 1440 },
  { height: 1024, snapshot: "foundation-768x1024.png", width: 768 },
  { height: 844, snapshot: "foundation-390x844.png", width: 390 },
] as const;

for (const frame of regressionFrames) {
  test(`matches the foundation regression at ${frame.width}x${frame.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(frame);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
    });
    await page.addStyleTag({
      content:
        "*,*::before,*::after{animation:none!important;caret-color:transparent!important;transition:none!important}",
    });

    await expect(page).toHaveScreenshot(frame.snapshot, {
      animations: "disabled",
      caret: "hide",
      fullPage: true,
    });
  });
}
