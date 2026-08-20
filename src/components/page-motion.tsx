"use client";

import { useEffect } from "react";

import { chapterRamps } from "@/lib/moyoy-content";

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
  /** The chapter's masked window, which owns the geometry both layers below read. */
  photo: HTMLElement | null;
  /** The document-level copy of the photograph that answers the browser-bar strips. */
  mirror: HTMLElement | null;
  /**
   * The document-level layer that answers the browser-bar strips, carried here because it
   * is placed by the frame's own geometry: the same box, the same offset. Only its offset
   * moves per frame, and only through `transform`, so the masked chapter is never
   * repainted for it.
   */
  bleed: HTMLElement | null;
  /** Set once the layer has been seen in its pinned position; never unset afterwards. */
  confirmed: boolean;
  bottom: number;
  imageHeight: number;
  overflowRatio: number;
  /** The frame's vertical colour, read at its two edges to fill the browser-bar strips. */
  ramp: readonly string[];
  top: number;
  written: [string, string];
}

/**
 * How far past the frame `.chapter-photo-bleed` carries the ramp's two ends. Measured on an
 * iPhone at 402 x 754: the screen is 874 CSS px, so the browser bars take 120 px between
 * them with the toolbar retracted and 160 px with it expanded — about 66 above and up to
 * 94 below. A fixed box is clipped to the window and reaches neither, so the bleed answers
 * both with room to spare.
 */
const CHAPTER_BLEED = 240;

/**
 * Slack held back from the photograph's travel so the browser-bar mirror always spans the
 * whole screen, and the floor under the estimate of the status bar's own height.
 *
 * The page knows the screen height and the window height, but not where the window sits
 * between them, and the two strips are not a fixed ratio of the difference: measured on an
 * iPhone, the status bar is a constant 62.8 CSS px while the toolbar is 58.1 collapsed and
 * 98.1 expanded, so the top's share moves from 52 % to 39 % of the same quantity. One
 * fraction cannot serve both, which leaves `env(safe-area-inset-top)` as the only signal
 * that tracks the constant.
 *
 * It cannot be trusted alone. WebKit 301994 has it returning 0 on several shipping iOS
 * versions, and a zero there would put the photograph's top edge inside the status bar with
 * the flat fill above it — the defect this layer exists to remove. Hence a floor: the
 * estimate is whichever of the two is larger.
 *
 * The arithmetic these two numbers have to satisfy, for the shortest approved derivative
 * (927.6 CSS px rendered against an 874 px screen):
 *
 *     cover the status bar     topCover >= 62.8
 *     cover the toolbar        imageHeight - topCover - innerHeight - travel >= toolbar
 *
 * At 67 and 29.6 the photograph reaches 67 to 96.6 px above the window and 117 to 146.6 px
 * below it, against 62.8 and 98.1 needed. Both hold in either toolbar state, and they still
 * hold if the safe-area inset reports zero.
 */
const MIRROR_SAFETY = 24;
const STATUS_BAR_FLOOR = 56;
const MIRROR_MARGIN = 8;

/** Linear read of a colour ramp at `position` in 0…1, returned as an `rgb()` string. */
function sampleRamp(ramp: readonly string[], position: number): string {
  if (ramp.length < 2) return "";
  const scaled = Math.min(Math.max(position, 0), 1) * (ramp.length - 1);
  const index = Math.min(Math.floor(scaled), ramp.length - 2);
  const mix = scaled - index;
  const from = ramp[index];
  const to = ramp[index + 1];
  const channel = (offset: number) => {
    const a = Number.parseInt(from.slice(offset, offset + 2), 16);
    const b = Number.parseInt(to.slice(offset, offset + 2), 16);
    return Math.round(a + (b - a) * mix);
  };
  return `rgb(${channel(1)} ${channel(3)} ${channel(5)})`;
}

interface Band {
  bottom: number;
  top: number;
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

export function PageMotion() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const crossings: CrossingTarget[] = [];
    const pans: PanTarget[] = [];
    /** Document bands whose surface is photography rather than the paper page. */
    const mediaBands: Band[] = [];
    /** Paper artwork that is painted over a chapter and hides the photograph behind it. */
    const paperBands: Band[] = [];
    let menuControl: HTMLElement | null = null;
    /** The control is `position: fixed`, so its window band is constant. */
    let menuBand: Band | null = null;
    let loopFrame = 0;
    let measureFrame = 0;
    let confirmFrame = 0;
    let idleFrames = 0;
    let lastScroll = Number.NaN;
    /** Cached in `measure()` so the animation path never forces a layout. */
    let maximumScroll = 0;
    /** The window height the mirror's endpoints were derived at; see `measure()`. */
    let measuredHeight = 0;
    /** `env(safe-area-inset-top)`, read through a probe because CSS cannot hand it over. */
    let safeAreaTop = 0;

