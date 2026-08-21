import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import sharp from "sharp";

import { openMenu } from "../support/menu";

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

/**
 * Safari 26 dropped `theme-color` for two heuristic modes at each window edge: with no
 * qualifying `position: fixed` or `sticky` box there, the bar stays translucent and the
 * page shows through it; with one, the bar is filled opaquely with a colour sampled from
 * it. DA-MEDIA-01 runs photography to both edges, so the fill is a band across the
 * artwork and the page wants the translucent mode.
 *
 * `.chapter-photo-pin` would supply the fill on its own — it is `position: fixed; inset: 0`,
 * exactly window-sized, and a CSS mask does not affect hit testing, so it answers the edge
 * hit test even where its silhouette is transparent. `.chrome-shield` takes that hit and
 * fails the candidate test, and because the sampler then walks the lineage of the box it
 * hit, the walk ends at `html` without ever reaching the plate.
 *
 * This asserts the predicate WebKit applies, not the result: `fixedContainerEdges()` and
 * `containerEdgeCandidateResult()` in Source/WebCore/page/LocalFrameView.cpp. Playwright
 * has no native browser chrome and never runs that Cocoa path, so a green run means the
 * page cannot supply an edge colour — never that the bars look right on a device. The
 * companion half, that the shields paint nothing, is the visual suite: they are absent
 * from every baseline. See docs/ios26-tint-root-cause.md.
 */
async function readEdgeCandidates(page: Page) {
  return page.evaluate(() => {
    // `sampleRectMargin` in LocalFrameView.cpp: the sampled point is the midpoint of
    // each edge, inset by this much.
    const MARGIN = 4;
    // `compareWithViewportSize()`: below this share of the window on a side the box is
    // `Smaller`, and a box that is `Smaller` on both is `TooSmall` — not a candidate.
    const MINIMUM_RATIO = 0.9;

    const isViewportConstrained = (element: Element) => {
      const position = getComputedStyle(element).position;
      return position === "fixed" || position === "sticky";
    };

    return (["top", "bottom"] as const).map((edge) => {
      const x = window.innerWidth / 2;
      const y = edge === "top" ? MARGIN : window.innerHeight - MARGIN;

      // The sampler's first pass carries `IgnoreCSSPointerEventsProperty`, which
      // `elementFromPoint` cannot. The shields are `pointer-events: none`, so the
      // property is lifted for the read and restored immediately after it.
      const shields = [...document.querySelectorAll<HTMLElement>(".chrome-shield")];
      const restore = shields.map((shield) => shield.style.pointerEvents);
      for (const shield of shields) shield.style.pointerEvents = "auto";
      const hit = document.elementFromPoint(x, y);
      for (const [index, shield] of shields.entries()) {
        shield.style.pointerEvents = restore[index];
      }

      // What the sampler would find: the first fixed or sticky box in the lineage of
      // the box it hit that is not `Smaller` on both axes.
      let candidate: string | null = null;
      for (
        let element: Element | null = hit;
        element;
        element = element.parentElement
      ) {
        if (!isViewportConstrained(element)) continue;
        const box = element.getBoundingClientRect();
        const narrow = box.width < window.innerWidth * MINIMUM_RATIO;
        const short = box.height < window.innerHeight * MINIMUM_RATIO;
        if (narrow && short) continue;
        candidate = element.className || element.tagName;
        break;
      }

      const shield = document.querySelector<HTMLElement>(
        `.chrome-shield[data-edge="${edge}"]`,
      );
      const box = shield?.getBoundingClientRect();
      const style = shield ? getComputedStyle(shield) : null;
      return {
        background: style?.backgroundColor ?? "",
        candidate,
        coversPoint: Boolean(
          box && box.left <= x && box.right >= x && box.top <= y && box.bottom >= y,
        ),
        // The sampled point is 4 px inside a rect the iOS UI process supplies, which
        // need not be where CSS `bottom: 0` lands. The shield straddles the edge so it
        // does not have to be.
        overhangsEdge:
          edge === "top"
            ? Boolean(box && box.top <= -50)
            : Boolean(box && box.bottom >= window.innerHeight + 50),
        position: style?.position ?? "",
        smallerOnBothAxes: Boolean(
          box &&
          box.width < window.innerWidth * MINIMUM_RATIO &&
          box.height < window.innerHeight * MINIMUM_RATIO,
        ),
        takesTheHit: hit === shield,
      };
    });
  });
}

