# MOYOY project design ledger

Last updated: 2026-08-19\
Workflow: `image-to-code` **Mode C — supplied precise design**\
Mirror policy: this file and the sibling DESIGN ledger must remain semantically
identical.

## Overview

Build a faithful, accessible, performance-conscious MOYOY landing page from the supplied
desktop/mobile design after truth, rights, and measured-spec blockers are resolved.

Design read: **香りで内面の旅を呼び覚ます organic editorial LP, organic direction**.

Signature system:

- warm neutral editorial surface;
- topographic/contour line work;
- continuous fixed-photography chapters;
- ROOT → DUSK → DAWN → ALPINE narrative;
- quiet black typography, generous negative space, and line-drawn products.

## Architecture

### Rendering

- Selected baseline: Next.js App Router, static-first.
- The landing route is a Server Component; core copy, SEO, and imagery do not depend on
  hydration.
- Client islands are limited to approved navigation/modal state, motion, analytics
  consent, or a future form.
- CSS owns layout and ordinary state transitions. Motion is conditional. GSAP is not an
  initial dependency and requires an approved complex-timeline need.

### Content

- One typed static content model binds each fragrance identity, number, prose, image,
  and alt intent.
- NEWS is omitted entirely from the initial implementation by owner decision.
- Modal destinations, contact/legal copy, metadata, analytics, forms, CMS, and
  localization remain open requirements rather than inferred behavior.
- The sanitized design-annotation ledger reconciles exactly 13 readable pink source
  stories/clusters: nine implementation instructions and four non-implementation
  guides. Annotation styling does not ship, and qualitative instructions do not supply
  missing timing, distance, easing, target, breakpoint, state, or rights values.

### Asset pipeline

- Raw AI/EPS/PDF, audits, private copy, and full-resolution sources remain local and
  private.
- Approved photographs are color-managed to sRGB, metadata-stripped, hashed, and emitted
  as responsive derivatives.
- Logo, contours, and product drawings use clean SVG exports.
- Fonts use licensed web delivery only; design-file embedding is not a license.

## Public / private boundary

The configured remote is public. The repository is **code and sanitized documentation
only**.

Public candidates after approval:

- application code and tests;
- sanitized documentation;
- approved, optimized production derivatives;
- licensed font delivery configuration without source secrets.

Private-only:

- `20260818_web/**`;
- `.private/**` except its local ignore boundary;
- AI/EPS/PDF masters and extracted full-resolution images;
- full audit reports/manifests, private copy, sensitive metadata, and rights documents;
- unapproved references and visual-diff artifacts containing client material.

No push, deployment, alias change, or production promotion is implied by local
implementation work.

## Implementation plan

1. Map the approved private copy and approved current-scope assets without exposing
   private source paths or audit metadata; omit NEWS and deferred links.
2. Use the visually approved closed/open PC/SP references, viewport-fixed modal, static
   initial composition, and 1200 px-contained PC line work.
3. Use the verified PC/SP chapter-edge exports and recovered ROOT upper foreground
   paths, select/measure fallback typography, close the remaining measured-spec gaps,
   and approve thresholds.
4. Maintain the exact-pinned Next.js toolchain and committed code-only baseline without
   admitting raw intake.
5. Build semantic static content and small client islands.
6. Run deterministic external-reference fidelity at 1440×900, 768×1024, and 390×844,
   with menu states.
7. Run technical gates and obtain stakeholder approval before deployment.

## Libraries

Pinned foundation dependencies and conditional additions:

| Family          |                                         Version | Decision                         |
| --------------- | ----------------------------------------------: | -------------------------------- |
| Runtime         |              Node 24.19.0 local/CI; Vercel 24.x | selected                         |
| Package manager |                                  pnpm 10.34.5 | exact pin for stable Vercel path |
| Framework       |                                  Next.js 16.3.1 | selected                         |
| UI              |                        React / React DOM 19.2.8 | selected                         |
| CSS             | Tailwind 4.3.3 + adapter 4.3.3 + PostCSS 8.5.26 | selected subject to Safari floor |
| Image intake    |                                    Sharp 0.35.3 | selected                         |
| Motion          |                                   Motion 13.1.0 | conditional                      |
| Complex motion  |                     GSAP 3.15.0 + adapter 2.1.2 | deferred                         |
| Browser tests   |                               Playwright 1.62.1 | selected                         |
| A11y            |                     @axe-core/playwright 4.13.0 | selected                         |
| Lab performance |                                     LHCI 0.15.1 | selected                         |
| Storybook       |                                               — | excluded initially               |

