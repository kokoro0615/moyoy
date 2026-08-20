"use client";

import { useEffect } from "react";

import { paperTint } from "@/lib/implementation-contract";

/**
 * Single owner for every scroll-linked transform on the landing page.
 *
 * It owns four behaviours: the delayed contour lag (DA-MOTION-02), the per-object scroll
 * offset (DA-MOTION-01), the chapter photograph pan (DA-MEDIA-01) and the legibility
 * state of the fixed menu control (DA-NAV-01). The pin itself is not here any more —
 * `.chapter-photo-pin` is a real `position: fixed` layer, so the browser holds the
 * photograph still and nothing on this path can fall behind the compositor. What remains
 * are small residual drifts where a frame of latency is a fraction of a pixel.
 *
 * The controller only ever writes CSS custom properties consumed by `translate3d()` and
 * one boolean data attribute. It never changes layout, visibility, reading order or hit
 * testing, it performs no layout reads on the animation path, and it resets every
 * property under `prefers-reduced-motion: reduce`.
 */

/** Frames the loop keeps running after the scroll offset stops changing. */
const IDLE_FRAMES = 12;

/** Viewport width below which the compact travels apply. */
const COMPACT_WIDTH = 640;

/**
 * Depth of the strips a mobile browser draws its own furniture over: iOS reserves about
 * 60 px above for the status bar and about 90 px below for the toolbar. Each bar takes
 * the colour of the page at the middle of its own strip.
 */
const STATUS_BAR = 60;
const TOOL_BAR = 90;

/**
 * The colour a browser bar is drawn over is read out of the artwork behind it rather than
 * from a table: every frame, silhouette mask and paper foreground is drawn once into a
 * small offscreen canvas and reduced to a ramp of mean RGBA down its height. Colour comes
 * from the photographs, coverage from the alpha of the masks and the foreground, and the
 * two are composited in paint order for exactly the band each bar covers.
 *
 * A per-chapter constant cannot do this. At a wide window the plate traverses more than
 * half of its frame while the chapter is on screen — DUSK runs from its lit sun to its
 * dark forest — and at every chapter boundary the silhouette is part paper, which is how
 * a bar ended up black over a cream page. `RAMP_ROWS` against the shortest shipped frame
 * is one entry per ~9 source px, finer than either bar; the columns are averaged per row,
 * so the ramp does not depend on how an engine filters a downscale.
 */
const RAMP_ROWS = 192;
const RAMP_COLUMNS = 24;

/** Widths the artboard is authored against, and above which it is zoomed. */
const ARTBOARD_WIDTH = 1200;
const MOBILE_ARTBOARD_WIDTH = 375;

/**
 * How much of each chapter photograph is revealed while its chapter is on screen.
 * `1` traverses the whole approved frame; `0` holds a single viewport-sized crop, which
 * is the behaviour this replaced. Lower it to make the plate read as more strictly still.
 */
const CHAPTER_PAN_STRENGTH = 1;

interface ContourLayerPlan {
  /**
   * Displacement in artboard px while the band crosses the window, `[wide, compact]`.
   * `y` alone is enough for a line that runs across the page; a line that runs *down*
   * the page needs `x`, because a vertical translation of a vertical line only slides
   * the line along itself and is close to invisible. See the orientation table in
   * `docs/scroll-motion-spec.md` §5.2.
   */
  readonly travelX?: readonly [number, number];
  readonly travelY: readonly [number, number];
}

interface ContourGroupPlan {
  /** Share of `travel` the band holds when it starts its crossing. */
  readonly from: number;
  /** Share of `travel` the band holds when it finishes its crossing. */
  readonly to: number;
  readonly layers: readonly ContourLayerPlan[];
  readonly selector: string;
}

interface ObjectPlan {
  /** Offset in artboard px when the object starts its crossing, `[wide, compact]`. */
  readonly from: readonly [number, number];
  /** Offset in artboard px when the object finishes its crossing, `[wide, compact]`. */
  readonly to: readonly [number, number];
  readonly selector: string;
}

/** One custom property travelling between two authored offsets. */
interface CrossingAxis {
  readonly from: number;
  readonly property: string;
  readonly to: number;
}

