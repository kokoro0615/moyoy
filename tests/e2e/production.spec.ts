import { expect, test, type Page } from "@playwright/test";

import { settleMenu } from "../support/menu";

const chapters = ["root", "dusk", "dawn", "alpine"] as const;

/**
 * Scroll and wait for the frame that follows it. The scroll-linked offsets are written
 * from a rAF loop and change on every frame, so a read taken in the same task samples
 * the previous scroll position.
 */
async function scrollAndSettle(page: Page, scrollY: number) {
  await page.evaluate(
    (y) =>
      new Promise<void>((resolve) => {
        window.scrollTo(0, y);
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
    scrollY,
  );
}

test("renders the approved production narrative and fidelity landmarks", async ({
  page,
}) => {
  const response = await page.goto("/", { waitUntil: "networkidle" });

  expect(response?.status()).toBe(200);
  await expect(
    page.locator("main[data-page='moyoy-lp'][data-ready='true']"),
  ).toBeVisible();
  await expect(page.locator('main[data-foundation-only="true"]')).toHaveCount(0);
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.locator("main h1")).toContainText("はじまる場所へ");

  for (const chapter of chapters) {
    await expect(
      page.locator(`section#${chapter}[data-chapter='${chapter}']`),
    ).toBeVisible();
  }

  await expect(page.locator("footer[data-fidelity='footer']")).toBeVisible();
  await expect(page.getByText("NEWS", { exact: true })).toHaveCount(0);
});

test("page artwork and chapter images fill required and wide viewports", async ({
  page,
}) => {
  for (const viewport of [
    { height: 1440, width: 2560 },
    { height: 900, width: 1440 },
    { height: 1024, width: 768 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "networkidle" });

    for (const selector of [
      ".page-canvas",
      ".page-artboard",
      ".chapter-root .chapter-photo",
      ".chapter-dusk .chapter-photo",
      ".chapter-dawn .chapter-photo",
      ".chapter-alpine .chapter-photo",
    ]) {
      const box = await page.locator(selector).boundingBox();
      expect(box?.x, selector).toBeCloseTo(0, 1);
      expect(box?.width, selector).toBeCloseTo(viewport.width, 1);
    }
  }
});

test("SP chapter photography covers the viewport without distorting the source", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "One deterministic geometry check is sufficient",
  );

  // DA-MEDIA-01 sizes each chapter photograph to the viewport so it can be held still
  // while the chapter scrolls. `object-fit: cover` is what keeps the source undistorted
  // now that the rendered box no longer carries the source aspect ratio.
  for (const width of [375, 390, 639]) {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/", { waitUntil: "networkidle" });

    for (const chapter of chapters) {
      const image = page.locator(`section#${chapter} .chapter-photo-pin img`);
      // The plate is viewport-fixed, so the section is what has to be scrolled to.
      await page.locator(`section#${chapter}`).scrollIntoViewIfNeeded();
      await image.evaluate((element: HTMLImageElement) => element.decode());
      const measurement = await image.evaluate((element: HTMLImageElement) => ({
        objectFit: getComputedStyle(element).objectFit,
        renderedHeight: element.getBoundingClientRect().height,
        renderedWidth: element.getBoundingClientRect().width,
      }));

      expect(measurement.objectFit, `${chapter} at ${width}px`).toBe("cover");
      expect(measurement.renderedWidth, `${chapter} at ${width}px`).toBeCloseTo(
        width,
        1,
      );
      expect(
        measurement.renderedHeight,
        `${chapter} at ${width}px`,
      ).toBeGreaterThanOrEqual(844);
    }
  }
});

test("below-fold chapter photographs are not fetched as CSS masks", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "One deterministic resource check is sufficient",
  );

  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(250);

  const loadedPhotos = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => /\/photo\/pc-(?:dusk|dawn|alpine)\.webp$/.test(name)),
  );
  expect(loadedPhotos).toEqual([]);

  const maskUrls = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".chapter-photo")].map(
      (element) => getComputedStyle(element).maskImage,
    ),
  );
  expect(maskUrls).toHaveLength(chapters.length);
  expect(maskUrls.every((url) => url.includes("/mask/mask-pc-"))).toBe(true);
});

test("wide chapter photography is never enlarged beyond its selected derivative", async ({
  browserName,
  page,
}) => {
  test.skip(browserName !== "chromium", "One deterministic asset check is sufficient");

  await page.setViewportSize({ height: 1440, width: 2560 });
  await page.goto("/", { waitUntil: "networkidle" });
  for (const chapter of chapters) {
    const image = page.locator(`section#${chapter} .chapter-photo-pin img`);
    // The plate is viewport-fixed, so the section is what has to be scrolled to.
    await page.locator(`section#${chapter}`).scrollIntoViewIfNeeded();
    await image.evaluate((element: HTMLImageElement) => element.decode());
    const dimensions = await image.evaluate((element: HTMLImageElement) => ({
      naturalWidth: element.naturalWidth,
      renderedWidth: element.getBoundingClientRect().width,
    }));

    expect(dimensions.naturalWidth, chapter).toBeGreaterThanOrEqual(
      Math.ceil(dimensions.renderedWidth),
    );
  }
});

test("wide artwork is full bleed before hydration", async ({ baseURL, browser }) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { height: 1440, width: 2560 },
  });
  const page = await context.newPage();

  try {
    await page.goto("/", { waitUntil: "load" });

    for (const selector of [
      ".page-artboard",
      ".chapter-root .chapter-photo",
      ".chapter-dusk .chapter-photo",
      ".chapter-dawn .chapter-photo",
      ".chapter-alpine .chapter-photo",
    ]) {
      const box = await page.locator(selector).boundingBox();
      expect(box?.x, selector).toBeCloseTo(0, 1);
      expect(box?.width, selector).toBeCloseTo(2560, 1);
    }
  } finally {
    await context.close();
  }
});

