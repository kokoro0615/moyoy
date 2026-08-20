/**
 * Device diagnostic for the iOS 26 browser-bar bands, round five. Not part of the landing
 * page: it is served at `/edge-probe` so the defect can be measured on the phone that
 * shows it, with no Mac and no Web Inspector attached.
 *
 * Rounds one and two settled the mechanism on the device. `lvh` equals `innerHeight`, so
 * no viewport unit reaches past the window. A fixed box declaring a 160 px overhang paints
 * no further than one declaring none — it is clipped to the window. And the strips the
 * browser bars occupy are translucent over the DOCUMENT's own scrolled paint: a striped
 * absolutely positioned band read back through the top bar, while the viewport-fixed plate
 * never appeared in a strip at all.
 *
 * Round three asked which document-level candidate can carry the photograph there and
 * answered it. `background-attachment: fixed` is unsupported on iOS and scrolls with the
 * document. `position: sticky` never reaches the strips and unpins at its parent's edge.
 * An ordinary absolutely positioned box pinned from a `scroll` + rAF loop does reach them,
 * but trails the compositor by about 13 CSS px under a fast flick, because the main thread
 * cannot follow asynchronous scrolling.
 *
 * So the layer that answers the strips has to be ordinary document content, and whatever
 * holds it still has to run off the main thread. Round five is that candidate:
 * `5 css-timeline`, an ordinary absolutely positioned box counter-translated 1 : 1 against
 * the root scroll timeline by CSS alone. Safari 26.4 moved scroll-driven animations onto
 * the compositor; if that holds here, this box is screen-stationary and document content
 * at the same time, which is exactly what the bars need.
 *
 * Round five measures TWO boundaries, not one, because a single rail-to-bar comparison
 * cannot say which of them failed:
 *
 *     root scroll            -> threaded transform      (tracking error)
 *     transformed document   -> native bar backdrop     (bar transfer)
 *
 * The same candidate layer is therefore read twice in every frame — once through a slot
 * cut in the fixed plate, inside the window, and once in the bar strip outside it — and
 * both are read against a screen-fixed rail. If the window-side reading is stationary and
 * only the bar-side one moves, the timeline is fine and the native strip is not being fed
 * the post-transform surface. If both move, the timeline is the problem.
 *
 * Kept after each fix rather than retired with it. The mechanism it measures is an
 * unstandardised browser heuristic that has already changed once, and nothing about it is
 * visible from a desktop browser or from any test in this repository — so when a future
 * iOS moves it again, this is the only instrument that can say what moved. It is not
 * linked from the page and is covered by the site-wide noindex.
 *
 * Reading the result is a measurement, not a glance. The pattern geometry, the regions of
 * interest, the phase-recovery method and the predeclared acceptance thresholds are in
 * `docs/edge-probe-5-measurement-spec.md`, which is written before the recording is made.
 */
export const dynamic = "force-static";

/**
 * Pattern geometry.
 *
 * Round three used 135° stripes, which cannot be measured: averaging a diagonal pattern
 * across an x window smears the vertical profile by the whole width of that window, so
 * hard colour stops read back as a monotone ramp. Confirmed against the round-three
 * recordings. These stripes are horizontal, so a region can be averaged across its full
 * width for signal-to-noise at no cost in vertical resolution.
 *
 * A plain periodic carrier is not enough on its own. A 12 px period reads a true error of
 * 13 px — which is what candidate 3 was measured at — as +1 px, and that is a false pass,
 * not a rounding error. Frame-to-frame continuity does not rescue it either: iOS momentum
 * can carry more than a period per 30 fps frame, and a screen recording may drop or repeat
 * frames.
 *
 * So each cell carries one of three tones, and the tone sequence is a ternary de Bruijn
 * sequence of order 4: every window of four consecutive cells appears exactly once, so a
 * single frame identifies its own position absolutely, with no continuity assumption and no
 * modulo. Continuity is then only a tie-breaker across the sequence's own repeat.
 *
 * The cell is 8 CSS px rather than 12 because of what the first device recording measured.
 * The bottom strip is 98 CSS px with the toolbar expanded and decoded cleanly, but the top
 * strip is only 63 px — five cells at 12 px — and there the correlation peak was separated
 * from its nearest whole-cell rival by as little as 0.015, which is not a measurement. At
 * 8 px the same strip carries seven cells and the bottom carries twelve. Four cells still
 * decode in principle; measured, four cells let four different region-building strategies
 * return four different answers on frames where the page was not moving at all.
 *
 * The rail's background is offset by `BLEED`, which is also where a perfect pin puts the
 * candidate's box top. The two codes are therefore in phase by construction, and the offset
 * a correct pin produces is zero derived from this geometry rather than fitted from the
 * recording. A non-zero reading on the fixed rail means the harness is wrong, not the page.
 */