The foundation pins direct dependencies and `pnpm@10.34.5` in the manifest and lockfile.
Vercel's stable automatic pnpm support covers versions 6–10; pnpm 11 requires
experimental Corepack. The exact current `latest-10` line is therefore selected for the
deployment foundation. Motion and GSAP remain uninstalled conditional choices. Any
upgrade requires official support/release review and a fresh full gate run.

On WSL, an explicit Linux Chromium path still passed through `chrome-launcher`'s Win32
temporary-path conversion and created `C:\...` profile directories in the repository.
An intentional no-op `puppeteerScript` now activates LHCI's PuppeteerManager path; the
ignore pattern remains defense in depth. A fresh three-run LHCI assertion set passed and
no `C:*` directory recurred. This operational fix does not waive the separately recorded
LHCI dev-only dependency advisories.

## Key decisions

1. Mode C uses the supplied design; no exploratory generation is needed.
2. The 1200 px PC artboard is a coordinate system scaled uniformly to wide-desktop
   viewport width. At 1440 px the complete artboard and chapter imagery are 1440 px
   wide; width-qualified raster derivatives prevent source upscaling.
3. The SP reference is a 375 px independent composition. The 390/768 written reflow
   contract is content-stress derived and never stretches the 375 page; exact-frame
   visual approval remains a Gate D/E requirement.
4. Browser/guide layers are non-production.
5. The hash-bound private PC 1200 px and SP 375 px menu-open references received static
   visual approval on 2026-08-18 and establish 250 px drawer geometry. Fidelity remains
   blocked until the interaction/viewport contract and exact capture frames exist.
6. NEWS placeholder copy and imagery do not ship.
7. Reference fidelity and implementation regression are separate gates.
8. Accessibility and approved copy/rights outrank pixel matching.
9. Vercel Preview must be protected; production is a human-authorized action.
10. A technical-candidate pass is evidence only; it requires a private hash-bound
    approval record and never authorizes deployment or human release.
11. Exact-frame landmark/region and modal contracts use approved selectors, anchors,
    hash-bound symmetric detectors, exact-size masks, and predeclared thresholds. Empty
    contracts cannot pass; exact references and executed results remain Gate D/E work.
12. Pink annotation content is governed by `docs/design-annotation-ledger.md`: all 13
    stories/clusters are accounted for, implementation intent is preserved, guides are
    excluded from UI, and unresolved deferred values remain Gate D/E constraints. The non-pink page-title
    candidate is not part of that ledger.
13. Fidelity evidence is an immutable hash chain from config and clean build/capture
    provenance through exact frame inputs, atomic comparison artifacts, executable
    detector/mask results, and concrete coverage observations. Labels and paths are
    normalized and non-clobbering; declarations or nonempty arrays never count as
    executed evidence. Missing exact references and production captures remain
    `UNAVAILABLE`. Per-frame
    evidence stays exclusive/non-clobbering; the single aggregate is a repeatable
    current-run index that reuses identical valid bytes or atomically replaces only a
    validated prior aggregate, so stale output cannot suppress Gate C diagnostics.
14. Capture publication is a separate fail-closed boundary: all deterministic paths are
    normalized and component-checked before browser work. Capture PNGs, provenance
    sidecars, and a `COMPLETE` manifest are same-directory fsynced/non-clobber published
    inside an opaque content-addressed run whose identity binds config, source, build,
    server, and capture environment. Identical runs reuse only identical bytes; an
    identity change creates a new immutable run and preserves prior runs. The aggregate
    pointer and preflight hash-bind the exact current run, so stale build/run evidence is
    rejected. Capture provenance schema v3 binds the actual hash to the explicit DOM
    observation result.
