# Design annotation ledger

Status: source reconciliation complete; implementation values remain open where noted\
Scope: supplied PC/SP landing-page design, pink annotation stories only

This sanitized ledger converts the readable pink design annotations into stable,
testable records without publishing source paths, private artwork, or source-native
indices. The corresponding private evidence ledger maps each public ID to the editable
source story or story cluster.

## Reconciliation

The source contains exactly **13 readable pink stories or story clusters**:

- **9 implementation instructions**: one NEWS launch-visibility instruction, one footer
  legal-link launch-visibility instruction, two
  parallax/delayed-scroll instructions, one repeating line-extension instruction, one
  PC centering/wide-line instruction, one fixed-photo instruction, one SP top-fixed
  navigation instruction, and one combined font/Retina instruction containing two
  requirements;
- **4 non-implementation guides**: PC first-view, SP first-view, 1200 px, and 750 px;
- **0 unreadable pink stories**.

The page-title candidate is excluded because source inspection established that it is
not pink. The two multi-clause stories remain one record each; their clauses are not
miscounted as additional stories. Pink styling identifies an annotation, not UI color
or content to render.

### Modal-interaction coverage audit

A complete keyword and story-level review of all 13 pink records found **no instruction**
for modal background scrolling/scroll lock, outside-click closing, Escape closing, or
link destinations/URLs. The only fixed-position instructions are DA-MEDIA-01 (chapter
photography) and DA-NAV-01 (the PC and SP menu control). These four modal/link behaviors are
therefore deferred from the current implementation scope rather than inferred. This
absence does not waive the accessibility review required before any production modal is
implemented.

| Public ID       | Private evidence key | Category             | Scope | Approximate location             | Authority                         | Confidence |
| --------------- | -------------------- | -------------------- | ----- | -------------------------------- | --------------------------------- | ---------- |
| DA-NEWS-01      | PINK-01              | content visibility   | PC/SP | NEWS launch behavior             | authoritative intent; unresolved  | high       |
| DA-FOOTER-01    | PINK-02              | content visibility   | PC/SP | footer legal links               | authoritative intent; resolved    | high       |
| DA-MOTION-01    | PINK-03              | motion               | PC/SP | product-band contour lines       | authoritative intent; incomplete  | high       |
| DA-MOTION-02    | PINK-04              | motion               | PC/SP | background contour system        | authoritative intent; incomplete  | high       |
| DA-MOTION-03    | PINK-05              | motion               | PC/SP | hero/scroll-line area            | authoritative intent; incomplete  | high       |
| DA-LAYOUT-01    | PINK-06              | responsive layout    | PC    | annotated centered target/line   | authoritative intent; ambiguous   | medium     |
| DA-MEDIA-01     | PINK-07              | scroll/media behavior | PC/SP | fragrance chapter photography    | authoritative intent; incomplete  | high       |
| DA-NAV-01       | PINK-08              | navigation           | PC/SP | menu control at page top         | authoritative intent; incomplete  | high       |
| DA-ASSET-01     | PINK-09              | typography/assets    | PC/SP | page-wide type/export guidance   | authoritative intent; rights open | high       |
| DA-GUIDE-PC-FV  | PINK-10              | framing guide        | PC    | PC first view                    | guide only                        | high       |
| DA-GUIDE-SP-FV  | PINK-11              | framing guide        | SP    | SP first view                    | guide only                        | high       |
| DA-GUIDE-PC-1200 | PINK-12              | dimension guide      | PC    | PC design canvas                 | guide only                        | high       |
| DA-GUIDE-SP-750 | PINK-13              | export-density guide | SP    | SP source/export framing         | guide only                        | high       |

## Implementation instructions

### DA-NEWS-01 — initial NEWS omission

- **Category / scope:** content visibility; PC and SP.
- **Nearby section / target:** NEWS; the initial public state of the NEWS feature.
- **Behavior:** publish initially without the NEWS feature.
- **Specified values:** initial-launch omission only.
- **Unspecified values:** whether the section is absent from the DOM, disabled by an
  approved content flag, or introduced later; no schedule or data source is supplied.
- **Reduced motion:** not applicable.
- **Authority:** authoritative implementation intent. The apparent conflict with a second
  NEWS instruction was a mis-binding of DA-FOOTER-01; the source contains no conflict.