const CELL = 8;
const LIT = 4;
/** Clear space between a lane and the window edge, so no lane can sit inside a bar strip. */
const MARGIN = 36;
/**
 * Height of one reading lane. The de Bruijn window is four cells; a lane is five, so every
 * reading carries one cell more evidence than uniqueness strictly needs. Measured on
 * synthetic signals, four cells decode correctly but leave only 0.02-0.08 of correlation
 * between the true offset and its nearest whole-cell rival, which is thin once a real
 * recording's noise is added. Five widens that margin at no cost: the bar strips are about
 * 61 CSS px, so a 60 px lane still fits inside one.
 */
const LANE = 60;
const TELEMETRY_TOP = 180;
const BLEED = 240;
const CODE_ORDER = 4;
/**
 * Green-channel levels 95 / 168 / 240 over a shade at 32. The code lives in the difference
 * between the three tones while the carrier lives in the difference between tone and shade,
 * so the tones are spread as widely as the hue allows: a narrow spread puts most of the
 * signal into the part that every whole-cell offset shares, which is exactly the part that
 * cannot tell them apart.
 */
const TONES = ["#085f6b", "#0da8bc", "#6ef0ff"] as const;
const SHADE = "#032026";

/**
 * Cyclic de Bruijn sequence of order `CODE_ORDER`: every window of that many symbols
 * occurs exactly once. Ruskey's Lyndon-word construction — note the recursion carries `t`,
 * not `1`, into the branching call. Passing `1` there produces a shorter sequence with
 * repeated windows, which looks plausible and silently destroys the property the whole
 * measurement rests on, so the result is checked below rather than trusted.
 */
function deBruijn(alphabet: number, order: number): number[] {
  const register = new Array<number>(alphabet * order).fill(0);
  const sequence: number[] = [];
  const visit = (position: number, period: number): void => {
    if (position > order) {
      if (order % period === 0) sequence.push(...register.slice(1, period + 1));
      return;
    }
    register[position] = register[position - period];
    visit(position + 1, period);
    for (let symbol = register[position - period] + 1; symbol < alphabet; symbol += 1) {
      register[position] = symbol;
      visit(position + 1, position);
    }
  };
  visit(1, 1);
  return sequence;
}

/**
 * The property the analysis depends on, asserted where it is cheap: any window of
 * `CODE_ORDER` cells identifies its own position in the sequence. A build that cannot
 * satisfy this must fail loudly rather than serve a probe that cannot be read.
 */
function assertWindowsAreUnique(sequence: readonly number[], order: number): void {
  const windows = new Set<string>();
  for (let index = 0; index < sequence.length; index += 1) {
    windows.add(
      Array.from(
        { length: order },
        (_, offset) => sequence[(index + offset) % sequence.length],
      ).join(""),
    );
  }
  if (windows.size !== sequence.length) {
    throw new Error(
      `edge probe carrier code is not uniquely decodable: ${windows.size} distinct windows for ${sequence.length} cells`,
    );
  }
}

const CODE = deBruijn(TONES.length, CODE_ORDER);
assertWindowsAreUnique(CODE, CODE_ORDER);
const CODE_SPAN = CODE.length * CELL;

/**
 * The carrier is built from two layers rather than one gradient, because one gradient
 * cannot be both long and sharp. Measured in WebKit: a single 972 px gradient carrying all
 * 162 stops comes back with every transition smeared over about ±2 px, which is a quarter
 * of a 6 px stripe — the brightest tone then peaks for a single row instead of holding a
 * plateau, the template stops matching what is on screen, and the correlation peak becomes
 * unstable. The cause is the ramp table a long gradient is rasterised into: 972 px across a
 * few hundred entries is several pixels per entry.
 *
 * So the sharp part and the long part are separated. `carrierMask` is a 12 px repeating
 * mask — a short tile, rasterised sharply — and it alone decides where a lit stripe begins
 * and ends. `codeRamp` only has to hold one tone per 12 px cell, so its smeared boundaries
 * are harmless; shifting it up by a quarter cell puts every boundary in the middle of a
 * shade stripe, where the mask hides it, and leaves the whole lit stripe on a clean plateau.
 */
