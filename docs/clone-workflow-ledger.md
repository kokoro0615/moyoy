# Clone workflow ledger

Opened 2026-08-19 for the scroll-behaviour work on the MOYOY landing page.

## Mode and scope

- **Operating mode:** authorized client rebuild, already in progress in this repository.
  The current task is an existing-product defect fix, not a new clone.
- **Production owner:** the main conversation. Observation, extraction, implementation and
  target-vs-local comparison stay with one owner.
- **In scope:** the scroll-linked behaviour of `/` — DA-MOTION-01, DA-MOTION-02 and
  DA-MEDIA-01 — plus the loading strategy for the chapter photography.
- **Out of scope:** copy, information architecture, routes, the menu, the footer contract,
  the NEWS deferral, and every unresolved question already recorded in
  `docs/open-questions.md`.

## Target and rights

| Item | Record |
| --- | --- |
| Behavioural reference | `https://apple-q.jp/` — named by DA-MEDIA-01 in `docs/design-annotation-ledger.md` as the intended fixed-background behaviour |
| Reference use | read-only observation of public pages at `1440 × 900` on 2026-08-19; computed styles and DOM structure only |
| Access controls | none bypassed; no authentication, paywall, robots restriction or rate limit touched |
| Assets taken from the reference | **none.** No image, font, script, stylesheet, copy or markup was copied |
| What was taken | one architectural fact: the reference pins a `position: fixed` layer at `z-index: -1` and runs no scroll listener. Recorded in `docs/scroll-motion-spec.md` §1 |
| Production identity | MOYOY only. Nothing on the page references or resembles the reference operator |
| MOYOY assets | client-confirmed paid web-use permission, already recorded in `docs/asset-provenance.csv` |

The reference grants a behavioural target and no licence. No third-party identity, trade
dress or media enters production output.

## Functional invariants preserved

Verified by the existing suites after the change:

- routes, static export, metadata, `robots.txt`;
- heading order, landmarks, reading order, and every accessible name;
- the menu dialog contract — focus entry, trap, Escape, focus return, scroll restore;
- chapter anchors `#root`, `#dusk`, `#dawn`, `#alpine` and `#products`, `#hero`;
- the approved copy in `src/lib/moyoy-content.ts`, unchanged;
- `prefers-reduced-motion: reduce` producing a static composition with no content,
  visibility or reading-order dependency on any transform;
- no layout shift, no horizontal overflow, and reflow at 200 % and 400 %;
- the fidelity capture contract's 21 frames and three coverage groups.

## Active specification

`docs/scroll-motion-spec.md` — measured reference technique, defect diagnosis, the `zoom`
decision with its three-engine evidence, the plate and pan model, contour depths and caps,
the drive model, reduced-motion behaviour, and predeclared acceptance criteria.

## Asset provenance

- New files: 18 contour layer SVGs derived from the six approved contour exports by
  `scripts/generate-contour-layers.mjs`. Same owner, same licence, same permission as their
  sources; regenerated into `docs/asset-provenance.csv` and
  `config/public-binary-allowlist.json`.
- Verified: stacking the split layers reproduces each source drawing with zero differing
  pixels.
- No asset was downloaded from the behavioural reference.

## State and viewport matrix

Compared at identical route, locale, theme, data and animation policy.

| Viewport | States checked |
| --- | --- |
| `1440 × 900` | top, ROOT, DUSK, DAWN, ALPINE, footer, menu-open, reduced motion, wheel-driven scroll sweep |
| `768 × 1024` | top, ROOT, DUSK, DAWN, ALPINE, footer, menu-open, reduced motion |
| `390 × 844` | top, ROOT, DUSK, DAWN, ALPINE, footer, menu-open, reduced motion |
| `1200 × 900` | motion contract checks (contour depths, object drift, plate, pan) |
| `2560 × 1440` | full-bleed artwork and derivative selection |

Engines: Chromium 151, Firefox 153, WebKit 26.5.

## Unresolved differences

