/**
 * Device diagnostic for the iOS 26 browser-bar bands, round three. Not part of the landing
 * page: it is served at `/edge-probe` so the defect can be measured on the phone that
 * shows it, with no Mac and no Web Inspector attached.
 *
 * Rounds one and two settled the mechanism on the device. `lvh` equals `innerHeight`, so
 * no viewport unit reaches past the window. A fixed box declaring a 160 px overhang paints
 * no further than one declaring none — it is clipped to the window. And the strips the
 * browser bars occupy are translucent over the DOCUMENT's own scrolled paint: a striped
 * absolutely positioned band read back through the top bar at hue 173–176° against its own
 * 186°, while the viewport-fixed plate never appeared in a strip at all — where that band
 * stopped short of the window edge the bar fell back to paper at 45°, not to the plate's
 * green at 147°.
 *
 * So the photograph cannot reach those strips from the fixed plate, and something that is
 * document content has to carry it. This round asks which candidate can, and colours the
 * answer: every candidate paints cyan stripes, the flat fill that produces the band today
 * is magenta, and the fixed plate covering the window is green.
 *
 * Remove this route once the defect is closed.
 */
export const dynamic = "force-static";

const probeDocument = String.raw`
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>MOYOY edge probe 3</title>
<style>
  /* Round two settled the mechanism: the bars are translucent over the DOCUMENT's own
     scrolled paint, and a viewport-fixed box is clipped to the window and never reaches
     them. So the photograph cannot get into those strips from the fixed plate. Something
     that is document content has to carry it.

     This round asks which candidate can. Every candidate paints CYAN STRIPES; the flat
     fill that currently produces the band is MAGENTA; the viewport-fixed plate that
     covers the window is GREEN. Cyan in a bar means that candidate reaches it. */

  * { box-sizing: border-box; }
  html, body { margin: 0; background: #ece7d8; }
  body { height: 360vh; }

  /* The document band - the analogue of '.chapter-photo', flat-filled as the landing page
     fills it today. */
  #tone {
    position: absolute;
    top: 80vh;
    right: 0;
    left: 0;
    height: 200vh;
    background-color: #c2185b;
  }

  /* Candidate 2 - one declaration on the band itself: a background whose positioning area
     is the viewport rather than the element, which is how the fixed plate is framed. */
  body[data-try="bgfix"] #tone {
    background-attachment: fixed;
    background-image: repeating-linear-gradient(
      135deg, #0e8f9e 0 20px, #063f47 20px 40px, #16c0d4 40px 46px
    );
  }

  #bleed {
    display: none;
    background-image: repeating-linear-gradient(
      135deg, #0e8f9e 0 20px, #063f47 20px 40px, #16c0d4 40px 46px
    );
  }
  /* Candidate 3 - an ordinary absolutely positioned box, pinned from the scroll loop. */
  body[data-try="jsabs"] #bleed {
    display: block;
    position: absolute;
    top: var(--js-top, 0);
    right: 0;
    left: 0;
    height: var(--js-height, 0);
  }
  /* Candidate 4 - sticky, which the browser pins itself but only within its own band. */
  body[data-try="sticky"] #bleed {
    display: block;
    position: sticky;
    top: calc(-1 * var(--bleed, 80px));
    height: calc(100lvh + 2 * var(--bleed, 80px));
  }

  /* Always present: the viewport-fixed plate the landing page ships. */
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
    padding: 10px 4px;
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

<div id="tone"><div id="bleed"></div></div>
<div id="plate">
  <div class="ruler" data-at="top"></div>
  <div class="ruler" data-at="bottom"></div>
</div>
<div aria-hidden="true" class="chrome-shield" data-edge="top"></div>
<div aria-hidden="true" class="chrome-shield" data-edge="bottom"></div>

<div id="readout">
  <h1>edge probe 3</h1>
  <div id="out">…</div>
  <div class="row">
    <button data-set="try" data-value="none" type="button">1 none</button>
    <button data-set="try" data-value="bgfix" type="button">2 bg-fixed</button>
    <button data-set="try" data-value="jsabs" type="button">3 js-abs</button>
    <button data-set="try" data-value="sticky" type="button">4 sticky</button>
  </div>
  <div class="row">
    <button data-set="plate" data-value="on" type="button">plate ON</button>
    <button data-set="plate" data-value="off" type="button">plate OFF</button>
  </div>
  <div id="legend">
    CYAN STRIPES in a bar = that candidate reaches it · MAGENTA = it does not ·
    CREAM = outside the band. Scroll a little and check the cyan holds still.
  </div>
</div>

<script>
  const body = document.body;
  const out = document.getElementById("out");
  const plate = document.getElementById("plate");
  const tone = document.getElementById("tone");
  const bleed = document.getElementById("bleed");
  const BLEED = 80;

  const params = new URLSearchParams(location.search);
  body.dataset.try = params.get("try") || "bgfix";
  body.dataset.plate = params.get("plate") || "on";

  const units = {};
  for (const unit of ["lvh", "svh"]) {
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

  function pin() {
    if (body.dataset.try !== "jsabs") return;
    const toneTop = tone.getBoundingClientRect().top + scrollY;
    body.style.setProperty("--js-top", Math.round(scrollY - toneTop - BLEED) + "px");
    body.style.setProperty("--js-height", innerHeight + BLEED * 2 + "px");
  }

  function render() {
    pin();
    const on = body.dataset.try !== "none" && body.dataset.try !== "bgfix";
    const rect = on ? bleed.getBoundingClientRect() : null;
    out.innerHTML = [
      "try <b>" + body.dataset.try + "</b>   plate <b>" + body.dataset.plate + "</b>",
      '<span class="k">window  </span>' + innerWidth + " x " + innerHeight,
      '<span class="k">lvh/svh </span>' +
        px(units.lvh.getBoundingClientRect().height) +
        " / " +
        px(units.svh.getBoundingClientRect().height),
      '<span class="k">candidate </span>' +
        (rect
          ? "top " + px(rect.top) + "  bottom " + px(rect.bottom)
          : body.dataset.try === "bgfix"
            ? "(a background, no box)"
            : "(none)"),
      '<span class="k">overhang  </span>' +
        (rect ? "top " + px(-rect.top) + "  bottom " + px(rect.bottom - innerHeight) : "-"),
      '<span class="k">hit t/b </span>' +
        describe(hitAt(innerWidth / 2, 4)) +
        " / " +
        describe(hitAt(innerWidth / 2, innerHeight - 4)),
      '<span class="k">scrollY </span>' + Math.round(scrollY),
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
  setInterval(render, 300);

  addEventListener("load", () => {
    if (!scrollY) scrollTo(0, Math.round(innerHeight * 1.6));
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
