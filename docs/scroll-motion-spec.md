# Scroll motion and fixed-photography specification

Measured implementation specification for DA-MOTION-01, DA-MOTION-02 and DA-MEDIA-01.
Written before the production edit; it supersedes the earlier JavaScript-pinned model.

- Route: `/` (single template family, `src/app/page.tsx`).
- Reference viewports: `1440 × 900`, `768 × 1024`, `390 × 844`.
- Behavioural reference for DA-MEDIA-01: `https://apple-q.jp/` — observed 2026-08-19,
  behaviour only, no asset or code reuse.

## 1. Observed reference technique (apple-q.jp, 1440 × 900)

Measured through the browser at the authorized public URL:

| Property | Measured value |
| --- | --- |
| Background carrier | `ul.bg` |
| `position` | `fixed` |
| `inset` | `top: 0; left: 0` |
| Box | `1425 × 900` (visual viewport) |
| `z-index` | `-1` |
| `transform` | `none` |
| `will-change` | `auto` |
| Photograph | `background-size: cover; background-position: 50% 50%` on the child `li` |
| Scroll listeners driving it | none |

Conclusion: the reference does **not** emulate a fixed background from JavaScript. The
browser owns the pin through a genuine `position: fixed` layer, and the scrolling
content is the moving window. That is why it never judders.

## 2. Defect diagnosis in the current implementation

Measured at `http://127.0.0.1:3001`, viewport `1440 × 900`, `--desktop-scale = 1.2`.

| # | Reported symptom | Measured root cause |
| --- | --- | --- |
| 1 | Top contour parallax "does not lag" | Amplitude is 8 % of scroll capped at 72 artboard px and saturates at `scrollY = 900`; below the perception threshold for a 1 344 px drawing. |
| 2 | Objects below the products "do not offset against each other" | Each contour band is a single `<img>`. One raster cannot express per-object offsets, so DA-MOTION-01 was structurally unimplementable. |
| 3 | Fixed photograph "judders on every scroll" | The pin is emulated by writing `translate3d()` from a `scroll` listener + `requestAnimationFrame`. The compositor scrolls the page before the main thread writes the counter-translation, so the photograph is permanently one or more frames behind the scroll. |
| 4a | Photograph appears late when scrolling into a chapter | All four chapter photographs carry `loading="lazy"`. Measured after `networkidle` at `scrollY = 0`: `dusk`, `dawn`, `alpine` all `complete: false`, `naturalWidth: 0`. |
| 4b | "Only the pinned region is ever visible" | The photographs are `1440 × 2174‥2221` but are rendered into a `100dvh` (900 px) box with `object-fit: cover`. 59 % of every photograph is cropped away and can never be reached. |

### 2.1 Structural blocker

`.page-artboard` carried `transform: scale(var(--desktop-scale)) translateX(-50%)`.
A transformed ancestor becomes the containing block for `position: fixed` descendants and
breaks `position: sticky`, so the browser could not own the pin. Verified in all three
engines (`.private/tmp-inspect/support-probe.mjs`):

| Engine | `position: fixed` inside `transform: scale()` | `position: sticky` inside it | `animation-timeline: scroll()` |
| --- | --- | --- | --- |
| Chromium 151 | not viewport-fixed | pins 120 px late at scale 1.2 | supported |
| Firefox 153 | not viewport-fixed | pins 120 px late | **not supported** |
| WebKit 26.5 | not viewport-fixed | pins 120 px late | supported |

Scroll-driven CSS animations are therefore unavailable as the cross-engine mechanism.

## 3. Resolution — `zoom` artboard

`.page-artboard` uses `zoom: var(--desktop-scale)` instead of `transform: scale()`.
Verified identical in Chromium 151, Firefox 153 and WebKit 26.5
(`.private/tmp-inspect/zoom-probe.mjs`, artboard `1200 × 3000`, viewport `1440 × 900`):

