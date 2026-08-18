# MOYOY landing page implementation specification

Workflow: `image-to-code` Mode C — supplied precise design\
Design read: **香りで内面の旅を呼び覚ます organic editorial LP, organic direction**\
Signature: topographic line system + continuous fixed-photography fragrance chapters\
Status: **Gate C BLOCKED — specification structure exists, unresolved values are
explicit below. Production UI edits must not begin.**

## 1. Reference mapping

The original supplied AI/PDF is the visual source of truth. The local private SVGs are
structural audit renders, not replacement masters. Public docs do not contain raw
references.

| Viewport / use   | Reference                    |     Natural reference |    Target CSS frame |         scaleX |         scaleY | Route/state/framing                                       |
| ---------------- | ---------------------------- | --------------------: | ------------------: | -------------: | -------------: | --------------------------------------------------------- |
| PC design canvas | private PC SVG               |      1200 × 10326.343 |    1200 × 10326.343 |         1.0000 |         1.0000 | `/`, menu closed, full page, browser/guide excluded       |
| PC inspection    | private PC PNG               |          1200 × 10326 |    1200 × 10326.343 |         1.0000 |        0.99997 | inspection only; SVG controls coordinates                 |
| 1440 capture     | PC SVG composed in viewport  | 1200 px content width | 1440 × 900 viewport | 1.0000 content | 1.0000 content | x offset 120 px if centered; named scroll frames below    |
| SP design canvas | private SP SVG               |        375 × 7066.723 |      375 × 7066.723 |         1.0000 |         1.0000 | `/`, menu closed, full page, browser/guide excluded       |
| SP inspection    | private SP PNG               |            375 × 7067 |      375 × 7066.723 |         1.0000 |        1.00004 | inspection only; SVG controls coordinates                 |
| 390 capture      | no approved 390 reference    |                     — |           390 × 844 |              — |              — | adapt the 375 composition; never stretch it; **BLOCKED**  |
| 768 capture      | no approved tablet reference |                     — |          768 × 1024 |              — |              — | written reflow + stakeholder golden required; **BLOCKED** |

Mapping rule:

```text
scaleX = referenceRasterWidth / targetDesignCanvasWidth
scaleY = referenceRasterHeight / targetDesignCanvasHeight
cssX = referenceX / scaleX
cssY = referenceY / scaleY
```

The PC canvas is a 1200 px composition inside a wider browser, not a reference to
stretch to 1440 px. At 1440 px, the default measured hypothesis is a centered 1200 px
canvas with 120 px outer space per side; the designer must approve line extensions and
full-bleed behavior before Gate C closes.

### Deterministic capture framing

- Production build on a dedicated owned port; record build ID, source revision/state,
  browser version, config hash, and the owned-server contract. Playwright does not
  expose its web-server PID to test code, so the sidecar records `pid: null`, the
  limitation, and `reuseExistingServer=false` rather than inventing a value.
- `locale=ja-JP`, `timezone=Asia/Tokyo`, light color scheme, device scale factor 1,
  stable copy/data, loaded fonts/images, hidden caret, no dev chrome.
- Freeze non-target motion and capture after `document.fonts.ready` and image readiness.
  Use reduced motion for geometry frames; capture separate motion evidence where motion
  is the target.
- Required viewport frames: 1440×900, 768×1024, 390×844.
- PC provisional scroll landmarks: 0, 2322.923, 3700.257, 5631.065, 6864.356, and
  9024.386 CSS px. Refine against clean designer exports before implementation.
- Menu-closed and menu-open are separate states. Menu-open framing is blocked until
  modal references exist.

`fidelity.config.json` schema v2 records route, viewport, state, scroll position,
readiness selector, image decoding, capture mode, immutable-reference contract, and
landmark/region contract per frame. The current top frames and required chapter/modal
coverage remain explicitly blocked; empty arrays and null thresholds are not passing
evidence. Each capture emits a repository-relative provenance sidecar without private
absolute paths. Captures are grouped into an opaque content-addressed run whose identity
binds the config hash, source revision/state, build ID, server contract, and capture
environment.

The config also names a schema-v1 aggregate evidence manifest. Every coverage item maps
to concrete observation IDs and frame IDs where an approved frame exists; missing
chapter/footer/modal frames are explicit `unavailable` observations, never dummy top
frames. A candidate manifest binds the config hash, clean source revision, build ID,
owned-server record, exact route/state/scroll/viewport/capture semantics, reference and
actual hashes/dimensions, capture-provenance hash, comparison-artifact hash, global
metrics, and hash-identified landmark-detector and region-mask results. Only executed
`PASS` results can satisfy coverage. `approved`, a nonempty array, or a copied result
record alone has no evidentiary value.