test("menu is a keyboard-safe modal and restores focus and scroll", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo(0, 600));
  const before = await page.evaluate(() => window.scrollY);
  const open = page.locator("button[data-fidelity-action='open-menu']");

  await open.focus();
  await page.keyboard.press("Enter");
  await settleMenu(page);

  const dialog = page.locator("dialog#site-menu[open][data-state='open']");
  await expect(dialog).toBeVisible();
  await expect(open).toHaveAttribute("aria-expanded", "true");
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(page.locator("[data-app-shell]")).toHaveAttribute("inert", "");
  await expect(page.locator("[data-fidelity-action='close-menu']")).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.locator("[data-fidelity-action='close-menu']")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("[data-fidelity-action='close-menu']")).toBeFocused();

  await page.keyboard.press("Escape");

  await expect(dialog).toHaveCount(0);
  await expect(open).toHaveAttribute("aria-expanded", "false");
  await expect(open).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(before);
});

test("menu drawer remains 250 CSS pixels at required viewports", async ({ page }) => {
  for (const viewport of [
    { height: 900, width: 1440 },
    { height: 1024, width: 768 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator("button[data-fidelity-action='open-menu']").click();
    await settleMenu(page);

    const box = await page.locator("dialog#site-menu[open]").boundingBox();
    expect(box?.width).toBe(250);
    expect(box?.x).toBe(viewport.width - 250);
    expect(box?.y).toBe(0);
    expect(Math.abs((box?.height ?? 0) - viewport.height)).toBeLessThan(0.1);

    await page.locator("[data-fidelity-action='close-menu']").click();
  }
});

test("menu invoker stays fixed at the page top on every viewport", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "One deterministic geometry check is sufficient",
  );

  // DA-NAV-01 「上部に固定表示」 carries two leaders in the source: one to the PC menu box
  // and one to the SP menu box, so the control is viewport-fixed at both.
  for (const expected of [
    { height: 900, scrollTo: 2199, top: 9.6, width: 1440 },
    { height: 1024, scrollTo: 2400, top: 8, width: 768 },
    { height: 844, scrollTo: 2493, top: 8, width: 390 },
  ]) {
    await page.setViewportSize({ height: expected.height, width: expected.width });
    await page.goto("/", { waitUntil: "networkidle" });
    const button = page.locator("button[data-fidelity-action='open-menu']");
    const label = `${expected.width}x${expected.height}`;

    expect((await button.boundingBox())?.y, label).toBeCloseTo(expected.top, 1);
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), expected.scrollTo);
    await expect(button, label).toBeInViewport();
    expect((await button.boundingBox())?.y, label).toBeCloseTo(expected.top, 1);
  }
});

test("menu artwork follows the approved PC and SP source bounds", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "One deterministic source-geometry check is sufficient",
  );

  for (const expected of [
    {
      height: 900,
      visual: { height: 21, width: 68.71, x: 1111.29, y: 20 },
      width: 1200,
    },
    {
      height: 844,
      visual: { height: 40.6, width: 26.15, x: 330.85, y: 20 },
      width: 375,
    },
  ]) {
    await page.setViewportSize(expected);
    await page.goto("/", { waitUntil: "networkidle" });

    const visual = await page
      .locator("[data-fidelity='menu-control-visual']")
      .boundingBox();

    expect(visual?.x).toBeCloseTo(expected.visual.x, 1);
    expect(visual?.y).toBeCloseTo(expected.visual.y, 1);
    expect(visual?.width).toBeCloseTo(expected.visual.width, 1);
    expect(visual?.height).toBeCloseTo(expected.visual.height, 1);
  }
});

test("hero and footer contours follow the PC and SP source geometry", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "One deterministic source-geometry check is sufficient",
  );

  for (const expected of [
    {
      footer: { width: 1064.96, x: 162.32, y: 8950.63 },
      height: 900,
      hero: { width: 1287.14, x: -74.14, y: -17.47 },
      width: 1200,
    },
    {
      footer: { width: 600.13, x: -49.37, y: 6112.81 },
      height: 844,
      hero: { width: 495.95, x: -104.02, y: -6.5 },
      width: 375,
    },
  ]) {
    await page.setViewportSize(expected);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });

    const hero = page.locator(".hero-contours");
    const heroBox = await hero.boundingBox();
    expect(heroBox?.x).toBeCloseTo(expected.hero.x, 1);
    expect(heroBox?.y).toBeCloseTo(expected.hero.y, 1);
    expect(heroBox?.width).toBeCloseTo(expected.hero.width, 1);
    expect(await hero.evaluate((element) => getComputedStyle(element).opacity)).toBe(
      "1",
    );

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const footer = page.locator(".footer-contours");
    const footerBox = await footer.boundingBox();
    expect(footerBox?.x).toBeCloseTo(expected.footer.x, 1);
    expect(
      (footerBox?.y ?? 0) + (await page.evaluate(() => window.scrollY)),
    ).toBeCloseTo(expected.footer.y, 1);
    expect(footerBox?.width).toBeCloseTo(expected.footer.width, 1);
    expect(await footer.evaluate((element) => getComputedStyle(element).opacity)).toBe(
      "1",
    );
  }
});

