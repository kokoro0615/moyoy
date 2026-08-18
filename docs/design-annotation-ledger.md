# Design annotation ledger

Status: source reconciliation complete; implementation values remain open where noted\
Scope: supplied PC/SP landing-page design, pink annotation stories only

This sanitized ledger converts the readable pink design annotations into stable,
testable records without publishing source paths, private artwork, or source-native
indices. The corresponding private evidence ledger maps each public ID to the editable
source story or story cluster.

## Reconciliation

The source contains exactly **13 readable pink stories or story clusters**:

- **9 implementation instructions**: two NEWS launch-visibility instructions, two
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

| Public ID       | Private evidence key | Category             | Scope | Approximate location             | Authority                         | Confidence |
| --------------- | -------------------- | -------------------- | ----- | -------------------------------- | --------------------------------- | ---------- |
| DA-NEWS-01      | PINK-01              | content visibility   | PC/SP | NEWS launch behavior             | authoritative intent; unresolved  | high       |
| DA-NEWS-02      | PINK-02              | content visibility   | PC/SP | NEWS content controls            | authoritative intent; unresolved  | high       |
| DA-MOTION-01    | PINK-03              | motion               | PC/SP | annotated page objects           | authoritative intent; incomplete  | high       |
| DA-MOTION-02    | PINK-04              | motion               | PC/SP | background contour system        | authoritative intent; incomplete  | high       |
| DA-MOTION-03    | PINK-05              | motion               | PC/SP | hero/scroll-line area            | authoritative intent; incomplete  | high       |
| DA-LAYOUT-01    | PINK-06              | responsive layout    | PC    | annotated centered target/line   | authoritative intent; ambiguous   | medium     |
| DA-MEDIA-01     | PINK-07              | scroll/media behavior | PC/SP | fragrance chapter photography    | authoritative intent; incomplete  | high       |
| DA-NAV-01       | PINK-08              | navigation           | SP    | menu/header at page top          | authoritative intent; incomplete  | high       |
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
- **Authority:** authoritative implementation intent, but it conflicts in scope with
  DA-NEWS-02 and therefore does not close Q-02.
- **Confidence:** high for the instruction; medium for its exact implementation scope.
- **Question:** Q-02 — entire NEWS section or only selected content types?
- **Implementation hook:** the semantic `NEWS` section's launch-visibility decision;
  do not render placeholder cards as a substitute.
- **Test hook:** assert the approved launch state at all three required viewports and
  verify that hidden content is neither focusable nor exposed to assistive technology.

### DA-NEWS-02 — initial omission of two NEWS contents

- **Category / scope:** content visibility; PC and SP.
- **Nearby section / target:** NEWS content controls; two source-referenced contents.
- **Behavior:** publish initially with those two contents hidden.
- **Specified values:** exactly two contents are affected; initial-launch state.
- **Unspecified values:** the retained annotation does not unambiguously bind the two
  contents to approved production identifiers, nor explain its relationship to
  DA-NEWS-01.
- **Reduced motion:** not applicable.
- **Authority:** authoritative implementation intent with an unresolved conflict.
- **Confidence:** high for count and visibility intent; medium for target identity.
- **Question:** Q-02 — identify the two contents and resolve the whole-section conflict.
- **Implementation hook:** approved NEWS taxonomy/content model, after owner resolution.
- **Test hook:** data-driven visibility assertion for the two approved identifiers,
  including keyboard and accessibility-tree absence when hidden.

### DA-MOTION-01 — relative object parallax

- **Category / scope:** motion; PC and SP unless the owner narrows the platforms.
- **Nearby section / target:** annotated page objects; exact object ownership remains to
  be mapped against clean exports.
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
- **Implementation hook:** the centered 1200 px PC composition and its approved
  open-ended contour primitive.
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
- **Authority:** authoritative intent; the cited inspiration is not an asset/code
  license and is not part of this public ledger.
- **Confidence:** high for intent; medium for cross-platform technique.
- **Question:** Q-08 — approve sections, geometry, platform behavior, and fallback.
- **Implementation hook:** chapter media layer inside each fragrance article.
- **Test hook:** scroll-boundary frames for every approved chapter, plus iOS/Safari and
  reduced-motion checks for focus visibility, crop, and scroll trapping.

### DA-NAV-01 — SP menu fixed at top

- **Category / scope:** navigation; SP.
- **Nearby section / target:** mobile menu/header at the page top.
- **Behavior:** keep the SP menu visible at the top while the page scrolls.
- **Specified values:** top-fixed behavior on SP.
- **Unspecified values:** fixed versus sticky technique, top/safe-area offset, trigger,
  height, stacking order, collision behavior, and modal interaction.
- **Reduced motion:** no motion-specific substitute; state changes must remain
  non-animated when reduced motion is requested.
- **Authority:** authoritative intent; incomplete state and geometry specification.
- **Confidence:** high for behavior; medium for implementation boundaries.
- **Question:** Q-16 — approve positioning, safe-area, stacking, focus, and modal rules.
- **Implementation hook:** semantic header/menu control, independent from the blocked
  modal visual.
- **Test hook:** SP scroll and zoom/reflow assertions, safe-area coverage, focus
  visibility, and no obstruction at 390×844 and the approved 375 px reference.

### DA-ASSET-01 — webfont roles and Retina-ready artwork

- **Category / scope:** typography and production assets; PC and SP.
- **Nearby section / target:** page-wide text and non-webfont visual elements; raster or
  vector derivatives. This is one source story containing two requirements.
- **Behavior:** reproduce the two named approved type roles through licensed webfont
  delivery; supply other visual lettering/artwork as approved SVG or image derivatives.
  Raster derivatives must be Retina-ready, or use SVG where suitable.
- **Specified values:** two named type families; raster at 2× or SVG.
- **Unspecified values:** licensed delivery account/domains, exact role-to-element map,
  weights, metric fallback, which assets are raster versus SVG, CSS display dimensions,
  breakpoints, and per-asset export choice.
- **Reduced motion:** not applicable.
- **Authority:** authoritative asset intent, subject to font licensing, accessibility,
  provenance, and approved derivative rules.
- **Confidence:** high for both requirements; medium for element-level scope.
- **Question:** Q-05 — approve licensed delivery and fallback; approve the per-asset
  2×/SVG choice before provenance changes.
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
- **Specified values:** PC first-view identity only.
- **Unspecified values:** viewport height, browser chrome, fold tolerance, and responsive
  interpolation.
- **Reduced motion:** not applicable.
- **Authority:** guide/evidence only; exclude the label and guide geometry from UI.
- **Confidence:** high.
- **Question:** Q-06 and clean-export approval must establish the actual frame.
- **Implementation hook:** none; use only to interpret approved capture framing.
- **Test hook:** future 1440×900 hero reference frame with the guide layer excluded.

### DA-GUIDE-SP-FV — SP first-view guide

- **Category / scope:** framing guide; SP.
- **Nearby section / target:** SP hero/first-view inspection frame.
- **Behavior:** labels the intended SP first-view region; it is not runtime content.
- **Specified values:** SP first-view identity only.
- **Unspecified values:** viewport height, browser chrome/safe area, fold tolerance, and
  390 px adaptation.
- **Reduced motion:** not applicable.
- **Authority:** guide/evidence only; exclude it from production.
- **Confidence:** high.
- **Question:** Q-06 — approve 375-to-390 adaptation and first-view framing.
- **Implementation hook:** none; reference interpretation only.
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
layout, state, or asset contracts. They cannot close Gate C while their listed values
and clean reference bindings remain unresolved. The four guide annotations may inform
measurement but never appear in production or count as approved implementation
behavior.