const CODE_NUDGE = LIT / 2;

const carrierMask = `repeating-linear-gradient(to bottom, #000 0 ${LIT}px, #0000 ${LIT}px ${CELL}px)`;

const codeRamp = `linear-gradient(to bottom, ${CODE.map((symbol, index) => {
  const top = index * CELL;
  return `${TONES[symbol]} ${top}px ${top + CELL}px`;
}).join(", ")})`;

/** Short marker proving which source produced the document that is being served. */
function sourceMarker(input: string): string {
  let hash = 0x81_1c_9d_c5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01_00_01_93) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

const probeBody = String.raw`<!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>MOYOY edge probe 5</title>
<meta name="edge-probe" content="__DESCRIPTOR__" />
<style>
  /* Every candidate paints the CODED CYAN carrier; the flat fill that produces the band
     today is MAGENTA; the page ground outside the band is CREAM; the viewport-fixed plate
     that covers the window is GREEN. Coded cyan in a bar means that candidate reaches it,
     and where it reaches it says nothing until its phase is measured.

     Four horizontal bands are cut into the window, twice — once near the top edge and once
     near the bottom — so that one frame carries all three readings next to each other:

       WITNESS  the candidate itself, seen through a slot in the fixed plate
       RAIL     the same pattern held still by the window, the fixed reference
       (plate)  everything else

     With an exact pin the witness stripes and the rail stripes line up, and so do the
     stripes in the bar strip beyond the window edge. */

  * { box-sizing: border-box; }
  html, body { margin: 0; background: #ece7d8; }
  /* A long runway: a fast flick with momentum covers a few thousand px, and the gate is a
     maximum over frames, so the band has to stay on screen long enough to produce them. */
  body { height: 800vh; }

  /* The document band - the analogue of '.chapter-photo', flat-filled as the landing page
     fills it today. */
  #tone {
    position: absolute;
    top: 80vh;
    right: 0;
    left: 0;
    height: 640vh;
    background-color: #c2185b;
  }

  /* Candidate 2 - one declaration on the band itself: a background whose positioning area
     is the viewport rather than the element, which is how the fixed plate is framed. */
  body[data-try="bgfix"] #tone {
    background-attachment: fixed;
    background-color: var(--shade);
    background-image: repeating-linear-gradient(
      to bottom, #0da8bc 0 6px, #032026 6px 12px
    );
  }

  #bleed { display: none; }
  /* Candidates 3 and 4 answer whether a layer reaches the strips at all, not where its
     stripes are, so they keep the plain two-tone carrier. */
  body[data-try="jsabs"] #bleed,
  body[data-try="sticky"] #bleed {
    display: block;
    background-color: var(--shade);
    background-image: repeating-linear-gradient(
      to bottom, #0da8bc 0 6px, #032026 6px 12px
    );
  }
  /* Candidate 3 - an ordinary absolutely positioned box, pinned from the scroll loop. */
  body[data-try="jsabs"] #bleed {
    position: absolute;
    top: var(--js-top, 0);
    right: 0;
    left: 0;
    height: var(--js-height, 0);
  }
  /* Candidate 4 - sticky, which the browser pins itself but only within its own band. */
  body[data-try="sticky"] #bleed {
    position: sticky;
    top: calc(-1 * var(--js-bleed, 80px));
    height: calc(100lvh + 2 * var(--js-bleed, 80px));
  }

  /* Candidate 5 - ordinary document content, counter-translated 1 : 1 against the root
     scroll timeline by CSS alone, so it is screen-stationary without a main-thread frame
     loop. '--pin-to' is the document's own maximum scroll, measured on load, resize,
     orientation and pageshow and never during a scroll: the obvious '260vh' is wrong by up
     to 40 px here, because 'vh' is the large viewport while 'innerHeight' shrinks when the
     toolbar expands, and 40 px of scale error is twenty times the gate.

     The counter-pin and the pattern are separate elements on purpose. Production has to pan
     the photograph inside the mirror while the mirror holds still, and one element cannot
     carry both transforms without one overwriting the other. */
  #csst { display: none; }
  body[data-try="csstimeline"] #csst {
    display: block;
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    height: calc(100vh + 480px);
  }
  /* Gated, so an engine without scroll timelines shows the box at its authored document
     position rather than parked at the keyframe's end value. Firefox 153 has no
     'animation-timeline' and no 'animation-duration: auto': ungated, the animation ran on
     the document timeline, finished in a second and held 'translateY(maxScroll)' forever,
     which puts the mirror a whole document away from where it belongs. Production takes
     the same gate, and falls back to the mean-colour bleed. */
  @supports (animation-timeline: scroll(root block)) and (animation-duration: auto) {
    body[data-try="csstimeline"] #csst {
      animation-name: counter-pin;
      animation-duration: auto;
      animation-timing-function: linear;
      animation-fill-mode: both;
      animation-timeline: scroll(root block);
    }
  }
  @keyframes counter-pin {
    from { transform: translate3d(0, var(--pin-from, 0px), 0); }
    to { transform: translate3d(0, var(--pin-to, 0px), 0); }
  }
  /* The inner elements carry the pattern; the outer one carries the pin, so the two
     transforms production needs — the counter-pin and the photograph's own pan — never
     have to share one property. */
  #csst-pattern {
    height: 100%;
    background-color: var(--shade);
  }
  .code-ramp {
    height: 100%;
    background-image: var(--code);
    background-position: 0 calc(-1 * var(--code-nudge));
    background-size: 100% var(--code-span);
    -webkit-mask-image: var(--carrier-mask);
    mask-image: var(--carrier-mask);
  }
  /* Production clips the chapter window with 'clip-path: inset(0)' and masks it with an
     alpha silhouette. Both sit on the ancestor of the layer that has to reach the bars, so
     both are asked here whether they take that overflow away from it. */
  body[data-try="csstimeline"] #tone { clip-path: inset(0); overflow: clip; }
  body[data-mask="on"] #tone {
    -webkit-mask-image: linear-gradient(#000, #000);
    mask-image: linear-gradient(#000, #000);
    mask-mode: alpha;
  }

  /* The fixed reference. Its box is the window, so its pattern is anchored to the window;
     the offset undoes the bleed, which puts its code in phase with the candidate's when the
     pin is exact. It is masked down to two bands well clear of both window edges, so it can
     never appear inside a bar strip and contaminate the candidate's own region. */
  #rail {
    position: fixed;
    z-index: 2;
    inset: 0;
    background-color: var(--shade);
    pointer-events: none;
    -webkit-mask-image: var(--rail-bands);
    mask-image: var(--rail-bands);
  }
  /* The rail's box is the window while the candidate's box top is one bleed above it, so
     the rail's code is shifted by exactly that bleed. The bleed is a whole number of cells,
     so the two carriers are in phase and a correct pin puts their stripes on the same rows —
     visible at a glance in the frame, and zero by construction in the measurement. */
  #rail > .code-ramp {
    background-position: 0 calc(-240px - var(--code-nudge));
  }

  /* Always present: the viewport-fixed plate the landing page ships. The mask cuts the two
     witness slots into it and paints nothing else differently — a mask is invisible to the
     edge sampler, so the plate remains exactly the layer that causes the defect. */
  #plate {
    position: fixed;
    z-index: 1;
    inset: 0;
    overflow: clip;
    background-image: repeating-linear-gradient(
      to bottom, #2f6b4a 0 6px, #12281d 6px 12px
    );
    -webkit-mask-image: var(--plate-mask);
    mask-image: var(--plate-mask);
  }
  body[data-plate="off"] #plate { display: none; }

  /* The window's own two edges, marked in the frame. The analysis reads the recording's
     scale and both bar-strip extents off these, so they are outside the plate and present
     in every state. */
  #rulers { position: fixed; z-index: 4; inset: 0; pointer-events: none; }
  .ruler { position: absolute; left: 0; width: 100%; height: 3px; background: #ffd400; }
  .ruler[data-at="top"] { top: 0; }
  .ruler[data-at="bottom"] { bottom: 0; }

  /* Per-frame telemetry, at a fixed offset from the window top so its digits stay in one
     place for the whole recording. 'S' is the scroll offset and 'F' a frame counter that
     advances once per animation frame, which is how the analysis detects a recording that
     dropped or repeated frames. Reading the scroll offset out of the video is also what
     labels each frame slow, fast, momentum, reverse or stopped, and what makes the
     "every frame happened to be a whole number of periods out" objection answerable. */
  #telemetry {
    position: fixed;
    z-index: 4;
    top: __TELEMETRY_TOP__px;
    left: 0;
    width: 100%;
    height: 36px;
    background: #000;
    pointer-events: none;
  }
  #telemetry-text {
    height: 22px;
    color: #ffd400;
    font: 700 15px/22px ui-monospace, "SF Mono", Menlo, monospace;
    letter-spacing: 0.06em;
    text-align: center;
    -webkit-text-size-adjust: 100%;
  }
  /* The same two numbers again, as bits. Reading a monospace font back out of a rescaled
     screen recording is a font-matching problem that has nothing to do with this page;
     reading 28 cells of black or white is not. The two markers at the ends let the analysis
     find the row and its cell pitch without being told where they are. */
  #telemetry-bits {
    display: flex;
    height: 14px;
  }
  #telemetry-bits i { flex: 1 1 0; background: #000; }

  .chrome-shield {
    position: fixed;
    z-index: 120;
    left: calc(50% - 12px);
    width: 24px;
    height: 200px;
    background-color: #ece7d8;
    opacity: 1;
    visibility: visible;
    pointer-events: none;
    -webkit-mask-image: linear-gradient(#0000, #0000);
    mask-image: linear-gradient(#0000, #0000);
  }
  .chrome-shield[data-edge="top"] { top: -100px; }
  .chrome-shield[data-edge="bottom"] { bottom: -100px; }
  body[data-shield="off"] .chrome-shield { display: none; }

  #readout {
    position: fixed;
    z-index: 3;
    top: 50%;
    left: 50%;
    width: min(76vw, 300px);
    transform: translate(-50%, -50%);
    padding: 8px 10px;
    border-radius: 9px;
    color: #f4f1ea;
    background: rgb(0 0 0 / 90%);
    font: 500 10.5px/1.38 ui-monospace, "SF Mono", Menlo, monospace;
    -webkit-text-size-adjust: 100%;
  }
  #readout b { color: #ffd400; font-weight: 700; }
  .k { color: #9fb4ab; }
  .row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
  .row button {
    flex: 1 1 auto;
    padding: 7px 2px;
    border: 1px solid #55655d;
    border-radius: 6px;
    color: #f4f1ea;
    background: #1d2724;
    font: inherit;
  }
  .row button[aria-pressed="true"] { color: #12281d; background: #ffd400; border-color: #ffd400; }
  h1 { margin: 0 0 5px; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; }
</style>

<div id="tone">
  <div id="csst"><div id="csst-pattern"><div class="code-ramp"></div></div></div>
  <div id="bleed"></div>
</div>
<div id="plate"></div>
<div aria-hidden="true" id="rail"><div class="code-ramp"></div></div>
<div id="rulers">
  <div class="ruler" data-at="top"></div>
  <div class="ruler" data-at="bottom"></div>
</div>
<div aria-hidden="true" id="telemetry"><div id="telemetry-text">S----- F----</div><div id="telemetry-bits"></div></div>
<div aria-hidden="true" class="chrome-shield" data-edge="top"></div>
<div aria-hidden="true" class="chrome-shield" data-edge="bottom"></div>

<div id="readout">
  <h1>edge probe 5</h1>
  <div id="out">…</div>
  <div class="row">
    <button data-set="try" data-value="none" type="button">1 none</button>
    <button data-set="try" data-value="bgfix" type="button">2 bg-fix</button>
    <button data-set="try" data-value="jsabs" type="button">3 js-abs</button>
    <button data-set="try" data-value="sticky" type="button">4 sticky</button>
  </div>
  <div class="row">
    <button data-set="try" data-value="csstimeline" type="button">5 css-timeline</button>
  </div>
  <div class="row">
    <button data-set="plate" data-value="on" type="button">plate ON</button>
    <button data-set="plate" data-value="off" type="button">plate OFF</button>
    <button data-set="shield" data-value="on" type="button">shield ON</button>
    <button data-set="shield" data-value="off" type="button">shield OFF</button>
  </div>
  <div class="row">
    <button data-set="mask" data-value="off" type="button">mask OFF</button>
    <button data-set="mask" data-value="on" type="button">mask ON</button>
  </div>
</div>

<script>
  const body = document.body;
  const out = document.getElementById("out");
  const tone = document.getElementById("tone");
  const bleed = document.getElementById("bleed");
  const csst = document.getElementById("csst");
  const text = document.getElementById("telemetry-text");
  const bits = document.getElementById("telemetry-bits");
  const BLEED = __BLEED__;
  const LANE = __LANE__;
  const MARGIN = __MARGIN__;
  const JS_BLEED = 80;
  const MARKER = "__MARKER__";

  const params = new URLSearchParams(location.search);
  body.dataset.try = params.get("try") || "csstimeline";
  body.dataset.plate = params.get("plate") || "on";
  body.dataset.shield = params.get("shield") || "on";
  body.dataset.mask = params.get("mask") || "off";

  const units = {};
  for (const unit of ["lvh", "svh", "dvh"]) {
    const box = document.createElement("div");
    box.style.cssText =
      "position:absolute;top:0;left:0;width:1px;visibility:hidden;pointer-events:none;height:100" +
      unit;
    document.body.append(box);
    units[unit] = box;
  }

  const supports = {
    timeline: CSS.supports("animation-timeline", "scroll(root block)"),
    duration: CSS.supports("animation-duration", "auto"),
  };

  const px = (v) => Math.round(v * 10) / 10;
  const pad = (v, width) => String(Math.max(0, Math.round(v))).padStart(width, "0").slice(-width);

  function scroller() {
    return document.scrollingElement || document.documentElement;
  }

  function maximumScroll() {
    const box = scroller();
    return Math.max(0, box.scrollHeight - box.clientHeight);
  }

  /**
   * Geometry only. This runs on load, resize, orientation and pageshow — never on scroll.
   * The 1 : 1 counter-translation itself belongs to CSS, which is the whole point of round
   * five: a value written from here per frame is exactly the main-thread lag candidate 3
   * already demonstrates.
   *
   * Both endpoints are derived from the band's own measured document top rather than from
   * a CSS expression that is meant to cancel one. Two '80vh' terms cancelling algebraically
   * still round separately during layout, and the residual measured 0.22 CSS px — eleven
   * per cent of the gate, in exactly the quantity the gate is on. Production has no
   * cancelling expression available anyway: its mirror sits at whatever document offset its
   * chapter has, so measuring the offset is the shape that transfers.
   *
   * The offset is read from the root element's own rect, never from 'window.scrollY'.
   * WebKit scrolls on a separate thread, so a measure raised by a load in the middle of a
   * scroll can pair a client rect with a scroll position the rects have not reached, and a
   * cache built in that frame stays wrong for the rest of the session.
   */
  let measuredHeight = 0;

  function measure() {
    measuredHeight = innerHeight;
    const offset = -document.documentElement.getBoundingClientRect().top;
    const bandTop = tone.getBoundingClientRect().top + offset;
    const maximum = maximumScroll();
    // Wanted: after the translation the box's document top is 'scrollY - BLEED'.
    body.style.setProperty("--pin-from", (-bandTop - BLEED).toFixed(2) + "px");
    body.style.setProperty("--pin-to", (maximum - bandTop - BLEED).toFixed(2) + "px");
    render();
  }

  /** Candidate 3 only: the main-thread pin, kept for regression comparison. */
  function pin() {
    if (body.dataset.try !== "jsabs") return;
    const toneTop = tone.getBoundingClientRect().top + scrollY;
    body.style.setProperty("--js-top", Math.round(scrollY - toneTop - JS_BLEED) + "px");
    body.style.setProperty("--js-height", innerHeight + JS_BLEED * 2 + "px");
  }

  function translateY(node) {
    const value = getComputedStyle(node).transform;
    if (!value || value === "none") return 0;
    const parts = value.slice(value.indexOf("(") + 1, -1).split(",");
    if (value.startsWith("matrix3d")) return Number.parseFloat(parts[13]);
    return Number.parseFloat(parts[5]);
  }

  function render() {
    pin();
    const mode = body.dataset.try;
    const boxed = mode === "jsabs" || mode === "sticky" || mode === "csstimeline";
    const node = mode === "csstimeline" ? csst : bleed;
    const rect = boxed ? node.getBoundingClientRect() : null;
    out.innerHTML = [
      "try <b>" + mode + "</b> plate <b>" + body.dataset.plate +
        "</b> shield <b>" + body.dataset.shield + "</b> mask <b>" + body.dataset.mask + "</b>",
      '<span class="k">win </span>' + innerWidth + "x" + innerHeight +
        '  <span class="k">scr </span>' + screen.width + "x" + screen.height +
        " @" + devicePixelRatio,
      '<span class="k">l/s/dvh </span>' +
        px(units.lvh.getBoundingClientRect().height) + "/" +
        px(units.svh.getBoundingClientRect().height) + "/" +
        px(units.dvh.getBoundingClientRect().height),
      '<span class="k">scroll </span>' + Math.round(scrollY) + " / " + Math.round(maximumScroll()) +
        '  <span class="k">pin </span>' +
        Math.round(Number.parseFloat(body.style.getPropertyValue("--pin-from")) || 0) + ".." +
        Math.round(Number.parseFloat(body.style.getPropertyValue("--pin-to")) || 0),
      '<span class="k">cand </span>' +
        (rect
          ? "top " + px(rect.top) + " bot " + px(rect.bottom)
          : mode === "bgfix"
            ? "(background, no box)"
            : "(none)"),
      '<span class="k">overhang </span>' +
        (rect ? "t " + px(-rect.top) + " b " + px(rect.bottom - innerHeight) : "-") +
        '  <span class="k">dy </span>' +
        (mode === "csstimeline" ? px(translateY(csst)) : "-"),
      '<span class="k">pinAt </span>' + measuredHeight +
        '  <span class="k">supports </span>timeline ' + (supports.timeline ? "Y" : "N") +
        "  dur-auto " + (supports.duration ? "Y" : "N"),
      '<span class="k">lanes </span>' + MARGIN + "+" + LANE + "/" + BLEED +
        '  <span class="k">build </span>' + MARKER,
    ].join("<br>");

    for (const button of document.querySelectorAll(".row button")) {
      button.setAttribute(
        "aria-pressed",
        String(body.dataset[button.dataset.set] === button.dataset.value),
      );
    }
  }

  /**
   * Cell 0 and cell 27 are always lit, so the analysis can find the row and its pitch;
   * cells 1..16 are the scroll offset, 17..24 the frame counter, 25..26 a parity pair.
   */
  const BITS = 28;
  const cells = [];
  for (let index = 0; index < BITS; index += 1) {
    const cell = document.createElement("i");
    bits.append(cell);
    cells.push(cell);
  }

  function writeBits(scroll, frame) {
    const value = [];
    for (let bit = 15; bit >= 0; bit -= 1) value.push((scroll >> bit) & 1);
    for (let bit = 7; bit >= 0; bit -= 1) value.push((frame >> bit) & 1);
    let ones = 0;
    for (const one of value) ones += one;
    value.push(ones & 1, (ones >> 1) & 1);
    const pattern = [1, ...value, 1];
    for (const [index, cell] of cells.entries()) {
      const next = pattern[index] ? "#fff" : "#000";
      if (cell.dataset.on !== next) {
        cell.style.backgroundColor = next;
        cell.dataset.on = next;
      }
    }
  }

  /**
   * One permanent animation frame loop, writing the two numbers the analysis reads back
   * out of the recording. It is also a deliberate, constant main-thread load: if the
   * candidate stays put while this is running, the pin is not on this thread.
   */
  let frames = 0;
  function tick() {
    frames += 1;
    const scroll = Math.max(0, Math.min(65535, Math.round(scrollY)));
    text.textContent = "S" + pad(scroll, 5) + " F" + pad(frames, 4);
    writeBits(scroll, frames & 255);
    requestAnimationFrame(tick);
  }

  for (const button of document.querySelectorAll(".row button")) {
    button.addEventListener("click", () => {
      body.dataset[button.dataset.set] = button.dataset.value;
      measure();
    });
  }

  addEventListener("scroll", render, { passive: true });
  addEventListener("resize", measure, { passive: true });
  addEventListener("orientationchange", measure, { passive: true });
  addEventListener("pageshow", measure);
  /**
   * The endpoints are a function of the window height, and iOS changes the window height
   * whenever the address bar collapses or expands. The first device recording measured what
   * happens when that goes unnoticed: the pin keeps a span derived from the old height, the
   * timeline normalises over the new one, and the two differ by 40 CSS px out of about
   * 5300 — so the layer acquires an error of 0.75 % OF THE SCROLL OFFSET. Measured on that
   * recording: 11.8 px at scrollY 1817, 28.5 px at 3916, climbing with the scroll exactly as
   * a scale error must. Under 2 px near the top of the document and far outside it further
   * down, which is the most misleading shape a defect can have.
   *
   * 'resize' alone did not catch it. The visual viewport reports the change directly, and a
   * cheap poll of the window height is the backstop for the case where neither fires. None
   * of this is on the scroll path: the 1 : 1 tracking is still CSS's, and this only keeps the
   * two numbers CSS interpolates between honest.
   */
  visualViewport?.addEventListener("resize", measure);
  visualViewport?.addEventListener("scroll", () => {
    if (innerHeight !== measuredHeight) measure();
  });
  measure();
  requestAnimationFrame(tick);
  setInterval(() => {
    if (innerHeight !== measuredHeight) measure();
    render();
  }, 250);

  addEventListener("load", () => {
    measure();
    if (!scrollY) scrollTo(0, Math.round(innerHeight * 2.4));
  });
</script>
`;