Artifact IDs are normalized lowercase ASCII basenames. Input/output paths must remain
inside the canonical project root with no symbolic-link components. Each frame PNG and
sidecar is resolved below `artifacts/fidelity/captures/runs/<run-id>/`, where the opaque
run ID is derived from the canonical capture identity. Per-frame duplicate or
pre-existing-different destinations are rejected and use same-directory temporary files
plus exclusive atomic publication, so a frame cannot traverse out of the evidence
directory or overwrite another frame's evidence. A `COMPLETE` run manifest commits the
exact frame paths and hashes. Identical runs reuse identical bytes; a changed build gets
a new immutable run while the old run remains intact. The one aggregate manifest is the
current-run index. An identical valid aggregate is reused; otherwise only a valid
tool-owned aggregate at that exact path is atomically replaced. Preflight recomputes the
identity and verifies the aggregate pointer, run-manifest hash, and every artifact
binding; stale, partial, symlinked, or mismatched evidence fails closed.

The generic foundation shell has separate visual-regression baselines at 1440×900,
768×1024, and 390×844. They protect only the internal non-production shell. They are
not external design references and must not be promoted into production goldens until
each corresponding implementation state has independently passed reference fidelity
and human review.

## 2. Authority ledger

| Region / datum                                           |                    Authority | Rule                                                                              |
| -------------------------------------------------------- | ---------------------------: | --------------------------------------------------------------------------------- |
| Section order and four fragrance identities              |                authoritative | preserve exactly                                                                  |
| Visible brand statement and fragrance prose              | authoritative but unapproved | use private copy ledger only after content approval; never invent                 |
| PC/SP major composition and photo sequence               |                authoritative | implement as independent responsive compositions                                  |
| Warm neutral surface, black line work, contour signature |                authoritative | measured tokens; no generic replacement style                                     |
| Product names, sizes, and prices                         |                 blocked copy | content owner must approve before public use                                      |
| Browser chrome and guide/pink visual marks               |  defective/non-authoritative | exclude from production                                                           |
| Readable pink annotation content                         | authoritative intent or guide | follow `docs/design-annotation-ledger.md`; unresolved values do not close Gate C   |
| NEWS article titles and images                           |                  placeholder | replace or omit; never ship from the mock                                         |
| Modal visual geometry                                    |                      missing | designer export required; no guessed fidelity                                     |
| Font outlines in reference                               |      mood/geometry authority | actual family delivery requires a license; fallback deviation must be recorded    |
| Audit SVG transparency/shading differences               |            non-authoritative | compare final implementation with original clean export, not audit-render defects |
| Contact and legal footer content                         |                 blocked copy | private until explicit approval                                                   |

The sanitized [design annotation ledger](design-annotation-ledger.md) reconciles all
13 readable pink stories or clusters: nine implementation instructions and four
non-implementation guides. Annotation styling and bounds never ship. The nine intent
records are requirements evidence, but they do not supply missing timing, easing,
distance, trigger, target binding, breakpoint, state, or rights values.

## 3. DOM and content model

Planned semantic order:

```text
body
├─ header (brand link + menu button; fixed behavior only after approval)
├─ main
│  ├─ section#hero
│  ├─ section#about
│  ├─ section#products
│  ├─ article#root
│  ├─ article#dusk
│  ├─ article#dawn
│  ├─ article#alpine
│  └─ section#news (conditional / blocked)
├─ footer
└─ dialog/navigation modal (blocked visual state)
```

- One page-level `h1`; each content section gets a logical heading without skipping
  levels.
- Prose and labels are HTML text. The logo, contours, and product drawings may be SVG;
  no prose is baked into images.
- Fragrance articles bind `{id, number, name, prose, image, alt}` from a static typed
  content model to prevent identity/copy/image mismatch.
- NEWS is absent or feature-flagged off until Q-02 and rights are resolved. No empty
  carousel or fake links.
- Link destinations, legal routes, shop/social targets, canonical metadata, and
  analytics are blocked rather than guessed.

## 4. Measured geometry

Coordinates below are CSS px in the PC design canvas, origin at its top-left.

