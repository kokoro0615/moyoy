# Manual WCAG 2.2 AA review

Review date: 2026-08-19
Target: local production build of `/`
Scope status: **PRODUCTION CANDIDATE REVIEWED — human accessibility/release approval remains blocked**

This record covers the implemented production candidate, including the full narrative,
all four photo chapters, the NEWS-less footer, and the viewport-fixed modal. Automated
axe results support but do not replace the manual review.

## Evidence and observations

| Check | Method | Result | Residual scope |
| --- | --- | --- | --- |
| Reflow at required viewports | Original-detail viewport inspection and DOM dimensions at 1440×900, 768×1024, and 390×844 | PASS — horizontal overflow was 0 px in every viewport; page heights were 9436, 7900, and approximately 6513 px at 390 px after uniform SP source scaling | exact-frame visual approval remains separate |
| 200% / 400% reflow | Three-engine checks at 720×900 and 360×844 CSS px | PASS — 15/15 overflow checks passed across Chromium, Firefox, and WebKit | manual assistive-technology zoom remains a human check |
| Structure and reading order | DOM and full-page visual inspection | PASS — `lang=ja`, one `main`, one `h1`, one footer, ROOT→DUSK→DAWN→ALPINE order, no NEWS, no unresolved links | none observed |
| Keyboard modal contract | Chromium, Firefox, and WebKit keyboard tests | PASS — Enter opens, close receives initial focus, Tab/Shift+Tab remain contained, Escape closes, background is inert, scroll is restored, and focus returns without scrolling | screen-reader announcement remains a human/AT check |
| Targets and geometry | DOM dimensions at all required viewports | PASS — open/close targets are at least 44×44 CSS px; drawer is 250 px wide and viewport-height | none observed |
| Visible focus | Original-detail modal inspection | PASS — close control has a visible two-pixel outline with offset | other unresolved destinations are intentionally non-interactive |
| Text contrast | Computed colors plus source-photo pixel analysis and visual inspection | PASS WITH INTENTIONAL DEVIATION — ink/paper is 15.21:1 and white/solid olive is 5.32:1; photo text uses a high-opacity dark glyph halo because the unmodified DUSK, DAWN, and ALPINE backgrounds contain sub-4.5:1 areas | halo and solid-olive deviation require design/exact-frame approval |
| Images and decorative content | DOM/alt inspection | PASS — four meaningful chapter images have concise Japanese alt text; contour, brand-repeat, and product-outline decoration is hidden | production derivatives remain approval-blocked |
| Automated detectable issues | axe, closed state across three engines plus menu-open state at 1440/768/390 | PASS — 5 passed, 4 intentional deterministic-project skips | automated support only |
| Reduced motion | CSS, DOM measurements, and three-engine motion checks with `prefers-reduced-motion: reduce` | PASS — the authored contour/object/photo transforms reset to zero and the repeating scroll line becomes a stable full-length rule | motion values and visual treatment remain design-approval work |

Before the contrast fix, raw source-photo regions behind the prose contained pixels below
4.5:1 at these rates: PC ROOT 0.3%, DUSK 44.8%, DAWN 26.0%, ALPINE 98.0%; SP ROOT
4.6%, DUSK 58.8%, DAWN 41.8%, ALPINE 80.6%. The production candidate now places an
high-opacity dark halo immediately around the white glyphs instead of darkening the photographs
with large overlays. The modal surface also uses solid `#68702f`: the approved
217/255 compositing over the paper would yield only 4.08:1 for white text.

The review screenshots are private local evidence and are not tracked. No private source
path, source master, rights record, or audit metadata is included in this document.

## Checks that still require human input

- A named accessibility reviewer must confirm screen-reader dialog naming/state,
  background exclusion, and reading order with the supported assistive technologies.
- Q-10 must define the supported Safari/iOS floor; local WebKit passage does not define
  product support.
- The contrast halo and solid modal surface are deliberate WCAG deviations from the
  static visual reference and require design/exact-frame approval.
- Approved production photo/vector derivatives and licensed webfont delivery are still
  required before release.

## Decision

No unresolved code-level WCAG 2.2 AA defect was found after the contrast and
focus/scroll fixes. The local production candidate passes the executable keyboard,
reflow, structure, target-size, and axe checks above. Gate E accessibility approval
remains **BLOCKED** on named human/assistive-technology review, supported Safari/iOS
policy, visual approval of the recorded contrast deviations, approved production
derivatives, and the wider release evidence chain.