- **Confidence:** high for the instruction and for its implementation scope.
- **Question:** none outstanding; Q-02 is closed.
- **Implementation hook:** the semantic `NEWS` section's launch-visibility decision;
  do not render placeholder cards as a substitute.
- **Test hook:** assert the approved launch state at all three required viewports and
  verify that hidden content is neither focusable nor exposed to assistive technology.

### DA-FOOTER-01 — initial omission of two footer legal links

- **Category / scope:** content visibility; PC and SP.
- **Nearby section / target:** the footer legal row. The two leaders were re-measured
  against the source and land on 個人情報保護方針 and サイトご利用にあたって, not on NEWS
  content. The earlier NEWS binding was a reading error, and it produced a conflict with
  DA-NEWS-01 that the source does not contain.
- **Behavior:** publish initially with those two links hidden.
- **Specified values:** exactly two contents; initial-launch state.
- **Unspecified values:** when the links return, and what they point to (Q-09 owns the
  destinations).
- **Reduced motion:** not applicable.
- **Authority:** authoritative implementation intent; no remaining conflict.
- **Confidence:** high for the instruction and for the target identity.
- **Question:** none outstanding; the corrected binding closes the Q-02 conflict.
- **Implementation hook:** `implementationContract.launchHiddenFooterPolicyLinks`. The
  approved copy stays recorded in the content module, and the removed row keeps its
  measured height so no other footer element moves.
- **Test hook:** assert both labels are absent from the DOM and from rendered text at all
  three viewports, and that the copyright keeps its authored position.
- **Status 2026-08-19:** implemented. The links are absent at 390/768/1200/1440/2560 and
  the copyright y is unchanged at every viewport.

### DA-MOTION-01 — relative object parallax

- **Category / scope:** motion; PC and SP unless the owner narrows the platforms.
- **Nearby section / target:** the background contour-line system in the product band.
  Both leaders were re-measured and land on two different contour lines, so the source
  binds this record to the contour objects, not to unmapped page objects.
- **Behavior:** objects move with small relative scroll offsets.
- **Specified values:** relative offset and scroll coupling; no numeric value.
- **Unspecified values:** object list, distance, direction, trigger range, timing,
  easing, scrub model, cancellation, and mobile behavior.
- **Reduced motion:** remove relative transforms and preserve a stable final
  composition in normal document flow.
- **Authority:** authoritative intent; insufficient for implementation tuning.
- **Confidence:** high for intent; medium for target coverage.
- **Question:** Q-08 — approve targets and all motion parameters.
- **Implementation hook:** a future named object-parallax owner; no library is implied.
- **Status 2026-08-19:** implemented per contour object. Every approved contour export is
  split into one file per contour path by `scripts/generate-contour-layers.mjs`, which was
  verified to recompose to the unsplit drawing with zero differing pixels, so each line
  can hold its own depth. Foreground objects (the centre wordmark, the three product
  drawings, the chapter drawing) lead the document while the contour planes lag, and the
  three product drawings hold three separate depths so they separate against each other.
  Depths and caps are recorded in `docs/scroll-motion-spec.md`.
- **Test hook:** compare approved scroll landmarks at PC/SP plus a reduced-motion case;
  assert no content visibility or reading-order dependency on transforms.

### DA-MOTION-02 — delayed contour-line scrolling

- **Category / scope:** motion; PC and SP unless narrowed by approval.
- **Nearby section / target:** decorative background contour-line system.
- **Behavior:** contour lines scroll more slowly than the document.
- **Specified values:** relative direction is delayed/slower; no numeric ratio.
- **Unspecified values:** exact line groups, distance, ratio, timing, easing, trigger
  bounds, clipping, mobile behavior, and compositor ownership.
- **Reduced motion:** render contours statically with no scroll transform.
- **Authority:** authoritative intent; incomplete motion specification.
- **Confidence:** high for intent and general target; medium for exact line groups.
- **Question:** Q-08 — approve ownership and measurable parameters.
- **Implementation hook:** the decorative contour primitive, isolated from content and
  assistive technology.
- **Status 2026-08-19:** implemented and re-tuned. The previous 8 % lag capped at 72 px
  saturated by `scrollY = 900` and was not perceptible; each layer now carries its own
  depth between 0.06 and 0.15 with its own cap. Every offset is zero at the group's rest
  anchor, so the approved static composition is unchanged.
- **Test hook:** approved start/mid/end scroll frames and reduced-motion screenshot;
  verify no layout shift or horizontal overflow.

### DA-MOTION-03 — slow repeating downward line extension