15. Coverage semantics are declared only by `semanticObservation`, never inferred from
    frame IDs or labels. Top/menu-open may use absolute `(0,0)`; chapter/footer frames
    require selector anchors with null absolute scroll. PASS evidence requires exactly
    one visible DOM target with positive bounds/intersection, exact expected attributes,
    and concrete executed landmark/region result IDs. The contracts and local production
    DOM now exist; exact references and executed PASS evidence remain Gate D/E blockers.
16. Paid web-use permission for the four chapter photographs and Web use for the current
    design copy/logo/contours/product drawings were client-confirmed on 2026-08-18.
    NEWS assets are excluded and reference-font binaries are replaced by a fallback. All
    production derivatives still need provenance and visual approval.
17. A complete review of all 13 pink stories found no modal rule for background scroll,
    outside-click closing, Escape closing, or link destinations. WCAG requirements now
    supply the minimum native-dialog, inert, scroll-lock, focus, Escape, and explicit
    close baseline; outside click and unresolved destinations remain absent.
18. The menu-closed PC 1200 px and SP 375 px references received hash-bound static
    visual approval on 2026-08-18. NEWS is omitted, current design copy/logo/contours/
    product drawings are approved for Web use, and reference-font binaries are replaced
    by an approved metric-compatible fallback.
19. The modal is viewport-fixed. At this decision point, unspecified modal gestures,
    destinations, parallax, repeated-line motion, and fixed-photo behavior were deferred,
    and PC line work used a centered 1200 px canvas. Decisions 37/38/42 supersede the
    motion and wide-layout portions; destinations and unapproved gestures remain deferred.
20. Chapter photography remains four independent media assets. The eight Illustrator
    clipping-group exports and two joined checks received on 2026-08-19 verify the
    PC/SP lower-edge alpha and exact stacking sequence. The separate beige foreground
    path owns the ROOT upper edge. Joined full-height photo bitmaps remain private
    comparison evidence only and do not ship.
21. PC chapter masks normalize at exact source/2 with strip origin y 2295. SP uses one
    `375/751` scale with strip origin y 2493; its final lower edge is y 5758.146.
22. NEWS omission moves the intact footer group by -890 px PC / -685 px SP. Final rule
    anchors are y 9084 / 5929 and final page heights are 9436 / 6382.
23. Jost Variable and Noto Sans JP Variable are the OFL candidate webfonts, with
    measured Liberation Sans/IPAPGothic metric-adjusted fallbacks and explicit wraps.
24. The responsive switch is 640 px by product/content stress. 390 uses 24 px gutters;
    768 uses 48 px insets and three product columns. First captures require visual review.
25. Gate C is a complete written/measured contract, not production approval. A local
    production candidate now exists, while Gate D still requires approved public
    derivatives and approved exact-frame references and Gate E requires immutable proof.
26. Capture fails before browser work while `foundationOnly=true`, so a foundation
    screenshot cannot be mislabeled as external-reference evidence. Detached Ed25519
    approval is selected, but enrollment still requires a named human signer and a
    reviewed public key; chat approval cannot substitute for that signature.
27. The local Playwright WebKit dependency blocker is resolved. Manual WCAG evidence on
    2026-08-19 now covers the production candidate at 1440/768/390, 200%/400% reflow,
    full-page media/copy, and modal states across the configured engines.
28. The desktop menu control belongs to the page top; only the SP control is fixed. The
    native dialog remains viewport-fixed, 250 px wide, inert, keyboard-contained, and
    restores focus and the exact scroll position without focus-induced scrolling.
29. Accessibility outranks pixel matching: the approved 217/255 olive surface composites
    to only 4.08:1 against white text over paper, so the candidate uses solid `#68702f`
    at 5.32:1. Photo prose/headings use a high-opacity dark glyph halo because source-photo
    sampling found substantial sub-4.5:1 regions. Both are intentional visual deviations
    requiring exact-frame/design approval.
30. Eleven immutable current-build captures can be generated from the production DOM,
    but captures are implementation evidence, not external references. Five clean
    desktop closed-state exact-frame candidates can be derived from the approved static
    canvas; footer, tablet, mobile, and all menu-open exact frames require new human
    approval. No candidate is promoted to the approved reference root without it.