    const isCompact = () => window.innerWidth < COMPACT_WIDTH;
    /**
     * `env(safe-area-inset-top)` is not readable from script, so it is measured through a
     * throwaway box. It stands in for the status bar's own height, which is the one part of
     * the difference between the screen and the window that does not change as the address
     * bar collapses.
     */
    const readSafeAreaTop = () => {
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px)";
      document.body.append(probe);
      const inset = probe.getBoundingClientRect().height;
      probe.remove();
      return Number.isFinite(inset) ? inset : 0;
    };
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
        const chapter = element.closest<HTMLElement>("[data-chapter]");
        const id = chapter?.dataset.chapter as keyof typeof chapterRamps.pc | undefined;
        pans.push({
          bleed:
            element
              .closest<HTMLElement>(".chapter-photo")
              ?.querySelector<HTMLElement>(".chapter-photo-bleed") ?? null,
          mirror:
            element
              .closest<HTMLElement>(".chapter-photo")
              ?.querySelector<HTMLElement>(".chapter-photo-mirror") ?? null,
          photo: element.closest<HTMLElement>(".chapter-photo"),
          bottom: 0,
          confirmed: false,
          element,
          imageHeight: 0,
          overflowRatio: 0,
          // Which crop is rendered decides which ramp is true of it, and the breakpoint
          // decides the crop. `collect()` runs from `measure()`, so a resize across it
          // re-reads this.
          ramp: id ? chapterRamps[isCompact() ? "sp" : "pc"][id] : [],
          top: 0,
          written: ["", ""],
        });
      }

      menuControl = document.querySelector<HTMLElement>(".menu-open-button");
    }

    function reset() {
      for (const target of crossings) {
        for (const axis of target.axes)
          target.element.style.setProperty(axis.property, "0px");
      }
      for (const target of pans) {
        target.element.style.removeProperty("--chapter-pan-y");
        target.photo?.style.setProperty("--chapter-pan-y", "0%");
        target.photo?.style.setProperty("--chapter-window", "0px");
        target.photo?.style.setProperty("--chapter-bleed", "0px");
        target.bleed?.style.setProperty("--chapter-window-y", "0px");
        target.written = ["", ""];
      }
    }

    /** Cache untransformed document geometry; never called from the animation path. */
    function measure() {
      measureFrame = 0;
      measuredHeight = window.innerHeight;
      safeAreaTop = readSafeAreaTop();
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
      const scale = scaleOf();
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
        target.imageHeight = imageHeight;
        target.overflowRatio =
          imageHeight > 0
            ? Math.max(0, (imageHeight - viewportHeight) / imageHeight)
            : 0;
        // The window and the strips beyond it, in artboard units: client rects are window
        // pixels and both layers live inside the zoomed artboard, so every length written
        // here is divided back the way every other offset is. They go on the chapter's own
        // window so the fill and the mirror read the same numbers.
        target.photo?.style.setProperty(
          "--chapter-window",
          `${(viewportHeight / scale).toFixed(2)}px`,
        );
        target.photo?.style.setProperty(
          "--chapter-bleed",
          `${(CHAPTER_BLEED / scale).toFixed(2)}px`,
        );

        // The mirror's two keyframe endpoints. A perfect pin puts its box top one bleed
        // above the window at every scroll offset, so the translation it needs is
        // `scrollY - bleed - (the chapter's own document top)` — and the scroll timeline
        // interpolates linearly between the value at scroll 0 and the value at maximum
        // scroll, which is exactly these two.
        //
        // Both are derived from the chapter's MEASURED document top rather than from a CSS
        // expression meant to cancel one, and both are re-derived whenever the window height
        // changes. Measured on the diagnostic: cancelling expressions still round separately
        // during layout and left 0.22 CSS px behind, and endpoints left stale across an
        // address-bar collapse put an error of 0.75 % of the scroll offset into the pin —
        // small near the top of the document and compounding all the way down it.
        const mirror = target.mirror;
        if (mirror) {
          mirror.style.setProperty(
            "--chapter-mirror-height",
            `${((viewportHeight + 2 * CHAPTER_BLEED) / scale).toFixed(2)}px`,
          );
          mirror.style.setProperty(
            "--chapter-mirror-inset",
            `${(CHAPTER_BLEED / scale).toFixed(2)}px`,
          );
          mirror.style.setProperty(
            "--chapter-mirror-from",
            `${((-CHAPTER_BLEED - target.top) / scale).toFixed(2)}px`,
          );
          mirror.style.setProperty(
            "--chapter-mirror-to",
            `${((maximumScroll - CHAPTER_BLEED - target.top) / scale).toFixed(2)}px`,
          );
        }
      }

      for (const chapter of document.querySelectorAll<HTMLElement>("[data-chapter]")) {
        const box = chapter.getBoundingClientRect();
        mediaBands.push({ bottom: box.bottom + scrollY, top: box.top + scrollY });
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
        paperBands.push({ bottom: box.bottom + scrollY, top: box.top + scrollY });
      }

      if (menuControl) {
        const box = menuControl.getBoundingClientRect();
        menuBand = { bottom: box.bottom, top: box.top };
      }

      lastScroll = Number.NaN;
      render();
      requestConfirm();
    }

    function requestMeasure() {
      if (measureFrame) return;
      measureFrame = window.requestAnimationFrame(measure);
    }

    /**
     * Reveal a mirror only once it is actually where it belongs.
     *
     * Writing the keyframe endpoints is not the same as the animation having applied them.
     * Measured in WebKit at 402 x 714: on the first frames after load the mirrors sat up to
     * 2 681 CSS px away from their pinned position, which on a device is a flash of the
     * wrong part of the photograph inside both browser bars. Chromium applied them
     * immediately. So the gate is the position itself, checked for a bounded number of
     * frames after each measure and never on the scroll path.
     */
    function confirmMirrors(remaining = 30) {
      confirmFrame = 0;
      let pending = false;
      for (const target of pans) {
        const mirror = target.mirror;
        // Confirmed once, and then left alone. The check reads the main thread's copy of a
        // threaded animation's transform, and in WebKit that copy converges a few frames
        // after the scroll offset it belongs to. Re-running it after every measure would
        // hide a perfectly correct mirror for a few frames whenever the address bar changed
        // the window height — a flicker of the flat fill at exactly the moments this layer
        // exists to fix. What needs preventing is the initial flash, and that happens once.
        if (!mirror || target.confirmed) continue;
        if (!mirror.style.getPropertyValue("--chapter-mirror-to")) {
          pending = true;
          continue;
        }
        if (Math.abs(mirror.getBoundingClientRect().top + CHAPTER_BLEED) <= 1) {
          target.confirmed = true;
          mirror.dataset.mirror = "ready";
        } else pending = true;
      }
      if (pending && remaining > 0) {
        confirmFrame = window.requestAnimationFrame(() =>
          confirmMirrors(remaining - 1),
        );
      }
    }

    function requestConfirm() {
      if (confirmFrame) return;
      confirmFrame = window.requestAnimationFrame(() => confirmMirrors());
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

    function render() {
      const scrollY = window.scrollY;
      renderControlSurface(scrollY);

      if (reducedMotion.matches) {
        reset();
        return;
      }

      const viewportHeight = window.innerHeight;
      // The mirror's endpoints are a function of the window height, and iOS changes the
      // window height whenever the address bar collapses or expands. `resize` alone did not
      // catch it on the device: measured on the diagnostic, endpoints left stale across one
      // collapse put an error of 0.75 % of the scroll offset into the pin — 11.8 px at
      // scrollY 1817 and 28.5 px at 3916, invisible at the top of the page and compounding
      // all the way down it. This is one integer comparison per frame and schedules the
      // re-measure for the next one; the 1 : 1 tracking itself stays CSS's.
      if (viewportHeight !== measuredHeight) requestMeasure();
      const scale = scaleOf();
      const compact = isCompact();

      for (const target of crossings) {
        const span = target.end - target.start;
        const progress = span > 0 ? clamp((scrollY - target.start) / span, 0, 1) : 1;
        for (const axis of target.axes) {
          const offset = (axis.from + (axis.to - axis.from) * progress) / scale;
          target.element.style.setProperty(axis.property, `${offset.toFixed(2)}px`);
        }
      }

      // The screen, the window, and therefore the strips the browser bars occupy. The
      // split between them cannot be read directly, so the top is estimated from the
      // safe-area inset — constant, and close to the status bar — and whatever is left of
      // the difference is the toolbar's.
      const screenHeight = window.screen?.height ?? viewportHeight;
      const strips = Math.max(0, screenHeight - viewportHeight);
      const topCover = compact
        ? Math.min(strips, Math.max(safeAreaTop, STATUS_BAR_FLOOR) + MIRROR_MARGIN)
        : 0;

      for (const target of pans) {
        if (target.imageHeight === 0) {
          target.photo?.style.setProperty("--chapter-pan-y", "0%");
          continue;
        }
        // The chapter is on screen from the frame its top edge reaches the viewport
        // bottom until its bottom edge leaves the viewport top.
        const crossing = target.bottom - target.top + viewportHeight;
        const progress = clamp(
          (scrollY - (target.top - viewportHeight)) / crossing,
          0,
          1,
        );
        // How far the frame may travel, and where it starts.
        //
        // On a desktop window this is unchanged: the whole hidden remainder is traversed
        // once, which is the published acceptance criterion at 1440 x 900.
        //
        // Where the browser draws its own bars over the page, the same photograph also has
        // to reach past both window edges, and it cannot do both. Measured on an iPhone at
        // 402 x 714: the SP derivative renders 927.7 CSS px tall against a 874 px screen, so
        // 53.7 px of it is spare once the screen is covered, against 213.7 px of travel if
        // only the window has to be covered. Something has to give, and DA-MEDIA-01 asks for
        // a photograph that does not scroll, so what gives is the travel. The frame also has
        // to start above the window rather than level with it, because a photograph whose
        // top edge is at the window's top edge cannot appear above it. Both consequences are
        // recorded as deviations; both disappear if derivatives with vertical context are
        // ever produced.
        const travel = Math.max(
          0,
          compact
            ? target.imageHeight - screenHeight - MIRROR_SAFETY
            : target.imageHeight - viewportHeight,
        );
        const offset = -topCover - progress * travel * CHAPTER_PAN_STRENGTH;
        const pan = offset / target.imageHeight;
        // On the chapter, not on the plate's image: the mirror's image is in a sibling
        // subtree and can only receive this by inheritance from their common ancestor.
        target.photo?.style.setProperty(
          "--chapter-pan-y",
          `${(pan * 100).toFixed(3)}%`,
        );
        const bleed = target.bleed;
        if (!bleed) continue;
        // The plate is pinned to the window, so in the chapter's own coordinates the window
        // begins at the scroll offset.
        bleed.style.setProperty(
          "--chapter-window-y",
          `${((scrollY - target.top) / scale).toFixed(2)}px`,
        );
        // Where the window's two edges fall on the frame, and therefore which colours the
        // strips beyond them have to hold if the mirror is unavailable. The pan moves the
        // frame up, so the window opens that much further down it.
        const window0 = -offset;
        const edgeTop = sampleRamp(target.ramp, window0 / target.imageHeight);
        const edgeBottom = sampleRamp(
          target.ramp,
          (window0 + viewportHeight) / target.imageHeight,
        );
        // A colour write repaints the strip, unlike the transform above, so only a colour
        // that actually changed is written.
        if (edgeTop !== target.written[0]) {
          bleed.style.setProperty("--chapter-edge-top", edgeTop);
          target.written[0] = edgeTop;
        }
        if (edgeBottom !== target.written[1]) {
          bleed.style.setProperty("--chapter-edge-bottom", edgeBottom);
          target.written[1] = edgeBottom;
        }
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
        '.chapter-photo img[loading="lazy"]',
      ),
    ];
    const preloader =
      deferred.length > 0 && "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries, self) => {
              for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                // Every deferred image in the chapter, not the first one. The chapter now
                // holds the photograph twice — once on the plate and once on the mirror
                // that answers the browser bars — and taking only the first left the plate
                // itself lazy, so it arrived after its own chapter did.
                for (const image of entry.target.querySelectorAll("img[loading]")) {
                  image.removeAttribute("loading");
                }
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
      ...document.querySelectorAll<HTMLImageElement>(".chapter-photo img"),
    ];
    for (const photograph of photographs) {
      photograph.addEventListener("load", requestMeasure);
    }

    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", requestMeasure, { passive: true });
    window.addEventListener("pageshow", requestMeasure);
    // The visual viewport reports a collapsing address bar directly, where `resize` may not.
    window.visualViewport?.addEventListener("resize", requestMeasure);
    reducedMotion.addEventListener("change", requestMeasure);

    return () => {
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", requestMeasure);
      window.removeEventListener("pageshow", requestMeasure);
      window.visualViewport?.removeEventListener("resize", requestMeasure);
      reducedMotion.removeEventListener("change", requestMeasure);
      observer?.disconnect();
      preloader?.disconnect();
      resizeObserver?.disconnect();
      for (const photograph of photographs) {
        photograph.removeEventListener("load", requestMeasure);
      }
      if (loopFrame) window.cancelAnimationFrame(loopFrame);
      if (measureFrame) window.cancelAnimationFrame(measureFrame);
      if (confirmFrame) window.cancelAnimationFrame(confirmFrame);
      document.body.style.removeProperty("background-color");
      reset();
    };
  }, []);

  return null;
}