test("contour layers lag scroll by separate depths and reset under reduced motion", async ({
  browserName,
  page,
}) => {
  test.skip(browserName !== "chromium", "One deterministic motion check is sufficient");

  // DA-MOTION-02 is the lag; DA-MOTION-01 is the separation between the lines while it
  // lags. Both are only observable per layer, which is why each contour path ships as its
  // own file. Depths are recorded in docs/scroll-motion-spec.md.
  async function layerOffsets(selector: string) {
    return page.locator(selector).evaluate((stack) =>
      [...stack.querySelectorAll<HTMLElement>(".contour-layer")].map((layer) => {
        const transform = getComputedStyle(layer).transform;
        return transform === "none"
          ? 0
          : Number(new DOMMatrixReadOnly(transform).m42.toFixed(1));
      }),
    );
  }

  const descending = (values: number[]) =>
    values.every(
      (value, index) => index === 0 || Math.abs(value) < Math.abs(values[index - 1]),
    );

  await page.setViewportSize({ height: 900, width: 1200 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/", { waitUntil: "networkidle" });

  // The approved page-top frame is the authored composition, so the hero stack starts
  // exactly where the reference draws it.
  await expect.poll(() => layerOffsets(".hero-contours")).toEqual([0, 0, 0, 0]);

  await scrollAndSettle(page, 400);
  const early = await layerOffsets(".hero-contours");
  expect(early.every((offset) => offset > 0)).toBe(true);
  expect(descending(early)).toBe(true);
  // The in-stack spread is what makes the lines separate rather than move as one plane.
  expect(early[0] / early[3]).toBeGreaterThan(3);

  // VF-31: the previous drive model reached its cap early and then held one value for
  // the rest of the page, which is why the motion did not read. Every layer must still
  // be moving while its band is on screen.
  await scrollAndSettle(page, 900);
  const later = await layerOffsets(".hero-contours");
  for (const [index, offset] of later.entries()) {
    expect(offset).toBeGreaterThan(early[index] + 10);
  }

  const maximumScroll = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  await scrollAndSettle(page, maximumScroll - 300);
  const footerEarly = await layerOffsets(".footer-contours");
  expect(footerEarly.every((offset) => offset < 0)).toBe(true);
  expect(descending(footerEarly)).toBe(true);
  // The footer stack arrives at the authored composition exactly at the page end.
  await page.evaluate((scrollY) => window.scrollTo(0, scrollY), maximumScroll);
  await expect.poll(() => layerOffsets(".footer-contours")).toEqual([0, 0]);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => window.scrollTo(0, 400));
  await expect.poll(() => layerOffsets(".hero-contours")).toEqual([0, 0, 0, 0]);
  await page.evaluate((scrollY) => window.scrollTo(0, scrollY), maximumScroll - 300);
  await expect.poll(() => layerOffsets(".footer-contours")).toEqual([0, 0]);
});

test("the first-view line extends downwards on a slow loop and is static under reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1200 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/", { waitUntil: "networkidle" });

  const line = page.locator(".scroll-indicator-line");
  const timeline = await line.evaluate((element) => {
    const animation = element.getAnimations()[0];
    if (!animation) return null;
    const timing = animation.effect?.getComputedTiming();
    return {
      duration: Number(timing?.duration ?? 0),
      iterations: timing?.iterations ?? 0,
    };
  });
  expect(timeline?.duration).toBe(3200);
  expect(timeline?.iterations).toBe(Infinity);

  const scaleAt = (time: number) =>
    line.evaluate((element, currentTime) => {
      const animation = element.getAnimations()[0];
      animation.pause();
      animation.currentTime = currentTime;
      return new DOMMatrixReadOnly(getComputedStyle(element).transform).m22;
    }, time);

  expect(await scaleAt(0)).toBeCloseTo(0, 2);
  expect(await scaleAt(1600)).toBeCloseTo(1, 2);
  expect(await scaleAt(3199)).toBeCloseTo(0, 2);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "networkidle" });
  expect(await line.evaluate((element) => element.getAnimations().length)).toBe(0);
  const box = await line.boundingBox();
  expect(box?.height).toBeCloseTo(48.95, 1);
});

test("decorative objects drift relative to the document and reset under reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1200 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/", { waitUntil: "networkidle" });

  const offset = (selector: string) => () =>
    page
      .locator(selector)
      .evaluate((element) =>
        Number.parseFloat(
          getComputedStyle(element).getPropertyValue("--object-parallax-y"),
        ),
      );

  // Foreground objects lead the document while the contour system behind them lags, so
  // the page reads as three planes instead of one. The sign is therefore the opposite of
  // the contour layers.
  const brandCenter = offset(".brand-center");
  await page.evaluate(() => window.scrollTo(0, 700));
  await expect.poll(brandCenter).toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo(0, 2400));
  await expect.poll(brandCenter).toBeLessThan(0);

  // DA-MOTION-01: the three product drawings share one band, so each carries its own
  // depth and they separate against each other as the band passes. The offsets are
  // written from a rAF loop and now change on every frame, so the read has to wait for
  // the frame that follows the scroll rather than sampling the previous one.
  await scrollAndSettle(page, 1200);
  const drawings = await Promise.all(
    ["perfume-15", "perfume-50", "diffuser-500"].map((product) =>
      offset(`.product-${product} .product-drawing img`)(),
    ),
  );
  expect(new Set(drawings).size).toBe(3);
  expect(Math.abs(drawings[1])).toBeGreaterThan(Math.abs(drawings[0]));
  expect(Math.abs(drawings[0])).toBeGreaterThan(Math.abs(drawings[2]));

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => window.scrollTo(0, 700));
  await expect.poll(brandCenter).toBe(0);
});