31. The original mean-line landmark detector canceled irregular silhouettes: three
    chapter candidates had exact 0 px position deltas but only 0.018–0.039 confidence.
    The v2 symmetric detector uses the median of per-perpendicular-line strongest edges,
    retaining the ≥0.04 threshold and producing 0/0/1/0 px DUSK/DAWN/ALPINE deltas.
32. Owner review and a fresh production-build comparison reopened visual fidelity for
    the page-top menu control and contour system. Hero/footer contour tone, hero contour
    placement, and annotated slower contour scrolling are open defects. DOM/CSS/SVG
    presence, build success, and implementation-authored snapshots prove existence or
    regression only; they cannot support a fidelity claim. The sanitized defect and
    closure-evidence contract is `docs/visual-fidelity-defects.md`.
33. The contour correction retains the `0.25px` Web derivative stroke after a rendered
    `1px` trial proved too dark, removes the extra CSS opacity, and maps hero/footer
    geometry from identical source path landmarks. A dependency-free client island
    applies an implementation-selected 8% lag with zero reduced-motion transform;
    motion values and 1440/768/390 frames remain unverified.

34. A second original-detail correction pass on 2026-08-19 measured the approved 1200 px
    PC and 375 px SP references against fresh stitched production captures and corrected
    eleven static regions: the open-ended brand header rule and wordmark, the first-view
    scroll indicator (label above the rule, not below), the about block, the centre brand
    mark, the whole product module (natural 1 px-per-millimetre drawings, 179.75 px
    column pitch, centred copy), the ROOT beige foreground (65 px PC / 18 px SP too
    high), the chapter copy block, the chapter title (rotated Latin, not upright), the
    chapter product drawing (screen blend restored), the two-column footer, and the modal
    drawer's internal typography and close control. PC band error fell from 0.0074/0.0631
    to 0.0012/0.0111 in the type-and-line bands.
35. A single `fullPage` screenshot silently dropped a composited masked chapter layer, so
    all reference comparison now uses stitched viewport slices from an owned port. A
    full-page capture is no longer accepted as comparison evidence in this project.
36. DA-ASSET-01 is implemented as real licensed delivery: self-hosted OFL 1.1 Jost and
    Noto Sans JP variable WOFF2 subsets built from the upstream `google/fonts` sources,
    14 KB and 132 KB, with `vmtx` retained for vertical Japanese typesetting and the
    measured metric-adjusted local faces as the fallback stack. Rights are clear; the
    public policy admits only their exact hash-bound WOFF2 derivatives.
37. All four annotated motions are implemented by one dependency-free client island plus
    CSS. The island writes only transform custom properties, caches geometry outside the
    scroll path, and zeroes everything under reduced motion. No motion library was added.
38. DA-MEDIA-01 is implemented as a bounded interpretation, not a literal viewport pin.
    The chapter silhouette is pinned by masking the container with the same alpha the
    derivative already carries, and only the photograph inside drifts, downward only.
    A literal pin would need new derivatives with vertical bleed, because the approved
    crops hold no RGB outside their alpha.
39. The paper-coloured source menu control cannot ship literally: it is invisible on the
    paper surface and fails WCAG 2.2 1.4.11. The desktop control therefore takes the page
    ink colour and the fixed SP control keeps the paper colour with the recorded dark
    halo. Both are intentional accessibility deviations awaiting design approval.
40. The third-party Instagram mark in the reference footer and drawer is excluded because
    no rights record covers someone else's trademark; the account name ships as text.
41. The owner-approved public boundary now has distinct hash-bound classes: 51
    production assets under `public/assets/moyoy-candidate/**` are
    `approved-production-asset`, and 21 viewport regression PNGs are
    `approved-production-baseline`. None is classified as synthetic, every binary stays
    below 10 MiB, and `pnpm policy:public` verifies the complete candidate worktree.
42. The footer address and telephone are literal approved production copy. Their exact
    UTF-8 values and source path are bound in `config/public-copy-allowlist.json`; the
    public-text detector still rejects every unlisted contact occurrence.