- **Category / scope:** motion; PC and SP unless narrowed by approval.
- **Nearby section / target:** hero/first-view scroll-line area.
- **Behavior:** a line extends downward and repeats slowly.
- **Specified values:** downward extension, slow character, repetition.
- **Unspecified values:** exact line, start/end length, duration, delay, easing, repeat
  gap, trigger, and whether it pauses off-screen.
- **Reduced motion:** show a static indicator with no repeating animation.
- **Authority:** authoritative intent; qualitative values are not numeric acceptance
  criteria.
- **Confidence:** high for intent; medium for exact target bounds.
- **Question:** Q-08 — approve geometry and animation values.
- **Implementation hook:** future scroll-indicator decoration; it must not carry the
  only accessible instruction.
- **Test hook:** animation-state evidence after timing approval and a deterministic
  reduced-motion screenshot with no repeat.

### DA-LAYOUT-01 — PC centering and wide-line extension

- **Category / scope:** responsive layout; PC.
- **Nearby section / target:** the annotation's local PC target plus its left-side line;
  the exact target bounds are not preserved in sanitized evidence.
- **Behavior:** align the indicated part to the browser center; on wider browsers,
  extend the line on its left.
- **Specified values:** browser-center relationship and wide-browser leftward extension.
- **Unspecified values:** target element, breakpoint, maximum canvas width, line anchor,
  extension rule, full-bleed interaction, and tolerances.
- **Reduced motion:** not applicable; this is layout, not animation.
- **Authority:** authoritative intent with ambiguous target binding.
- **Confidence:** high for both clauses; medium for the affected element.
- **Question:** Q-07 — approve exact target, width trigger, anchor, and extension rule.
- **Owner decision 2026-08-19:** keep the uniform full-viewport scale. It satisfies the
  centring clause exactly, and satisfies the extension clause only in the sense that the
  rule grows along with everything else: composition, type and page height all scale with
  the viewport (page height 9436 → 20130 px at 2560). The literal reading — a fixed
  1200 px composition whose left rule alone extends — was considered and declined.
  Recorded as an accepted deviation, not as conformance.
- **Implementation hook:** the 1200 px authored PC composition uniformly scaled to the
  full viewport and its approved open-ended contour primitive.
- **Test hook:** geometry assertions at 1200 and 1440 CSS px plus one approved wider
  width; verify no clipping or horizontal overflow.

### DA-MEDIA-01 — fixed chapter photography

- **Category / scope:** scroll/media behavior; PC and SP behavior must be confirmed.
- **Nearby section / target:** fragrance chapter background photographs.
- **Behavior:** photographs remain fixed while surrounding content scrolls.
- **Specified values:** fixed/no-scroll visual intent.
- **Unspecified values:** affected chapters, fixed versus sticky technique, container
  bounds, stacking, crop transitions, device support, and mobile fallback.
- **Reduced motion:** use ordinary static-flow imagery unless a separate accessible
  fixed treatment is approved.
- **Specified reference:** the annotation cites `https://www.apple-q.jp` as the intended
  behaviour — a background photograph that holds still while the section scrolls over it.
  The reference is a behavioural target only; it grants no asset or code licence.
- **Authority:** authoritative intent, with a named behavioural reference.
- **Confidence:** high for intent; medium for cross-platform technique.
- **Question:** Q-08 — approve sections, geometry, platform behavior, and fallback.
- **Implementation hook:** chapter media layer inside each fragrance article.
- **Test hook:** scroll-boundary frames for every approved chapter, plus iOS/Safari and
  reduced-motion checks for focus visibility, crop, and scroll trapping.
- **Status 2026-08-19 (superseded):** implemented by translating each viewport-sized
  photograph against the scroll from the motion controller. Owner review rejected it: a
  JavaScript 1 : 1 counter-translation is always at least one frame behind a
  compositor-driven scroll, so the photograph juddered, and a `100dvh` box discarded 59 %
  of every approved frame.
