/**
 * Device diagnostic for the iOS 26 browser-bar bands, round two. Not part of the landing
 * page: it is served at `/edge-probe` so the defect can be measured on the phone that
 * shows it, with no Mac and no Web Inspector attached.
 *
 * Round one settled three things on the device, and they are why this page exists in its
 * present shape: `lvh` equals `innerHeight`, so no viewport unit can size a box past the
 * window; a fixed box is clipped to the window even when it declares a 160 px overhang;
 * and the strips the browser bars occupy carry the page's ground colour at unchanged hue
 * and lightness with roughly 19 points of saturation removed — a translucent material
 * over something, not an opaque fill.
 *
 * What that something is decides every candidate fix, and this page separates the four
 * possibilities by colour: the document band is teal, the fixed plate is green, the
 * document ground is the landing page's own paper, and the striped variants tell real
 * paint apart from a derived flat colour.
 *
 * A route handler rather than a page, so nothing about the measurement belongs to the
 * framework: no hydration, no bundler CSS, no React. It declares no `theme-color`, so
 * whatever the bars do here is the browser's own heuristic.
 *
 * Remove this route once the defect is closed.
 */
export const dynamic = "force-static";

const probeDocument = String.raw`
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>MOYOY edge probe 2</title>
<style>
  /* Round two. Round one established, on the device, that:
       - lvh === innerHeight === 754, so no viewport unit can size a box past the window;
       - a fixed box is clipped to the window even when it declares a 160px overhang;
       - the strips the browser bars occupy show the page's ground colour, desaturated by
         about 19 points of saturation at unchanged hue and lightness - a translucent
         material over something, not an opaque fill.
     What is unresolved is WHAT that something is: document content that scrolls, or one
     flat colour the browser derived from the page. Every candidate fix depends on which. */

  * { box-sizing: border-box; }

  /* PAPER - the landing page's real document ground, so the fallback here is its fallback. */
  html, body { margin: 0; background: #ece7d8; }
  body { height: 340vh; }

  /* TEAL - the analogue of '.chapter-photo': an ordinary absolutely positioned box, part
     of the document, spanning one band of it exactly as a chapter does. If a bar shows
     teal, this box is what the bar is over. If it shows teal STRIPES, the bar is over
     real scrolled paint and a photograph could be put there; if it shows FLAT teal in the
     striped variants, the browser is not showing paint at all - it derived a colour. */
  #tone {
    position: absolute;
    top: 90vh;
    right: 0;
    left: 0;
    height: 160vh;
  }
  body[data-tone="flat"] #tone { background-color: #0e8f9e; }
  body[data-tone="scroll"] #tone {
    background-image: repeating-linear-gradient(
      135deg, #0e8f9e 0 20px, #063f47 20px 40px, #16c0d4 40px 46px
    );
  }
  body[data-tone="fixed"] #tone {
    background-attachment: fixed;
    background-image: repeating-linear-gradient(
      135deg, #0e8f9e 0 20px, #063f47 20px 40px, #16c0d4 40px 46px
    );
  }
  body[data-tone="none"] #tone { background: none; }

  /* GREEN - the analogue of '.chapter-photo-pin': the viewport-fixed plate. */
  #plate {
    position: fixed;
    z-index: 1;
    inset: 0;
    overflow: clip;
    background-image: repeating-linear-gradient(
      135deg, #0b3d2c 0 22px, #12281d 22px 44px, #2f6b4a 44px 52px
    );
  }
  body[data-plate="off"] #plate { display: none; }

  .ruler { position: absolute; left: 0; z-index: 2; width: 100%; height: 3px; background: #ffd400; }
  .ruler[data-at="top"] { top: 0; }
  .ruler[data-at="bottom"] { bottom: 0; }

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
    width: min(93vw, 440px);
    transform: translate(-50%, -50%);
    padding: 12px 14px;
    border-radius: 10px;
    color: #f4f1ea;
    background: rgb(0 0 0 / 88%);
    font: 500 13px/1.5 ui-monospace, "SF Mono", Menlo, monospace;
    -webkit-text-size-adjust: 100%;
  }
  #readout b { color: #ffd400; font-weight: 700; }
  .k { color: #9fb4ab; }
  .row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .row button {
    flex: 1 1 auto;
    padding: 9px 4px;
    border: 1px solid #55655d;
    border-radius: 7px;
    color: #f4f1ea;
    background: #1d2724;
    font: inherit;
  }
  .row button[aria-pressed="true"] { color: #12281d; background: #ffd400; border-color: #ffd400; }
  h1 { margin: 0 0 8px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; }
  #legend { margin-top: 8px; color: #9fb4ab; font-size: 11.5px; line-height: 1.45; }
</style>

<div id="tone"></div>
<div id="plate">
  <div class="ruler" data-at="top"></div>
  <div class="ruler" data-at="bottom"></div>
</div>
<div aria-hidden="true" class="chrome-shield" data-edge="top"></div>
<div aria-hidden="true" class="chrome-shield" data-edge="bottom"></div>

<div id="readout">
  <h1>edge probe 2</h1>
  <div id="out">…</div>
  <div class="row">
    <button data-set="tone" data-value="flat" type="button">1 flat</button>
    <button data-set="tone" data-value="scroll" type="button">2 stripes</button>
    <button data-set="tone" data-value="fixed" type="button">3 str-fixed</button>
    <button data-set="tone" data-value="none" type="button">4 none</button>
  </div>
  <div class="row">
    <button data-set="plate" data-value="on" type="button">plate ON</button>
    <button data-set="plate" data-value="off" type="button">plate OFF</button>
    <button data-set="shield" data-value="on" type="button">shield ON</button>
    <button data-set="shield" data-value="off" type="button">shield OFF</button>
  </div>
  <div id="legend">
    bar shows TEAL STRIPES = document paint reaches it · FLAT TEAL = derived colour ·
    CREAM = html/body only · GREEN = the fixed plate reaches it
  </div>
</div>

<script>
  const body = document.body;
  const out = document.getElementById("out");
  const plate = document.getElementById("plate");
  const tone = document.getElementById("tone");

  const params = new URLSearchParams(location.search);
  body.dataset.tone = params.get("tone") || "scroll";
  body.dataset.plate = params.get("plate") || "on";
  body.dataset.shield = params.get("shield") || "on";

  const units = {};
  for (const unit of ["vh", "svh", "lvh", "dvh"]) {
    const box = document.createElement("div");
    box.style.cssText =
      "position:absolute;top:0;left:0;width:1px;visibility:hidden;pointer-events:none;height:100" +
      unit;
    document.body.append(box);
    units[unit] = box;
  }

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

  function hitAt(x, y) {
    const shields = [...document.querySelectorAll(".chrome-shield")];
    const saved = shields.map((s) => s.style.pointerEvents);
    for (const s of shields) s.style.pointerEvents = "auto";
    const node = document.elementFromPoint(x, y);
    for (const [i, s] of shields.entries()) s.style.pointerEvents = saved[i];
    return node;
  }

  const px = (v) => Math.round(v * 10) / 10;

  function render() {
    const toneRect = tone.getBoundingClientRect();
    const inBand = toneRect.top < innerHeight && toneRect.bottom > 0;
    out.innerHTML = [
      "tone <b>" +
        body.dataset.tone +
        "</b>  plate <b>" +
        body.dataset.plate +
        "</b>  shield <b>" +
        body.dataset.shield +
        "</b>",
      '<span class="k">window   </span>' + innerWidth + " x " + innerHeight,
      '<span class="k">lvh/svh  </span>' +
        px(units.lvh.getBoundingClientRect().height) +
        " / " +
        px(units.svh.getBoundingClientRect().height),
      '<span class="k">plate    </span>' +
        (body.dataset.plate === "off"
          ? "(off)"
          : "top " + px(plate.getBoundingClientRect().top) +
            "  bottom " + px(plate.getBoundingClientRect().bottom)),
      '<span class="k">tone band</span>' +
        'top ' +
        px(toneRect.top) +
        "  bottom " +
        px(toneRect.bottom) +
        (inBand ? "  <b>ON SCREEN</b>" : "  off screen"),
      '<span class="k">hit t/b  </span>' +
        describe(hitAt(innerWidth / 2, 4)) +
        " / " +
        describe(hitAt(innerWidth / 2, innerHeight - 4)),
      '<span class="k">scrollY  </span>' + Math.round(scrollY),
    ].join("<br>");

    for (const button of document.querySelectorAll(".row button")) {
      button.setAttribute(
        "aria-pressed",
        String(body.dataset[button.dataset.set] === button.dataset.value),
      );
    }
  }

  for (const button of document.querySelectorAll(".row button")) {
    button.addEventListener("click", () => {
      body.dataset[button.dataset.set] = button.dataset.value;
      render();
    });
  }

  addEventListener("scroll", render, { passive: true });
  addEventListener("resize", render, { passive: true });
  render();
  setInterval(render, 400);

  // Park the view inside the tone band on load, so the first screenshot is the case
  // that matters without anyone having to hunt for it.
  addEventListener("load", () => {
    if (!scrollY) scrollTo(0, Math.round(innerHeight * 1.4));
  });
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