43. Wide-desktop geometry no longer stops at 2400 CSS px or waits for React hydration.
    CSS derives the complete 1200 px artboard scale from the viewport using
    `tan(atan2(100vw, 1200px))`; 2560 px selects source-derived `pc-2560-*` WebP files
    generated from the high-resolution client inputs, so a 2400 px derivative is never
    enlarged.
44. The CSS chapter silhouette uses eight small alpha-only PC/SP WebP masks, not the
    RGB chapter photos. The initial Chromium resource check confirms below-fold DUSK,
    DAWN and ALPINE RGB files are not requested before scroll.
45. SP chapter heights and 1600 px source-origin steps derive from
    `--sp-source-scale: viewport/751` throughout 375–639 px. Chromium tests cover 390
    and 639 px aspect ratios, while exact external 390 px fidelity remains unverified.
46. Fidelity coverage now has 21 viewport/state frames: top, ROOT, DUSK, DAWN, ALPINE,
    footer, and menu-open at 1440×900, 768×1024, and 390×844. Visual regression captures
    are viewport slices; the rejected `fullPage` capture is not used.
42. Wide-desktop geometry no longer stops at 2400 CSS px or waits for React hydration.
    CSS derives the complete 1200 px artboard scale from the viewport using
    `tan(atan2(100vw, 1200px))`; Chromium, Firefox and WebKit regression evidence at
    2560 px confirms all four chapter media layers reach both edges. This does not
    approve raster upscaling: release above 2400 px remains blocked until a sufficiently
    wide approved photo derivative exists.
43. Core fidelity masks follow the current layout contract: the 1440 frame covers the
    full-width artboard and the 768 frame covers the measured 48 px tablet insets. An
    executed geometry failure now also returns a failing comparator process status, so
    direct CLI use cannot report success from global pixels alone.

## Gate status

| Gate               | Status          | Reason                                                                                       |
| ------------------ | --------------- | -------------------------------------------------------------------------------------------- |
| A — truth          | READY: LIMITED PC/SP | current design copy/assets approved for Web use; NEWS and links omitted/deferred            |
| B — direction      | APPROVED        | closed/open PC 1200 and SP 375 static references are hash-bound and approved                  |
| C — measured spec  | READY           | typography, masks, SP/footer, modal, responsive, selectors/detectors/masks, and thresholds are specified |
| D — implementation | CANDIDATE BLOCKED | corrected static + full motion candidate exists with approved production derivatives, 21 configured regression frames, and 1200/375 evidence; human review, motion approval, and exact external responsive references remain open |
| E — release        | BLOCKED         | open visual defects, signer/approval, clean committed candidate revision, approved references, fidelity/visual evidence, and human release review remain |

The strict Mode C audit initially reported no tracked files, no reference-fidelity
package surface, and no CI. After the foundation shell, package/Playwright/fidelity
harness, and CI workflow were added, the pre-baseline rerun reported **19 PASS, 0 WARN,
1 BLOCK** because `git.tracking` had no first commit. Local commit `c78be61` now
establishes the audited code-only baseline, and the fresh 2026-08-18 strict rerun reports
**20 PASS, 0 WARN, 0 BLOCK**. This is a project-structure audit result only. No push,
deployment, CI-run, trusted signer, or approved external-reference evidence exists, so
Gate D/E remain blocked.

## TODO

- Resolve remaining Gate A/D/E items in `docs/open-questions.md`.
- Preserve deferred annotation values; the implemented contour lag, decorative-object
  drift, scroll-line loop, and bounded chapter-photo drift are measurable implementation
  judgments pending design/motion approval.
- Obtain approval for all 11 exact-frame references and the recorded accessibility
  deviations; enroll a named reviewed signer without exposing a private key.
- Approve the production derivatives, then create a clean candidate revision through an
  explicitly authorized commit before rerunning the immutable evidence chain.
- Establish a protected Preview only after explicit deployment approval.
- Repeat live audit after a real deployment exists.

## Open questions

The authoritative list is `docs/open-questions.md`. Gate status must be updated here
whenever an answer changes architecture, content, rights, or acceptance.