| Item | State |
| --- | --- |
| Reference fidelity gate (`pnpm test:fidelity`) | **BLOCKED, pre-existing.** The evidence contract is `unavailable` and no exact-frame reference is approved. Unchanged by this work |
| `pnpm candidate:preflight` | **BLOCKED, pre-existing**, for the same approval reason |
| Reveal extent of the chapter pan | implementation decision; a full traverse answers the reported defect, and the strength constant lets the owner dial it back |
| Contour depths and caps | tuned to be perceptible; owner confirmation of amplitude pending |
| Type rasterisation at desktop widths | changed by `zoom`: glyphs and `0.25px` strokes now render at their true size instead of being upscaled from a `1×` raster. Geometry and photography are unchanged; the `1440 × 900` regression baselines were re-recorded, and `768 × 1024` and `390 × 844` were untouched |

## Claim rule

This work is a measured defect correction with local three-engine evidence. It does not
close Gate D or Gate E, does not authorize deployment, and does not constitute human visual
approval.

## 2026-08-20 session — mobile fidelity, line weight, motion amplitude, drawer motion

- **Mode:** unchanged (authorized client rebuild; existing-product defect fix).
- **Production owner:** unchanged — the main conversation holds observation, extraction,
  implementation and target-vs-local comparison.
- **In scope:** four owner-reported defects — the SP about block (VF-29), the SP footer
  mark and contact block (VF-30), contour line weight and parallax amplitude
  (VF-28 / VF-31), and the menu drawer's open/close behaviour (VF-32) — plus the SP
  product section (VF-33), found while measuring the about block and corrected in the
  same pass.
- **Out of scope, unchanged:** approved copy, information architecture, routes, the NEWS
  deferral (Q-02), the footer policy links (DA-FOOTER-01), the Instagram mark (VF-12),
  and every open question already recorded in `docs/open-questions.md`.

### Reference and rights

No new target site was visited and no asset was downloaded. All measurement came from
material already in the repository: the approved `375 × 7067` and `1200 × 10326` frames,
the `375 × 844` / `1200 × 900` menu-open exports, and the private Illustrator outline
masters. No third-party identity entered production output; the Instagram mark remains
unshipped.

### Assets touched

The six approved contour exports and their 18 generated layers changed one rendered CSS
declaration each (`stroke-width: .25px` → `1px` plus `vector-effect: non-scaling-stroke`).
Path geometry, `viewBox`, and every other attribute are unchanged, so the layers still
restack to the source drawing. `docs/asset-provenance.csv` and
`config/public-binary-allowlist.json` were regenerated from the files on disk.

### Comparison performed

Target-vs-local at `375` (full paper regions, reduced motion so no scroll transform is in
the frame) and at `1200` (contour statistic). Regression baselines at `1440 × 900`,
`768 × 1024` and `390 × 844` were re-recorded after the corrections and re-verified.
Menu motion was inspected at 150 ms, 350 ms and settled, plus the closing frame, on
Chromium at `1440 × 900` and `390 × 844`.

### Still unresolved after this session

| Item | State |
| --- | --- |
| `pnpm test:fidelity` / `pnpm candidate:preflight` | **BLOCKED, pre-existing and unchanged.** No approved immutable exact-frame reference exists for any of the 21 frames |
| Motion amplitude (VF-31) and drawer timing (VF-32) | measurable implementation judgment; owner confirmation pending |
| Instagram mark in the footer and drawer | third-party mark, no rights path recorded; stays unshipped |
| SP residuals of 1–6 px on product copy rows | fallback font metrics, not geometry; resolves when the Adobe Fonts kit is live |

## 2026-08-20 session — first view, line hierarchy, SP scale, control legibility, motion

- **Mode:** unchanged (authorized client rebuild; existing-product defect fix).
- **Production owner:** unchanged — the main conversation holds observation, extraction,
  implementation and target-vs-local comparison.
- **In scope:** six owner-reported defects — the PC first-view scroll cue (VF-36), the
  product drawing line weight (VF-37), the SP scroll-cue centring and the SP prose
  position against the background artwork (both VF-34), motion amplitude (VF-31b) and
  drawer timing (VF-32b), and the fixed menu control disappearing over photography
  (VF-35).