| Measurement | `transform: scale(1.2)` | `zoom: 1.2` |
| --- | --- | --- |
| Artboard box | `1440 × 3600` | `1440 × 3600` |
| Child at `left: 333px; width: 539px` | `l = 400, w = 647` | `l = 400, w = 647` |
| Document height | `3600` (via `calc()` on the canvas) | `3600` (implicit) |
| `position: fixed` child, `inset: 0` | `1440 × 3600` at `top: -600` when scrolled | `1440 × 900` at `top: 0` at every scroll |
| Ancestor `mask-image` clips that fixed child | n/a | yes, and the mask travels with the page |

Layout is unchanged; the pin becomes browser-owned. `.page-canvas` no longer needs an
explicit height — the zoomed artboard produces `11 323 px` at `1440 × 900`, the same
document height as before.

## 4. Chapter photography (DA-MEDIA-01)

```
.chapter                 absolute, artboard coordinates, unchanged
└ .chapter-photo         absolute inset:0, silhouette alpha mask — scrolls with the page
  └ .chapter-photo-pin   position: fixed; inset: 0 — browser-owned viewport pin
    └ img                width:100%; height:auto; min-height:100%; object-fit:cover
```

- The mask is the moving window; the photograph is the still plane. No scroll listener
  participates in the pin.
- `--chapter-pan-y` translates the photograph inside the pin so the frame that is taller
  than the viewport is traversed once while the chapter is on screen. Travel is
  `pan = clamp((scrollY - (top - vh)) / (H + vh), 0, 1)` and
  `--chapter-pan-y = -pan × overflowRatio × CHAPTER_PAN_STRENGTH`, expressed as a
  percentage of the photograph's own height so it is immune to the artboard zoom.
- `CHAPTER_PAN_STRENGTH` in `src/components/page-motion.tsx` is the single reveal knob:
  `1` traverses the whole approved frame, `0` reproduces the previous single-crop pin.
  Shipped at `1`.
- Measured overflow at `1440 × 900`: root `1274 px`, dusk `1280 px`, dawn `1321 px`,
  alpine `1285 px`. Resulting drift is `≈0.41 px` per scrolled pixel, so a one-frame main
  thread lag is `≈0.4 px` — below the perception threshold, unlike the `1 : 1` pin it
  replaces.
- At `390 × 844` the source is `751 × 1733‥1758`, rendered `390 × 900‥913`; overflow is
  `56‥69 px`, so mobile keeps an effectively pure pin.
- Fallback tone: each pin carries the photograph's measured mean colour
  (root `#12281d`, dusk `#6b442c`, dawn `#42633e`, alpine `#779fa4`) so a not-yet-decoded
  photograph reads as the chapter's tone instead of a hole.

### Loading

- `root` loads eagerly at low priority — it is the first chapter and the only one reachable
  without an intervening scroll gesture.
- `dusk`, `dawn`, `alpine` stay `loading="lazy"` for the initial navigation and are armed
  by an `IntersectionObserver` with `rootMargin: 150%` (≈1 350 px ahead at `1440 × 900`),
  which removes the `loading` attribute before the chapter can reach the viewport.
- LCP is the hero vector/type, so the initial request set is unchanged.

## 5. Contour parallax (DA-MOTION-02) and relative object offset (DA-MOTION-01)

Each approved contour drawing is a single Illustrator export containing separate contour
paths:

| Source | viewBox | Paths |
| --- | --- | --- |
| `pc-contours-hero.svg` | `1287.14 × 1344.45` | 4 |
| `pc-contours-product.svg` | `1227.05 × 442.91` | 3 |
| `pc-contours-footer.svg` | `1064.96 × 521.67` | 2 |
| `sp-contours-hero.svg` | `495.95 × 920.64` | 4 |
| `sp-contours-product.svg` | `471.74 × 170.37` | 3 |
| `sp-contours-footer.svg` | `600.13 × 294.03` | 2 |

`scripts/generate-contour-layers.mjs` splits each export into one file per path, keeping
the original `viewBox`, `<style>` block and path attributes, so the layers restack to a
pixel-identical drawing at rest. Each layer then carries its own parallax depth, which is
what DA-MOTION-01 ("objects move with small relative scroll offsets", bound by the ledger
to the contour objects) actually asks for.