test("the chapter plate is viewport-fixed and the photograph pans through its frame", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1200 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/", { waitUntil: "networkidle" });

  for (const chapter of chapters) {
    const section = page.locator(`section#${chapter}`);
    const plate = page.locator(`section#${chapter} .chapter-photo-pin`);
    const image = page.locator(`section#${chapter} .chapter-photo-pin img`);
    const mask = await page
      .locator(`section#${chapter} .chapter-photo`)
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return style.maskImage === "none" ? style.webkitMaskImage : style.maskImage;
      });
    expect(mask).toContain(chapter);
    // DA-MEDIA-01 is owned by the browser, not by a scroll listener.
    expect(await plate.evaluate((element) => getComputedStyle(element).position)).toBe(
      "fixed",
    );

    const top = await section.evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY,
    );
    const pans: number[] = [];
    const plateTops: number[] = [];
    const silhouettes: number[] = [];
    for (const factor of [-0.9, 0, 0.9]) {
      await page.evaluate(
        (scrollY) => window.scrollTo(0, Math.max(0, scrollY)),
        top + factor * 900,
      );
      await page.waitForTimeout(120);
      pans.push(
        await image.evaluate((element) =>
          Number.parseFloat(
            getComputedStyle(element).getPropertyValue("--chapter-pan-y"),
          ),
        ),
      );
      plateTops.push(
        await plate.evaluate((element) => element.getBoundingClientRect().top),
      );
      silhouettes.push(
        await section.evaluate(
          (element) => element.getBoundingClientRect().top + window.scrollY,
        ),
      );
    }
    // The plate never leaves the top of the viewport, whatever the scroll offset is.
    for (const plateTop of plateTops) expect(plateTop).toBeCloseTo(0, 1);
    // The photograph traverses its own hidden remainder in one direction only.
    expect(pans[1]).toBeLessThanOrEqual(pans[0]);
    expect(pans[2]).toBeLessThanOrEqual(pans[1]);
    expect(pans[2]).toBeLessThan(0);
    // The silhouette is a document-flow window; it does not move with the plate.
    expect(silhouettes[0]).toBeCloseTo(top, 1);
    expect(silhouettes[2]).toBeCloseTo(top, 1);
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => window.scrollTo(0, 4200));
  for (const chapter of chapters) {
    await expect
      .poll(() =>
        page
          .locator(`section#${chapter} .chapter-photo-pin img`)
          .evaluate((element) =>
            Number.parseFloat(
              getComputedStyle(element).getPropertyValue("--chapter-pan-y"),
            ),
          ),
      )
      .toBe(0);
    expect(
      await page
        .locator(`section#${chapter} .chapter-photo-pin`)
        .evaluate((element) => getComputedStyle(element).position),
    ).toBe("absolute");
  }
});

test("the viewport-wide chapter plates never intercept content outside their chapter", async ({
  page,
}) => {
  // Each plate is `position: fixed; inset: 0`, so all four cover the whole viewport at
  // every scroll offset. Only the silhouette mask keeps them from swallowing the hero,
  // the product copy and the footer, so hit testing has to be asserted, not assumed.
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto("/", { waitUntil: "networkidle" });

  const hitAt = (x: number, y: number) =>
    page.evaluate(
      ([px, py]) => {
        const element = document.elementFromPoint(px, py);
        return element ? !element.closest(".chapter-photo-pin") : false;
      },
      [x, y],
    );

  for (const scrollY of [0, 1200, 2000]) {
    await page.evaluate((value) => window.scrollTo(0, value), scrollY);
    await page.waitForTimeout(120);
    for (const [x, y] of [
      [720, 450],
      [400, 300],
      [1100, 700],
      [200, 800],
    ]) {
      expect(await hitAt(x, y), `${x},${y} at scrollY ${scrollY}`).toBe(true);
    }
  }

  // The hero prose stays selectable rather than sitting under a plate.
  await page.evaluate(() => window.scrollTo(0, 1150));
  await page.waitForTimeout(120);
  expect(
    await page
      .locator(".about-copy p span")
      .first()
      .evaluate((span) => {
        const box = span.getBoundingClientRect();
        const hit = document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        );
        return hit === span || span.contains(hit);
      }),
  ).toBe(true);
});

test("every chapter photograph is decoded before its chapter can reach the viewport", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "One deterministic loading check is sufficient",
  );

  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto("/", { waitUntil: "networkidle" });

  for (const chapter of chapters) {
    const top = await page
      .locator(`section#${chapter}`)
      .evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
    // Stop one viewport short of the chapter: the frame must already be there.
    await page.evaluate(
      (scrollY) => window.scrollTo(0, scrollY),
      Math.max(0, top - 900),
    );
    await expect
      .poll(
        () =>
          page
            .locator(`section#${chapter} .chapter-photo-pin img`)
            .evaluate(
              (element: HTMLImageElement) =>
                element.complete && element.naturalWidth > 0,
            ),
        { timeout: 15_000 },
      )
      .toBe(true);
  }
});