/**
 * The two masks that cut the window into lanes. Both are stated here rather than in the
 * stylesheet so the geometry is derived from `MARGIN` and `LANE` once and published in the
 * descriptor, instead of being written twice and drifting.
 */
const RAIL_TOP = MARGIN + LANE;
const RAIL_BOTTOM = MARGIN + 2 * LANE;

const railBands = [
  "linear-gradient(to bottom",
  `#0000 0 ${RAIL_TOP}px`,
  `#000 ${RAIL_TOP}px ${RAIL_BOTTOM}px`,
  `#0000 ${RAIL_BOTTOM}px calc(100% - ${RAIL_BOTTOM}px)`,
  `#000 calc(100% - ${RAIL_BOTTOM}px) calc(100% - ${RAIL_TOP}px)`,
  `#0000 calc(100% - ${RAIL_TOP}px) 100%)`,
].join(", ");

const plateMask = [
  "linear-gradient(to bottom",
  `#000 0 ${MARGIN}px`,
  `#0000 ${MARGIN}px ${MARGIN + LANE}px`,
  `#000 ${MARGIN + LANE}px calc(100% - ${MARGIN + LANE}px)`,
  `#0000 calc(100% - ${MARGIN + LANE}px) calc(100% - ${MARGIN}px)`,
  `#000 calc(100% - ${MARGIN}px) 100%)`,
].join(", ");