## Changelog
- 2026-08-19: Owner-approved remediation pass. SP chapter heights/steps now derive from
  `viewport/751` across 375–639 px; separate alpha-only masks prevent below-fold RGB
  fetches; source-derived 2560 px photo derivatives prevent raster upscaling; literal
  footer contact copy is guarded by a hash-bound exception; production assets and
  viewport regression PNGs are separately allowlisted; and visual/fidelity coverage is
  expanded to 21 material-state frames with viewport captures.
- 2026-08-19: Reconciled current-state contracts after the production candidate and full
  motion implementation: foundation-only/production-absent claims now describe history,
  while Gate D remains candidate-blocked and Gate E remains blocked. Corrected stale
  1440/768 core masks and made geometry comparison failures exit nonzero.
- 2026-08-19: Removed the accidental 2400 px wide-layout cap and the hydration-owned
  artboard scale. Added a three-engine 2560 px full-bleed regression and recorded the
  separate wider-photo-derivative release blocker; no reference or derivative approval
  was inferred from the geometry result.
- 2026-08-19: Second correction pass. Measured and corrected eleven static regions
  against the approved 1200/375 references, implemented all four annotated motions in one
  client island plus CSS, delivered the licensed OFL webfont subsets, split the menu
  control contrast between desktop and SP, rebuilt the footer as two columns, and added
  three-engine motion tests. Reference comparison moved from full-page screenshots to
  stitched viewport slices after a full-page capture dropped a masked chapter layer.
  Recorded the public-binary and public-text policy blockers instead of weakening either
  control. Gate D stays a candidate and Gate E stays blocked.
- 2026-08-19: Corrected PC/SP menu visual bounds and hero/footer contour source geometry
  after original-detail comparison; retained the `0.25px` derivative stroke, removed
  the causal CSS opacity, and restored natural footer scale/clipping. Implemented the
  slower contour instruction as a measured 8% transform lag with a static
  `prefers-reduced-motion` path; responsive and motion approval remain blocked.
- 2026-08-19: Reopened menu/contour fidelity after owner review and fresh source-vs-build
  inspection found menu-position, hero/footer contour-tone, hero contour-placement, and
  missing slower-scroll behavior defects. Added a persistent defect ledger and a strict
  rule forbidding visual-pass claims based only on code, asset presence, build success,
  or regression snapshots.
- 2026-08-19: Corrected the wide-desktop contract after owner review: the complete
  1200 px PC artboard, including chapter and decorative imagery, scales uniformly to
  full viewport width. Width-qualified photo derivatives prevent source upscaling.
- 2026-08-19: Implemented the local production candidate and viewport-fixed native
  modal, fixed desktop/SP menu positioning and scroll-safe focus restoration, generated
  the 11-state capture set, and completed production WCAG/reflow/axe inspection. Kept
  Gate D/E blocked on public derivative approval, 11 approved exact frames, a named
  reviewed signer, a clean authorized revision, and human visual/AT review.
- 2026-08-19: Replaced the irregular-contour-incompatible mean-line fidelity detector
  with a symmetric perpendicular-median v2 detector and retained the predeclared
  confidence/position thresholds; added a regression test for a 40 px wavy boundary.
- 2026-08-19: Resolved the local WebKit host dependency failure, made fidelity capture
  fail fast on a foundation-only build, selected detached-signature approval without
  inventing signer identity/key material, and recorded a scope-bounded manual WCAG
  review. Gate D remains foundation-only and Gate E remains blocked.
- 2026-08-19: Closed Gate C with measured fallback typography, normalized PC/SP masks,
  final NEWS-less footer/page geometry, content-stress 390/768 reflow, WCAG modal
  behavior, and hash-bound executable fidelity selectors/detectors/region masks and
  predeclared thresholds. Production UI and release evidence remain absent.

### 2026-08-18

- Selected `image-to-code` Mode C and the organic editorial direction.
- Recorded the topographic-line/fixed-photo signature.
- Established the public code-only and private evidence/source boundary.
- Selected the static-first Next.js candidate stack.
- Recorded Gate A/C/E as blocked; no false closure.
- Added sanitized audit, provenance, invariant, implementation-spec, and open- question
  documents.