test("scroll-linked motion does not shift layout", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1200 });
  await page.goto("/", { waitUntil: "networkidle" });

  const geometry = async () =>
    page.evaluate(() =>
      [...document.querySelectorAll("section[id], footer[data-fidelity]")].map(
        (element) => {
          const box = element.getBoundingClientRect();
          return [
            element.id || "footer",
            Math.round(box.top + window.scrollY),
            Math.round(box.height),
          ];
        },
      ),
    );

  await page.emulateMedia({ reducedMotion: "reduce" });
  const still = await geometry();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.waitForTimeout(200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  expect(await geometry()).toEqual(still);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("the first-view scroll cue stays inside the window at every required viewport", async ({
  page,
}) => {
  // DA-GUIDE-PC-FV frames the PC first view as 1200 × 800 and DA-GUIDE-SP-FV frames the
  // SP first view as 375 × 667; in both the cue is flush with the bottom edge of that
  // frame. The artboard resolves against viewport width, so on any window that is not
  // the authored ratio the authored band is not the window — at 1440 × 900 the whole
  // 58 px rule used to begin exactly at the fold.
  for (const viewport of [
    { height: 900, width: 1440 },
    { height: 900, width: 1200 },
    { height: 1024, width: 768 },
    { height: 844, width: 390 },
    { height: 932, width: 430 },
    { height: 800, width: 1920 },
  ]) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });

    const box = await page.locator(".scroll-indicator").boundingBox();
    expect(box, `${viewport.width}×${viewport.height}`).not.toBeNull();
    expect(box!.y, `${viewport.width}×${viewport.height} top`).toBeGreaterThan(0);
    expect(
      box!.y + box!.height,
      `${viewport.width}×${viewport.height} bottom`,
    ).toBeLessThanOrEqual(viewport.height);
    // It must also stay clear of the brand rule above it.
    const rule = await page.locator(".brand-header").boundingBox();
    expect(box!.y).toBeGreaterThan(rule!.y + rule!.height);
  }
});

test("the fixed menu control stays legible where the surface stops being paper", async ({
  page,
}) => {
  for (const viewport of [
    { height: 900, width: 1440 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "networkidle" });

    const control = page.locator(".menu-open-button");
    const paint = () =>
      control.evaluate((element) => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, color: style.color };
      });

    // The control never paints a background at any scroll position; only its own colour
    // and halo change.
    const transparent = ["rgba(0, 0, 0, 0)", "transparent"];

    // Over the paper page it is the page ink with no halo — the approved page-top frame.
    await expect.poll(() => control.getAttribute("data-over-media")).toBe("false");
    let painted = await paint();
    expect(painted.color).toBe("rgb(17, 18, 15)");
    expect(transparent).toContain(painted.background);

    // The ROOT chapter box starts above the photograph the reader sees: the beige upper
    // foreground is painted over it, so the surface there is still paper and the control
    // must not invert.
    const foreground = await page.locator(".root-foreground").evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { bottom: box.bottom + window.scrollY, top: box.top + window.scrollY };
    });
    await page.evaluate(
      (y) => window.scrollTo(0, y),
      (foreground.top + foreground.bottom) / 2 - 100,
    );
    await expect
      .poll(() => control.getAttribute("data-over-media"), {
        message: `${viewport.width}px over the ROOT upper foreground`,
      })
      .toBe("false");

    // Over every chapter photograph it inverts to the paper colour and takes the halo the
    // page already uses for its own type over these frames.
    for (const chapter of chapters) {
      const top = await page
        .locator(`section#${chapter}`)
        .evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), top + 500);
      await expect
        .poll(() => control.getAttribute("data-over-media"), {
          message: `${viewport.width}px over ${chapter}`,
        })
        .toBe("true");
      await expect
        .poll(async () => (await paint()).color, {
          message: `${viewport.width}px control colour over ${chapter}`,
        })
        .toBe("rgb(236, 231, 216)");
      painted = await paint();
      expect(transparent, `${viewport.width}px over ${chapter}`).toContain(
        painted.background,
      );
      expect(
        await control.evaluate((element) => getComputedStyle(element).filter),
        `${viewport.width}px halo over ${chapter}`,
      ).toContain("drop-shadow");
    }
  }
});

test("every piece of decorative line artwork carries a scroll offset", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "One deterministic coverage check is sufficient",
  );

  // VF-38. The audit that produced this test found the two brand rules — the longest
  // lines on the page — with no scroll offset at all, and found that the hero's two
  // vertically-oriented contour lines were being translated along their own direction,
  // which is close to invisible. Both are covered here: every element must move, and a
  // line that runs down the page must move sideways.
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/", { waitUntil: "networkidle" });

  const selectors = [
    ".hero-contours .contour-layer",
    ".product-contours .contour-layer",
    ".footer-contours .contour-layer",
    ".brand-header",
    ".brand-center",
    ".brand-footer",
    ".product-drawing img",
    ".chapter-product",
  ];

  const sample = async () =>
    page.evaluate((list) => {
      const out: Record<string, string[]> = {};
      for (const selector of list) {
        out[selector] = [...document.querySelectorAll(selector)].map((element) => {
          const transform = getComputedStyle(element).transform;
          if (transform === "none") return "0,0";
          const matrix = new DOMMatrixReadOnly(transform);
          return `${matrix.m41.toFixed(1)},${matrix.m42.toFixed(1)}`;
        });
      }
      return out;
    }, selectors);

  const maximumScroll = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  const frames = [];
  for (const scrollY of [0, 700, 1400, 2600, 4200, 6200, 8200, maximumScroll]) {
    await scrollAndSettle(page, scrollY);
    frames.push(await sample());
  }

  for (const selector of selectors) {
    const count = frames[0][selector].length;
    expect(count, `${selector} present`).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      const seen = new Set(frames.map((frame) => frame[selector][index]));
      expect(seen.size, `${selector} [${index}] never moves`).toBeGreaterThan(1);
    }
  }

  // The hero's third and fourth contour lines run down the page, so their travel has to
  // carry a horizontal component or the displacement slides along the line itself.
  await scrollAndSettle(page, 1400);
  const heroX = await page.evaluate(() =>
    [...document.querySelectorAll(".hero-contours .contour-layer")].map((element) =>
      Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m41),
    ),
  );
  expect(heroX[0]).toBeLessThan(1);
  expect(heroX[1]).toBeLessThan(1);
  expect(heroX[2]).toBeGreaterThan(40);
  expect(heroX[3]).toBeGreaterThan(20);

  // The ROOT upper foreground is the one documented exception: it is the seam between the
  // paper page and the first photograph, and it is also the signal the control uses to
  // know which surface is behind it.
  const foregroundOffsets = new Set(
    await Promise.all(
      [0, 1400, 2600].map(async (scrollY) => {
        await scrollAndSettle(page, scrollY);
        return page
          .locator(".root-foreground")
          .evaluate((element) => getComputedStyle(element).transform);
      }),
    ),
  );
  expect([...foregroundOffsets]).toEqual(["none"]);

  // Reduced motion still returns the whole system to the authored composition.
  //
  // Polled rather than sampled after a fixed settle. The controller reacts to the media
  // change on its own animation frame, so a single read taken inside that frame sees the
  // transforms the page had a moment earlier — which made this check fail about one run in
  // three, on the unmodified baseline as well. The assertion is unchanged; only the wait
  // for it now depends on the page rather than on the machine.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await scrollAndSettle(page, 1400);
  for (const selector of selectors) {
    await expect
      .poll(async () => [...new Set((await sample())[selector])].sort().join("|"), {
        timeout: 5_000,
      })
      .toBe("0,0");
  }
});

