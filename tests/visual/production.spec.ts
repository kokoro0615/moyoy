import { expect, test, type Page } from "@playwright/test";

import { settleMenu } from "../support/menu";

const chapters = ["root", "dusk", "dawn", "alpine"] as const;
const viewports = [
  { height: 900, label: "1440x900", width: 1440 },
  { height: 1024, label: "768x1024", width: 768 },
  { height: 844, label: "390x844", width: 390 },
] as const;

const states = [
  { id: "top", selector: null },
  ...chapters.map((chapter) => ({
    id: chapter,
    selector: `section#${chapter}`,
  })),
  { id: "footer", selector: "footer[data-fidelity='footer']" },
] as const;

async function waitForFrame(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    [...document.images]
      .filter((image) => {
        const rect = image.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight;
      })
      .every((image) => image.complete && image.naturalWidth > 0),
  );
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images]
        .filter((image) => {
          const rect = image.getBoundingClientRect();
          return rect.bottom > 0 && rect.top < window.innerHeight;
        })
        .map((image) => image.decode()),
    );
  });
}

for (const viewport of viewports) {
  for (const state of states) {
    test(`matches the production ${state.id} frame at ${viewport.label}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/", { waitUntil: "load" });
      await page.addStyleTag({
        content:
          "*,*::before,*::after{animation:none!important;caret-color:transparent!important;scroll-behavior:auto!important;transition:none!important}",
      });

      if (state.selector) {
        await page.locator(state.selector).scrollIntoViewIfNeeded();
      } else {
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      await waitForFrame(page);

      await expect(page).toHaveScreenshot(
        `production-${viewport.label}-${state.id}.png`,
        {
          animations: "disabled",
          caret: "hide",
          fullPage: false,
        },
      );
    });
  }
}

for (const viewport of viewports) {
  test(`matches the production menu-open frame at ${viewport.label}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "load" });
    await page.addStyleTag({
      content:
        "*,*::before,*::after{animation:none!important;caret-color:transparent!important;scroll-behavior:auto!important;transition:none!important}",
    });
    await page.locator("button[data-fidelity-action='open-menu']").click();
    await settleMenu(page);
    await waitForFrame(page);

    await expect(page).toHaveScreenshot(`production-${viewport.label}-menu-open.png`, {
      animations: "disabled",
      caret: "hide",
      fullPage: false,
    });
  });
}