/** An element that travels between authored offsets while it crosses the window. */
interface CrossingTarget {
  readonly axes: readonly CrossingAxis[];
  readonly element: HTMLElement;
  end: number;
  start: number;
}

/**
 * DA-MEDIA-01. The plate is pinned by the browser; this only pans the photograph inside
 * it so the whole approved frame is traversed once while its chapter is on screen.
 */
interface PanTarget {
  readonly element: HTMLElement;
  bottom: number;
  overflowRatio: number;
  top: number;
}

interface Band {
  bottom: number;
  top: number;
}

/**
 * One chapter, everything the chrome tint needs about it. The geometry is cached by
 * `measure()` in viewport px, which is what the sample points are expressed in and what
 * keeps the artboard `zoom` out of the arithmetic.
 */
interface ChapterSurface {
  readonly section: HTMLElement;
  /** Document band the chapter occupies. */
  bottom: number;
  top: number;
  /** Rendered box of the photograph inside the pinned plate. */
  imageHeight: number;
  pinTop: number;
  /** Share of the frame that is off-plate and therefore traversed by the pan. */
  overflowRatio: number;
  /** Colour ramp of the photograph; null until the frame has decoded. */
  frame: Uint8ClampedArray | null;
  /** Alpha ramp of the silhouette that clips it, over the chapter's own document band. */
  mask: Uint8ClampedArray | null;
}

/** A paper layer painted over the chapters, with the alpha ramp of its own artwork. */
interface PaperBand extends Band {
  ramp: Uint8ClampedArray | null;
}

/**
 * VF-31, third pass. Owner review after the second: the motion still did not read.
 * Measuring the shipped controller at 1440 × 900 explains why, and it was never the size
 * of the numbers. Every band was driven by `scroll × depth` against a fixed cap, so each
 * one spent nearly the whole page pinned at its cap and therefore completely still:
 * the footer stack sat at its `-280 / -170` limit continuously from `scrollY = 0` to
 * `3000`, the product stack at `-300 / -210 / -130` until `900`, and the hero stack
 * saturated at `scrollY = 1264` and then held `430 / 330 / 230 / 130` for the remaining
 * ~13 000 px. Amplitude was already large; what was missing was motion that lasts.
 *
 * The drive model is now the band's own crossing of the window rather than the raw
 * scroll offset. Each layer interpolates from `from` to `to` across exactly the interval
 * in which its band is visible, so it can never saturate while the reader can see it and
 * it is still by construction once it cannot. `travel` is the whole displacement over
 * that crossing, and the in-stack ratio is held near 3.5 : 1 so neighbouring lines
 * separate instead of moving as one plane.
 */
const contourPlan: readonly ContourGroupPlan[] = [
  {
    // Starts at the authored position — the approved page-top frame is scroll 0 — and
    // lags downward for as long as the hero band is leaving. Layers 1 and 2 run across
    // the page and layers 3 and 4 run down it, so the last two are moved sideways: see
    // VF-38 below.
    from: 0,
    layers: [
      { travelY: [460, 250] },
      { travelY: [345, 188] },
      { travelX: [-158, -86], travelY: [104, 56] },
      { travelX: [-96, -52], travelY: [62, 34] },
    ],
    selector: ".hero-contours",
    to: 1,
  },
  {
    // Symmetric about the moment the band is centred in the window.
    from: -0.5,
    layers: [
      { travelY: [320, 144] },
      { travelY: [216, 98] },
      // A small closed form rather than a run of line, so it separates on both axes.
      { travelX: [-74, -34], travelY: [96, 44] },
    ],
    selector: ".product-contours",
    to: 0.5,
  },
  {
    // Arrives at the authored position exactly as the page bottom is reached.
    from: -1,
    layers: [{ travelY: [200, 90] }, { travelY: [120, 54] }],
    selector: ".footer-contours",
    to: 0,
  },
];