- **Out of scope, unchanged:** approved copy, information architecture, routes, the NEWS
  deferral (Q-02), the footer policy links (DA-FOOTER-01), the Instagram mark (VF-12),
  the tablet band's bespoke reflow, and every open question already in
  `docs/open-questions.md`.

### Reference and rights

No new target site was visited and no asset was downloaded. All measurement came from
material already in the repository: the approved `375 × 7067` and `1200 × 10326` frames,
and — for the first time — the **guide layer of the supplied source document**, read
directly from its content streams to recover the two first-view frames the owner's report
refers to. That measurement produced two numbers (PC first view 1200 × 800, SP first view
375 × 667) and nothing else; no guide mark, label or bracket enters production output.
No third-party identity is involved.

### Assets touched

The three approved product drawings changed rendered CSS declarations only: the outline
class moved to `stroke-width: 1px` with `vector-effect: non-scaling-stroke`, and the
signature accent path — which shipped with no presentation attribute at all — was given
an explicit fill and hairline stroke. Path geometry, `viewBox` and every other attribute
are unchanged. `docs/asset-provenance.csv` and `config/public-binary-allowlist.json` were
regenerated from the files on disk and `pnpm policy:public` re-verified.

### Comparison performed

Target-vs-local at the authored `1200` and `375` canvases for the product band, the
contour bands and the SP about block. The SP correction was additionally verified by
rendering at `390` and downscaling to `375` before comparing with the approved frame, so
that "the composition is a pure scale of the approved canvas" is measured rather than
asserted. Geometry was measured at eleven widths from `320` to `2560`. The menu control
was inspected over all four chapters at `1440` and `390`. Drawer motion was inspected at
120 / 300 / 520 / 900 ms on Chromium at `1440 × 900`.

### Still unresolved after this session

| Item | State |
| --- | --- |
| `pnpm test:fidelity` / `pnpm candidate:preflight` | **BLOCKED, pre-existing and unchanged.** No approved immutable exact-frame reference exists for any of the 21 frames |
| Contour line weight | production is ~4× the master's 0.25 px hairline. Kept because the owner rejected the faithful weight twice; recorded as an intentional deviation with a measured alternative in `docs/visual-fidelity-defects.md` |
| Motion amplitude (VF-31b) and drawer timing (VF-32b) | measurable implementation judgment; owner confirmation pending |
| Product accent mark x-position | production sits about 2 px left of the reference; pre-existing in the approved export, not raised by the owner, not changed here |
| Instagram mark in the footer and drawer | third-party mark, no rights path recorded; stays unshipped |
| SP residuals of 1–6 px on product copy rows | fallback font metrics, not geometry; resolves when the Adobe Fonts kit is live |

## 2026-08-20 second session — control treatment and parallax coverage

- **Mode:** unchanged (authorized client rebuild; existing-product defect fix).
- **Production owner:** unchanged — the main conversation.
- **In scope:** two owner-reported defects — the paper plate behind the fixed menu control
  (VF-35b) and the coverage of the scroll offset across the line system (VF-38).
- **Out of scope, unchanged:** approved copy, information architecture, routes, the NEWS
  deferral, the footer policy links, the Instagram mark, the tablet band's bespoke reflow,
  and the contour line-weight deviation recorded in the previous session.

### Reference and rights

No new target site was visited and no asset was downloaded. No production asset changed at
all this session: the corrections are CSS and the scroll controller. Measurement came from
the repository's own build, from the eight chapter mask files, and from the six approved
contour exports.

### Comparison performed

Rendered-transform audit of every decorative element at nine scroll positions
(1440 × 900); per-layer path geometry measured from the six contour exports; backdrop
luminance behind the control sampled with the control hidden at ten scroll positions per
chapter, at 1440 × 900 and 390 × 844; mask opacity measured in the control's corner strip
for all eight mask files; the paper-to-photograph transition located to within the
control's own height.

