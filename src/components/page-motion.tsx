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
 * Depth of the strip at the top of the window that a mobile browser draws its status bar
 * and address bar over. iOS reserves about 60 px for the status bar alone; this is
 * rounded up so the surface decision is taken on ink the bars actually cover.
 */
const CHROME_STRIP = 96;

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
    /** The chapter elements behind `mediaBands`, index for index. */
    const chapterSections: HTMLElement[] = [];
    /** The paper page below the last chapter. */
    const footerBands: Band[] = [];
    let menuControl: HTMLElement | null = null;
    let themeColor: HTMLMetaElement | null = null;
    let chromeTint: HTMLElement | null = null;
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
      chapterSections.length = 0;
      footerBands.length = 0;

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
      chromeTint = document.querySelector<HTMLElement>(".chrome-tint");
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
      const scrollY = window.scrollY;
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
        chapterSections.push(chapter);
      }

      for (const element of document.querySelectorAll<HTMLElement>(
        'footer[data-fidelity="footer"]',
      )) {
        const box = element.getBoundingClientRect();
        footerBands.push({ bottom: box.bottom + scrollY, top: box.top + scrollY });
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
     * Safari 26 no longer reads `theme-color`. It derives the tint of the status bar and
     * the toolbar from the `background-color` of the `position: fixed` elements nearest
     * the window edges, and this page has four full-window fixed chapter plates that are
     * present at every scroll position — so one chapter's colour was painted into both
     * bars for the whole document, over the paper page as much as over its own
     * photograph. The plates carry no colour at all now — they are clipped by their own
     * window, which takes them out of the browser's reckoning anyway — and one dedicated
     * fixed layer behind the page carries the tint instead. This points that layer at the
     * surface the bars are actually drawn over: `--chapter-chrome` is the measured mean
     * of the band at the top of each photograph, which is not the photograph's own mean
     * wherever the frame opens on sky. Over the paper page it is the paper.
     *
     * The strip the bars occupy is short, so the decision is taken on the top of the
     * window rather than on the whole of it: that is where the status bar sits, it is the
     * one bar iOS never collapses, and the mobile plate pans only a few per cent of its
     * frame, so that band stays the same colour for the whole chapter.
     */
    function renderChromeSurface(scrollY: number) {
      const top = scrollY;
      const bottom = scrollY + Math.min(CHROME_STRIP, window.innerHeight);
      const overlaps = (band: Band) => band.top < bottom && band.bottom > top;
      // The two bars take one colour between them, so they can only disagree where a
      // seam crosses the window. The page has one such seam that matters — the last
      // chapter into the paper footer — and there the reader has arrived at the footer,
      // which fills most of the window and sits under the bottom bar. Paper wins that
      // one; the ALPINE frame above it is a pale sky, so the status bar barely parts
      // from it. Everywhere else the top of the window decides.
      const footerTop = scrollY + window.innerHeight - CHROME_STRIP;
      const footerBottom = scrollY + window.innerHeight;
      const bottomOnPaper = footerBands.some(
        (band) => band.top < footerBottom && band.bottom > footerTop,
      );
      let active: HTMLElement | null = null;
      if (!bottomOnPaper) {
        // Chapters overlap at their seams and the earlier one holds the higher
        // `z-index`, so the first match is the one actually painting at the window top.
        for (const [index, band] of mediaBands.entries()) {
          if (!overlaps(band)) continue;
          active = chapterSections[index] ?? null;
          break;
        }
      }

      const tint = active
        ? getComputedStyle(active).getPropertyValue("--chapter-chrome").trim() ||
          paperTint
        : paperTint;

      if (chromeTint && chromeTint.dataset.tint !== tint) {
        chromeTint.dataset.tint = tint;
        chromeTint.style.setProperty("--chrome-tint", tint);
      }
      // Chrome, Edge and iOS before 26 still honour the meta, so it is kept in step.
      if (themeColor && themeColor.content !== tint) themeColor.content = tint;
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
      reset();
    };
  }, []);

  return null;
}