/**
 * Foreground objects lead the page while the contour planes lag it, so they are pushed
 * down as they enter and drawn up as they leave. `from` and `to` are stated separately
 * rather than as one symmetric cap because the space around an object is not symmetric:
 * a product drawing has its whole 245 px row above it but only the measured 33 px gap to
 * its own caption below, and a drawing that overran its caption would read as a layout
 * fault rather than as depth.
 *
 * VF-38. The two brand rules are added here. They are the longest lines on the page and
 * they were the only line artwork with no scroll offset at all, which is what made the
 * effect read as "not applied to every background line". Each is anchored so that the
 * frame the reference approves is the frame that holds still: the header rule starts at
 * its authored offset, because the approved composition is the page top, and the footer
 * rule arrives at its authored offset, because the approved composition is the page end.
 */
const objectPlan: readonly ObjectPlan[] = [
  { from: [0, 0], to: [-44, -20], selector: ".brand-header" },
  { from: [70, 32], to: [-90, -40], selector: ".brand-center" },
  {
    from: [28, 12],
    to: [-104, -46],
    selector: ".product-perfume-15 .product-drawing img",
  },
  {
    from: [28, 12],
    to: [-118, -52],
    selector: ".product-perfume-50 .product-drawing img",
  },
  {
    // The heaviest drawing travels least: the three bottles hold three separate depths,
    // and the diffuser is the plane the other two are read against.
    from: [22, 10],
    to: [-68, -30],
    selector: ".product-diffuser-500 .product-drawing img",
  },
  { from: [84, 38], to: [-24, -11], selector: ".chapter-product" },
  { from: [44, 20], to: [0, 0], selector: ".brand-footer" },
];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

/** `RAMP_ROWS` mean RGBA values down an image, taken once per decoded source. */
const rampCache = new Map<string, Uint8ClampedArray | null>();

/**
 * Reduce a decoded image to one mean RGBA per horizontal band. The draw is the only
 * expensive step and it happens once per source, off the animation path.
 */
function readRamp(image: CanvasImageSource, key: string): Uint8ClampedArray | null {
  const cached = rampCache.get(key);
  if (cached !== undefined) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = RAMP_COLUMNS;
  canvas.height = RAMP_ROWS;
  const context = canvas.getContext("2d");
  if (!context) return null;
  let pixels: Uint8ClampedArray;
  try {
    context.drawImage(image, 0, 0, RAMP_COLUMNS, RAMP_ROWS);
    pixels = context.getImageData(0, 0, RAMP_COLUMNS, RAMP_ROWS).data;
  } catch {
    // Every source here is same-origin and cannot taint the canvas, but a frame that has
    // not decoded can still throw. The chapter's own `--chapter-tone` stays in force, and
    // the failure is cached so the animation path never retries it.
    rampCache.set(key, null);
    return null;
  }
  const ramp = new Uint8ClampedArray(RAMP_ROWS * 4);
  for (let row = 0; row < RAMP_ROWS; row += 1) {
    for (let channel = 0; channel < 4; channel += 1) {
      let total = 0;
      for (let column = 0; column < RAMP_COLUMNS; column += 1) {
        total += pixels[(row * RAMP_COLUMNS + column) * 4 + channel];
      }
      ramp[row * 4 + channel] = total / RAMP_COLUMNS;
    }
  }
  rampCache.set(key, ramp);
  return ramp;
}

/** Ramp an image the page only references from CSS. Resolves from the HTTP cache. */
function loadRamp(url: string, done: () => void) {
  if (rampCache.has(url)) return;
  const image = new Image();
  image.decoding = "async";
  image.addEventListener("load", () => {
    readRamp(image, url);
    done();
  });
  image.addEventListener("error", () => {
    rampCache.set(url, null);
  });
  image.src = url;
}

const hexChannel = (value: number) =>
  Math.round(clamp(value, 0, 255))
    .toString(16)
    .padStart(2, "0");

/** Row span of a ramp covering `[from, to]` of a box that runs `start` to `end`. */
function rampRows(start: number, end: number, from: number, to: number) {
  const height = end - start;
  if (height <= 0) return null;
  const first = clamp(
    Math.floor(((from - start) / height) * RAMP_ROWS),
    0,
    RAMP_ROWS - 1,
  );
  const last = clamp(
    Math.ceil(((to - start) / height) * RAMP_ROWS) - 1,
    first,
    RAMP_ROWS - 1,
  );
  return { first, last };
}