Depth is the fraction of scroll distance the layer withholds; cap is the maximum
displacement in artboard pixels.

| Group | Anchor | Layer | Depth | Cap (wide / compact) |
| --- | --- | --- | --- | --- |
| `.hero-contours` | page start, downward only | 1 | 0.340 | 430 / 190 |
| | | 2 | 0.255 | 330 / 146 |
| | | 3 | 0.175 | 230 / 102 |
| | | 4 | 0.100 | 130 / 58 |
| `.product-contours` | own centre, symmetric | 1 | 0.280 | 300 / 132 |
| | | 2 | 0.190 | 210 / 92 |
| | | 3 | 0.115 | 130 / 58 |
| `.footer-contours` | page end, upward only | 1 | 0.260 | 280 / 124 |
| | | 2 | 0.160 | 170 / 76 |

**2026-08-20 amplitude correction (VF-31).** The first published set above was owner-
rejected as imperceptible. Two measured causes, both addressed by the values now in the
table:

1. *Early saturation.* The hero group anchors at page start, so at the previous
   `0.150 / 58 px` compact pair the first layer reached its cap at `scrollY = 387` — less
   than half a mobile viewport — and every contour was frozen for the remaining ~6 000 px
   of document. Each cap is now large enough for its layer to keep moving for as long as
   its band is on screen (hero layer 1 saturates at `scrollY ≈ 1 265` wide / `559`
   compact, against a hero band that leaves the viewport at about `2 200`).
2. *Insufficient separation.* The leading-to-trailing depth ratio inside a stack was
   2.5 : 1 with a 78 px absolute spread at desktop; it is now 3.4 : 1 with a 300 px
   spread, which is what makes the individual contour lines read as separate planes.

At rest (`scrollY = 0` for the hero group, chapter-centre for the product group, page end
for the footer group) every offset is `0`, so the approved static composition is
unchanged and the existing visual baselines stay valid at those framings.

Foreground objects lead instead of lag (negative depth):

| Object | Depth | Cap (wide / compact) |
| --- | --- | --- |
| `.brand-center` | −0.088 | 62 / 27 |
| `.product-perfume-15` drawing | −0.078 | 40 / 18 |
| `.product-perfume-50` drawing | −0.115 | 58 / 26 |
| `.product-diffuser-500` drawing | −0.058 | 31 / 14 |
| `.chapter-product` | −0.080 | 46 / 21 |

Foreground caps grow by roughly half rather than trebling: a drawing that overran its own
caption would read as a layout fault, not as depth. Each cap stays inside its cell.

The three product drawings share a band, so distinct depths make them separate visibly
against each other and against the contour layers behind them — the reported defect 2.

### 5.1 2026-08-20 drive-model correction (VF-31b)

The amplitude correction above was owner-rejected a third time. Measuring the shipped
controller at `1440 × 900` shows the cause was never the size of the numbers:

| `scrollY` | `.hero-contours` | `.product-contours` | `.footer-contours` |
| ---: | --- | --- | --- |
| 0 | `0 / 0 / 0 / 0` | `-300 / -210 / -130` | `-280 / -170` |
| 400 | `113 / 85 / 58 / 33` | `-300 / -210 / -130` | `-280 / -170` |
| 900 | `255 / 191 / 131 / 75` | `-264 / -179 / -109` | `-280 / -170` |
| 1600 | `430 / 330 / 230 / 130` | `-101 / -69 / -42` | `-280 / -170` |
| 3000 | `430 / 330 / 230 / 130` | `226 / 153 / 93` | `-280 / -170` |

Every band spends most of the document **pinned at its cap, and therefore completely
still**. The footer stack holds one value from `scrollY 0` to `3000`; the product stack
holds one value until `900`; the hero stack saturates at `1264` and holds for the
remaining ~13 000 px. Amplitude was already large. What was missing was motion that
*lasts* — a cap is a cliff, and past it the parallax is indistinguishable from a static
background.