- **Status 2026-08-19 (current):** the pin is browser-owned. `.page-artboard` now scales
  with `zoom` instead of `transform: scale()`, so it is no longer the containing block for
  fixed descendants, and `.chapter-photo-pin` is a genuine `position: fixed` layer clipped
  by the silhouette mask above it — the same architecture measured on the cited reference,
  which pins `ul.bg` with `position: fixed; inset: 0; z-index: -1` and runs no scroll
  listener at all. A wheel-driven sweep over 1 680 px measures 0.00 px of plate movement
  and zero frames off by more than 0.5 px in Chromium 151, Firefox 153 and WebKit 26.5.
  The photograph now keeps its own intrinsic height and pans through the hidden remainder
  once per chapter, so the whole approved frame is seen. Reduced motion releases the pin
  and restores the in-flow full-chapter composition. Measured values are recorded in
  `docs/scroll-motion-spec.md`.

### DA-NAV-01 — SP menu fixed at top

- **Category / scope:** navigation; PC and SP.
- **Nearby section / target:** the menu control at the page top. The annotation carries
  two leaders — one to the PC menu box and one to the SP menu box. The earlier SP-only
  scope dropped the PC leader.
- **Behavior:** keep the menu control visible at the top while the page scrolls, on both
  platforms.
- **Specified values:** top-fixed behavior on PC and SP.
- **Unspecified values:** fixed versus sticky technique, top/safe-area offset, trigger,
  height, stacking order, collision behavior, and modal interaction.
- **Reduced motion:** no motion-specific substitute; state changes must remain
  non-animated when reduced motion is requested.
- **Authority:** authoritative intent; incomplete state and geometry specification.
- **Confidence:** high for behavior; medium for implementation boundaries.
- **Question:** Q-16 — approve positioning, safe-area, stacking, focus, and modal rules.
- **Implementation hook:** semantic header/menu control, independent from the blocked
  modal visual.
- **Test hook:** scroll and zoom/reflow assertions at PC and SP, safe-area coverage, focus
  visibility, and no obstruction at 390×844 and the approved 375 px reference.
- **Status 2026-08-19:** implemented. The control is `position: fixed` at every width and
  holds its authored offset after scrolling at 1440, 768 and 390.

### DA-ASSET-01 — webfont roles and Retina-ready artwork

- **Category / scope:** typography and production assets; PC and SP.
- **Nearby section / target:** page-wide text and non-webfont visual elements; raster or
  vector derivatives. This is one source story containing two requirements.
- **Behavior:** reproduce the two named approved type roles through licensed webfont
  delivery; supply other visual lettering/artwork as approved SVG or image derivatives.
  Raster derivatives must be Retina-ready, or use SVG where suitable.
- **Specified values:** the two named families are **Futura PT** and
  **秀英角ゴシック銀 Std**, and the source supplies the Adobe Fonts web project that
  delivers them (kit `yhj3ndj`, script embed with a 3000 ms timeout). The licensed
  delivery path was specified by the source, not left open. Raster at 2× or SVG.
- **Unspecified values:** the registered domains on that kit, the Japanese family's web
  slug, exact role-to-element map,
  weights, metric fallback, which assets are raster versus SVG, CSS display dimensions,
  breakpoints, and per-asset export choice.
- **Reduced motion:** not applicable.
- **Authority:** authoritative asset intent, subject to font licensing, accessibility,
  provenance, and approved derivative rules.
- **Confidence:** high for both requirements; medium for element-level scope.
- **Question:** Q-05 — register the deploy origin on the kit and confirm the Japanese
  family slug; approve the per-asset 2×/SVG choice before provenance changes.
- **Status 2026-08-19:** implemented. The kit is loaded through Adobe's current CSS embed
  (same kit, one stylesheet instead of a timed script) and both families lead the type
  stacks ahead of the measured OFL fallbacks. `Referrer-Policy` moved from `no-referrer`
  to `strict-origin-when-cross-origin` because Adobe Fonts validates the requesting origin
  and answers 412 without one, which would have blocked the specified delivery
  permanently. Unregistered origins still receive 412 and fall back to the local subsets;
  that single third-party response is the only one the release-boundary check tolerates.
- **Implementation hook:** typography tokens/font delivery and the approved derivative
  pipeline; prose remains accessible HTML.
- **Test hook:** font-load/metric checks, no extracted font binaries, derivative
  intrinsic-dimension and `sizes` checks, provenance status, and no raster upscale.

## Non-implementation guides

### DA-GUIDE-PC-FV — PC first-view guide

- **Category / scope:** framing guide; PC.
- **Nearby section / target:** PC hero/first-view inspection frame.
- **Behavior:** labels the intended PC first-view region; it is not runtime content or a
  CSS instruction by itself.