/** Mean colour of `[from, to]` within a box, or null while the ramp is unavailable. */
function rampColour(
  ramp: Uint8ClampedArray | null,
  start: number,
  end: number,
  from: number,
  to: number,
): [number, number, number] | null {
  const rows = ramp && rampRows(start, end, from, to);
  if (!ramp || !rows) return null;
  const channels: [number, number, number] = [0, 0, 0];
  for (let row = rows.first; row <= rows.last; row += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      channels[channel] += ramp[row * 4 + channel];
    }
  }
  const span = rows.last - rows.first + 1;
  return [channels[0] / span, channels[1] / span, channels[2] / span];
}

/**
 * How much of the band `[from, to]` a layer occupying `[start, end]` actually paints:
 * the share of the band inside the box, scaled by the mean alpha of its artwork there. A
 * layer with no ramp yet is taken as opaque inside its own box, which is the model the
 * menu control already uses.
 */
function rampCoverage(
  ramp: Uint8ClampedArray | null,
  start: number,
  end: number,
  from: number,
  to: number,
) {
  const overlap = Math.min(end, to) - Math.max(start, from);
  const span = to - from;
  if (overlap <= 0 || span <= 0) return 0;
  const share = overlap / span;
  const rows = rampRows(start, end, Math.max(start, from), Math.min(end, to));
  if (!ramp || !rows) return share;
  let alpha = 0;
  for (let row = rows.first; row <= rows.last; row += 1) alpha += ramp[row * 4 + 3];
  return (share * alpha) / ((rows.last - rows.first + 1) * 255);
}

/** `#rrggbb` from a custom property, so a measured constant can enter the composite. */
function parseHex(value: string): [number, number, number] | null {
  const match = /^#([\da-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const packed = Number.parseInt(match[1], 16);
  return [(packed >> 16) & 255, (packed >> 8) & 255, packed & 255];
}

const paperRGB = parseHex(paperTint) ?? [236, 231, 216];

/** The silhouette a chapter is clipped by, named only in the stylesheet. */
function maskSourceOf(photo: HTMLElement) {
  const style = getComputedStyle(photo);
  const declared = style.maskImage || style.webkitMaskImage || "";
  return /url\(["']?([^"')]+)["']?\)/.exec(declared)?.[1] ?? null;
}

