/**
 * Device diagnostic for the iOS 26 browser-bar bands. Not part of the landing page: it is
 * served at `/edge-probe` so the defect can be measured on the phone that shows it, with
 * no Mac and no Web Inspector attached — every number a Safari-only question needs,
 * printed large enough to screenshot.
 *
 * A route handler rather than a page, so that nothing about the measurement belongs to the
 * framework: no hydration, no bundler CSS, no React. The document below is exactly what the
 * device parses, and it declares no `theme-color`, so whatever the browser bars do here is
 * the browser's own heuristic and nothing the page asked for.
 *
 * Remove this route once the defect is closed.
 */
export const dynamic = "force-static";

const probeDocument = String.raw`
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>MOYOY edge probe</title>
<style>
  /* Deliberately NO theme-color meta: this page must present the same "no declared
     tint" state the production page does, so whatever the bars do here is the browser's
     own heuristic and nothing else. */

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    /* MAGENTA is the marker colour. It is what sits *behind* the plate, exactly as
       '.chapter-photo''s flat fill sits behind '.chapter-photo-pin' on the real page.
       Any magenta visible at a window edge means the plate does not reach that edge. */
    background: #d81b60;
  }

  body { height: 320vh; }

  /* The plate under test — the analogue of '.chapter-photo-pin'. Its content is a hard
     stripe pattern so that a flat band of any kind is unmistakable against it. */
  #plate {
    position: fixed;
    z-index: 1;
    overflow: clip;
    background-image: repeating-linear-gradient(
      135deg,
      #0b3d2c 0 22px,
      #12281d 22px 44px,
      #2f6b4a 44px 52px
    );
  }

  /* Variant A — what production ships today. */
  body[data-variant="A"] #plate { inset: 0; }
  /* Variant B — the reverted attempt: sized to the large viewport. */
  body[data-variant="B"] #plate { top: 0; right: 0; left: 0; height: max(100%, 100lvh); }
  /* Variant C — a fixed overhang past both edges, independent of any viewport unit. */
  body[data-variant="C"] #plate { inset: -160px 0; }
  /* Variant D — plate absent, so the marker colour is what the bars see. */
  body[data-variant="D"] #plate { display: none; }

  /* The production shields, reproduced exactly. */
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

  /* Rulers pinned to the plate's own edges, so a screenshot shows where the plate
     believes the window ends without needing a console. */
  .ruler {
    position: absolute;
    left: 0;
    z-index: 2;
    width: 100%;
    height: 3px;
    background: #ffd400;
  }
  .ruler[data-at="top"] { top: 0; }
  .ruler[data-at="bottom"] { bottom: 0; }

  /* Readout. Vertically centred on purpose: it must never sit at a window edge, or it
     would answer the edge hit test itself and change what is being measured. */
  #readout {
    position: fixed;
    z-index: 3;
    top: 50%;
    left: 50%;
    width: min(92vw, 430px);
    transform: translate(-50%, -50%);
    padding: 12px 14px;
    border-radius: 10px;
    color: #f4f1ea;
    background: rgb(0 0 0 / 86%);
    font: 500 13px/1.5 ui-monospace, "SF Mono", Menlo, monospace;
    -webkit-text-size-adjust: 100%;
  }
  #readout b { color: #ffd400; font-weight: 700; }
  #readout .k { color: #9fb4ab; }
  #readout .warn { color: #ff7a7a; }
  #readout .ok { color: #7ee08a; }
  #controls {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
  }
  #controls button {
    flex: 1 1 auto;
    padding: 9px 6px;
    border: 1px solid #55655d;
    border-radius: 7px;
    color: #f4f1ea;
    background: #1d2724;
    font: inherit;
  }
  #controls button[aria-pressed="true"] {
    color: #12281d;
    background: #ffd400;
    border-color: #ffd400;
  }
  h1 {
    margin: 0 0 8px;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
</style>

<div id="plate">
  <div class="ruler" data-at="top"></div>
  <div class="ruler" data-at="bottom"></div>
</div>
<div aria-hidden="true" class="chrome-shield" data-edge="top"></div>
<div aria-hidden="true" class="chrome-shield" data-edge="bottom"></div>

<div id="readout">
  <h1>edge probe</h1>
  <div id="out">…</div>
  <div id="controls">
    <button data-set="variant" data-value="A" type="button">A inset:0</button>
    <button data-set="variant" data-value="B" type="button">B lvh</button>
    <button data-set="variant" data-value="C" type="button">C ±160</button>
    <button data-set="variant" data-value="D" type="button">D none</button>
  </div>
  <div id="controls">
    <button data-set="shield" data-value="on" type="button">shield ON</button>
    <button data-set="shield" data-value="off" type="button">shield OFF</button>
  </div>
</div>

<script>
  const body = document.body;
  const out = document.getElementById("out");
  const plate = document.getElementById("plate");

  const params = new URLSearchParams(location.search);
  body.dataset.variant = params.get("variant") || "A";
  body.dataset.shield = params.get("shield") || "on";

  // A probe box per viewport-unit flavour, measured rather than assumed: on iOS these
  // three disagree, and which one 'position: fixed' follows is the whole question.
  const units = {};
  for (const unit of ["vh", "svh", "lvh", "dvh"]) {
    const box = document.createElement("div");
    box.style.cssText =
      "position:absolute;top:0;left:0;width:1px;visibility:hidden;pointer-events:none;height:100" +
      unit;
    document.body.append(box);
    units[unit] = box;
  }

  const safeArea = document.createElement("div");
  safeArea.style.cssText =
    "position:absolute;top:0;left:0;width:1px;visibility:hidden;pointer-events:none;" +
    "padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)";
  document.body.append(safeArea);

  function describe(node) {
    if (!node) return "(none)";
    const id = node.id ? "#" + node.id : "";
    const cls =
      typeof node.className === "string" && node.className.trim()
        ? "." + node.className.trim().split(/\s+/).join(".")
        : "";
    const edge = node.dataset && node.dataset.edge ? "[" + node.dataset.edge + "]" : "";
    return node.tagName.toLowerCase() + id + cls + edge;
  }

  // 'elementFromPoint' honours 'pointer-events', which WebKit's first sampling pass does
  // not. The shields are lifted for the read and restored straight after it.
  function hitAt(x, y) {
    const shields = [...document.querySelectorAll(".chrome-shield")];
    const saved = shields.map((s) => s.style.pointerEvents);
    for (const s of shields) s.style.pointerEvents = "auto";
    const node = document.elementFromPoint(x, y);
    for (const [i, s] of shields.entries()) s.style.pointerEvents = saved[i];
    return node;
  }

  function px(value) {
    return Math.round(value * 100) / 100;
  }

  function render() {
    const vv = window.visualViewport;
    const rect = plate.getBoundingClientRect();
    const style = getComputedStyle(safeArea);
    const shown = body.dataset.variant !== "D";
    const bottomGap = shown ? px(window.innerHeight - rect.bottom) : NaN;
    const topGap = shown ? px(rect.top) : NaN;
    const verdict = (gap) =>
      Number.isNaN(gap)
        ? '<span class="k">n/a</span>'
        : gap <= 0.5
          ? '<span class="ok">reaches</span>'
          : '<span class="warn">' + gap + "px SHORT</span>";

    out.innerHTML = [
      "<b>" + body.dataset.variant + "</b> / shield <b>" + body.dataset.shield + "</b>",
      '<span class="k">window   </span>' +
        window.innerWidth +
        " x " +
        window.innerHeight +
        "  dpr " +
        window.devicePixelRatio,
      '<span class="k">visualVP </span>' +
        (vv ? px(vv.width) + " x " + px(vv.height) + "  offTop " + px(vv.offsetTop) : "-"),
      '<span class="k">clientH  </span>' + document.documentElement.clientHeight,
      '<span class="k">vh/svh   </span>' +
        px(units.vh.getBoundingClientRect().height) +
        " / " +
        px(units.svh.getBoundingClientRect().height),
      '<span class="k">lvh/dvh  </span><b>' +
        px(units.lvh.getBoundingClientRect().height) +
        "</b> / " +
        px(units.dvh.getBoundingClientRect().height),
      '<span class="k">safe t/b </span>' + style.paddingTop + " / " + style.paddingBottom,
      '<span class="k">plate    </span>top ' + px(rect.top) + "  bottom " + px(rect.bottom),
      '<span class="k">top edge </span>' + verdict(topGap),
      '<span class="k">bot edge </span>' + verdict(bottomGap),
      '<span class="k">hit  top </span>' + describe(hitAt(window.innerWidth / 2, 4)),
      '<span class="k">hit  bot </span>' +
        describe(hitAt(window.innerWidth / 2, window.innerHeight - 4)),
      '<span class="k">scrollY  </span>' + Math.round(window.scrollY),
    ].join("<br>");

    for (const button of document.querySelectorAll("#controls button")) {
      button.setAttribute(
        "aria-pressed",
        String(body.dataset[button.dataset.set] === button.dataset.value),
      );
    }
  }

  for (const button of document.querySelectorAll("#controls button")) {
    button.addEventListener("click", () => {
      body.dataset[button.dataset.set] = button.dataset.value;
      render();
    });
  }

  addEventListener("scroll", render, { passive: true });
  addEventListener("resize", render, { passive: true });
  if (window.visualViewport) {
    visualViewport.addEventListener("resize", render);
    visualViewport.addEventListener("scroll", render);
  }
  render();
  setInterval(render, 400);
</script>
`;

export function GET(): Response {
  return new Response(probeDocument, {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8",
    },
  });
}