The drive model is therefore no longer `scroll × depth` clamped to a cap. Each layer now
interpolates from `from` to `to` across exactly the interval in which its own band
crosses the window:

```
start    = clamp(bandTop − viewportHeight, 0, maximumScroll)
end      = clamp(bandTop + bandHeight,  start, maximumScroll)
progress = clamp((scrollY − start) / (end − start), 0, 1)
offset   = (from + (to − from) × progress) × travel ÷ artboardScale
```

A layer cannot saturate while the reader can see it, and it is still by construction once
it cannot. Trimming `end` to `maximumScroll` is what lets a band anchored at either end of
the document still complete its travel.

| Group | `from` → `to` | Layer | Travel, artboard px (wide / compact) |
| --- | --- | --- | --- |
| `.hero-contours` | `0` → `1` (authored position at page top, lags downward) | 1 | 460 / 250 |
| | | 2 | 345 / 188 |
| | | 3 | 230 / 125 |
| | | 4 | 132 / 72 |
| `.product-contours` | `−0.5` → `+0.5` (symmetric about its centred moment) | 1 | 320 / 144 |
| | | 2 | 216 / 98 |
| | | 3 | 128 / 58 |
| `.footer-contours` | `−1` → `0` (arrives at the authored position at the page end) | 1 | 200 / 90 |
| | | 2 | 120 / 54 |

In-stack ratio is 3.48 : 1 and hero layer 1's peak rises from 430 to 460 artboard px, so
the correction increases peak amplitude as well as removing the freeze.

Foreground objects use the same crossing, with **separate rise and fall limits** because
the space around an object is not symmetric: a product drawing has its whole 245 px row
above it but only the measured 33 px gap to its own caption below. An object is pushed
down as it enters and drawn up as it leaves.

| Object | Fall, px (wide / compact) | Rise, px (wide / compact) |
| --- | --- | --- |
| `.brand-center` | 70 / 32 | 90 / 40 |
| `.product-perfume-15` drawing | 28 / 12 | 104 / 46 |
| `.product-perfume-50` drawing | 28 / 12 | 118 / 52 |
| `.product-diffuser-500` drawing | 22 / 10 | 68 / 30 |
| `.chapter-product` | 84 / 38 | 24 / 11 |