### Still unresolved after this session

| Item | State |
| --- | --- |
| `pnpm test:fidelity` / `pnpm candidate:preflight` | **BLOCKED, pre-existing and unchanged** |
| Contour line weight | still ~4× the master's 0.25 px hairline, by owner decision; unchanged this session |
| Motion amplitude and drawer timing | owner confirmation still pending |
| Chapter type (title, prose) has no relative offset | the chapters hold the photograph, its pan and one drawing; adding a third plane to the type is available but was not done, because the report was about background lines |
| Instagram mark, SP product copy residuals | unchanged |

## 2026-08-20 third session — Safari and iOS device defects

- **Mode:** unchanged (authorized client rebuild; existing-product defect fix).
- **Production owner:** unchanged — the main conversation.
- **In scope:** two owner-reported defects observed on a physical iPhone against the
  Vercel deployment — a blank margin at both edges of every viewport for the whole
  document (VF-39) and dark green bands above the status bar and below the browser
  toolbar (VF-40).
- **Out of scope, unchanged:** approved copy, information architecture, routes, the NEWS
  deferral, the footer policy links, the Instagram mark, the tablet band's bespoke
  reflow, and the contour line-weight deviation recorded in the first session.

### Reference and rights

No new target site was visited and no asset was downloaded. No production asset changed:
the corrections are CSS, one render-blocking head script, one metadata field and the
divisor the scroll controller already used. The deployed HTML and stylesheet were fetched
from the live origin to confirm the shipped build carried the construct under suspicion.

### Comparison performed

Both defects were reproduced from the repository's own build, not inferred. Rendering was
compared across **Chromium 151, Firefox 153 and WebKit 26.5** at 360 / 375 / 390 / 402 /
430 / 639 / 720 / 768 / 1200 / 1440 / 2560 px; the owner's device frame was measured
against the Chromium 390 × 844 reference on three independent readings; the chapter plate
was isolated with an eight-treatment matrix in WebKit and the pin re-measured at three
scroll positions in both engines. The `1440x900`, `768x1024` and `390x844` matrix required
by the workflow was exercised through `pnpm test:e2e` on all three engines and
`pnpm test:visual` on Chromium.

### Root causes

