# Visual fidelity defect ledger

Status: **OPEN — blocks claims that the production candidate matches the supplied
design**
Scope: sanitized public record; no private source paths or client masters

This ledger records visual discrepancies found by owner review and a fresh
production-build inspection on 2026-08-19. `implemented` means that markup or an asset
is present. It does not mean `faithful`. No item below may be closed from code inspection,
asset existence, build success, or implementation-authored regression snapshots.

| ID | Region / state | Observed discrepancy | Current implementation signal | Status |
| --- | --- | --- | --- | --- |
| VF-01 | PC/SP page-top menu control, closed state | Position did not match the supplied PC/SP design | visual bounds now map to the measured 1200/375 source bounds while the semantic button retains a ≥44 px target | CORRECTED CANDIDATE — PENDING HUMAN REVIEW |
| VF-02 | PC/SP hero contour system | Contours were materially fainter than the supplied design | end-to-end trials rejected `1px`; the approved `0.25px` derivative is retained and the extra CSS `opacity: 0.2` is removed | CORRECTED CANDIDATE — PENDING HUMAN REVIEW |
| VF-03 | PC/SP hero contour system | Top and left contour placement did not align with the supplied design | identical source path landmarks now set PC/SP offsets and natural scale; fresh 1200/375 overlay exists | CORRECTED CANDIDATE — PENDING HUMAN REVIEW |
| VF-04 | PC/SP footer contour system | Footer contours were materially fainter, underscaled, misplaced, and clipped | CSS opacity is removed, natural scale/source offsets are restored, and footer-local clipping no longer cuts the PC contour | CORRECTED CANDIDATE — PENDING HUMAN REVIEW |
| VF-05 | contour motion, normal-motion mode | The pink instruction says contour lines scroll more slowly than the document; the candidate was static | the 8 % lag now covers hero, product and footer contours with anchored ranges, viewport-space caps and a compact cap set below 640 px; reduced motion forces zero transform | IMPLEMENTED — MOTION VALUES UNVERIFIED |
| VF-06 | PC/SP brand header line + MOYOY wordmark, page top | Rule and wordmark were too high and the artwork was rendered under natural width, so the wordmark did not reach the reference position and the open-ended left rule was truncated | measured PC reference rule at y 394.0–396.2 with artwork ink x 0–676, y 385–400 (natural 917×15.02 anchored at x −241); production rendered y 292 with a 605 px artwork | CORRECTED — 1200/375 EVIDENCE, PENDING HUMAN REVIEW |
| VF-07 | PC/SP first-view scroll indicator | Label rendered below the line; whole block ~241 px (PC) / ~276 px (SP) above the reference, and the line length/geometry did not match | reference PC block x 585.9, y 735.8, 26.64×63.45 with label ink y 736–745 and line y 750–799.4; SP block x 172.9, y 602.8 with line y 618–666.5 | CORRECTED — 1200/375 EVIDENCE, PENDING HUMAN REVIEW |
| VF-08 | PC about heading + vertical prose | Whole block ~292 px above the reference, heading/prose gap too small | reference heading ink x 382–404, prose columns x 522–817 (8 columns, 40 px pitch), block rows 1008–1265; production rows 716–988; corrected columns now agree within 1 px | CORRECTED — 1200 EVIDENCE, PENDING HUMAN REVIEW |
| VF-09 | PC centre brand mark | 151 px above the reference | reference mark rows begin y 1396; production y 1245 | CORRECTED — 1200 EVIDENCE, PENDING HUMAN REVIEW |
| VF-10 | PC product section | Column pitch, drawing scale, copy alignment and vertical rhythm all diverged | reference drawing centres x 423 / 603 / 782, all bottom-aligned at y 1830 at natural SVG size (30.43×108.03, 62.14×86.36, 136.09×244.97), copy centred with eyebrow ink at y 1866; production used 234 px pitch, left-aligned copy and non-natural drawing sizes; the chapter title was also upright instead of rotated and the chapter drawing lost its screen blend | CORRECTED — 1200/375 EVIDENCE, PENDING HUMAN REVIEW |
| VF-11 | PC/SP ROOT upper beige foreground | Silhouette sat 65–66 px (PC) / 18 px (SP) above the reference, exposing the rectangular photo top edge | reference-vs-SVG lower-edge solution gives PC top 2136, SP top 2441; production used 2069.1 / 2422.41 | CORRECTED — 1200/375 EVIDENCE, PENDING HUMAN REVIEW |
| VF-12 | PC/SP footer | Contact block rendered as one left column; the reference splits contact (left) and policy/copyright (right) and the reference contains an Instagram mark | reference left block x 48 with three lines plus the account line, right block x 832–1160 with two policy labels and the copyright | CORRECTED — 1200/375 EVIDENCE, PENDING HUMAN REVIEW; the third-party Instagram mark stays unshipped |
| VF-13 | PC/SP menu control, closed state | Source artwork fill is exactly the paper colour `#ece7d8`, so a faithful page-top control is invisible over paper and fails WCAG 2.2 non-text contrast | approved PC closed reference contains zero non-paper pixels in x 900–1200 / y 0–120; the extracted control outline declares `fill: #ece7d8` | INTENTIONAL ACCESSIBILITY DEVIATION — DESIGN APPROVAL REQUIRED |
| VF-14 | PC/SP decorative object motion (DA-MOTION-01) | Relative object parallax was absent | eight decorative objects now drift symmetrically about their centred moment with unequal caps | IMPLEMENTED — MOTION VALUES UNVERIFIED |
| VF-15 | PC/SP first-view line motion (DA-MOTION-03) | Repeating downward line extension was absent | a 3.2 s CSS loop extends the 48.95 px rule downwards and drains it downwards; reduced motion renders the full static rule | IMPLEMENTED — MOTION VALUES UNVERIFIED |
| VF-16 | PC/SP chapter photography (DA-MEDIA-01) | Fixed/sticky chapter-photo continuity was absent | the silhouette is now a static `mask-image` taken from the same derivative and the photograph drifts downwards inside it; the chapter boundary never moves | IMPLEMENTED — PARTIAL, MOTION VALUES UNVERIFIED |
| VF-17 | PC/SP contour motion coverage (DA-MOTION-02) | Only hero and footer contours had lag; the product contour band was static and carried an extra CSS `opacity: 0.2` | the product contour band now has a transform owner and the extra CSS opacity is removed | IMPLEMENTED — MOTION VALUES UNVERIFIED |
| VF-18 | wide desktop, viewport width above 2400 CSS px | The complete artboard and chapter photographs stopped at 2400 px, leaving symmetric paper gutters (80 px each at 2560) despite the approved full-viewport rule | the artboard scale is resolved in CSS as `viewport / 1200`; source-derived `pc-2560-*` WebP files are selected above 2400 px and a Chromium regression verifies natural width ≥ rendered width | CORRECTED CANDIDATE — exact wide external reference remains UNVERIFIED |
| VF-19 | SP chapter photography, 376–639 px | Chapter boxes kept the 375 px reference heights while their images expanded to the viewport width, so 390 px squeezed ROOT from its uniform `390/751` height of about 900 px down to 865 px; distortion increased toward 639 px | `--sp-source-scale: viewport/751` drives all chapter heights, 1600 px source-origin steps, footer position, and page height; Chromium checks 390 and 639 aspect ratios against natural image ratios | CORRECTED CANDIDATE — exact external 390 reference remains UNVERIFIED |
| VF-20 | CSS chapter masks before scroll | Each mask reused an RGB `photo/*.webp`, so CSS discovered all four desktop chapter photos before the user reached them and added about 2.3 MB to initial transfer | eight independently hashed alpha-only PC/SP WebP masks are referenced from CSS; a Chromium resource test confirms below-fold DUSK/DAWN/ALPINE RGB files are absent before scroll | CORRECTED CANDIDATE — transfer measurement is locally verified |
| VF-21 | visual regression capture | `fullPage: true` allowed a composited masked chapter layer to disappear from the baseline while the test still passed | 21 production viewport/state PNGs capture top, each chapter, footer, and menu-open separately at 1440/768/390; no visual test uses fullPage | CORRECTED CANDIDATE — baselines remain implementation regression evidence, not external fidelity |
| VF-22 | fidelity coverage, 768/390 chapter and footer states | The prior 11-frame contract covered only top/menu for tablet and mobile | the contract now contains 21 frames and three material-state coverage groups, with concrete selector anchors and exact-size masks for every viewport | CORRECTED CANDIDATE — exact responsive references and executed comparisons remain UNAVAILABLE |
| VF-23 | footer contact source and public scanner | address/telephone were split/escaped to avoid the public-text detector, making source copy noncanonical | literal approved copy is restored; `config/public-copy-allowlist.json` binds the exact values and source path by SHA-256 while all other contact matches remain blocked | CORRECTED CANDIDATE — staged policy and human copy review remain required |
| VF-24 | chapter photography under real scroll (DA-MEDIA-01) | Owner review: the fixed photograph juddered on every scroll. The pin was emulated by writing a counter-`translate3d()` from a `scroll` listener, so it was structurally one or more frames behind a compositor-driven scroll and the 1 : 1 correction made every frame of latency fully visible | `.page-artboard` uses `zoom` instead of `transform: scale()`, which stops it being a containing block for fixed descendants, and `.chapter-photo-pin` is a real `position: fixed` layer clipped by the silhouette mask; wheel-driven sweep over 1 680 px measures 0.00 px plate movement and 0 frames off by >0.5 px in Chromium 151, Firefox 153 and WebKit 26.5 | CORRECTED CANDIDATE — measured locally on three engines |
| VF-25 | chapter photography crop (DA-MEDIA-01) | Owner review: only the pinned region of each photograph was ever visible. Every frame is authored at full chapter height (1440×2174‥2221) but was rendered into a `100dvh` box with `object-fit: cover`, discarding 59 % of every approved photograph | the plate holds the frame at its own intrinsic height and `--chapter-pan-y` traverses the hidden remainder once per chapter, so the whole approved photograph is seen; strength is a single documented constant in `page-motion.tsx` | CORRECTED CANDIDATE — reveal extent is an implementation decision pending owner confirmation |
| VF-26 | chapter photography arrival (DA-MEDIA-01) | Owner review: scrolling from ROOT to DUSK showed nothing until the photograph arrived. All four frames were `loading="lazy"`; measured after `networkidle` at scroll 0, DUSK/DAWN/ALPINE were all `complete: false, naturalWidth: 0` | ROOT loads eagerly at low priority, the rest are armed by an `IntersectionObserver` at `rootMargin: 150%`, each `<source>` declares its own intrinsic box, and the plate is backed by the photograph's measured mean tone; a Chromium regression asserts every frame is decoded one viewport before its chapter | CORRECTED CANDIDATE — Lighthouse performance stays 100 with LCP 0.7 s and CLS 0 |
| VF-27 | contour motion amplitude and separation (DA-MOTION-01/02) | Owner review: neither the lag nor the per-object offset was perceptible. The lag was 8 % capped at 72 px and saturated by `scrollY = 900`, and each contour band was one raster, which cannot express a per-object offset at all | each approved export is split into one file per contour path by `scripts/generate-contour-layers.mjs` (verified to recompose with zero pixel difference) and every layer carries its own depth and cap; foreground objects lead while the contour planes lag, and the three product drawings hold three separate depths | CORRECTED CANDIDATE — depths recorded in `docs/scroll-motion-spec.md`, owner confirmation of amplitude pending |
| VF-28 | PC/SP contour line weight | **Re-opened VF-02.** Owner review: the background lines are too faint. Measured against the approved frames at 1 : 1 scale, the reference contour bands contain fully inked pixels (`min` luminance `0.0`, `p0.1 % ≈ 11`, `p0.5 % ≈ 50–59` over paper at `231`) while production could not produce a single black pixel (`min 17.6/89.0`, `p0.1 % 153–175`): a `0.25px` stroke antialiases to about 25 % coverage and can never reach the reference's ~1 px solid core. The earlier "1px over-darkens" conclusion was reached without this statistic | the six approved contour exports carry `stroke-width: 1px` with `vector-effect: non-scaling-stroke` (so the weight survives the tablet band's `vw` scaling and the desktop `zoom`), and `scripts/generate-contour-layers.mjs` re-derived the 18 layers. Product drawings were measured separately and left alone: the reference product outline is `≈0.26 px` of ink, which the shipped `0.25px` already matches. After: SP `min 0.0 / p0.1 % 13.9–17.6 / p0.5 % 54.9–57.2 / p1 % 113.1–134.0` against reference `0.0 / 10.9–11.9 / 50.0–58.9 / 113.1–129.1`; PC `p1 %` identical at `115.1` | CORRECTED — 1200/375 REFERENCE STATISTIC, PENDING HUMAN REVIEW |
| VF-29 | SP about block (heading + prose) | Owner review: the mobile copy is collapsed. The spec row "SP measured 237.42 px block" records the width of eight *vertical* columns; it was implemented as a horizontal wrap width, so the prose ran left-to-right in ten wrapped lines from y 779 and the heading sat above it at x 24. The approved SP frame sets the prose in eight vertical-rl columns at a 32 px pitch and centres the heading below them | prose restored to `writing-mode: vertical-rl` at `14 px / 32 px / 0` tracking in a 256 px block; heading horizontal, centred, with `padding-left: 7.25px` absorbing the trailing letter-space. Measured after: columns at `293–305 / 261–272 / 229–240 / 197–208 / 164–176 / 132–145` against reference `293–305 / 262–273 / 229–241 / 197–209 / 165–177 / 133–145`; prose ink top `844` vs `844`; heading ink rows `1202–1217` and x `105–269` vs reference `1202–1217` and `104–270` | CORRECTED — 375 EVIDENCE, PENDING HUMAN REVIEW |
| VF-30 | SP footer mark, contact block and close control | Owner review: the mobile footer text and logo are the wrong size and in the wrong place. `sp-brand-footer-line.svg` is byte-identical to the header artwork (`viewBox 0 0 917 15.02`) but SP CSS sized it to `250px`, squashing the whole wordmark into a 4.09 px rule; the contact block sat at x 24 against a reference x 30; and the hidden policy row reserved two stacked lines where the reference sets one, pushing the copyright 17.5 px low. The SP close control also used the PC's side-by-side arrangement | the footer mark is anchored like the header (`left: -652px; width: 917px`), the contact block moves to x 29 with measured `+73 / +98 / +115 / +150` ink offsets below the mark, the reserved policy row is one line so the copyright lands at `+269` against reference `+270`, and the SP close control stacks the box over the label (reference box `333–354 / 20–40`, label `329–358 / 50–60`, both centred on x 343.5) | CORRECTED — 375 EVIDENCE, PENDING HUMAN REVIEW |
| VF-31 | contour and object motion amplitude | **Second owner rejection of VF-27.** The published depths still saturated before the reader had scrolled one mobile viewport (hero layer 1 capped at `scrollY = 387`) and the leading-to-trailing spread inside a stack was 78 px at desktop, which does not read as separation | depths and caps re-derived so every layer keeps moving for as long as its band is on screen and the in-stack depth ratio rises to 3.4 : 1; foreground objects grow by about half so no drawing can overrun its own caption. Values and the saturation arithmetic are in `docs/scroll-motion-spec.md` §5 | **SUPERSEDED by VF-31b** |
| VF-31b | contour and object motion amplitude | **Third owner rejection.** Owner review: the motion is still not strong enough | measuring the shipped controller at 1440 × 900 shows the cause was never the size of the numbers. Every band was driven by `scroll × depth` against a fixed cap, so each spent nearly the whole page **pinned at its cap and therefore completely still**: the footer stack held `-280 / -170` continuously from `scrollY 0` to `3000`, the product stack held `-300 / -210 / -130` until `900`, and the hero stack saturated at `scrollY 1264` and then held `430 / 330 / 230 / 130` for the remaining ~13 000 px. The drive model is now each band's own crossing of the window: every layer interpolates across exactly the interval in which it is visible, so it cannot saturate while the reader can see it and is still by construction once it cannot. Peak travel also rises (hero layer 1 430 → 460 artboard px) and the in-stack ratio is 3.48 : 1. Object limits are now separate for rise and fall, because the space around a drawing is not symmetric — a product drawing has its whole row above it but only the measured 33 px gap to its own caption below | CORRECTED CANDIDATE — MEASURED ON THREE ENGINES; MOTION AMPLITUDE STILL AWAITS OWNER CONFIRMATION |
| VF-32 | menu drawer open/close behaviour | Owner review: the menu open/close is too plain. There was no transition at all — `showModal()` and `close()` swapped the drawer on a single frame | the drawer is drawn in from its own edge and its groups settle in reading order, entirely in CSS: `@starting-style` supplies the entry state and `transition-behavior: allow-discrete` on `display`/`overlay` keeps the exit alive, so no JavaScript holds animation state. 520 ms enter / 300 ms exit on the documented easing tokens, a 42 ms stagger over ten ranked items, section rules drawn with `scale-x` instead of switched on, and a focus/hover ripple on the 3 × 3 control mark. `prefers-reduced-motion` keeps a designed fallback (140 ms opacity only, nothing travels) rather than losing the transition | **SUPERSEDED by VF-32b** |
| VF-32b | menu drawer open/close behaviour | **Second owner review:** the drawer still resolves too quickly to register as a movement | both halves are lengthened and, more importantly, the entry *distance* of each group is nearly doubled — at this panel width the travel is what reads, not the clock. Enter 520 → **640 ms**, exit 300 → **420 ms**, stagger 42 → **52 ms**, settle delay 140 → **150 ms**, group travel 14 → **26 px**, group transition 260/420 → **300/460 ms**, section-rule draw 560 → **720 ms**. The panel still arrives in 640 ms and every item is focusable while its group settles, so no interaction waits on the choreography. Inspected at 120 / 300 / 520 / 900 ms on Chromium at 1440 × 900 | IMPLEMENTED — TIMING IS MEASURABLE IMPLEMENTATION JUDGMENT, NOT DESIGNER-APPROVED |
| VF-33 | SP product section | Found while correcting VF-29: the whole mobile product block sat 148 px low with centred copy and equal-height rows. The approved SP frame draws every product at natural size centred on x 106.5, starts a left-aligned copy column at x 199, shares a bottom edge between drawing and copy (`1650 / 1872 / 2189`), and uses a larger price size | rows declared at `130 / 150 / 245 px` with a 72 px gap and `align-items: end`; copy left-aligned with the measured ink pitch (category → name 23, name → volume 35, volume → dimensions 16, dimensions → price 36); volume/dimensions at 11 px and price at 15 px with `word-break: keep-all` so the diffuser price lines break at their own space. All 20 measured ink rows now land within 6 px of the reference (median 2 px) | CORRECTED — 375 EVIDENCE, PENDING HUMAN REVIEW |
| VF-34 | SP band, 376–639 px | Owner review: the mobile prose no longer sits on the background line the approved frame draws it against, and the centred scroll cue reads as left-of-centre | the SP band resolved **two scales at once**: decorative artwork and chapter strips were sized in `vw` while every piece of type and furniture kept its authored 375 px offset. Measured at 390: `.hero-contours` 495.94 → 515.77 px wide and 36.8 px taller, while `.about-copy p` stayed at y 842.5 and only moved 15 px in x; the cue's 1 px rule stayed at canvas x 186.5 against a window centre of 195, i.e. **8.5 px left**. The divergence is 4 % at 390 and 15 % at 430. The whole SP composition is now authored on the 375 px canvas and the artboard resolves that canvas against the viewport with `zoom`, exactly as the desktop artboard resolves 1200; every `vw` value in the band was restated as the canvas pixel it evaluated to at 375, so the approved 375 rendering is byte-equivalent (reference MAE 8.721 → 8.665) and every other width is a uniform scale of it. Verified by downscaling the 390 render to 375 and re-comparing with the approved frame | CORRECTED — 375 REFERENCE PRESERVED, 390/414/430/639 PROVEN PURE SCALE; PENDING HUMAN REVIEW |
| VF-35 | fixed menu control, every width, over chapter photography | Owner review: scrolling makes the menu control collide with the surface behind it and disappear | DA-NAV-01 pins the control to the top of the window, so it necessarily crosses from paper onto photography, but the PC control carried a single static `color: var(--ink)`. Measured over ROOT (`--chapter-tone #12281d`) the ink mark reached about **1.05 : 1** and was invisible. Inverting to paper is not an answer either — the ALPINE frame is snow and its top-right corner is lighter than the paper. The control now sits on a plate of the page's own paper whenever the surface behind it stops being paper, keeping page ink at a fixed **14.6 : 1** on every frame; over the paper surface the plate *is* the surface, so the approved page-top frame is unchanged. The band is computed by the existing scroll owner from the cached chapter boxes, and a paper halo is the no-JavaScript floor. The SP control's previous paper-plus-dark-halo inversion is retired in favour of the same treatment | **SUPERSEDED by VF-35b** |
| VF-36 | PC/SP first-view scroll cue | Owner review: on PC the scroll cue is not inside the first view the pink guide draws | the guide layer was measured for the first time (see `docs/design-annotation-ledger.md`): the PC first view is **1200 × 800** and the SP first view is **375 × 667**, and in both the cue is authored flush with the frame's bottom edge at the same 64.2 px clearance. The artboard resolves against viewport *width*, so on a 1440 × 900 window the authored 800 px band renders **960 px** tall and the cue landed at y 883–959 — measured, its 58.7 px rule began at **exactly 900.34**, wholly below the fold. The cue now keeps its authored offset wherever the window can show it and rises to the real fold only when the window is shorter than the authored band. Measured after, at 320×800 / 375×844 / 390×844 / 430×932 / 639×900 / 640×900 / 768×1024 / 1200×900 / 1440×900 / 1920×1080 / 2560×1440: inside the window at every one, with the authored 735.8 (PC) and 602.8 (SP) preserved at 1200×900, 768×1024, 375×844, 390×844 and 430×932 | CORRECTED — 11 VIEWPORTS MEASURED; PENDING HUMAN REVIEW |
| VF-37 | PC/SP product line work | Owner review: the SVG of the three PERFUME/DIFFUSER product drawings is too faint | measuring integrated ink width (the antialiasing-independent statistic) against the approved 1200 px frame shows the drawings were **already faithful** — reference outline 0.251 px, production 0.243 px — and that the page around them was not. The **contour system is 4× the reference**: reference contour ink 0.250/0.258 px against production 0.891/1.145 px, because VF-28 promoted a 0.25 px background hairline to a 1 px stroke on percentile evidence that was contaminated by other ink in those bands. That inverted the master's line hierarchy — background whisper at statement weight — which is what makes the products read as washed out. The owner-approved contour weight is left untouched and the product line work is raised to the same crisp `1px` + `vector-effect: non-scaling-stroke`, so the two families match as they do in the master. Measured after: outline 0.243 → **0.977 px**. The signature accent path also shipped with no presentation attribute at all, rendering as a bare fill at 1.003 px against the reference's 1.255 px solid black; it now carries an explicit fill and hairline stroke at 1.578 px so it still outranks the outline | CORRECTED — MEASURED; the 4× contour deviation from the master is recorded here and is NOT resolved, see below |
| VF-35b | fixed menu control, every width | **Owner rejection of VF-35.** The paper plate looks bad and reads as broken; keep the background transparent and change the control's own colour instead | the plate is removed and nothing is painted behind the mark at any scroll position. A single colour is still measurably impossible — sampling the surface behind the control at 1440 × 900 across all four chapters gives relative luminance 0.799 (paper) → 0.007 (ROOT forest) → 0.652 (ALPINE snow), and it crosses the ink/paper break *inside* one chapter (DUSK spans 0.008 to 0.379), so a per-chapter colour fails too. The control therefore adopts the treatment the page already uses for its own type over these same photographs and which the owner has already approved on all four chapter titles: page ink with no shadow over paper — byte-identical to the approved page-top frame — and the paper colour with the chapter halo over a photograph. Measured mark-vs-surround contrast after: page top 10.0 : 1, ROOT 11.7 : 1, DUSK 6.1 : 1, ALPINE 4.4 : 1, SP ROOT 16.1 : 1, SP ALPINE 4.5 : 1. The media band also became exact: the ROOT chapter box begins about 260 px above the photograph the reader sees, because the beige upper foreground is painted over it, so that band is now subtracted and the control stays ink there | CORRECTED — MEASURED ON ALL FOUR CHAPTERS AT 1440 AND 390; PENDING HUMAN REVIEW |
| VF-38 | parallax coverage across the whole line system | Owner review: is the parallax actually applied to every background line, and does each object really offset from its neighbours? | audited by reading the rendered transform of every decorative element at nine scroll positions. Two real gaps. **(a) Three elements never moved at all:** the brand header rule, the brand footer rule — the two longest lines on the page — and the ROOT upper foreground. The two brand rules now drift with the rest of the line system, each anchored so the frame the reference approves is the frame that holds still (the header starts at its authored offset because the approved composition is the page top; the footer arrives at its authored offset because the approved composition is the page end). The ROOT foreground stays fixed and is the one documented exception: it is the seam between the paper page and the first photograph, its position is the measured VF-11 value, and it is also the signal VF-35b uses to know which surface is behind the control. **(b) Two of the four hero contour lines were moving invisibly.** Measuring each layer's own geometry shows hero layers 3 and 4 are vertically oriented (bounding boxes 388 × 801 and 435 × 709), and a vertical translation of a vertical line only slides the line along itself. Those two layers, and the product stack's small closed form, now carry a horizontal component perpendicular to their own direction, so the displacement is visible rather than merely present. Re-audited after: every element except the ROOT foreground changes on every band it crosses | CORRECTED — 9-POSITION AUDIT AT 1440 × 900; PENDING HUMAN REVIEW |
| VF-39 | every viewport, Safari / iOS Safari only | Owner review on a physical iPhone (390 × 844): the page keeps a blank margin at both edges all the way to the end of the document and the composition is broken | both artboards resolve their authored canvas against the window with `zoom`, and the ratio was computed in CSS as `tan(atan2(100vw, 375px))` / `tan(atan2(100vw, 1200px))` — the only construct on the page whose implementations still disagree. `atan2()` over two lengths in **different units** is unspecified (w3c/csswg-drafts#7482) and shipping WebKit does not return the ratio, so `zoom` is invalid at computed-value time and falls back to `1`. The artboard then renders at its authored **375 px** (SP) / **1200 px** (PC) width and the base rule's `margin-inline: auto` centres it: a 7.5 px paper gutter down both edges of a 390 px phone, 27.5 px on a 430 px phone, 120 px on a 1440 px Safari window — and the whole composition 4 %–20 % off the frame it was measured against. The same ratio feeds `--first-view-height` and the scroll controller, so the scroll cue and every parallax offset were wrong with it. Measured on the owner's frame: the wordmark ink ends at 0.691 of the window against the approved 0.7067, i.e. exactly the 375/390 ratio. The ratio is now written as a plain number by a render-blocking head script before the first paint, and the CSS path registers the viewport width as a `<length>` so both `atan2()` arguments arrive in the same unit. Verified in Chromium, Firefox and WebKit at 360/375/390/402/430/639/720/768/1200/1440/2560: artboard left edge 0, artboard width = window width | CORRECTED — 11 WIDTHS × 3 ENGINES; PENDING HUMAN REVIEW ON DEVICE |
| VF-40 | page top and page end, Safari / iOS Safari only | Owner review on a physical iPhone: a dark green band above the status bar and below the browser toolbar | DA-MEDIA-01 pins each chapter photograph with a real `position: fixed` plate inside a masked silhouette window, and the plate is backed by `--chapter-tone`. WebKit stops applying the ancestor mask to that composited layer once the window scrolls out of view: reproduced in WebKit at 390 × 844 and 1440 × 900, where the ROOT photograph paints across the paper hero — the hero clip reads mean rgb(20, 46, 32) against Chromium's rgb(231, 226, 211). ROOT holds the highest chapter `z-index`, and its tone `#12281d` is the green the owner photographed. With `viewport-fit=cover` the fixed plate also extends into the strips iOS Safari draws its toolbars over, which is where the escape stays visible on the device. The window now carries an explicit `clip-path: inset(0)` — a geometric clip WebKit does apply to the composited layer, and, unlike `transform`, `filter` or `contain: paint`, one that does not become the containing block for a fixed descendant, so the plate stays viewport-fixed (pin rect measured at 0/844 at three scroll positions in both engines, unchanged). The browser UI tint is additionally stated as `theme-color: #ece7d8` instead of being sampled from the page. Measured after: WebKit hero clip rgb(231, 226, 211) at 390, rgb(235, 230, 215) at 1440 — identical to Chromium | CORRECTED — MEASURED IN WEBKIT AND CHROMIUM AT 390 AND 1440; PENDING HUMAN REVIEW ON DEVICE |

## Closure evidence

Each item requires all applicable evidence below:

1. Inspect the approved external PC/SP reference and affected crop at original detail.
2. Build the current source and capture it from an owned server at matching route,
   state, viewport, and scroll framing.
3. Inspect reference, actual, overlay, and amplified difference at original detail for
   the named region. Top, footer, and menu states require separate evidence.
4. Use symmetric measurements for both images: menu bounds, contour landmarks,
   line-tone/edge metrics, and scroll landmarks where motion is involved. Predeclare the
   acceptance rule before evaluating the corrected implementation.
5. Verify source layouts at 1200×900 PC and 375×844 SP, then the required 1440×900,
   768×1024, and 390×844 frames. Where an approved exact frame is unavailable, keep the
   result `UNVERIFIED` and request visual approval instead of manufacturing a golden.
6. Verify `prefers-reduced-motion: reduce` produces a stable static composition and that
   normal motion causes no layout shift, horizontal overflow, or content dependency.
7. Run the affected repository gates and record results separately from reference
   fidelity. Human visual approval is still required where the contract says so.

## Claim rule

Until every applicable item is closed with the evidence above, describe the candidate
as containing the relevant SVG/UI implementation but not as matching, complete, or
visually approved.

## 2026-08-19 correction evidence status

- Fresh production regression captures cover top, ROOT, DUSK, DAWN, ALPINE, footer, and
  menu-open at 1440×900, 768×1024, and 390×844 as 21 separate viewport PNGs.
- Approved exact static references exist only for authored 1200 px PC and 375 px SP.
  Their reference, actual, overlay, and amplified difference were inspected at original
  detail. Menu-open full-frame differences remain material because the approved source
  contains NEWS/destination content while production intentionally omits unresolved
  destinations and applies the recorded WCAG modal deviation.
- No approved exact static reference exists for 1440×900, 768×1024, or 390×844, and no
  approved animated reference exists for any viewport. Those results remain
  `UNVERIFIED`; implementation-authored screenshots and regression baselines do not
  close that gap.
- Normal motion measures +32 px hero displacement after 400 px scroll at 1200/375 and
  -16 px footer displacement 200 px before page end; reduced motion measures 0 px.
  Scaled PC transforms are normalized by artboard scale.


## 2026-08-19 second correction pass — evidence status

Method: production build served from an owned dedicated port, captured as stitched
viewport slices (a single `fullPage` screenshot was rejected after it dropped a
composited masked chapter layer), `prefers-reduced-motion: reduce` for geometry frames,
`ja-JP` / `Asia/Tokyo` / light scheme / device scale 1, fonts and images awaited.

Reference-vs-production mean absolute error, authored canvases, menu closed:

| PC band (y) | MAE before | MAE after | SP band (y) | MAE before | MAE after |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 0.00739 | **0.00115** | 0 | — | **0.00542** |
| 900 | 0.01145 | **0.00697** | 844 | — | **0.03360** |
| 1800 | 0.06312 | **0.01114** | 1688 | — | **0.02439** |
| 2700 | 0.02915 | **0.02105** | 2532 | 0.06056 | **0.04595** |
| 3600 | 0.01567 | **0.01448** | 3376 | 0.05231 | **0.04520** |
| 4500 | 0.02681 | **0.02266** | 4220 | 0.06778 | **0.06226** |
| 5400 | 0.04318 | **0.03847** | 5064 | 0.06256 | **0.06094** |
| 6300 | 0.02646 | **0.02612** | footer | — | **0.03585** |
| 7200 | 0.03288 | **0.03093** | | | |
| 8100 | 0.02607 | **0.02615** | | | |
| footer | — | **0.01736** | | | |

Classification of what remains:

- **PC** — every band is inside the predeclared thresholds (neutral/vector ≤0.015 for
  the type-and-line bands at y 0–1800, photo ≤0.045 for the chapter bands).
- **SP chapter bands y 4220 and y 5064 exceed the 0.045 photo threshold** at 0.062 and
  0.061. Landmark search puts the chapter photographs within 0–3 px of the reference, so
  the residue is resampling, not geometry: the reference PNG is Illustrator's own
  375 px render while production ships the 751 px 2× derivative that DA-ASSET-01 and the
  750 px export guide require, and the browser downsamples it. Classified as
  **INTENTIONAL DEVIATION** (2× density outranks matching one resampler), recorded here
  rather than resolved by relaxing the threshold.
- **Menu open** — the drawer's internal layout now lands within about 1 px of the
  approved 1200 px reference, but the full-drawer MAE stays near 0.10 because the
  reference surface is the translucent 217/255 olive while production uses the recorded
  solid `#68702f` WCAG deviation, and because the reference drawer still contains the
  intentionally omitted NEWS block and the unresolved Instagram / Online Shop
  destinations.
- **1440×900, 768×1024 and 390×844 remain `UNVERIFIED`.** No approved exact-frame
  reference exists for them; only written-spec conformance and regression evidence do.
- **2560×1440 wide geometry and source selection** now reach both viewport edges in
  Chromium, Firefox and WebKit, including a no-JavaScript inspection. Source-derived
  2560 px WebPs are selected without enlarging the 2400 px candidates. No approved exact
  wide-frame reference exists, so wide asset fidelity and release remain unverified.

## 2026-08-20 owner-review pass — evidence status

Method: production build served from an owned dedicated port; deterministic Chromium
captures at device scale 1, `ja-JP` / `Asia/Tokyo` / light scheme, fonts and images
awaited, `prefers-reduced-motion: reduce` for all geometry frames and explicit
`no-preference` for motion frames. Reference comparison is against the approved
`1200 × 10326` PC and `375 × 7067` SP frames. Guide geometry was measured from the
source guide layer rather than inferred.

### Measured line-weight statistic (integrated ink width)

Integrated ink width — the sum of `(paper − luminance) / paper` across a line's
perpendicular profile — is the antialiasing-independent measure of how much ink a stroke
actually lays down. A 0.25 px stroke and a 1 px stroke at 25 % opacity both look "grey",
but only the second is a full pixel wide; percentile statistics cannot tell them apart,
which is how VF-28 reached the wrong conclusion.

| Line family | Approved reference | Production before | Production after |
| --- | ---: | ---: | ---: |
| Hero contour, PC y 300 | 0.250 px | 0.891 px | 0.891 px (unchanged) |
| Hero contour, PC y 600 | 0.258 px | 1.145 px | 1.145 px (unchanged) |
| Product outline, perfume 15 ml | 0.251 px | 0.243 px | **0.977 px** |
| Product accent mark, diffuser | 1.255 px | 1.003 px | **1.578 px** |

### Unresolved: the contour system is 4× the master

The master draws the background contours and the product outlines at the **same**
0.25 px hairline. Production now draws both at roughly 1 px, so their *relationship* is
faithful and the owner's two rejections of a 0.25 px hairline (VF-02, VF-28) are
respected — but the absolute weight is about **4× the master**, and that flattens the
master's line hierarchy, in which a 0.25 px whisper is read against a 1.0–1.25 px
statement (the brand rule and the product accent mark).

This is recorded as an **owner-driven intentional deviation**, not as a resolved item.
A 0.25 px CSS stroke renders at about 25 % coverage on a 1× display, which is why it was
rejected twice. The alternative that has not yet been put to the owner is *crispness
instead of weight*: a stroke that always resolves to one whole device pixel but carries
`stroke-opacity` around 0.5, which reads as a clean continuous line at 1× while laying
down roughly half the ink of the current treatment and restoring the hierarchy. It is a
single token change if the owner wants it.

### Gate status

| Gate | Result |
| --- | --- |
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck` | PASS |
| `pnpm test:unit` | PASS |
| `pnpm build` | PASS |
| `pnpm test:e2e` (Chromium 151 / Firefox 153 / WebKit 26.5) | PASS — 68 passed, 16 skipped by design; run twice to confirm stability |
| `pnpm test:a11y` (axe) | PASS |
| `pnpm test:visual` | PASS — 21 baselines re-recorded after review of every diff |
| `pnpm test:lhci` | PASS — performance 100, accessibility 100, LCP 0.7 s, CLS 0, TBT 0 ms |
| `pnpm check:runtime`, `pnpm policy:public`, `pnpm audit:production`, `pnpm audit:development` | PASS |
| `pnpm capture:fidelity` | PASS — 38 captures |
| `pnpm test:fidelity`, `pnpm candidate:preflight` | **BLOCKED, pre-existing and unchanged** — no approved immutable exact-frame reference exists for any of the 21 frames |

### Known limitation in the regression suite

`toHaveScreenshot` runs at `maxDiffPixelRatio: 0.001`, which is 1 296 px at 1440 × 900.
A change confined to the scroll cue (about 400 px of ink) passes that threshold even when
the cue has moved 60 px. The 1440 × 900 and 768 × 1024 cue corrections were therefore
invisible to the visual suite and are covered by explicit geometry assertions in
`tests/e2e/production.spec.ts` instead. Baselines were re-recorded regardless so the
stored frames stay truthful.

## 2026-08-20 second owner-review pass — evidence status

### Parallax coverage audit

Rendered vertical offset in CSS px at 1440 × 900, read from each element's own computed
transform. `x,y` marks an element that also carries a horizontal component.

| Element | before | after |
| --- | --- | --- |
| hero contour 1–2 (lines that run across the page) | 0 → 383 / 288 | 0 → 383 / 288 |
| hero contour 3–4 (lines that run down the page) | 0 → 192 / 110, invisible along the line | `-132,87` / `-80,52`, perpendicular |
| product contour 1–3 | −133 → 133, −90 → 90, −53 → 53 | unchanged, plus `31,-40` → `-31,40` on layer 3 |
| footer contour 1–2 | −167 → 0, −100 → 0 | unchanged |
| brand header rule | **0 at every scroll position** | 0 → −37 |
| brand centre mark | 58 → −75 | unchanged |
| brand footer rule | **0 at every scroll position** | 37 → 0 |
| ROOT upper foreground | 0 | **0 — documented exception** |
| product drawings 1–3 | 23 → −87 / −98, 18 → −57 | unchanged |
| chapter drawings 1–4 | 70 → −20 | unchanged |

### Menu control surface sampling

Relative luminance of the surface behind the control, sampled with the control hidden,
at ten scroll positions per chapter, 1440 × 900:

| Chapter | backdrop L (mean, min…max over the crossing) | worst contrast vs ink | worst contrast vs paper |
| --- | --- | ---: | ---: |
| ROOT | 0.007 … 0.799 | 1.02 : 1 | 1.00 : 1 |
| DUSK | 0.008 … 0.379 | 1.03 : 1 | 1.98 : 1 |
| DAWN | 0.009 … 0.558 | 1.05 : 1 | 1.40 : 1 |
| ALPINE | 0.186 … 0.652 | 4.22 : 1 | 1.21 : 1 |

No static colour clears 3 : 1 on all four, and no per-chapter colour does either, because
the backdrop crosses the ink/paper break inside a single chapter. The adaptive treatment
measured after the change: page top 10.0 : 1, ROOT 11.7 : 1, DUSK 6.1 : 1, ALPINE 4.4 : 1,
SP ROOT 16.1 : 1, SP ALPINE 4.5 : 1.

### Stale visual baselines — method correction

Two baselines (`production-1440x900-footer`, `production-768x1024-footer`) were dated
2026-08-19 15:09, before the contour layer assets were written at 2026-08-20 00:09, and
were **not** rewritten by the previous session's `pnpm test:visual:update`. Playwright's
bare `--update-snapshots` flag does not force every file to be rewritten. The previous
session's claim that "21 baselines were re-recorded" was therefore wrong for those two
frames. `test:visual:update` now passes `--update-snapshots=all`, every baseline has been
re-recorded from the current build, and the suite passes twice from a clean run.

### Gate status

| Gate | Result |
| --- | --- |
| `pnpm verify:foundation` (runtime → policy → audits → format → lint → typecheck → unit → build → e2e → axe → visual → Lighthouse) | **PASS end to end** |
| `pnpm test:e2e` (Chromium 151 / Firefox 153 / WebKit 26.5) | PASS — 69 passed, 18 skipped by design |
| `pnpm test:visual` | PASS — 21 baselines, all re-recorded with `--update-snapshots=all` |
| `pnpm test:lhci` | PASS — performance 100, accessibility 100, LCP 0.7 s, CLS 0, TBT 0 ms |
| `pnpm test:fidelity`, `pnpm candidate:preflight` | **BLOCKED, pre-existing and unchanged** |

## 2026-08-20 third owner-review pass — Safari and iOS evidence status

### What the two reports had in common

Both defects were engine-specific and both were invisible to the gate that was running.
Every Playwright project in `playwright.config.ts` is a **desktop context at 1440 × 900**,
and `pnpm test:visual` records baselines on **Chromium only**; the specs that do resize to
390 × 844 mostly carry `test.skip(browserName !== "chromium")`. Nothing in the suite ever
compared a WebKit frame to anything. The two defects reproduce in WebKit at the first
attempt, so the gap was coverage, not difficulty.

### VF-39 — measurement

| Reading | Approved / Chromium | Owner's iPhone frame | Unscaled 375 canvas on a 390 window |
| --- | --- | --- | --- |
| Wordmark ink right edge, as a fraction of the window | 0.7067 | ≈0.691 | 0.6987 |
| Wordmark ink width, as a fraction of the window | 0.250 | ≈0.240 | 0.240 |
| `.brand-header` top, in CSS px below the content top | 334.8 | ≈325 | 321.9 |

The screenshot's 919 : 1987 aspect matches 390 × 844 exactly, so the device is a 390 pt
phone and the readings are the 1 / 1.04 signature of an unscaled canvas.

### VF-39 — after

`zoom` resolved from the head script, measured as `getComputedStyle(...).zoom` and as the
artboard's own rect, in Chromium 151 / Firefox 153 / WebKit 26.5:

| Window | 360 | 375 | 390 | 402 | 430 | 639 | 720 | 768 | 1200 | 1440 | 2560 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Artboard left | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Artboard width = window | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### VF-40 — isolation

Eight candidate treatments were rendered in WebKit at 390 × 844 and the paper hero clip
was measured for each. Only two removed the bleed: `clip-path: inset(0)` and
`transform: translateZ(0)`. The transform was rejected on inspection — it becomes the
containing block for the fixed plate and would silently unpin DA-MEDIA-01. `isolation`,
`will-change: mask`, `opacity: 0.999`, a self-mask on the plate, `backface-visibility` and
removing `overflow: clip` all left the bleed in place. The pin was then re-measured at
three scroll positions in both engines with and without the clip: identical, `0 / 844`.

### Gate status

| Gate | Result |
| --- | --- |
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck` | PASS |
| `pnpm test:unit` | PASS — 37 node tests, 3 vitest tests |
| `pnpm test:e2e` (Chromium 151 / Firefox 153 / WebKit 26.5) | PASS — 108 passed, 18 skipped by design; includes 13 new cross-engine invariants |
| `pnpm test:visual` | PASS — 21 baselines unchanged, so the correction costs no Chromium fidelity |
| `pnpm test:a11y` | PASS |
| `pnpm test:fidelity`, `pnpm candidate:preflight` | **BLOCKED, pre-existing and unchanged** |

### Still open

- No WebKit or mobile-context **visual baseline** exists. The two new invariants
  (`resolves the artboard against the full Npx window`, `holds every chapter plate inside
  its window`) are targeted at the two failure modes that were found, not at Safari
  fidelity in general.
- Both corrections are verified in WebKit 26.5 under Playwright, which is **not** iOS
  Safari. Only a re-check on the owner's device closes VF-39 and VF-40.