| Landmark               |                         Reference bounds / CSS px |                Tolerance | Implementation owner |
| ---------------------- | ------------------------------------------------: | -----------------------: | -------------------- |
| PC canvas              |                           x 0–1200; y 0–10326.343 |             0.5 px frame | page shell           |
| 1440 PC placement      |                            x 120–1320 if centered |     ±2 px after approval | page shell           |
| SP canvas              |                             x 0–375; y 0–7066.723 |             0.5 px frame | page shell           |
| ROOT photo chapter     | y 2322.923–4212.799; visual image height 1889.876 |        ±2 px major edges | fragrance chapter    |
| DUSK photo chapter     | y 3700.257–5823.309; visual image height 2123.052 |        ±2 px major edges | fragrance chapter    |
| DAWN photo chapter     | y 5631.065–7457.590; visual image height 1826.525 |        ±2 px major edges | fragrance chapter    |
| ALPINE photo chapter   | y 6864.356–9024.386; visual image height 2160.030 |        ±2 px major edges | fragrance chapter    |
| NEWS transition        |                          approximately y 9024.386 | ±2 px after clean export | NEWS section         |
| Hairlines / logo rules |             exact bounds pending clean SVG export |                    ±1 px | brand primitives     |
| SP chapter boundaries  |                      **TBD from clean SP export** |                        — | **Gate C blocker**   |
| Footer start/bounds    |                        **TBD from clean exports** |                        — | **Gate C blocker**   |

The chapter ranges intentionally overlap through irregular contour clipping. Do not turn
them into four unrelated rectangular cards. Exact clip paths and transition vertices
must be measured from clean SVG exports before coding.

## 5. Typography

| Role                     | Intended family                                      |      Weight | Size / line-height / tracking    | Measure / wrap                           | Status              |
| ------------------------ | ---------------------------------------------------- | ----------: | -------------------------------- | ---------------------------------------- | ------------------- |
| Latin display/navigation | Futura PT                                            | Book/Medium | TBD from licensed-font reference | match authoritative line count           | font rights BLOCKED |
| Japanese prose/labels    | DNP Shuei Go Gin Std                                 |         L/M | TBD from licensed-font reference | preserve vertical/horizontal composition | font rights BLOCKED |
| Special outlined marks   | clean SVG when not one of the approved webfont roles |         n/a | exported geometry                | no hidden accessible prose               | export BLOCKED      |
| Fallback                 | TBD with metric overrides                            |         TBD | must avoid layout shift          | approved intentional deviation           | BLOCKED             |

Before Gate C closes, record exact size, line height, tracking, max measure, writing
mode, and wrap for every role at PC/SP. Font binaries embedded in design files are never
a production source.

## 6. Surfaces and imagery

| Element          | Bounds / aspect                      | Crop / focal point                        | Surface treatment                                               |
| ---------------- | ------------------------------------ | ----------------------------------------- | --------------------------------------------------------------- |
| Page paper       | full page                            | none                                      | sampled neutral `#ece7d8` from PDF; verify against clean export |
| Contour system   | open paths across neutral bands      | may extend at wide PC only after approval | black/gray hairline, no shadow                                  |
| ROOT             | irregular clipped full-width chapter | bent tree remains dominant                | approved sRGB derivative; no overlay that destroys greens       |
| DUSK             | irregular clipped full-width chapter | sun and landscape hierarchy preserved     | approved sRGB derivative                                        |
| DAWN             | irregular clipped full-width chapter | sunbeams and canopy preserved             | approved sRGB derivative                                        |
| ALPINE           | irregular clipped full-width chapter | snow ridges and blue sky preserved        | approved sRGB derivative                                        |
| Product drawings | measured SVG bounds                  | no rasterization                          | low-contrast neutral line work                                  |
| NEWS cards       | blocked                              | no production crop yet                    | no placeholder asset ships                                      |

All chapter masters require color-managed CMYK→sRGB conversion, metadata strip, no
upscale, responsive widths, and separate art-directed crops where the PC/SP references
differ.

## 7. Responsive behavior