| Defect | Root cause |
| --- | --- |
| VF-39 blank margin at both edges | `zoom: tan(atan2(100vw, <canvas>px))` — `atan2()` over two lengths in different units is unspecified (w3c/csswg-drafts#7482) and shipping WebKit does not return the ratio, so `zoom` was invalid in Safari and both artboards rendered at their authored width, centred by `margin-inline: auto` |
| VF-40 green bands top and bottom | WebKit stops applying an ancestor `mask` to a `position: fixed` descendant once the masked window scrolls out of view, so the chapter plate's `--chapter-tone` painted outside its window — and with `viewport-fit=cover` that includes the strips iOS Safari draws its toolbars over |
| Why neither was caught | every Playwright project is a desktop context at 1440 × 900, visual baselines are Chromium-only, and the mobile-width specs skip non-Chromium engines |

### Still unresolved after this session

| Item | State |
| --- | --- |
| VF-39 / VF-40 on the owner's device | corrected and verified in WebKit under Playwright, which is not iOS Safari; **a device re-check is required to close them** |
| WebKit / mobile-context visual baselines | still absent; the two new checks are targeted invariants, not a Safari fidelity baseline |
| `pnpm test:fidelity` / `pnpm candidate:preflight` | **BLOCKED, pre-existing and unchanged** |
| Contour line weight, motion amplitude, drawer timing, Instagram mark, SP product copy residuals | unchanged |

## 2026-08-20 fourth session — the iOS 26 browser bar tint

- **Mode:** unchanged (authorized client rebuild; existing-product defect fix).
- **Production owner:** unchanged — the main conversation.
- **In scope:** one owner-reported defect (VF-41) — the top and bottom bands return as
  soon as the ROOT photograph reaches the window. The left/right gutters (VF-39) were
  confirmed corrected on the device.
- **Out of scope, unchanged:** everything recorded in the previous three sessions.

### Reference and rights

No new target site was visited and no asset was downloaded. No production asset changed;
the per-chapter tint values were measured from the shipped photographs already in the
repository.

### Root cause

Safari 26 ignores `theme-color` and takes the browser UI tint from the `background-color`
of on-screen `position: fixed` / `sticky` elements, falling back to the body. The four
full-window fixed chapter plates were that source. The previous session's `theme-color`
was inert on the owner's device, and its `clip-path` moved the tint from a chapter colour
to the body colour rather than removing the band.

### Still unresolved after this session

| Item | State |
| --- | --- |
| VF-41 on the owner's device | corrected and swept in WebKit under Playwright, which is not iOS Safari; **a device re-check is required to close it** |
| One colour for two bars | resolved: Safari samples the element nearest each bar, so two 4 px anchors give the status bar and the toolbar their own colour. What remains is the four chapter seams, where the mask is blending two photographs and no single colour is right for either bar |
| Transparent bars | not available to a page: the glass appears only when Safari finds no colour at all, and the body background is always a fallback. A WebKit fix is reported as expected in iOS 26.2 |
| WebKit / mobile-context visual baselines | still absent |
| `pnpm test:fidelity` / `pnpm candidate:preflight` | **BLOCKED, pre-existing and unchanged** |

## 2026-08-20 fifth session — the bands were still paper

- **Mode:** unchanged (authorized client rebuild; existing-product defect fix).
- **Production owner:** unchanged — the main conversation.
- **In scope:** one owner-reported defect (VF-42) — the fourth session's fix did not
  change what the device shows. The bands are still there and still paper-coloured.
- **Out of scope, unchanged:** everything recorded in the previous four sessions.

### Reference and rights

No new target site was visited and no asset was downloaded. No production asset changed.
The per-chapter tint table introduced last session was **deleted**, not re-measured: the
tint is now read at runtime from the shipped photographs and masks already in the
repository. External research was limited to public documentation of Safari 26's sampling
rules, which is recorded in `docs/visual-fidelity-defects.md`.

### Root cause

Three defects, only the first of which the owner could see:

1. The two tint anchors were hidden at `z-index: -1`, under the opaque paper canvas.
   Safari only samples an element that is offered to it; `display: none` is the sole
   hiding state that removes one, and painting below the page is not a hiding state at
   all — it removes the element from the sampler entirely. Both bars therefore fell back
   to the body's paper. The anchors are `opacity: 0` now, which is invisible and sampled.
2. The per-chapter colour table had DUSK's toolbar value taken from ROOT, and could not be
   correct at a wide window in any case, because the plate traverses 58 % of its frame
   while the chapter is on screen.
3. `measure()` mixed `window.scrollY` with client rects. Under WebKit's threaded scrolling
   a measure raised mid-scroll could cache every document band a whole chapter out — a
   latent bug older than the tint work, which also governed the parallax ranges and the
   menu control's surface test.

### Still unresolved after this session

| Item | State |
| --- | --- |
| VF-42 on the owner's device | corrected and swept at three viewports in WebKit under Playwright, which is not iOS Safari; **a device re-check is required to close it** |
| Chapter-seam frames | the remaining worst cases (Δ 44 / 46) are the boundaries where the silhouette genuinely blends photograph and paper. The composite now tracks that blend rather than snapping to one surface, so the bar is wrong by a few levels rather than by a whole surface |
| Transparent bars | unchanged: not available to a page. A WebKit fix is reported as expected in iOS 26.2 |
| `pnpm test:e2e` at default parallelism | **environmentally unreliable on this workstation** — `networkidle` timeouts in unrelated tests, reproduced on the unmodified baseline (7 failures). Runs are bounded to 2–4 workers |
| WebKit / mobile-context visual baselines | still absent |
| `pnpm test:fidelity` / `pnpm candidate:preflight` | **BLOCKED, pre-existing and unchanged** |

## 2026-08-21 session — the SP menu label and the drawer's browser-bar bands

- **Mode:** unchanged (authorized client rebuild; existing-product defect fix).
- **Production owner:** unchanged — the main conversation.
- **In scope:** two owner-reported defects, both observed on a physical iPhone.
  VF-46 — the mobile `menu` label is out of position under its mark and reads as broken.
  VF-47 — opening and closing the menu brings a band back at the bottom of the screen.
- **Out of scope, unchanged:** everything recorded in the previous sessions. The PC menu
  label carries the same size defect as the SP one and is deliberately **not** corrected;
  it is recorded as Q-28 because correcting it moves the approved 1200 px page-top frame.

### Reference and rights

No new target site was visited and no asset was downloaded. No production asset changed.
Both corrections were measured out of the approved private references already in the
repository — `sp-reference.svg` and `pc-reference.svg` — by reading the geometry of the
outlined glyph and mark paths in the top-right region directly, not by eye and not from
a raster (the control is authored in the paper colour and is invisible in the PNG).

### Assets touched

None. Seven visual baselines under `tests/visual/__screenshots__/` were regenerated.

### Comparison performed

| Check | Result |
| --- | --- |
| Reference-vs-render, SP mark, 3 engines | ink width 26.12 (WebKit) / 27.33 (Chromium) / 26.14 (Firefox) against the reference's 26.14; ink centre against mark centre 0.09 / 0.06 / 0.06 px; one line box everywhere |
| Widths swept, closed state | 320, 375, 390, 393, 414, 430, 639 — geometry identical at all seven |
| Edge-candidate predicate, menu closed | 8 scroll offsets × 2 edges, Chromium / Firefox / WebKit: no candidate |
| Edge-candidate predicate, menu open | 320, 390, 768 × 2 edges, Chromium / Firefox / WebKit: no candidate; `:modal` false |
| Drawer behaviour after leaving the top layer | 3 engines × 390 / 768 / 1440: geometry, paint order, focus entry, focus return, `aria-expanded`, `inert`, Escape, scroll lock and scroll restoration all unchanged |
| `pnpm test:visual` | 21 baselines pass **before** regeneration — the change sits under the 0.001 diff-ratio tolerance. Regenerated anyway so the baseline is the shipped render; the changed pixels are confined to the SP mark (x ≥ 325, y ≤ 90) plus 11 pixels of photograph decode noise across three frames |

### Root cause

VF-46: the label was anchored to the box's left edge where the reference centres it on the
mark's axis, and was set 27 % small; the two compounded into a visible lateral shift whose
size differs per engine. The size error was identified by the existing `top: 33px`, which
is the baseline for an 11 px word and not for the 8.6 px one that shipped.

VF-47: two defects, both of which create a Safari 26 edge candidate only while the drawer
is open. The modal `<dialog>` sits in the top layer above `.chrome-shield` and classifies
as `IsSidebar`; and the scroll lock made `<body>` `position: fixed`, which the shield's
own lineage walk then reached and accepted, returning the paper colour. The general form —
**any rule that makes an ancestor of a shield viewport-constrained defeats it** — is
recorded in `docs/ios26-tint-root-cause.md` §9, replacing the entry that called the first
of these unfixable.

### Still unresolved after this session

| Item | State |
| --- | --- |
| VF-46 and VF-47 on the owner's device | measured on three engines under Playwright, which is not iOS Safari; **a device re-check is required to close either** |
| PC menu label size (Q-28) | **out of scope by decision** — 14 % short of the approved 30.51 px of ink, left as an unresolved fidelity diff pending owner approval |
| `pnpm test:e2e` at default parallelism | **environmentally unreliable, unchanged.** One WebKit test (`the chapter plate is viewport-fixed and the photograph pans through its frame`) fails under three-engine load and passes in isolation; reproduced identically on the unmodified baseline, so it is not a property of this change |
| WebKit / mobile-context visual baselines | still absent |
| `pnpm test:fidelity` / `pnpm candidate:preflight` | **BLOCKED, pre-existing and unchanged** |