test("the SP composition holds one scale, so type keeps its place on the artwork", async ({
  page,
}) => {
  // VF-34. The band used to size decorative artwork in `vw` while pinning type to the
  // authored 375 px offsets, so every width above 375 pulled the two apart. Measuring
  // the prose against the contour system it is drawn over proves they now scale as one.
  const sample = async (width: number, height: number) => {
    await page.setViewportSize({ height, width });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });
    return page.evaluate(() => {
      const prose = document.querySelector(".about-copy p")!.getBoundingClientRect();
      const contours = document
        .querySelector(".hero-contours")!
        .getBoundingClientRect();
      const line = document
        .querySelector(".scroll-indicator-line")!
        .getBoundingClientRect();
      return {
        // Position of the prose block inside the contour drawing it sits on.
        offsetX: (prose.x - contours.x) / contours.width,
        offsetY: (prose.y - contours.y) / contours.height,
        // The cue is centred on the canvas, so it must stay centred on the window.
        lineCentre: (line.x + line.width / 2) / window.innerWidth,
      };
    });
  };

  const authored = await sample(375, 844);
  for (const width of [390, 414, 430, 639]) {
    const actual = await sample(width, 844);
    expect(actual.offsetX, `${width}px prose x`).toBeCloseTo(authored.offsetX, 3);
    expect(actual.offsetY, `${width}px prose y`).toBeCloseTo(authored.offsetY, 3);
    expect(actual.lineCentre, `${width}px cue centre`).toBeCloseTo(0.5, 2);
  }
});

