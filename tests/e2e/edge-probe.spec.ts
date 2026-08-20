import { expect, test } from "@playwright/test";

/**
 * Contracts for the device diagnostic at `/edge-probe`.
 *
 * NOTHING HERE CAN PASS THE BROWSER-BAR GATE. Every assertion below runs in a desktop
 * engine, and no desktop engine draws the translucent strips iOS Safari puts its status bar
 * and toolbar over. `WebPage::sidesRequiringFixedContainerEdges` is Cocoa-only and depends
 * on obscured insets supplied by the Safari UI process, so a green run here means the probe
 * is syntactically valid, its geometry is derived correctly and it did not regress — never
 * that candidate 5 holds still inside a bar on a phone. That answer only exists in a
 * recording from the device, measured against `docs/edge-probe-5-measurement-spec.md`.
 *
 * What these tests do protect:
 *  - the counter-pin is exact at every scroll offset in engines that have scroll timelines;
 *  - the pinned layer does not extend the document it is measured against, which would
 *    invalidate the keyframe endpoint and take the 1 : 1 scale with it;
 *  - engines without scroll timelines fall back to something inert rather than parking the
 *    layer at the far end of the animation;
 *  - the published descriptor still describes the page, so the analysis harness cannot
 *    build a template for a probe that is no longer being served;
 *  - candidates 1 to 4 still behave as rounds one to three recorded them.
 */

const PROBE = "/edge-probe";
const VIEWPORT = { height: 844, width: 390 } as const;

interface Descriptor {
  readonly bleed: number;
  readonly cell: number;
  readonly code: string;
  readonly lane: number;
  readonly margin: number;
  readonly order: number;
}

async function readDescriptor(request: {
  get: (url: string) => Promise<{ text: () => Promise<string> }>;
}): Promise<Descriptor> {
  const body = await (await request.get(PROBE)).text();
  const raw = /<meta name="edge-probe" content="([^"]+)"/.exec(body)?.[1];
  expect(raw, "the probe must publish its own pattern geometry").toBeTruthy();
  const fields = Object.fromEntries(
    (raw as string).split(";").map((entry) => {
      const split = entry.indexOf("=");
      return [entry.slice(0, split), entry.slice(split + 1)];
    }),
  );
  return {
    bleed: Number(fields.bleed),
    cell: Number(fields.cell),
    code: fields.code,
    lane: Number(fields.lane),
    margin: Number(fields.margin),
    order: Number(fields.order),
  };
}

test("the probe publishes a pattern the analysis can decode without guessing", async ({
  request,
}) => {
  const descriptor = await readDescriptor(request);

  // Every window of `order` cells must identify its own position, or a lagging candidate
  // can be read as a stationary one that happens to sit a whole number of cells away.
  const symbols = [...descriptor.code].map(Number);
  expect(symbols.length).toBeGreaterThan(0);
  const windows = new Set(
    symbols.map((_, index) =>
      Array.from(
        { length: descriptor.order },
        (__, offset) => symbols[(index + offset) % symbols.length],
      ).join(""),
    ),
  );
  expect(windows.size, "code windows must be unique").toBe(symbols.length);

  // A reading lane has to carry at least one full window, or the code proves nothing.
  expect(descriptor.lane / descriptor.cell).toBeGreaterThanOrEqual(descriptor.order);

  // The rail is offset by the bleed, so the two carriers are only in phase when the bleed
  // is a whole number of cells. Otherwise the expected offset is not zero and the gate
  // would be measured against a constant nobody wrote down.
  expect(descriptor.bleed % descriptor.cell).toBe(0);

  // A lane must not reach a window edge, or it would be read through a browser bar and
  // stop being a reference.
  expect(descriptor.margin).toBeGreaterThanOrEqual(24);
});

test("the counter-pin is exact at every scroll offset, or the engine has no scroll timeline", async ({
  browserName,
  page,
}) => {
  await page.setViewportSize(VIEWPORT);
  await page.goto(`${PROBE}?try=csstimeline&plate=on&shield=on`, {
    waitUntil: "networkidle",
  });

  const supported = await page.evaluate(
    () =>
      CSS.supports("animation-timeline", "scroll(root block)") &&
      CSS.supports("animation-duration", "auto"),
  );

  // Recorded rather than asserted: Firefox 153 has neither, which is exactly why the
  // production mirror has to be a progressive enhancement over the existing fill.
  test.info().annotations.push({
    description: String(supported),
    type: `scroll-timeline support in ${browserName}`,
  });

  const { bandTop, maximumScroll } = await page.evaluate(() => {
    const box = document.scrollingElement as Element;
    const offset = -document.documentElement.getBoundingClientRect().top;
    return {
      bandTop:
        (document.getElementById("tone") as Element).getBoundingClientRect().top +
        offset,
      maximumScroll: box.scrollHeight - box.clientHeight,
    };
  });
  expect(maximumScroll).toBeGreaterThan(0);

  const offsets = [0, 0.15, 0.4, 0.63, 0.85, 0.97, 1].map((fraction) =>
    Math.round(maximumScroll * fraction),
  );

  for (const offset of offsets) {
    await page.evaluate((value) => window.scrollTo(0, value), offset);
    await page.waitForTimeout(120);
    const state = await page.evaluate(() => {
      const box = document.scrollingElement as Element;
      return {
        documentHeight: box.scrollHeight,
        pinTop:
          document.getElementById("csst")?.getBoundingClientRect().top ?? Number.NaN,
        pinFrom: Number.parseFloat(
          document.body.style.getPropertyValue("--pin-from") || "NaN",
        ),
        pinTo: Number.parseFloat(
          document.body.style.getPropertyValue("--pin-to") || "NaN",
        ),
        railTop:
          document.getElementById("rail")?.getBoundingClientRect().top ?? Number.NaN,
      };
    });

    // The layer must never extend the document. If it does, the maximum scroll it is
    // scaled against changes underneath it and the 1 : 1 relationship silently drifts —
    // measured in Chromium before `overflow: clip` was added to the band.
    expect(state.documentHeight, `document height at scrollY ${offset}`).toBe(
      maximumScroll + VIEWPORT.height,
    );
    // The endpoints are measured from the band's own document top, so neither is the
    // maximum scroll on its own. What has to hold is the slope: one CSS px of translation
    // per CSS px of scroll, across the whole range. Anything else is a scale error, and a
    // scale error is indistinguishable from a lag until the page is at the far end.
    expect(state.pinTo - state.pinFrom, "counter-pin slope").toBeCloseTo(
      maximumScroll,
      1,
    );
    expect(state.pinFrom, "counter-pin start").toBeCloseTo(-bandTop - 240, 1);
    expect(state.railTop, "the reference rail is the window").toBeCloseTo(0, 1);

    if (supported) {
      expect(state.pinTop, `pinned top at scrollY ${offset}`).toBeCloseTo(-240, 1);
    } else {
      // Without a timeline the box must simply travel with the document — its authored
      // position minus the scroll offset. The failure this guards against is the one
      // Firefox 153 produced before the animation was gated: with no 'animation-timeline'
      // and no 'animation-duration: auto', the animation ran on the document timeline
      // instead, finished in a second and held 'translateY(maximumScroll)' for the rest of
      // the session, parking the layer a whole document away from where it belongs.
      expect(state.pinTop, `unpinned top at scrollY ${offset}`).toBeCloseTo(
        bandTop - offset,
        0,
      );
    }
  }
});