| Trigger / range           | Reflow                                                                  | Order / visibility                                 | Crop                     | Spacing                                 |
| ------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------- | ------------------------ | --------------------------------------- |
| ≥1200 px content capacity | center 1200 px PC canvas; outer line extension only if approved         | PC composition                                     | PC art direction         | measured PC values                      |
| 769–1199 px provisional   | **no approved layout**                                                  | preserve semantic order; avoid scaled-down desktop | TBD                      | **Gate C blocker**                      |
| 376–768 px provisional    | choose tablet reflow by content stress, not device label                | preserve all approved prose and navigation         | TBD                      | **Gate C blocker**                      |
| ≤375 px reference         | SP composition at 375 design width                                      | vertical chapter stack; menu available             | SP art direction         | measured SP values pending clean export |
| 390 px acceptance         | add 15 px through gutters/available width; do not stretch 375 reference | same SP order                                      | preserve SP focal points | requires written approval               |

At 200%/400% zoom, reflow and readable text outrank exact reference wrapping. Any
resulting visual difference is documented before approval.

## 8. State, motion, accessibility, performance

### State

- Menu button: default, hover, focus-visible, active, expanded.
- Modal/navigation: closed/open/closing, Escape, outside-close only if approved, focus
  trap, focus restoration, scroll lock, resize, history behavior.
- Links: default, hover, focus-visible, active, visited policy.
- NEWS: omitted/off is the safe initial state; no loading/empty behavior is invented
  without a data source.
- No form, CMS, auth, persistence, or error state exists in the current scope.

### Motion

| Motion              | Trigger         | Provisional behavior                          | Reduced motion        |
| ------------------- | --------------- | --------------------------------------------- | --------------------- |
| Scroll indicator    | page idle/loop  | slow repeating line extension                 | static indicator      |
| Contour parallax    | scroll          | slower than document; transform-only          | no transform          |
| Object parallax     | scroll          | small relative offsets; no reading disruption | no transform          |
| Chapter photography | scroll          | fixed/sticky visual continuity where approved | ordinary static flow  |
| Modal               | user open/close | duration/easing TBD; interruptible            | instant or short fade |

No library is selected until exact timing, property ownership, cancellation, and mobile
behavior are approved. CSS is the default; Motion or GSAP requires a documented need.
The motion rows map to DA-MOTION-01 through DA-MOTION-03 and DA-MEDIA-01 in the
[design annotation ledger](design-annotation-ledger.md). Their qualitative wording is
not a license to invent numeric behavior.

### Accessibility

- WCAG 2.2 AA target; axe critical/serious violations must be zero, followed by manual
  review.
- Semantic landmarks/headings, real text, visible focus, logical focus order, correct
  names/states, and modal keyboard behavior are mandatory.
- Manual checks: keyboard only, screen-reader names, 200%/400% zoom/reflow, contrast,
  target size, iOS/macOS Safari, and reduced motion.
- Decorative contours are `aria-hidden`; meaningful chapter images receive approved
  concise alt text without duplicating adjacent prose.
- Fixed/sticky effects cannot obscure focused content or create scroll traps.

### Performance and privacy

- Static Server Component page; client islands only for approved state/motion.
- One measured LCP candidate may preload. Every image has width/height and accurate
  `sizes`; below-fold media lazy-loads.
- Initial goals: LCP ≤2.5 s, CLS ≤0.1, lab TBT ≤200 ms; Lighthouse performance ≥0.90.
  Field INP goal ≤200 ms at p75 after approved monitoring exists.
- Raw design files, private evidence, full masters, private copy, and metadata are
  excluded from Git and deployment.
- No analytics or monitoring until consent/privacy decisions are approved.

## 9. Intentional deviations

| Reference detail                             | Implementation decision             | Source-of-truth reason              |
| -------------------------------------------- | ----------------------------------- | ----------------------------------- |
| Browser frame                                | omit                                | presentation-only layer             |
| Guide labels/pink bounds                     | omit                                | design annotation, not UI           |
| NEWS placeholder titles/images               | omit or approved replacement        | unapproved copy and rights          |
| Inaccessible small text/targets, if measured | raise to WCAG floor                 | accessibility outranks raster       |
| Exact text wrap under zoom                   | allow reflow                        | readable HTML and WCAG reflow       |
| Modal visual                                 | no implementation until exported    | missing reference cannot be guessed |
| Audit-render shading variance                | follow clean designer export        | audit SVG omitted some PDF forms    |
| Unlicensed fonts                             | approved metric-compatible fallback | legal/source-of-truth requirement   |

Additional deviations require a row here before implementation, not after a failed
comparison.

## 10. Acceptance thresholds

These thresholds are provisional and must be approved before implementation. They may
not be relaxed after seeing an implementation result.

