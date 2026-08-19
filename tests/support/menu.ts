import type { Page } from "@playwright/test";

/**
 * The drawer's open and close transitions are owned by CSS (`@starting-style` plus
 * `transition-behavior: allow-discrete`), so a click returns before the panel has
 * arrived. Geometry, accessibility and capture checks must observe the settled frame,
 * not an intermediate one.
 */
export async function settleMenu(page: Page) {
  await page.locator("dialog#site-menu").evaluate(async (dialog) => {
    await Promise.all(
      dialog.getAnimations({ subtree: true }).map((animation) => animation.finished),
    );
  });
}