export function PageMotion() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const crossings: CrossingTarget[] = [];
    const pans: PanTarget[] = [];
    /** Document bands whose surface is photography rather than the paper page. */
    const mediaBands: Band[] = [];
    /** Paper artwork that is painted over a chapter and hides the photograph behind it. */
    const paperBands: PaperBand[] = [];
    /** The chapters behind `mediaBands`, index for index, with what tints their bars. */
    const chapterSurfaces: ChapterSurface[] = [];
    let menuControl: HTMLElement | null = null;
    let themeColor: HTMLMetaElement | null = null;
    let chromeTints: HTMLElement[] = [];
    /** The control is `position: fixed`, so its window band is constant. */
    let menuBand: Band | null = null;
    let loopFrame = 0;
    let measureFrame = 0;
    let idleFrames = 0;
    let lastScroll = Number.NaN;
    /** Cached in `measure()` so the animation path never forces a layout. */
    let maximumScroll = 0;

    const isCompact = () => window.innerWidth < COMPACT_WIDTH;
    const pick = (pair: readonly [number, number]) => (isCompact() ? pair[1] : pair[0]);
    /**
     * Both artboards are zoomed, so artboard px are scaled on the way out. The divisor
     * is the same `clientWidth` the head script in `src/app/layout.tsx` divides by, so
     * the offsets written here cannot drift from the scale the canvas is drawn at.
     */
    const scaleOf = () => {
      const width = document.documentElement.clientWidth || window.innerWidth;
      if (width < COMPACT_WIDTH) return width / MOBILE_ARTBOARD_WIDTH;
      return width >= ARTBOARD_WIDTH ? width / ARTBOARD_WIDTH : 1;
    };

    function collect() {
      crossings.length = 0;
      pans.length = 0;
      mediaBands.length = 0;
      paperBands.length = 0;
      chapterSurfaces.length = 0;

      for (const plan of contourPlan) {
        const stack = document.querySelector<HTMLElement>(plan.selector);
        if (!stack) continue;
        for (const [index, element] of [
          ...stack.querySelectorAll<HTMLElement>(".contour-layer"),
        ].entries()) {
          const layer = plan.layers[Math.min(index, plan.layers.length - 1)];
          const axes: CrossingAxis[] = [
            {
              from: plan.from * pick(layer.travelY),
              property: "--contour-parallax-y",
              to: plan.to * pick(layer.travelY),
            },
          ];
          if (layer.travelX) {
            axes.push({
              from: plan.from * pick(layer.travelX),
              property: "--contour-parallax-x",
              to: plan.to * pick(layer.travelX),
            });
          }
          crossings.push({ axes, element, end: 0, start: 0 });
        }
      }

      for (const plan of objectPlan) {
        for (const element of document.querySelectorAll<HTMLElement>(plan.selector)) {
          crossings.push({
            axes: [
              {
                from: pick(plan.from),
                property: "--object-parallax-y",
                to: pick(plan.to),
              },
            ],
            element,
            end: 0,
            start: 0,
          });
        }
      }

      for (const element of document.querySelectorAll<HTMLElement>(
        ".chapter-photo-pin img",
      )) {
        pans.push({ bottom: 0, element, overflowRatio: 0, top: 0 });
      }

      menuControl = document.querySelector<HTMLElement>(".menu-open-button");
      themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      chromeTints = [...document.querySelectorAll<HTMLElement>(".chrome-tint")];
    }

    function reset() {
      for (const target of crossings) {
        for (const axis of target.axes)
          target.element.style.setProperty(axis.property, "0px");
      }
      for (const target of pans) {
        target.element.style.setProperty("--chapter-pan-y", "0%");
      }
    }

    /** Cache untransformed document geometry; never called from the animation path. */
    function measure() {
      measureFrame = 0;
      collect();
      reset();
      // Every band below is a client rect plus the scroll offset, and the two have to be
      // the same offset. `window.scrollY` is not reliably that offset: WebKit scrolls on
      // its own thread, so a measure raised by an image load in the middle of a scroll can
      // read a scroll position the rects have not caught up with — and the bands then land
      // a whole chapter out and stay there, because nothing re-measures afterwards. The
      // root's own rect is the offset the rects were taken against, whatever the scrolling
      // thread is doing, so it is read from there instead.
      const scrollY = -document.documentElement.getBoundingClientRect().top;
      const viewportHeight = window.innerHeight;
      maximumScroll = Math.max(
        0,
        document.documentElement.scrollHeight - viewportHeight,
      );

      for (const target of crossings) {
        const box = target.element.getBoundingClientRect();
        const top = box.top + scrollY;
        // The crossing runs from the frame the band's top edge reaches the window bottom
        // until its bottom edge leaves the window top, trimmed to the scrollable range so
        // a band anchored at either end of the document still completes its travel.
        target.start = clamp(top - viewportHeight, 0, maximumScroll);
        target.end = clamp(top + box.height, target.start, maximumScroll);
      }

      for (const target of pans) {
        const chapter = target.element.closest<HTMLElement>("[data-chapter]");
        if (!chapter) continue;
        const chapterBox = chapter.getBoundingClientRect();
        const imageHeight = target.element.getBoundingClientRect().height;
        target.top = chapterBox.top + scrollY;
        target.bottom = target.top + chapterBox.height;
        target.overflowRatio =
          imageHeight > 0
            ? Math.max(0, (imageHeight - viewportHeight) / imageHeight)
            : 0;
      }

      for (const chapter of document.querySelectorAll<HTMLElement>("[data-chapter]")) {
        const box = chapter.getBoundingClientRect();
        mediaBands.push({ bottom: box.bottom + scrollY, top: box.top + scrollY });

        // Everything the chrome tint needs, read here so the animation path never does.
        // The plate is viewport-fixed, so its box is the window; the frame inside it is
        // taller than the window by the share the pan traverses.
        const pin = chapter.querySelector<HTMLElement>(".chapter-photo-pin");
        const image = chapter.querySelector<HTMLImageElement>(".chapter-photo-pin img");
        const pinBox = pin?.getBoundingClientRect();
        const imageHeight = image?.getBoundingClientRect().height ?? 0;
        // The silhouette is a CSS mask, so its file is only named in the stylesheet. It
        // is already in the HTTP cache by the time the chapter paints; ramping it needs a
        // second measure, which the loader asks for once the alpha is available.
        const photo = chapter.querySelector<HTMLElement>(".chapter-photo");
        const maskUrl = photo ? maskSourceOf(photo) : null;
        if (maskUrl) loadRamp(maskUrl, requestMeasure);
        chapterSurfaces.push({
          bottom: box.bottom + scrollY,
          frame:
            image?.complete && image.naturalWidth > 0
              ? readRamp(image, image.currentSrc)
              : null,
          imageHeight,
          mask: maskUrl ? (rampCache.get(maskUrl) ?? null) : null,
          overflowRatio:
            imageHeight > 0
              ? Math.max(0, (imageHeight - viewportHeight) / imageHeight)
              : 0,
          pinTop: pinBox?.top ?? 0,
          section: chapter,
          top: box.top + scrollY,
        });
      }

      // The ROOT chapter box starts about 260 px above the photograph the reader sees:
      // the beige upper foreground is painted over it at `z-index: 20`, so the surface is
      // still paper there. Measured at 1440 × 900, the backdrop behind the control reads
      // paper (relative luminance 0.799) until the foreground's lower edge at document
      // y 3020 and the photograph (0.015) immediately after it.
      for (const foreground of document.querySelectorAll<HTMLElement>(
        ".root-foreground",
      )) {
        const box = foreground.getBoundingClientRect();
        const artwork = foreground.querySelector<HTMLImageElement>("img");
        paperBands.push({
          bottom: box.bottom + scrollY,
          ramp:
            artwork?.complete && artwork.naturalWidth > 0
              ? readRamp(artwork, artwork.currentSrc)
              : null,
          top: box.top + scrollY,
        });
      }

      if (menuControl) {
        const box = menuControl.getBoundingClientRect();
        menuBand = { bottom: box.bottom, top: box.top };
      }

      lastScroll = Number.NaN;
      render();
    }

    function requestMeasure() {
      if (measureFrame) return;
      measureFrame = window.requestAnimationFrame(measure);
    }

    /**
     * VF-35. Legibility, not motion: the fixed control has to know when the surface
     * behind it stops being the paper page, because no single colour survives both. The
     * chapter silhouettes are opaque in the control's own corner strip from within 2 % of
     * each chapter's height (measured from the eight mask files), so the chapter box is
     * an accurate media band everywhere except under the ROOT upper foreground, which is
     * subtracted here.
     */
    function renderControlSurface(scrollY: number) {
      if (!menuControl || !menuBand) return;
      const top = scrollY + menuBand.top;
      const bottom = scrollY + menuBand.bottom;
      const overlaps = (band: Band) => band.top < bottom && band.bottom > top;
      const overMedia = mediaBands.some(overlaps) && !paperBands.some(overlaps);
      const next = overMedia ? "true" : "false";
      if (menuControl.dataset.overMedia !== next) menuControl.dataset.overMedia = next;
    }

    /**
     * Safari 26 no longer reads `theme-color`. It derives the tint of each browser bar
     * from the `background-color` of a `position: fixed` element at that edge of the
     * window, falling back to the body — and only from one it would actually draw, which
     * the two `.chrome-tint` anchors were not, first buried at `z-index: -1` under the
     * opaque paper canvas and then at `opacity: 0`. Both bars stayed one colour over every
     * photograph as a result. The anchors are opaque now; this points each of them at the
     * surface its own bar is drawn over — sampled independently, so a window showing a seam
     * no longer has to choose.
     *
     * Writing the colour here is what makes the bars follow the page: a fixed layer is not
     * re-sampled by scrolling alone, but repainting it marks the window edges dirty and the
     * next commit re-derives them. See docs/ios26-tint-root-cause.md.
     *
     * The colour is read out of the photograph rather than from a per-chapter constant.
     * The plate is viewport-fixed and the frame inside it pans, so the rows under a bar
     * move while the chapter is on screen: at 1440 × 900 the DUSK frame travels from its
     * lit sun to its dark forest, and no constant is both. The frame's own ramp plus the
     * pan offset gives the exact band, and the measured constants stay as the floor for
     * the frames that have not decoded yet.
     */
    function renderChromeSurface(scrollY: number) {
      const height = window.innerHeight;

      /**
       * The photograph under the window rows `[from, to]`. The plate is pinned to the
       * window and the frame is translated inside it by the pan, so those rows map onto
       * the frame by subtracting the pan — no layout is read to do it. Until the frame
       * decodes there is no ramp and the answer is `--chapter-tone`, which is exactly what
       * the masked window is painting in the meantime.
       */
      const colourOf = (surface: ChapterSurface, from: number, to: number) => {
        const travel = surface.bottom - surface.top + height;
        const progress =
          reducedMotion.matches || travel <= 0
            ? 0
            : clamp((scrollY - (surface.top - height)) / travel, 0, 1);
        const imageTop =
          surface.pinTop -
          progress * surface.overflowRatio * CHAPTER_PAN_STRENGTH * surface.imageHeight;
        return (
          rampColour(
            surface.frame,
            imageTop,
            imageTop + surface.imageHeight,
            from,
            to,
          ) ??
          parseHex(
            getComputedStyle(surface.section).getPropertyValue("--chapter-tone"),
          ) ??
          paperRGB
        );
      };

      /**
       * Composite the band in paint order — paper foreground, then the chapters, whose
       * DOM order is their z-order — and let the page ground take whatever is left. This
       * is what stops a bar from turning the colour of a photograph the silhouette has
       * not opened yet: at a chapter boundary the coverage is partial and the tint stays
       * mostly paper, which is what the reader sees there.
       */
      const barTint = (from: number, to: number) => {
        const channels: [number, number, number] = [0, 0, 0];
        let remaining = 1;
        const paint = (colour: readonly [number, number, number], coverage: number) => {
          const share = clamp(coverage, 0, 1) * remaining;
          for (let channel = 0; channel < 3; channel += 1) {
            channels[channel] += colour[channel] * share;
          }
          remaining -= share;
        };

        for (const band of paperBands) {
          if (remaining <= 0.002) break;
          paint(
            paperRGB,
            rampCoverage(
              band.ramp,
              band.top,
              band.bottom,
              from + scrollY,
              to + scrollY,
            ),
          );
        }
        for (const surface of chapterSurfaces) {
          if (remaining <= 0.002) break;
          const coverage = rampCoverage(
            surface.mask,
            surface.top,
            surface.bottom,
            from + scrollY,
            to + scrollY,
          );
          if (coverage <= 0) continue;
          paint(colourOf(surface, from, to), coverage);
        }
        paint(paperRGB, 1);
        return `#${hexChannel(channels[0])}${hexChannel(channels[1])}${hexChannel(channels[2])}`;
      };

      const topTint = barTint(0, STATUS_BAR);
      const bottomTint = barTint(height - TOOL_BAR, height);

      for (const layer of chromeTints) {
        const next = layer.dataset.edge === "bottom" ? bottomTint : topTint;
        if (layer.dataset.tint === next) continue;
        layer.dataset.tint = next;
        layer.style.setProperty("--chrome-tint", next);
      }
      // The body is what Safari falls back to when it finds no anchor, and it is the one
      // colour both bars would then share. It is invisible either way: `.page-canvas`
      // covers the document and the overscroll rubber band is painted from the root.
      if (document.body.style.backgroundColor !== topTint) {
        document.body.style.backgroundColor = topTint;
      }
      // Chrome, Edge and iOS before 26 still honour the meta, and it colours one bar.
      if (themeColor && themeColor.content !== topTint) themeColor.content = topTint;
    }

    function render() {
      const scrollY = window.scrollY;
      renderControlSurface(scrollY);
      renderChromeSurface(scrollY);

      if (reducedMotion.matches) {
        reset();
        return;
      }

      const viewportHeight = window.innerHeight;
      const scale = scaleOf();

      for (const target of crossings) {
        const span = target.end - target.start;
        const progress = span > 0 ? clamp((scrollY - target.start) / span, 0, 1) : 1;
        for (const axis of target.axes) {
          const offset = (axis.from + (axis.to - axis.from) * progress) / scale;
          target.element.style.setProperty(axis.property, `${offset.toFixed(2)}px`);
        }
      }

      for (const target of pans) {
        if (target.overflowRatio === 0) {
          target.element.style.setProperty("--chapter-pan-y", "0%");
          continue;
        }
        // The chapter is on screen from the frame its top edge reaches the viewport
        // bottom until its bottom edge leaves the viewport top.
        const travel = target.bottom - target.top + viewportHeight;
        const progress = clamp(
          (scrollY - (target.top - viewportHeight)) / travel,
          0,
          1,
        );
        target.element.style.setProperty(
          "--chapter-pan-y",
          `${(-progress * target.overflowRatio * CHAPTER_PAN_STRENGTH * 100).toFixed(3)}%`,
        );
      }
    }

    function loop() {
      const scrollY = window.scrollY;
      if (scrollY === lastScroll) idleFrames += 1;
      else {
        idleFrames = 0;
        lastScroll = scrollY;
      }
      render();
      // Sampling per frame rather than per scroll event keeps the drift in step with the
      // compositor even when the browser coalesces scroll events.
      loopFrame = idleFrames < IDLE_FRAMES ? window.requestAnimationFrame(loop) : 0;
    }

    function wake() {
      idleFrames = 0;
      if (!loopFrame) loopFrame = window.requestAnimationFrame(loop);
    }

    measure();

    const indicator = document.querySelector<HTMLElement>(".scroll-indicator");
    const observer =
      indicator && "IntersectionObserver" in window
        ? new IntersectionObserver(
            ([entry]) => {
              indicator.dataset.motionVisible = entry.isIntersecting ? "true" : "false";
            },
            { rootMargin: "64px" },
          )
        : null;
    if (indicator) observer?.observe(indicator);

    // DA-MEDIA-01 follow-up: the deferred chapter photographs are armed roughly one and a
    // half viewports early, so a chapter can never arrive before its frame has decoded.
    const deferred = [
      ...document.querySelectorAll<HTMLImageElement>(
        '.chapter-photo-pin img[loading="lazy"]',
      ),
    ];
    const preloader =
      deferred.length > 0 && "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries, self) => {
              for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                entry.target.querySelector("img")?.removeAttribute("loading");
                self.unobserve(entry.target);
              }
            },
            { rootMargin: "150% 0px" },
          )
        : null;
    for (const image of deferred) {
      const chapter = image.closest("[data-chapter]");
      if (chapter) preloader?.observe(chapter);
    }

    const resizeObserver =
      "ResizeObserver" in window ? new ResizeObserver(requestMeasure) : null;
    const canvas = document.querySelector(".page-canvas");
    if (canvas) resizeObserver?.observe(canvas);

    // A `<source>` intrinsic box is a promise, not a measurement: re-measure once each
    // frame has actually decoded so the pan range is taken from the real rendered box.
    const photographs = [
      ...document.querySelectorAll<HTMLImageElement>(".chapter-photo-pin img"),
    ];
    for (const photograph of photographs) {
      photograph.addEventListener("load", requestMeasure);
    }

    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", requestMeasure, { passive: true });
    window.addEventListener("pageshow", requestMeasure);
    reducedMotion.addEventListener("change", requestMeasure);

    return () => {
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", requestMeasure);
      window.removeEventListener("pageshow", requestMeasure);
      reducedMotion.removeEventListener("change", requestMeasure);
      observer?.disconnect();
      preloader?.disconnect();
      resizeObserver?.disconnect();
      for (const photograph of photographs) {
        photograph.removeEventListener("load", requestMeasure);
      }
      if (loopFrame) window.cancelAnimationFrame(loopFrame);
      if (measureFrame) window.cancelAnimationFrame(measureFrame);
      document.body.style.removeProperty("background-color");
      reset();
    };
  }, []);

  return null;
}