- Synchronized the ledger after the pinned foundation, application shell, gate harness,
  and CI workflow were added; production implementation and Gate C remain blocked.
- Selected exact pnpm 10.34.5 for Vercel's stable supported path; pnpm 11 experimental
  Corepack was rejected for this baseline.
- Recorded the WSL LHCI PuppeteerManager workaround and fresh no-recurrence evidence.
- Added three-viewport regression, deterministic capture provenance, true midpoint
  overlay testing, path-redacted fidelity artifacts, and explicit blocked coverage
  contracts without closing Gate C/E.
- Reconciled all 13 readable pink design stories/clusters into a sanitized stable-ID
  ledger and private source map: nine implementation instructions, four guide-only
  records, and one confirmed non-pink page-title exclusion.
- Hardened fidelity artifact identifiers, canonical path containment, symbolic-link and
  duplicate-destination rejection, and atomic non-clobbering output; defined the
  config/capture/comparison hash-chain manifest with explicit unavailable detector,
  mask, chapter, footer, and modal results.
- Made blocked fidelity reruns deterministic: valid identical aggregate bytes are
  reused and changed aggregate bytes atomically replace only the tool-owned aggregate;
  per-frame evidence remains non-clobbering.
- Hardened capture publication with pre-browser path/config validation, component-wise
  symlink and containment checks, buffered non-clobbering atomic publication, and
  identical-only rerun reuse for both PNG and provenance sidecar.
- Replaced name-based coverage meaning with explicit selector/anchor/expected-DOM
  observations and exact executed geometry-result bindings; unavailable chapter and
  modal contracts continue to block Gate C/E.
- Replaced fixed capture sidecars with opaque content-addressed immutable runs and a
  hash-bound `COMPLETE` run manifest; changed build provenance creates a new preserved
  run, identical reruns reuse exact bytes, and stale current-run pointers fail closed.
- Established local code-only baseline commit `c78be61`; a fresh strict Mode C audit
  reports 20 PASS, 0 WARN, and 0 BLOCK. No push or deployment occurred, and missing
  exact-frame/responsive references, remaining rights, signer/approval evidence, and CI
  execution keep Gate C/E blocked.
- Audited newly supplied PC/SP/modal rasters, recovered exact 1200/375 private canvas
  crops, reconstructed the SP menu-open state from the original alpha layer, removed a
  known magenta guide bracket in a separately hashed candidate, and measured a common
  250 px right drawer with `#68702f` at 217/255 alpha. Static artwork does not resolve
  runtime modal behavior or 390/tablet mapping.
- Recorded the owner's deferral of 390 px/tablet work from the current scope without
  waiving required release coverage.
- Recorded client-confirmed paid web-use permission for the four chapter photographs;
  private neutral candidates remain non-production pending art direction and approval.
- Confirmed by complete pink-story review that background scroll, outside click, Escape,
  and link destinations are not annotated; deferred those behaviors without inventing
  an interaction contract.
- Recorded static visual approval of the hash-bound PC 1200 px and SP 375 px menu-open
  references. This approves their appearance and measured drawer geometry only; runtime
  behavior, responsive derivatives, production release, and deployment remain outside
  the approval scope.
- Recorded hash-bound approval of the menu-closed PC 1200 px and SP 375 px references;
  all four closed/open static states are now approved visual sources.
- Resolved the current-scope truth decisions: omit NEWS, approve current design copy and
  current logo/contour/product-drawing Web use, replace reference fonts with a measured
  fallback, use a viewport-fixed modal, defer unspecified links/interactions/motion, and
  contain initial PC line work within 1200 px.
- Selected independent chapter media with PC/SP clipping masks as the irregular-edge
  architecture. A connected Illustrator photo export may support private comparison,
  but the production page will not ship one full-height joined bitmap.
- Verified the eight photo-only transparent chapter exports and both connected checks
  on 2026-08-19. Pixel matching proves the chapter stacking sequence and source-space
  offsets; the separate beige foreground vector owns the ROOT upper edge. Normalized
  production derivatives and final page-placement evidence are still pending.
