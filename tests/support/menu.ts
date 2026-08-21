import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const invokerSelector = "button[data-fidelity-action='open-menu']";
const openDrawerSelector = "dialog#site-menu[open]";

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

/**
 * Opening the drawer and waiting for it to settle.
 *
 * The retry is not a wait for the page to be ready — it is a wait for the *press* to be
 * delivered. Measured against the production build in WebKit at 768 x 844, in one or two
 * of every ten loads a press dispatched immediately after `networkidle` landed on `<html>`
 * while the release a few milliseconds later landed on `.menu-control-visual`; because the
 * two targets differ, the `click` was then dispatched at their common ancestor, so the
 * invoker never received one. `openMenu` never ran, no exception was raised anywhere, and
 * the drawer simply stayed shut. Playwright's own actionability check passes immediately
 * before this happens, and so does an explicit `elementFromPoint` precondition on the
 * control's own centre — both were tried, and neither closed it: what is stale is the
 * press, not the assertion in front of it. Any added instrumentation slowed the loop
 * enough to hide it, which is the signature of a dispatch-timing race in synthetic input
 * and not of anything a reader can reach at tapping speed.
 *
 * Re-pressing is safe and cannot mask a broken drawer. `openMenu` in the component returns
 * early once `dialog.open` is set, the invoker is inside the `inert` shell for as long as
 * the drawer is up, and the guard below only presses again while no open drawer exists.
 * Every caller still asserts the drawer's own state afterwards.
 */
export async function openMenu(page: Page) {
  const invoker = page.locator(invokerSelector);
  const drawer = page.locator(openDrawerSelector);
  await expect(async () => {
    if ((await drawer.count()) === 0) await invoker.click({ timeout: 5_000 });
    await expect(drawer).toBeAttached({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  await settleMenu(page);
}