The diffuser travels least: it is the heaviest drawing and the plane the two bottles are
read against, and its measured offsets keep the three separated in the documented order
(`|perfume-50| > |perfume-15| > |diffuser|` at the band's midpoint).

`scaleOf()` now also divides by the **mobile** artboard scale below 640 px, since the SP
composition became a zoomed 375 px canvas in the same pass (VF-34).

### 5.2 2026-08-20 coverage correction (VF-38)

Owner review asked whether the effect is applied to *every* background line and whether
each object really offsets from its neighbours. Auditing the rendered transform of every
decorative element at nine scroll positions found two gaps.

**The line count itself is right.** Each approved contour export contains exactly one
subpath per `<path>`, so the 4 / 3 / 2 split is one file per visible line and every line
already carried its own depth:

| Export | `<path>` elements | subpaths per path |
| --- | ---: | --- |
| `pc-contours-hero` | 4 | 1, 1, 1, 1 |
| `pc-contours-product` | 3 | 1, 1, 1 |
| `pc-contours-footer` | 2 | 1, 1 |

**Gap 1 — three elements never moved at all.** The brand header rule, the brand footer
rule and the ROOT upper foreground held a zero offset at every scroll position. The two
brand rules are the longest lines on the page, so their stillness is what made the effect
read as "not applied to every background line"; both are now driven, anchored so the frame
the reference approves is the frame that holds still. The ROOT upper foreground stays
fixed on purpose: it is the seam between the paper page and the first photograph, its
position is the measured VF-11 value, and VF-35b reads it to know which surface is behind
the fixed control.

**Gap 2 — a vertical translation of a vertical line is invisible.** Measuring the arc and
bounding box of each layer's own path gives its dominant direction:

| Layer | bounding box | orientation |
| --- | --- | --- |
| hero 1 | 694 × 229 | across the page |
| hero 2 | 836 × 372 | across the page |
| hero 3 | 388 × 801 | **down the page** |
| hero 4 | 435 × 709 | **down the page** |
| product 1 | 1227 × 421 | across the page |
| product 2 | 1220 × 299 | across the page |
| product 3 | 111 × 139 | small closed form |
| footer 1–2 | 830 × 411, 1065 × 520 | across the page |

Hero layers 3 and 4 are the two contours a reader sees while reading the about block and
the product section, and translating them vertically slides each line along its own
direction: the displacement is real but produces almost no visible change except at the
endpoints. Those two, and the product stack's small closed form, now travel with a
horizontal component perpendicular to their own direction. Travel is capped so no layer
pulls its drawing's edge inside the canvas: the hero box overhangs the canvas by 74 px on
the left, and layers 3 and 4 have their own ink 13 px and 25 px inside that box, so a
leftward travel moves their open ends further off-canvas rather than into view.

| Group | Layer | travel x (wide / compact) | travel y (wide / compact) |
| --- | --- | --- | --- |
| `.hero-contours` | 1 | — | 460 / 250 |
| | 2 | — | 345 / 188 |
| | 3 | −158 / −86 | 104 / 56 |
| | 4 | −96 / −52 | 62 / 34 |
| `.product-contours` | 1 | — | 320 / 144 |
| | 2 | — | 216 / 98 |
| | 3 | −74 / −34 | 96 / 44 |
| `.footer-contours` | 1 | — | 200 / 90 |
| | 2 | — | 120 / 54 |

Object offsets, stated as the offset at the start and the end of each object's own
crossing:

| Object | from (wide / compact) | to (wide / compact) |
| --- | --- | --- |
| `.brand-header` | 0 | −44 / −20 |
| `.brand-center` | 70 / 32 | −90 / −40 |
| `.product-perfume-15` drawing | 28 / 12 | −104 / −46 |
| `.product-perfume-50` drawing | 28 / 12 | −118 / −52 |
| `.product-diffuser-500` drawing | 22 / 10 | −68 / −30 |
| `.chapter-product` | 84 / 38 | −24 / −11 |
| `.brand-footer` | 44 / 20 | 0 |

`.brand-header` starts at zero and `.brand-footer` ends at zero, because the approved
composition for the first is the page top and for the second is the page end. Every other
object is below the fold at scroll 0, so its starting offset is never in an approved
frame.

## 6. Drive model

`src/components/page-motion.tsx` runs one `requestAnimationFrame` loop that is started by
scroll/resize and parks itself after the scroll settles. It samples `window.scrollY` per
frame rather than per scroll event, writes only CSS custom properties consumed by
`translate3d()`, and performs no layout reads on the animation path (geometry is cached
and refreshed on resize / `ResizeObserver`).

The 1 : 1 pin — the only motion where a one-frame lag is visible — is no longer on this
path at all.

## 7. Reduced motion

`prefers-reduced-motion: reduce` removes every contour and object transform, releases the
pin (`position: absolute; inset: 0; height: 100%`) so each chapter shows its whole
photograph in normal flow, and holds the scroll indicator at its designed static length.
No behaviour, content or reading order depends on motion.

## 8. Acceptance

- Pinned photograph: viewport-relative `top` must not vary by more than `0.5 px` across a
  scripted scroll sweep through each chapter, measured from the compositor's own frames.
- Contour layers: at `scrollY = 0` (hero), product-band centre and page end, every
  `--contour-parallax-y` must read `0px`.
- All four chapter photographs must report `complete: true` before their chapter's top
  edge reaches the viewport bottom.
- The whole of each photograph must be traversed once per chapter at `1440 × 900`.
- `1440 × 900`, `768 × 1024` and `390 × 844` renders at rest must match the approved
  reference within the existing fidelity thresholds.