function expectNoEdgeCandidate(
  edges: Awaited<ReturnType<typeof readEdgeCandidates>>,
  situation: string,
) {
  for (const [index, edge] of (["top", "bottom"] as const).entries()) {
    const state = edges[index];
    const where = `${edge} edge ${situation}`;
    expect(state.position, `${where}: shield is viewport-fixed`).toBe("fixed");
    expect(state.coversPoint, `${where}: shield covers the sampled point`).toBe(true);
    expect(state.overhangsEdge, `${where}: shield straddles the window edge`).toBe(
      true,
    );
    expect(state.takesTheHit, `${where}: shield takes the edge hit`).toBe(true);
    // Without a background the shield is `IsHiddenOrTransparent`, which sets
    // `retryHonoringPointerEvents` — and that retry steps over it to the plate.
    expect(state.background, `${where}: shield declares a background`).not.toBe(
      "rgba(0, 0, 0, 0)",
    );
    expect(
      state.smallerOnBothAxes,
      `${where}: shield is TooSmall rather than a candidate`,
    ).toBe(true);
    expect(state.candidate, `${where}: nothing qualifies as a fixed edge`).toBeNull();
  }
}

test("offers Safari no colour for either browser bar", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/", { waitUntil: "networkidle" });

  // The plate only reaches the window edges once a chapter is on screen, and the failure
  // this guards against is per-scroll-position, so the sweep is the one the tint check
  // used: two samples inside each surface the page presents, clear of the seams.
  for (const offset of [0, 800, 2800, 3200, 3800, 4200, 4600, 5000]) {
    await page.evaluate((y) => window.scrollTo(0, y), offset);
    await page.waitForTimeout(80);
    expectNoEdgeCandidate(await readEdgeCandidates(page), `at scrollY ${offset}`);
  }
});

/**
 * VF-47. The same predicate with the drawer open, which is the state that used to break
 * it. A modal `<dialog>` is in the top layer, above every z-index on the page including
 * the shield's, and on a phone the panel covers the midpoint of both window edges — the
 * single point the sampler hit-tests. Being full-height and part-width it is then
 * `IsSidebar`, a candidate, and both bars filled with the drawer's olive for as long as
 * the menu was open. The drawer is opened with `show()` instead, so it takes its declared
 * `z-index: 100` and the shields keep the hit in both states.
 *
 * The sweep is by viewport rather than by scroll offset: the panel's share of the window
 * is what decides whether it reaches the sampled point, and the body is scroll-locked
 * while it is open. 390 is the reported device, 320 the narrowest supported window, and
 * 768 one where the 250 px panel does not reach the midpoint at all.
 */
test("offers Safari no colour for either browser bar with the menu open", async ({
  page,
}) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo(0, 3800));
    await page.waitForTimeout(80);

    await openMenu(page);
    await expect(
      page.locator("dialog#site-menu[open][data-state='open']"),
    ).toBeVisible();

    expectNoEdgeCandidate(await readEdgeCandidates(page), `at ${width} px, menu open`);

    // The other half of the fix, which a hit test cannot observe: a modal dialog also puts
    // a `::backdrop` over both edges, and WebKit reads that through
    // `containerResultFromBackdrop()`, which sets `isDimmingLayer` and with it the
    // `preferExistingColor` branch that freezes the bars. `:modal` matches only a dialog
    // opened with `showModal()`, so this is the direct assertion that it was not.
    expect(
      await page.evaluate(() =>
        document.querySelector("dialog#site-menu")!.matches(":modal"),
      ),
      `${width} px: drawer is not in the top layer`,
    ).toBe(false);
  }
});