- **Specified values:** measured 2026-08-20 from the source guide layer — the frame is a
  dimension bracket on the PC artboard running from the canvas top edge to **y 800**,
  with the connector at x 1217. The PC first view is therefore **1200 × 800**, a 3 : 2
  window. The scroll block the guide sits beside is authored at y 735.8 with a height of
  63.45, so it ends 0.75 px above the frame edge.
- **Unspecified values:** browser chrome, and what should happen on a window that is not
  3 : 2 — the artboard resolves against viewport *width*, so on a 1440 × 900 window the
  authored 800 px band renders 960 px tall.
- **Reduced motion:** not applicable.
- **Authority:** the guide label and bracket are excluded from UI, but the measured frame
  height is now load-bearing for anything the design pins to the first-view edge.
- **Confidence:** high.
- **Question:** Q-06 and clean-export approval must establish the actual frame.
- **Implementation hook:** `.scroll-indicator` keeps the authored 735.8 offset wherever
  the window can show the block, and follows the real fold at the same 64.2 px clearance
  when the window is shorter than the authored band (VF-36).
- **Test hook:** `tests/e2e/production.spec.ts` — "the first-view scroll cue stays inside
  the window at every required viewport".

### DA-GUIDE-SP-FV — SP first-view guide

- **Category / scope:** framing guide; SP.
- **Nearby section / target:** SP hero/first-view inspection frame.
- **Behavior:** labels the intended SP first-view region; it is not runtime content.
- **Specified values:** measured 2026-08-20 from the same guide layer — a dimension
  bracket on the SP artboard running from the canvas top edge to **y 667**, connector at
  x 382. The SP first view is therefore **375 × 667**. The SP scroll block is authored at
  y 602.8, giving the same **64.2 px** clearance to the frame edge as the PC block.
- **Unspecified values:** browser chrome/safe area and the 375-to-390 adaptation.
- **Reduced motion:** not applicable.
- **Authority:** the guide mark is excluded from production; the measured frame height is
  load-bearing in the same way as the PC frame.
- **Confidence:** high.
- **Question:** Q-06 — approve 375-to-390 adaptation and first-view framing.
- **Implementation hook:** the SP `.scroll-indicator` uses the same rule against the
  667 px frame (VF-36).
- **Test hook:** approved 390×844 hero frame and 375 px design-canvas inspection with
  guide marks excluded.

### DA-GUIDE-PC-1200 — PC 1200 px guide

- **Category / scope:** dimension guide; PC.
- **Nearby section / target:** authored PC design canvas.
- **Behavior:** identifies the 1200 px PC composition basis; it is not visible UI.
- **Specified values:** 1200 px design-canvas width.
- **Unspecified values:** outer-viewport behavior and the breakpoint at which the PC
  composition applies.
- **Reduced motion:** not applicable.
- **Authority:** guide corroborating measured source geometry, not an implementation
  element.
- **Confidence:** high.
- **Question:** Q-06/Q-07 — approve switch trigger and wide-viewport extensions.
- **Implementation hook:** PC content-canvas constraint after approval.
- **Test hook:** exact 1200 px canvas measurement and approved 1440 px centering.

### DA-GUIDE-SP-750 — SP 750 px export guide

- **Category / scope:** export-density guide; SP.
- **Nearby section / target:** SP source/export framing.
- **Behavior:** indicates a 750 px Retina export basis for the authored 375 CSS px SP
  composition; it must not cause the layout viewport to be treated as 750 CSS px.
- **Specified values:** 750 px export width; measured source geometry supports a 375 CSS
  px composition at 2×.
- **Unspecified values:** per-asset export dimensions and whether each derivative should
  use raster 2× or SVG.
- **Reduced motion:** not applicable.
- **Authority:** guide corroborating density interpretation, not runtime UI.
- **Confidence:** high.
- **Question:** Q-05/Q-06 — approve derivative choices and 375-to-390 behavior.
- **Implementation hook:** asset export validation only; no 750 CSS px breakpoint.
- **Test hook:** assert intrinsic-to-CSS sizing for approved derivatives and run the
  actual SP acceptance viewport at 390×844 without stretching the reference.

## Gate rule

The nine implementation annotations establish intent, not complete numerical motion,
layout, state, or asset contracts. They could not close Gate C until the measured
fallback contracts and clean reference bindings were recorded. Gate C is now ready;
unapproved implementation values and missing executed reference evidence remain Gate
D/E work. The four guide annotations may inform measurement but never appear in
production or count as approved implementation behavior.