| Viewport/state                   | Gated region                  | Threshold                                                                     |
| -------------------------------- | ----------------------------- | ----------------------------------------------------------------------------- |
| 1440×900 menu closed             | frame/content axis            | content x offset and major section edges ±2 CSS px                            |
| 1440×900 named chapter frames    | irregular clip and photo crop | major clip landmarks ±2 px; focal anchors ±4 px                               |
| 390×844 menu closed              | SP geometry                   | blocked until 390 mapping approved; then major landmarks ±2 px                |
| 768×1024 menu closed             | tablet written spec           | stakeholder review required before golden; no stretched-raster metric         |
| menu open at all three viewports | modal bounds/focus            | blocked until external references; focus order/state must be exact            |
| all authoritative text           | copy/wrapping                 | exact copy and line count at 100% for approved font; baseline landmarks ±2 px |
| logo/hairlines/icons             | vector bounds                 | ±1 CSS px and exact approved token color                                      |
| neutral/vector regions           | pixel diagnostics             | normalized RGB MAE ≤0.01 and changed-pixel ratio ≤0.015 at 16/255 threshold   |
| photo regions                    | pixel diagnostics             | normalized RGB MAE ≤0.035, edge MAE ≤0.025, plus focal-anchor gate            |
| every comparison                 | discrepancy ledger            | zero material unexplained discrepancies                                       |

Metrics are diagnostic and never replace original-detail review of reference, actual,
50% overlay, amplified difference, and side-by-side artifacts.

The overlay is an actual equal-alpha composite and has a synthetic red/blue midpoint
test. It remains a review aid, never a perceptual or geometric acceptance gate.

Every capture destination is validated as a normalized deterministic PNG below the
current immutable `artifacts/fidelity/captures/runs/<run-id>/` before a browser
screenshot is taken. Existing path components must be real directories, never symbolic
links; screenshots are produced as buffers and published through a same-directory
fsynced, non-clobbering operation. A repeat of the same run reuses only byte-identical
PNG, provenance, and run-manifest bytes. Different bytes within that run are a hard
failure; a legitimate identity change creates a separate run.

Frame semantics are explicit contracts, never inferred from frame IDs or labels.
Top/menu-open frames may use absolute `(0,0)`. Each approved ROOT, DUSK, DAWN, ALPINE,
or footer frame must instead name an approved selector-anchor strategy, keep absolute
`scroll` null, declare exact visible/state/DOM-attribute expectations, and bind concrete
landmark and region result IDs. Capture provenance records the observed selector count,
visibility, positive bounds and viewport intersection, actual scroll, and exact DOM
attributes; aggregate coverage must carry and PASS those same bindings.

Before any technical-candidate check can pass, a private approval manifest must bind
the config hash, immutable external-reference hashes/dimensions, all required
viewport/state coverage, predeclared thresholds, Gate C/copy/rights evidence, and the
discrepancy ledger to an explicit approver record or signed approval record. A technical
pass does not authorize publishing or deployment. The local preflight validates a signed
record's shape, bindings, detached Ed25519 signature, and trusted tracked signer policy.
Signer enrollment and staged-content review remain separate protected human controls.
The machine-facing and human-facing requirements are consolidated in
`docs/technical-candidate-contract.md`.

## 11. Gate status

| Gate                     | Status          | Evidence / blocker                                                                                |
| ------------------------ | --------------- | ------------------------------------------------------------------------------------------------- |
| A — truth ready          | BLOCKED         | no tracked baseline; copy, NEWS behavior, destinations, rights unresolved                         |
| B — direction approved   | PARTIAL         | supplied organic direction accepted for specification; no new generation needed                   |
| C — specification ready  | BLOCKED         | modal, tablet/390 mapping, annotation parameters, typography, SP measurements, clean exports, threshold approval missing |
| D — implementation ready | FOUNDATION ONLY | application shell/config/gate harness exists; production UI intentionally absent                  |
| E — human release approval | BLOCKED       | no passing technical evidence, approved diff artifacts, live deployment, or stakeholder approval  |

The initial strict project audit reported three blockers: no tracked project files, no
reference-fidelity script/package surface, and no CI workflow. After the pinned
package/Playwright/fidelity harness and repository instructions were added, the fresh
2026-08-18 strict Mode C rerun reported **19 PASS, 0 WARN, 1 BLOCK**. The remaining
block is `git.tracking` because no first commit exists. There is still no CI-run
evidence or approved target/current capture pair; this rerun does not close Gate A, C,
comparison, CI, or human release approval.