test("the browser-bar mirror is document content, holds still, and adds nothing else", async ({
  browserName,
  page,
}) => {
  // iOS Safari's bars are translucent over the document's own scrolled paint, and a
  // `position: fixed` box is clipped to the window and never reaches them. The mirror is
  // the layer that does. Nothing here can prove it looks right inside a bar — no desktop
  // engine draws one — but these are the properties that let it, and each of them was a
  // defect at some point while it was being built.
  await page.setViewportSize({ height: 714, width: 402 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/", { waitUntil: "networkidle" });

  const supported = await page.evaluate(
    () =>
      CSS.supports("animation-timeline", "scroll(root block)") &&
      CSS.supports("animation-duration", "auto"),
  );
  test.info().annotations.push({
    description: String(supported),
    type: `scroll-timeline support in ${browserName}`,
  });

  for (const chapter of chapters) {
    const mirror = page.locator(`section#${chapter} .chapter-photo-mirror`);
    await expect(mirror).toHaveCount(1);
    // Never fixed and never sticky. A viewport-constrained box at a window edge is what
    // Safari samples for its bar colour, and the whole point of the shield layer is that
    // nothing on this page offers it one. Where scroll timelines are absent the whole rule
    // never applies and the box keeps its static default, which satisfies the same contract.
    const position = await mirror.evaluate(
      (element) => getComputedStyle(element).position,
    );
    expect(["absolute", "static"], `${chapter} mirror position`).toContain(position);
    expect(position).not.toBe("fixed");
    expect(position).not.toBe("sticky");
  }

  // Exactly one image per chapter carries an accessible name: the mirror is a second copy
  // of the same photograph and must not become a second entry in the accessibility tree.
  for (const chapter of chapters) {
    const named = await page
      .locator(`section#${chapter} .chapter-photo img`)
      .evaluateAll(
        (nodes) =>
          nodes.filter(
            (node) =>
              (node as HTMLImageElement).alt !== "" &&
              node.getAttribute("aria-hidden") !== "true",
          ).length,
      );
    expect(named, `${chapter} accessible images`).toBe(1);
  }

  const documentHeight = await page.evaluate(
    () => (document.scrollingElement as Element).scrollHeight,
  );

  if (!supported) {
    // No scroll timeline means no mirror at all, and nothing further to measure: the page is
    // exactly the page that shipped before it.
    for (const chapter of chapters) {
      expect(
        await page
          .locator(`section#${chapter} .chapter-photo-mirror`)
          .evaluate((element) => getComputedStyle(element).display),
        `${chapter} without a scroll timeline`,
      ).toBe("none");
    }
    return;
  }

  // One settled scroll before the measurements. WebKit applies a scroll-driven animation a
  // frame or two after the element is first laid out, and a reading taken inside that
  // window is the untransformed position, not a tracking failure.
  await page.evaluate(() => window.scrollTo(0, 2600));
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (document.querySelector("#root .chapter-photo-mirror") as HTMLElement)
              .dataset.mirror ?? "",
        ),
      { timeout: 5_000 },
    )
    .toBe("ready");
  await page.waitForTimeout(400);

  for (const offset of [2600, 3400, 4200, 5000, 5600]) {
    await page.evaluate((value) => window.scrollTo(0, value), offset);
    // Poll the quantity being asserted, not a proxy for it: WebKit's main-thread copy of a
    // threaded animation's transform converges a few frames after the scroll it belongs to,
    // so a fixed wait here measures machine load rather than the page.
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            Math.abs(
              (
                document.querySelector("#root .chapter-photo-mirror") as HTMLElement
              ).getBoundingClientRect().top + 240,
            ),
          ),
        { timeout: 5_000 },
      )
      .toBeLessThan(0.5);
    const state = await page.evaluate(() => {
      const photo = document.querySelector(
        "#root .chapter-photo-mirror",
      ) as HTMLElement;
      const plate = document.querySelector("#root .chapter-photo-pin") as HTMLElement;
      return {
        documentHeight: (document.scrollingElement as Element).scrollHeight,
        mirrorTop: photo.getBoundingClientRect().top,
        plateTop: plate.getBoundingClientRect().top,
        platePosition: getComputedStyle(plate).position,
        ready: photo.dataset.mirror ?? "",
      };
    });

    // The counter-translated layer must not extend the document it is scaled against.
    // Measured in Chromium before `overflow: clip` was added to the band: `scrollHeight`
    // grew once the translation passed the document's end, which moved the endpoint the
    // mirror is derived from, which moved the mirror, which grew the document again.
    expect(state.documentHeight, `document height at ${offset}`).toBe(documentHeight);
    // DA-MEDIA-01's own plate is untouched by any of this.
    expect(state.platePosition).toBe("fixed");
    expect(state.plateTop).toBeCloseTo(0, 1);

    expect(state.ready, "confirmed in place before the mirror is shown").toBe("ready");
    // One bleed above the window, at every scroll offset.
    expect(state.mirrorTop, `mirror top at ${offset}`).toBeCloseTo(-240, 0);
  }

  // The seam. The mirror continues the plate's own frame past the window edge, so the two
  // images have to occupy exactly the same screen position: any difference is a step in the
  // middle of a photograph, right where the browser bar draws it.
  //
  // This is the contract that was missing when the travel was written onto the plate's image
  // instead of onto the chapter. Custom properties inherit down, not sideways, so the
  // mirror's image never received it, fell back to zero, and the photograph jumped by 25 to
  // 55 CSS px at the window edge — by an amount that changed as the page scrolled.
  //
  // The device reports an 874 px screen and the compact branch of the travel is written
  // against it, so it is stated here; without it a desktop run never exercises that branch.
  await page.addInitScript(() =>
    Object.defineProperty(window.screen, "height", { get: () => 874 }),
  );
  await page.reload({ waitUntil: "networkidle" });

  const worstSeam = () =>
    page.evaluate(() =>
      Math.max(
        0,
        ...[...document.querySelectorAll("[data-chapter]")].map((chapter) => {
          const mirror = chapter.querySelector(".chapter-photo-mirror") as HTMLElement;
          if (mirror.dataset.mirror !== "ready") return 0;
          const plate = chapter
            .querySelector(".chapter-photo-pin img")!
            .getBoundingClientRect();
          const copy = chapter
            .querySelector(".chapter-photo-mirror img")!
            .getBoundingClientRect();
          return Math.abs(copy.top - plate.top);
        }),
      ),
    );

  for (const offset of [2800, 3400, 4000, 4600, 5200, 4600, 3400, 2800]) {
    await page.evaluate((value) => window.scrollTo(0, value), offset);
    await expect.poll(worstSeam, { timeout: 5_000 }).toBeLessThan(0.5);
  }

  // And the same across a window height change, which is what the address bar does.
  for (const height of [754, 660, 714]) {
    await page.setViewportSize({ height, width: 402 });
    await page.evaluate(() => window.scrollTo(0, 4000));
    await expect.poll(worstSeam, { timeout: 5_000 }).toBeLessThan(0.5);
  }

  // Released from the window, the chapter shows its whole photograph in ordinary flow and
  // there are no strips left to answer.
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const chapter of chapters) {
    await expect
      .poll(
        () =>
          page
            .locator(`section#${chapter} .chapter-photo-mirror`)
            .evaluate((element) => getComputedStyle(element).display),
        { timeout: 5_000 },
      )
      .toBe("none");
  }
});