test("candidates one to four still behave as the earlier rounds recorded them", async ({
  page,
}) => {
  await page.setViewportSize(VIEWPORT);

  const observed: Record<string, { display: string; position: string }> = {};
  for (const mode of ["none", "bgfix", "jsabs", "sticky"] as const) {
    await page.goto(`${PROBE}?try=${mode}&plate=on&shield=on`, {
      waitUntil: "networkidle",
    });
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 3));
    await page.waitForTimeout(150);
    observed[mode] = await page.evaluate(() => {
      const style = getComputedStyle(document.getElementById("bleed") as Element);
      return { display: style.display, position: style.position };
    });
  }

  expect(observed.none.display).toBe("none");
  expect(observed.bgfix.display).toBe("none");
  expect(observed.jsabs).toEqual({ display: "block", position: "absolute" });
  expect(observed.sticky).toEqual({ display: "block", position: "sticky" });
});

test("every documented state is reachable from the query string alone", async ({
  page,
}) => {
  await page.setViewportSize(VIEWPORT);
  await page.goto(`${PROBE}?try=csstimeline&plate=off&shield=off&mask=on`, {
    waitUntil: "networkidle",
  });

  await expect(page.locator("body")).toHaveAttribute("data-try", "csstimeline");
  await expect(page.locator("body")).toHaveAttribute("data-plate", "off");
  await expect(page.locator("body")).toHaveAttribute("data-shield", "off");
  await expect(page.locator("body")).toHaveAttribute("data-mask", "on");

  // The shield is the only thing keeping the fixed plate from supplying an edge colour, so
  // turning it off has to actually remove it — that is the separation of responsibilities
  // the recording is meant to demonstrate.
  await expect(page.locator(".chrome-shield")).toHaveCount(2);
  expect(
    await page
      .locator('.chrome-shield[data-edge="top"]')
      .evaluate((element) => getComputedStyle(element).display),
  ).toBe("none");

  await page.goto(`${PROBE}?try=csstimeline&plate=on&shield=on`, {
    waitUntil: "networkidle",
  });
  expect(
    await page
      .locator('.chrome-shield[data-edge="top"]')
      .evaluate((element) => getComputedStyle(element).display),
  ).not.toBe("none");
});

test("the telemetry strip carries a scroll offset and a frame counter for the analysis", async ({
  page,
}) => {
  await page.setViewportSize(VIEWPORT);
  await page.goto(`${PROBE}?try=csstimeline`, { waitUntil: "networkidle" });

  await page.evaluate(() => window.scrollTo(0, 1234));
  await expect
    .poll(() => page.locator("#telemetry-text").textContent())
    .toMatch(/^S01234 F\d{4}$/);

  const first = await page.locator("#telemetry-text").textContent();
  await page.waitForTimeout(200);
  const second = await page.locator("#telemetry-text").textContent();
  expect(
    second,
    "the frame counter must advance, or dropped frames are undetectable",
  ).not.toBe(first);

  // The same two numbers as bits, which is what the analysis actually reads: matching a
  // monospace font in a rescaled screen recording is a font problem, not a page problem.
  const cells = page.locator("#telemetry-bits i");
  await expect(cells).toHaveCount(28);
  const pattern = await cells.evaluateAll((nodes) =>
    nodes.map((node) =>
      getComputedStyle(node).backgroundColor === "rgb(255, 255, 255)" ? 1 : 0,
    ),
  );
  expect(pattern[0], "start marker").toBe(1);
  expect(pattern[27], "stop marker").toBe(1);
  let scroll = 0;
  for (let index = 1; index <= 16; index += 1) scroll = (scroll << 1) | pattern[index];
  expect(scroll, "the bit row must carry the same scroll offset").toBe(1234);
  const ones = pattern.slice(1, 25).reduce<number>((total, bit) => total + bit, 0);
  expect((pattern[25] | (pattern[26] << 1)) & 3, "parity").toBe(ones & 3);
});