const rootVariables = [
  ":root{",
  `--code:${codeRamp};`,
  `--carrier-mask:${carrierMask};`,
  `--code-span:${CODE_SPAN}px;`,
  `--code-nudge:${CODE_NUDGE}px;`,
  `--shade:${SHADE};`,
  `--rail-bands:${railBands};`,
  `--plate-mask:${plateMask};`,
  "}",
].join("");

/**
 * The probe describes its own pattern, so the analysis reads the geometry out of the page
 * it actually recorded instead of keeping a second copy that can drift from this file.
 * A template built from anything else is measuring a different probe.
 */
const descriptor = [
  `cell=${CELL}`,
  `lit=${LIT}`,
  `nudge=${CODE_NUDGE}`,
  `margin=${MARGIN}`,
  `lane=${LANE}`,
  `telemetry=${TELEMETRY_TOP}`,
  `telemetrybits=28`,
  `telemetryheight=36`,
  `bleed=${BLEED}`,
  `order=${CODE_ORDER}`,
  `tones=${TONES.join("|")}`,
  `shade=${SHADE}`,
  `code=${CODE.join("")}`,
].join(";");

const probeDocument = probeBody
  .replace("<style>", `<style>${rootVariables}`)
  .replace("__DESCRIPTOR__", descriptor)
  .replace("__BLEED__", String(BLEED))
  .replace("__TELEMETRY_TOP__", String(TELEMETRY_TOP))
  .replace(/__LANE__/g, String(LANE))
  .replace(/__MARGIN__/g, String(MARGIN))
  .replace("__MARKER__", sourceMarker(probeBody + rootVariables + descriptor));

export function GET(): Response {
  return new Response(probeDocument, {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8",
    },
  });
}