test("the drawer's scroll lock leaves the mirror and the root scroller alone", async ({
  browserName,
  page,
}) => {
  // VF-48. The regression this covers was invisible to every other check in this file: the
  // drawer's geometry, focus trap, Escape path and scroll restoration were all correct, and
  // the edge-candidate predicate was green in both menu states. What the lock did instead
  // was take the page out of flow — which clips it to the window, so `.chapter-photo-mirror`
  // can no longer reach the strips iOS Safari draws its bars over — and empty the root
  // scroller, which makes the `scroll(root block)` timeline that holds the mirror still go
  // inactive and drop it to `transform: none`. Neither is observable from a bar colour, so
  // this asserts the two properties the mirror needs the lock to preserve.
  await page.setViewportSize({ height: 714, width: 402 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/", { waitUntil: "networkidle" });

  const supported = await page.evaluate(
    () =>
      CSS.supports("animation-timeline", "scroll(root block)") &&
      CSS.supports("animation-duration", "auto"),
  );
  test.skip(!supported, `no scroll timeline in ${browserName}, so there is no mirror`);

  await page.evaluate(() => window.scrollTo(0, 2600));
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (document.querySelector("#root .chapter-photo-mirror") as HTMLElement)
              .dataset.mirror ?? "",
        ),
      { timeout: 5_000 },
    )
    .toBe("ready");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.abs(
          (
            document.querySelector("#root .chapter-photo-mirror") as HTMLElement
          ).getBoundingClientRect().top + 240,
        ),
      ),
    )
    .toBeLessThan(0.5);

  const readLockState = () =>
    page.evaluate(() => {
      const scroller = document.scrollingElement as Element;
      const mirror = document.querySelector(
        "#root .chapter-photo-mirror",
      ) as HTMLElement;
      const shell = document.querySelector("[data-app-shell]") as HTMLElement;
      return {
        mirrorTop: mirror.getBoundingClientRect().top,
        // Null once the timeline has no scrollable overflow to run against.
        pinDrivesTheMirror: mirror
          .getAnimations()
          .every((animation) => animation.timeline?.currentTime !== null),
        scrollY: window.scrollY,
        scrollable: scroller.scrollHeight > scroller.clientHeight,
        shellPosition: getComputedStyle(shell).position,
      };
    });

  const before = await readLockState();
  expect(
    before.scrollable,
    "the root scroller has scroll before the drawer opens",
  ).toBe(true);

  await page.locator("button[data-fidelity-action='open-menu']").click();
  await settleMenu(page);
  const open = await readLockState();

  expect(
    open.shellPosition,
    "the page stays in flow while the drawer is open",
  ).not.toBe("fixed");
  expect(open.shellPosition).not.toBe("sticky");
  expect(open.scrollable, "the root scroller keeps its scrollable overflow").toBe(true);
  expect(open.pinDrivesTheMirror, "the mirror's scroll timeline stays active").toBe(
    true,
  );
  expect(open.scrollY, "the reader keeps their place").toBe(before.scrollY);
  expect(open.mirrorTop, "the mirror does not move when the drawer opens").toBeCloseTo(
    before.mirrorTop,
    0,
  );

  await page.locator("button[data-fidelity-action='close-menu']").click();
  await settleMenu(page);
  const after = await readLockState();
  expect(after.scrollY, "and keeps it afterwards").toBe(before.scrollY);
  expect(after.mirrorTop, "and the mirror is where it was").toBeCloseTo(
    before.mirrorTop,
    0,
  );
});

test("the drawer's focus ring answers the modality that opened it", async ({
  page,
}) => {
  // VF-49. A programmatic `focus()` matches `:focus-visible` in WebKit whatever the reader
  // did, so opening the drawer with a tap drew the page's 2 px focus outline as a rectangle
  // around the close button and its label. Chromium and Firefox suppress it on their own,
  // which is why every desk check missed it; all three are asserted so the fix cannot be
  // read as engine-specific.
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/", { waitUntil: "networkidle" });

  const ringOn = (selector: string) =>
    page.locator(selector).evaluate((element) => element.matches(":focus-visible"));
  const open = page.locator("button[data-fidelity-action='open-menu']");
  const close = page.locator("button[data-fidelity-action='close-menu']");

  await open.click();
  await settleMenu(page);
  await expect(close).toBeFocused();
  expect(await ringOn("[data-fidelity-action='close-menu']"), "pointer open").toBe(
    false,
  );

  await close.click();
  await settleMenu(page);
  await expect(open).toBeFocused();
  expect(await ringOn("[data-fidelity-action='open-menu']"), "pointer close").toBe(
    false,
  );

  // The ring is aimed, not removed: a keyboard reader still gets it in both directions.
  await open.focus();
  await page.keyboard.press("Enter");
  await settleMenu(page);
  await expect(close).toBeFocused();
  expect(await ringOn("[data-fidelity-action='close-menu']"), "keyboard open").toBe(
    true,
  );

  await page.keyboard.press("Escape");
  await expect(open).toBeFocused();
  expect(await ringOn("[data-fidelity-action='open-menu']"), "Escape close").toBe(true);
});

test("the drawer holds the page still without taking it out of flow", async ({
  page,
}) => {
  // The behaviour the layout lock used to supply. A wheel over the page, a wheel over a
  // drawer with no scroll of its own, and the keys that scroll a document all have to stop
  // at the drawer — measured before the fix: the wheel was held by `overscroll-behavior`
  // everywhere except Firefox, and `End` sent the page to the end of the document in both
  // WebKit and Firefox.
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo(0, 1500));
  const before = await page.evaluate(() => window.scrollY);

  await page.locator("button[data-fidelity-action='open-menu']").click();
  await settleMenu(page);

  await page.mouse.move(80, 400);
  await page.mouse.wheel(0, 600);
  await page.mouse.move(320, 400);
  await page.mouse.wheel(0, 600);
  await page.keyboard.press("PageDown");
  await page.keyboard.press("End");
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.scrollY), "held while open").toBe(before);

  await page.keyboard.press("Escape");
  await settleMenu(page);
  expect(await page.evaluate(() => window.scrollY), "restored on close").toBe(before);

  // And the lock is released with the drawer, not left on the document.
  await page.mouse.move(80, 400);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
});
