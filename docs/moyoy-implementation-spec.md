# MOYOY landing page implementation specification

Workflow: `image-to-code` Mode C — supplied precise design\
Design read: **香りで内面の旅を呼び覚ます organic editorial LP, organic direction**\
Signature: topographic line system + continuous fixed-photography fragrance chapters\
Status: **Gate C READY — measured specification and executable fidelity contract are
complete. A local production candidate exists; Gate D/E approval remains separate and
blocked.**

## 1. Reference mapping

The original supplied AI/PDF is the visual source of truth. The local private SVGs are
structural audit renders, not replacement masters. Public docs do not contain raw
references.

| Viewport / use   | Reference                    |     Natural reference |    Target CSS frame |         scaleX |         scaleY | Route/state/framing                                       |
| ---------------- | ---------------------------- | --------------------: | ------------------: | -------------: | -------------: | --------------------------------------------------------- |
| PC design canvas | private PC SVG               |      1200 × 10326.343 |    1200 × 10326.343 |         1.0000 |         1.0000 | `/`, menu closed, full page, browser/guide excluded; static visual approved 2026-08-18 |
| PC inspection    | private approved PC PNG      |          1200 × 10326 |    1200 × 10326.343 |         1.0000 |        0.99997 | hash-bound menu-closed visual reference                    |
| PC modal reference | private cleaned designer PNG |          1200 × 10326 |    1200 × 10326.343 |         1.0000 |        0.99997 | `/`, menu open, full page; static visual approved 2026-08-18 |
| 1440 capture     | PC SVG composed in viewport  | 1200 px authored width | 1440 × 900 viewport | 1.2000 artboard | 1.2000 artboard | complete artboard bounds x 0–1440; named scroll frames below |
| SP design canvas | private SP SVG               |        375 × 7066.723 |      375 × 7066.723 |         1.0000 |         1.0000 | `/`, menu closed, full page, browser/guide excluded; static visual approved 2026-08-18 |
| SP inspection    | private approved SP PNG      |            375 × 7067 |      375 × 7066.723 |         1.0000 |        1.00004 | hash-bound menu-closed visual reference                    |
| SP modal reference | private reconstructed designer PNG |            375 × 7067 |      375 × 7066.723 |         1.0000 |        1.00004 | `/`, menu open, full page; original alpha layer composited; static visual approved 2026-08-18 |
| 390 capture      | content-stress reflow specification |               — |           390 × 844 |              — |              — | written specification complete; never stretch 375; exact-frame visual evidence **UNAVAILABLE** |
| 768 capture      | content-stress tablet specification |               — |          768 × 1024 |              — |              — | written specification complete; exact-frame visual evidence **UNAVAILABLE** |

Mapping rule:

```text
scaleX = referenceRasterWidth / targetDesignCanvasWidth
scaleY = referenceRasterHeight / targetDesignCanvasHeight
cssX = referenceX / scaleX
cssY = referenceY / scaleY
```

The PC reference uses a 1200 px authored coordinate system. At wide desktop, scale that
complete coordinate system uniformly to the viewport width: at 1440 px the scale is
1.2 and the artboard/photo bounds are x 0–1440. Vector artwork scales directly; chapter
photography must select a derivative at least as wide as its rendered CSS width rather
than upscaling the 1200 px candidate. The 768/390 layouts remain independent reflows.

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
- Top/menu-open use absolute `(0,0)`. ROOT/DUSK/DAWN/ALPINE use their semantic section
  start with `offsetY=-96`; footer uses its semantic end with `offsetY=0`. Absolute
  page-length scroll values are prohibited for those five frames.
- Menu-closed and menu-open are separate states. Private approved menu-open references
  establish visually approved 1200/375 canvas geometry, but capture framing remains
  blocked until runtime fixed/full-height intent is approved. The 390/tablet mapping was
  later superseded by the measured content-stress rules in section 7. Exact 390/tablet
  visual approval remains unavailable; this does not authorize a stretched fallback.

`fidelity.config.json` schema v2 records route, viewport, state, scroll position,
readiness selector, image decoding, capture mode, immutable-reference contract, and
landmark/region contract per frame. All required top/chapter/footer/modal selectors,
anchors, expected attributes, detector identities, region masks, and thresholds are
now explicit. The production DOM exists locally, but approved exact-frame references and
executed comparisons remain blocked Gate D/E inputs; specified contracts are not passing
evidence. Each capture emits a repository-relative provenance sidecar without private
absolute paths. Captures are grouped into an opaque content-addressed run whose identity
binds the config hash, source revision/state, build ID, server contract, and capture
environment.

The config also names a schema-v1 aggregate evidence manifest. Every coverage item maps
to concrete observation IDs and frame IDs where an approved frame exists; missing
chapter/footer/modal frames are concrete observations, never dummy top frames. Until
their immutable references and production captures exist, results remain `UNAVAILABLE`.
A candidate manifest binds the config hash, clean source revision, build ID,
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

The visual-regression files are named `production-*` and are viewport-sized state frames,
not full-page composites. They contain approved client photography/copy and are
classified as `approved-production-baseline`, never as synthetic or as external design
references. Their exact hashes are tracked in the public binary allowlist; they remain
implementation regression goldens and do not establish external-reference fidelity.

## 2. Authority ledger

| Region / datum                                           |                    Authority | Rule                                                                              |
| -------------------------------------------------------- | ---------------------------: | --------------------------------------------------------------------------------- |
| Section order and four fragrance identities              |                authoritative | preserve exactly                                                                  |
| Visible brand statement, product/footer, and fragrance prose | authoritative and approved for Web use | map private copy verbatim; never invent or silently alter                       |
| PC/SP major composition and photo sequence               |                authoritative | implement as independent responsive compositions                                  |
| Warm neutral surface, black line work, contour signature |                authoritative | measured tokens; no generic replacement style                                     |
| Product names, sizes, and prices                         |            approved current copy | use the private approved-copy ledger verbatim                                  |
| Browser chrome and guide/pink visual marks               |  defective/non-authoritative | exclude from production                                                           |
| Readable pink annotation content                         | authoritative intent or guide | follow `docs/design-annotation-ledger.md`; unresolved values do not close Gate C   |
| NEWS article titles and images                           |      excluded initial scope | omit the entire NEWS feature and all placeholders                                 |
| Modal visual geometry                                    | authoritative static visual at 1200/375 | reproduce the hash-bound approved private references; runtime behavior remains unresolved |
| Modal background scroll, outside click, Escape, link destinations | absent from pink annotations | apply the resolved native-dialog accessibility contract for scroll lock and Escape; keep outside click and unresolved destinations absent |
| Font outlines in reference                               |      mood/geometry authority | do not extract binaries; use and measure an approved metric-compatible fallback   |
| Audit SVG transparency/shading differences               |            non-authoritative | compare final implementation with original clean export, not audit-render defects |
| Contact and legal footer content                         |        approved current copy | map from private ledger without exposing audit/source metadata                    |

The sanitized [design annotation ledger](design-annotation-ledger.md) reconciles all
13 readable pink stories or clusters: nine implementation instructions and four
non-implementation guides. Annotation styling and bounds never ship. The nine intent
records are requirements evidence, but they do not supply missing timing, easing,
distance, trigger, target binding, breakpoint, state, or rights values.

## 3. DOM and content model

Current candidate semantic order:

```text
body
├─ div[data-app-shell]
│  ├─ main
│  │  ├─ section#hero (about content + section#products)
│  │  ├─ section#root
│  │  ├─ section#dusk
│  │  ├─ section#dawn
│  │  ├─ section#alpine
│  │  └─ NEWS omitted from the initial implementation
│  ├─ footer
│  └─ button (menu invoker)
└─ dialog#site-menu (viewport-fixed navigation modal)
```

- One page-level `h1`; each content section gets a logical heading without skipping
  levels.
- Prose and labels are HTML text. The logo, contours, and product drawings may be SVG;
  no prose is baked into images.
- Fragrance sections bind `{id, number, name, prose, image, alt}` from a static typed
  content model to prevent identity/copy/image mismatch.
- NEWS is absent from the initial DOM. No empty carousel, hidden focus target, mock
  article, placeholder image, or fake link.
- Link destinations, legal routes, and shop/social targets are not present in the pink
  annotations and were deferred from the current scope on 2026-08-18. Render no dead
  links. Canonical metadata and analytics remain blocked rather than guessed.

## 4. Measured geometry

Coordinates below are CSS px in the PC design canvas, origin at its top-left.

| Landmark               |                         Reference bounds / CSS px |                Tolerance | Implementation owner |
| ---------------------- | ------------------------------------------------: | -----------------------: | -------------------- |
| PC canvas              |                           x 0–1200; y 0–10326.343 |             0.5 px frame | page shell           |
| 1440 PC placement      |                            x 120–1320 if centered |     ±2 px after approval | page shell           |
| SP canvas              |                             x 0–375; y 0–7066.723 |             0.5 px frame | page shell           |
| PC modal drawer reference | x 950–1200; width 250; full authored canvas height | ±1 px at the 1200 authored canvas | modal visual |
| SP modal drawer reference | intended x 125–375; width 250; antialiased source edge observed at x 124 | ±1 px at the 375 authored canvas | modal visual |
| Modal drawer surface reference | source RGB `#68702f`; alpha 217/255 (`0.85098`) over page | exact approved token/opacity | modal visual |
| Modal primary content inset | 50 px from the drawer's left edge in both PC/SP candidates | ±1 px after typography approval | modal content |
| ROOT photo chapter     | y 2322.923–4212.799; visual image height 1889.876 |        ±2 px major edges | fragrance chapter    |
| DUSK photo chapter     | y 3700.257–5823.309; visual image height 2123.052 |        ±2 px major edges | fragrance chapter    |
| DAWN photo chapter     | y 5631.065–7457.590; visual image height 1826.525 |        ±2 px major edges | fragrance chapter    |
| ALPINE photo chapter   | y 6864.356–9024.386; visual image height 2160.030 |        ±2 px major edges | fragrance chapter    |
| PC photo-strip source  | 2400 × 13241 at 144 ppi; chapter origins y 0/3200/6400/9600 source px | exact source-pixel relationship | chapter masks |
| SP photo-strip source  | 751 × 6539 at 144 ppi; chapter origins y 0/1600/3200/4800 source px | exact source-pixel relationship; normalize the extra raster edge against the 375 px canvas | chapter masks |
| NEWS transition        |                          approximately y 9024.386 | ±2 px after clean export | NEWS section         |
| Hairlines / logo rules |             exact bounds pending clean SVG export |                    ±1 px | brand primitives     |
| SP chapter strip       | y 2493.000–5758.146; uniform scale `375/751 = 0.499334221` | ±1 source px / ±0.5 CSS px | fragrance chapter |
| SP ROOT foreground     | top 2422.410; silhouette begins at y 2493.000; bottom 2541.290 | ±0.5 CSS px | ROOT upper contour |
| PC final footer rule   | y 9084 after NEWS omission; final page height 9436 | ±2 CSS px | footer |
| SP final footer rule   | y 5929 after NEWS omission; final page height 6382 | ±2 CSS px | footer |

The chapter ranges intentionally overlap through irregular contour clipping. Do not turn
them into four unrelated rectangular cards. The eight clean transparent exports and two
connected photo-only checks received on 2026-08-19 establish the exact raster
silhouettes and stacking relationship. The upper beige-to-ROOT contour is a separate
foreground vector shape, not part of the ROOT photograph alpha; its exact PC/SP path is
available in the structural SVG evidence. Final page placement, selector anchors, and
CSS normalization is fixed below. For the PC exports use `source/2`. The joined source
strip maps to CSS y 2295 with chapter source origins 0/3200/6400/9600, yielding:

| PC layer | CSS top | CSS height | CSS bottom | overlap with prior layer |
| -------- | ------: | ---------: | ---------: | -----------------------: |
| ROOT     | 2295.0  | 1812.0     | 4107.0     | —                        |
| DUSK     | 3895.0  | 1816.5     | 5711.5     | 212.0                    |
| DAWN     | 5495.0  | 1851.0     | 7346.0     | 216.5                    |
| ALPINE   | 7095.0  | 1820.5     | 8915.5     | 251.0                    |

For SP, preserve the 751 px artboard width and apply one uniform scale only; never crop
the half-pixel export edge or use separate x/y scales:

| SP layer | CSS top | CSS height | CSS bottom | overlap with prior layer |
| -------- | ------: | ---------: | ---------: | -----------------------: |
| ROOT     | 2493.000 | 865.346  | 3358.346   | —                        |
| DUSK     | 3291.935 | 866.844  | 4158.779   | 66.411                   |
| DAWN     | 4090.870 | 877.830  | 4968.699   | 67.909                   |
| ALPINE   | 4889.804 | 868.342  | 5758.146   | 78.895                   |

The layer formula is `top = 2493 + sourceOriginY × 375/751` and
`height = sourceHeight × 375/751`. The separate beige ROOT foreground begins at
`2295 - 225.90 = 2069.10` on PC and `2493 - 70.59 = 2422.41` on SP, so the first
silhouette sample coincides with the photo-strip origin without moving the photograph.
These values were obtained by source-pixel alpha bounds plus whole-strip correlation,
not by reading the compressed board visually.

NEWS omission removes 890 px on PC and 685 px on SP. Move the complete footer group as
a unit so its brand rule occupies the former NEWS heading anchor: PC y 9974→9084 and
SP y 6614→5929. Preserve all internal footer offsets, then end the page at PC 9436 and
SP 6382. This is a deliberate structural splice, not a compression of the remaining
page, and leaves the measured post-ALPINE breathing space intact.

The approved modal references render the drawer through the authored page; the
production behavior is now explicitly viewport-fixed as specified in section 8.

### 2026-08-19 measured static corrections

Recovered by original-detail measurement of the approved 1200 px PC and 375 px SP
menu-closed/menu-open references against fresh production-build captures taken from an
owned server. Reference values are ink bounds in the authored canvas; artwork sizes are
the natural viewBox of the approved derivative. The right-hand column is the value the
current candidate ships.

| Landmark | Reference measurement | Shipped implementation value | Defect |
| --- | --- | --- | --- |
| PC brand header line | artwork ink x 0–676, y 385–400; rule occupies y 394.0–396.2; wordmark letters begin x 584/612/638/666 | natural `917 × 15.02` at `left: -238.5px; top: 385.8px`; measured result x 0–678 with letters at 584/613/638/666 | VF-06 |
| SP brand header line | artwork ink x 0–265, y 322–336; rule y 330.8–333 | natural `917 × 15.02` at `left: -652px; top: 321.9px` | VF-06 |
| PC scroll indicator | block ink x 586–612, y 736–799; label ink y 736–745; rule x 599, y 750–799.4 | block `left: 585.9px; top: 735.8px; width: 26.64px`; label (`11.2px/500`) first, rule second at local `top: 14.5px; left: 13.1px; height: 48.95px`; measured result label 736–743, rule 750–798 | VF-07 |
| SP scroll indicator | block ink x 173–199, y 603–666; rule y 618–666.5 | block `left: 172.9px; top: 602.8px`; identical natural-scale internals | VF-07 |
| PC about block | heading ink x 382–404; eight prose columns x 522/562/603/642/682/722/762/803 at 40 px pitch; block rows 1008–1265 | `left: 378px; top: 1005px`, heading-to-prose gap `102px`; measured columns 523/562/602/643/683/722/763/803 (≤1 px) | VF-08 |
| PC centre brand mark | ink begins y 1396 | `top: 1396px; left: 469px` | VF-09 |
| PC product drawings | natural 30.43 × 108.03, 62.14 × 86.36, 136.09 × 244.97; centres x 423 / 603 / 782; all bottom-aligned at y 1830 | grid `left: 333px; width: 539.25px`, three equal columns with no gap; each drawing pinned to its natural CSS size and bottom-aligned in a 245 px row starting at `top: 1585px` | VF-10 |
| PC product copy | centred under each drawing; eyebrow ink top y 1866 | `text-align: center`; `padding-top: 33px` | VF-10 |
| PC ROOT beige foreground | solving the derivative's own lower-edge profile against the reference edge gives top 2136 (six independent columns agree within 1 px) | `top: 2136px` (was 2069.1) | VF-11 |
| SP ROOT beige foreground | same solution gives top 2441 | `top: 2441px` (was 2422.41) | VF-11 |
| PC chapter copy | eyebrow ink 2728–2733, number 2747–2760, prose lines 2814 + 32 px pitch, ink x 118–321 | `.chapter-copy` `top: 430px; left: 117px`; number `margin-top: 6px; font-size: 18.5px`; prose `margin-top: 40px` | VF-10 |
| PC chapter title | rotated Latin, not upright: letter ink 2722–2748 / 2768–2813 / 2834–2878 / 2897–2922 at x 1019–1063 | `writing-mode: vertical-rl; text-orientation: mixed`, `top: 422px; right: 127px; letter-spacing: 16.3px`; measured 2722/2769/2834/2895 at x 1019–1061 | VF-10 |
| SP chapter copy/title | copy ink x 50–254 from y 2629; title ink x 318–344 from y 2629 with 13 px letter gaps | `.chapter-copy` `top: 133px; left: 49px`, prose `margin-top: 40px`; `h2` `top: 133px; right: 27px; letter-spacing: 10px` | VF-10 |
| Chapter product drawing | authored as white line work that screens over the photograph | rendered with `mix-blend-mode: screen` on the `<img>`, because the file isolates its own blend group | VF-10 |
| PC footer | left contact block from x 46 with ink rows 10020 / 10045 / 10062 / 10097; right policy row 10071 and copyright row 10110 from x 832 | two-column footer: `.footer-contact` `top: 61px; left: 46px`, `.footer-legal` `top: 109px; left: 832px`; type 13 / 11.8 / 11.8 / 13 / 13 / 9.5 px at weight 500 | VF-12 |
| PC footer Instagram mark | present in the reference | **not shipped**: a third-party trademark with no rights record; the account name ships as text | VF-12 |
| Modal drawer content | close control ink y 20–40 with the box at x 1159–1179; `ABOUT` 103–120, rule 128–130, `MOYOYについて` 138–148, `PRODUCT` 191–207, rule 216–217, `製品情報` 225–237, list 263 / 291 / 319 / 347 | close control is a horizontal `close` + 21 px box row; content `margin-top: 98px`, `h2` `26px/27px` with a `2.5px` rule, section gap `35px`, labels `13px/18px`, list pitch `28px` with a drawn long arrow; measured 102–119 / 128–129 / 137–147 / 191 / … (≤1 px after the final pass) | VF-12 |
| PC/SP menu control | the extracted control outline declares `fill: #ece7d8`, identical to the paper surface, and the approved closed reference contains no non-paper pixel in that region | geometry preserved; the desktop control takes `--ink` because it never leaves the paper surface, and the fixed SP control keeps `--paper` plus the recorded dark glyph halo | VF-13 |


### 2026-08-20 measured SP corrections (VF-29 / VF-30 / VF-33)

Recovered from `.private/references/sp-reference.png` (375 × 7067, the approved SP frame)
by ink-band analysis at luminance threshold 110 over the `231` paper, cross-checked
against the outline masters `sp-about-copy-outlines.svg` (`viewBox 237.41 × 375.28`) and
`sp-footer-copy-outlines.svg` (`viewBox 316.98 × 204.96`). Production values are the
reduced-motion render at 375 CSS px, so no scroll-linked transform is in the measurement.

| Element | Reference ink | Production ink | Residual |
| --- | --- | --- | --- |
| About prose, column 1 (right) | x 293–305, first row 844 | x 293–305, row 844 | 0 |
| About prose, columns 2–6 | x 262–273 / 229–241 / 197–209 / 165–177 / 133–145 | x 261–272 / 229–240 / 197–208 / 164–176 / 132–145 | ≤1 px |
| About heading | rows 1202–1217, x 104–270 | rows 1202–1217, x 105–269 | ≤1 px |
| Centre brand mark | rows 1304–1325 and 1355–1365, x 90–284 / 139–235 | rows 1304–1326 and 1355–1365, identical x | ≤1 px |
| Product 1 copy (5 rows) | 1527 / 1551 / 1586 / 1601 / 1637 | 1526 / 1547 / 1584 / 1600 / 1633 | ≤4 px |
| Product 2 copy (5 rows) | 1749 / 1772 / 1807 / 1823 / 1858 | 1748 / 1769 / 1806 / 1822 / 1855 | ≤3 px |
| Product 3 copy (8 rows) | 2004 / 2028 / 2063 / 2078 / 2111 / 2127 / 2158 / 2174 | 2000 / 2023 / 2060 / 2076 / 2108 / 2128 / 2152 / 2172 | ≤6 px |
| Product drawings | natural size, all centred on x 106.5; bottoms 1649 / 1869 / 2188 | same centre line; bottoms 1650 / 1872 / 2189 | ≤3 px |
| Footer mark | rows 6607–6620, x 0–265 (identical to the header mark) | rows +0…+14 from footer top, x 0–264 | ≤1 px |
| Footer contact | company +73, address +98, telephone +115, account +150; ink x 30 | +73 / +98 / +115 / +150; ink x 30 | 0 |
| Footer copyright | +270 | +269 | 1 px |

Residuals are Latin/Japanese fallback metrics (Jost and Noto Sans JP stand in for Futura
PT and 秀英角ゴシック銀 Std until the Adobe Fonts kit resolves on the deploy domain), not
geometry. Horizontal ink runs 5–40 px wider than the reference for the same reason.

Known remaining SP differences, all previously recorded decisions rather than defects:
the NEWS block (Q-02, omits about 685 px of document), the two footer policy links
(DA-FOOTER-01), and the Instagram mark in the footer and drawer (VF-12, third-party mark
stays unshipped, so the account line starts at the block's left edge instead of indented
behind a 26.85 px glyph).

## 5. Typography

| Role                     | Intended family                                      |      Weight | Size / line-height / tracking    | Measure / wrap                           | Status              |
| ------------------------ | ---------------------------------------------------- | ----------: | -------------------------------- | ---------------------------------------- | ------------------- |
| Latin display/navigation | Jost Variable (OFL 1.1), then metric-adjusted Liberation Sans | 400/500/600 | role table below | explicit approved wraps | measured |
| Japanese prose/labels    | Noto Sans JP Variable (OFL 1.1), then metric-adjusted IPAPGothic | 400/500/600 | role table below | explicit approved wraps | measured |
| Special outlined marks   | clean SVG when not one of the approved webfont roles |         n/a | exported geometry                | no hidden accessible prose               | export BLOCKED      |
| Fallback                 | two local metric-adjusted faces; explicit line-height and hard reference breaks | n/a | overrides below | HTML remains readable if webfonts fail | measured |

Measured role contract (CSS px; tracking is `letter-spacing`):

| Role | PC size / line / tracking | SP size / line / tracking | writing / measure / wrap |
| ---- | ------------------------- | ------------------------- | ------------------------ |
| Chapter vertical title | 62 / 65 / 3 | 37.5 / 40 / 2 | vertical-rl; one Latin letter per visual row |
| About heading | 24 / 30 / 8 | 18 / 22.5 / 7.25 | PC vertical-rl; SP horizontal, centred on the canvas **below** the prose (ink rows 1202–1219) |
| About Japanese prose | 16 / 40 / 2 | 14 / 32 / 0 | PC and SP both vertical columns; the measured 237.42 px SP block is the **ink width of eight vertical-rl columns at a 32 px pitch**, not a horizontal wrap width (VF-29); preserve approved hard breaks |
| Chapter Japanese prose | 14 / 32 / 0 | 14 / 32 / 0 | eight explicit lines per approved chapter; max measured ink width 222.95 px |
| Eyebrow | 9 / 12 / 0.9 | 9 / 12 / 0.9 | `MOYOY FRAGRANCE`, no wrap |
| Chapter number | 17 / 21 / 2.3 | 17 / 21 / 2.3 | no wrap |
| Product name | 16 / 20 / 1 | 16 / 20 / 1 | no wrap |
| Product category | 10 / 14 / 1.2 | 10 / 14 / 1.2 | approved line breaks only |
| Modal Latin heading | 22 / 28 / 2.3 | 22 / 28 / 2.3 | no wrap |
| Modal Japanese label | 13 / 20 / 1.2 | 13 / 20 / 1.2 | no inferred destination |

Chapter-prose measured ink widths by line are ROOT
`195.96/200.54/201.91/176.84/176.40/205.76/189.13/197.06`, DUSK
`153.91/112.13/188.80/138.05/179.66/177.45/181.36/222.95`, DAWN
`155.87/203.79/191.16/188.53/163.22/137.68/161.40/163.17`, and ALPINE
`155.63/165.69/138.69/141.79/70.68/174.78/133.12/195.40` px. These are line-count
and wrap acceptance data, not production copy.

At 100 px in Chromium 151.0.7922.34, measured Jost font ascent/descent is 107/38 and Noto Sans
JP is 116/29. The Latin fallback width least-squares ratio is 0.910386 and the Japanese
ratio is 1.119292. Define local fallbacks with `size-adjust: 91.04%` for Liberation Sans
and `111.93%` for IPAPGothic, then `ascent-override: 107%/116%`,
`descent-override: 38%/29%`, and `line-gap-override: 0%` respectively. Explicit
line-height and approved `<br>` boundaries remain authoritative; metric override does
not authorize browser-dependent rewrapping. Production delivery must pin reviewed OFL
artifacts and subsets; no design-embedded font binary is a source.

### 2026-08-19 webfont delivery (DA-ASSET-01)

Licensed OFL 1.1 delivery replaces the local-only fallback. Both families are
self-hosted, subset to the exact production character set, and served as variable
WOFF2 with the `wght` axis retained.

| Role | Family | Source | Licence | Subset | Delivery |
| --- | --- | --- | --- | --- | --- |
| Latin display / navigation / numerals | Jost (variable) | `google/fonts` `ofl/jost/Jost[wght].ttf` | OFL 1.1 (`ofl/jost/OFL.txt`) | 107 Latin/punctuation code points | `moyoy-jost-subset.woff2`, 14 196 bytes |
| Japanese prose / labels | Noto Sans JP (variable) | `google/fonts` `ofl/notosansjp/NotoSansJP[wght].ttf` | OFL 1.1 (`ofl/notosansjp/OFL.txt`) | full kana blocks plus the 258 production kanji/punctuation, 648 glyphs, `vmtx` retained for vertical typesetting | `moyoy-noto-sans-jp-subset.woff2`, 132 316 bytes |

- Subsetting keeps `kern, liga, vert, vrt2, palt, locl, ccmp` so vertical-writing forms
  survive; hinting is dropped and CFF is desubroutinized.
- Measured metrics confirm the earlier fallback fitting: Jost `unitsPerEm 1000`,
  ascent 1070, descent −375; Noto Sans JP ascent 1160, descent −288.
- Loading strategy: both faces are `font-display: swap` with the measured
  metric-adjusted local faces (`Liberation Sans` at `size-adjust: 91.04%`, `IPAPGothic`
  at `111.93%`) as the fallback stack, so a font failure keeps the page readable and the
  swap does not shift layout. Only the Japanese subset is `<link rel="preload">`ed,
  because it is the measured first-paint text face.
- No design-file binary is used and no reference font is redistributed.
- **Publication is blocked**, not by rights but by the tracked public-repository policy:
  `scripts/check-public-repo-policy.mjs` admits binary public candidates only as
  hash-allowlisted PNGs under `tests/visual/__screenshots__`. The candidate WOFF2 files
  therefore live beside the other untracked candidate derivatives and require an
  owner-approved allowlist rule before they can enter public Git.


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
| NEWS cards       | omitted initial scope                 | none                                      | no placeholder asset ships                                      |

Paid web-use permission for all four chapter photographs was client-confirmed on
2026-08-18. The approved candidate derivatives preserve the Adobe-exported RGB
appearance, embed sRGB, strip private metadata, and avoid upscale. Responsive widths and
separate art-directed crops are included where the PC/SP references differ. The 2560 px
PC derivatives are generated from high-resolution source inputs and selected above 2400
CSS px, so no 2400 px file is enlarged.

### Irregular chapter-boundary implementation

- Keep ROOT, DUSK, DAWN, and ALPINE as four independent semantic chapter media layers;
  do not ship one 1200×multi-thousand-pixel joined page bitmap.
- Eight Illustrator exports were received and verified on 2026-08-19: each chapter is
  an RGBA PNG at 144 ppi, separately for PC and SP. All contain the intended photograph
  and transparent lower silhouette without text, logo, contour lines, product drawings,
  or pink instructions. The PC files are 2400 px wide; the SP files are 751 px wide
  because Illustrator rasterized both half-pixel artboard edges. Preserve that source
  edge until the 375 px normalization is diff-tested; do not blindly crop or stretch it.
- The next chapter sits behind the preceding chapter's irregular lower edge. Pixel
  comparison against the connected exports proves source-space chapter origins of
  0/3200/6400/9600 px on PC and 0/1600/3200/4800 px on SP. At nominal 2× scale these
  are 1600 CSS px PC and 800 CSS px SP steps before SP edge normalization.
- The ROOT upper edge is not present in the ROOT photograph alpha. It is produced by a
  separate beige foreground path over the rectangular photo top; exact PC/SP versions
  were located in the structural SVG evidence and must remain a separate decorative
  layer.
- Convert the accepted silhouette into a lightweight PC/SP alpha-only WebP mask. Render
  an optimized WebP `<picture>` inside that mask with the measured crop and focal point.
  The mask is a separate CSS resource, so it cannot force the RGB photograph for every
  chapter to load before scroll. Text, vertical chapter names, numbering, and product
  drawings remain HTML/SVG overlays, never baked into the photograph.
- Adjacent chapter media share the same measured boundary and overlap internally by at
  most the predeclared antialias tolerance so no one-pixel background seam appears.
- A full connected photo-only Illustrator export is useful as private fidelity evidence,
  but not as a production asset: it prevents chapter-level lazy loading, enlarges decode
  memory, couples PC/SP crops, and makes later fixed-photo behavior expensive to add.
- The current audit SVG contains no reusable clip-path/mask definitions, so exact masks
  must come from the Illustrator clipping groups or approved transparent exports rather
  than being guessed from the flattened page screenshot.

## 7. Responsive behavior

| Trigger / range           | Reflow                                                                  | Order / visibility                                 | Crop                     | Spacing                                 |
| ------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------- | ------------------------ | --------------------------------------- |
| ≥1200 px content capacity | uniformly scale the complete 1200 px artboard to full viewport width with no geometry cap | PC composition | width-qualified PC derivative at least as wide as the CSS viewport; `pc-2560-*` is selected above 2400 px | all art reaches both edges without raster upscaling |
| 640–1199 px               | tablet reflow; full-width chapter media, 48 px content inset, three product columns | preserve semantic order and all content | PC masks scaled uniformly by container width; no screenshot scaling | fluid gaps, minimum 32 px between product columns |
| 376–639 px                | SP reflow with 24 px text/content gutter                                | SP order; all approved content remains              | chapter heights and source-origin steps use `--sp-source-scale = viewport/751` | surplus width goes to layout/gutters, not raster stretch |
| ≤375 px reference         | independent SP composition; 24 px minimum reading gutter where content permits | vertical chapter stack; menu available             | uniform `width/751` mask transform | measured SP values                      |
| 390 px acceptance         | recompute constraints at 390; do not apply `scale(1.04)` to the page     | same SP order and hard copy breaks                  | full-bleed media uses uniform 390/751 transform; overlays use CSS constraints | 24 px gutters; 342 px readable width |

At 200%/400% zoom, reflow and readable text outrank exact reference wrapping. Any
resulting visual difference is documented before approval.

The 640 px breakpoint is content-derived: three 136 px product modules, two 32 px
minimum gaps, and two 32 px outer gutters require 536 px before optical allowance.
640 px provides that allowance without shrinking reference typography. At 768×1024 the
content width is 672 px inside 48 px insets, chapter media remains full bleed, and the
drawer remains exactly 250 px. At 390×844 the readable width is 342 px inside 24 px
gutters and the drawer is x 140–390. Neither acceptance viewport scales the 375 px page
height or positions; section heights arise from content, measured mask formulas, and
explicit spacing tokens. The first implemented 390/768 captures require Gate D visual
review because no external exact-frame design exists.

## 8. State, motion, accessibility, performance

### State

- Menu button: default, hover, focus-visible, active, expanded.
- Modal uses native `<dialog id="site-menu">` opened with `showModal()`, fixed to
  `inset-block: 0; inset-inline-end: 0`, width 250 px, and visual viewport height.
- The invoker is a real button with `aria-controls="site-menu"` and synchronized
  `aria-expanded`. Opening stores the invoker, calls `showModal()`, then focuses the
  explicit close button. The dialog has `aria-modal="true"` and an accessible name.
- `Tab`/`Shift+Tab` cycle only through current visible/enabled dialog focusables; if
  none remain, the close button receives focus. Focus never enters a closed dialog.
- Modal top-layer behavior is supplemented by setting the application shell `inert`
  (preserving/restoring any prior value) so pointer, focus, and assistive-technology
  access to the background are deterministic.
- Opening stores `scrollY` and locks the document with fixed-body positioning and
  `top: -scrollY`; closing removes the lock and restores the exact position. Safe-area
  insets pad content without changing the 250 px outer width.
- The dialog `cancel` event prevents the browser default and routes Escape through the
  same idempotent close routine. Closing restores focus to the stored invoker, or to the
  header menu button if the original node is no longer connected.
- An explicit visible close button has at least a 44×44 CSS px target and visible
  focus. Backdrop/outside click does not close the dialog because that gesture is not
  approved. No history mutation or unapproved link destination is added.
- Approved static visual facts remain the right-aligned 250 px drawer, 50 px content
  inset, and the reference `#68702f` at 217/255 opacity. Because that surface yields
  only 4.08:1 for white text over paper, the production candidate uses solid `#68702f`
  at 5.32:1 until another AA palette is approved. Modal transition motion remains
  disabled because none is specified; reduced motion therefore has no modal transition
  to suppress.
- Links: default, hover, focus-visible, active, visited policy.
- NEWS: omitted/off is the safe initial state; no loading/empty behavior is invented
  without a data source.
- No form, CMS, auth, persistence, or error state exists in the current scope.

### Motion

Status: **2026-08-19 measured candidate contract.** Every value below is
`provisional implementation judgment` selected against the approved 1200 px PC and
375 px SP static sources; none of it is designer-approved timing. All scroll-linked
motion is owned by one dependency-free client island (`src/components/page-motion.tsx`)
that publishes CSS custom properties; CSS owns the idle scroll-line loop. No motion
library is introduced.

Common controller contract:

- One `scroll` and one `resize` listener, both `passive`, coalesced into a single
  `requestAnimationFrame` write pass. The frame callback reads only `window.scrollY`
  and `window.innerHeight`; all element geometry is cached and refreshed by a
  `ResizeObserver` on the page canvas plus the `resize` listener, so no layout is read
  per frame.
- Only `transform: translate3d(0, …, 0)` is written, always through a CSS custom
  property on the owning element. No motion owns layout, visibility, reading order,
  hit testing or focus.
- `prefers-reduced-motion: reduce` is honoured twice: the island writes `0` for every
  property and a CSS block forces `transform: none` and `animation: none` on the same
  targets. The reduced state is the approved static composition.
- Re-entrancy: the island removes its listeners and resets every property on unmount,
  so route changes, back/forward navigation and BFCache restores cannot duplicate
  listeners or leave a stale transform.
- Scaled PC canvas: at ≥1200 px CSS resolves `--desktop-scale` as
  `tan(atan2(100vw, 1200px))`, so the artboard reaches both viewport edges before
  hydration and without the former 2400 px cap. Every
  viewport-space distance is divided by that scale before it is written into artboard
  space, so the perceived motion is scale-independent.

| ID | Target selector / owner | Trigger | Range / landmarks | Distance and rate | Duration / easing / repeat | Interrupt · resize · reload | PC / tablet / SP | Effect on static reference | Cost | Reduced motion | Deterministic test | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M-01 contour lag (DA-MOTION-02) | `.hero-contours`, `.product-contours`, `.footer-contours` via `--contour-parallax-y` | document scroll | hero anchored at document top; product anchored at its own centred-in-viewport scroll position; footer anchored at maximum scroll | `offset = (scrollY − anchor) × 0.08`, clamped in viewport CSS px to hero `0…+72`, product `−40…+40`, footer `−48…0` on ≥640 px and hero `0…+40`, product `−22…+22`, footer `−28…0` below 640 px | scroll-coupled, no duration; easing is the scroll itself; no repeat | continuous function of `scrollY`, so interruption and reverse are inherent; anchors recomputed on resize; reload lands on the correct value on the first frame | identical model on all widths; the compact cap set keeps the optical lag proportional to the 375 px composition | none at rest (offset 0 at page top) | compositor transform on three `<picture>` elements | all three offsets forced to `0` | compare `--contour-parallax-y` at scroll 0 / 400 / end plus a reduced-motion frame | provisional implementation judgment |
| M-02 object parallax (DA-MOTION-01) | `.brand-center`, `.product-drawing img` (three, staggered), `.chapter-product` (four) via `--object-parallax-y` | document scroll | per object, `p = (viewportCentre − objectCentre) / (viewportHeight + objectHeight)`, clamped to `−0.5…+0.5` | `offset = p × 2 × cap`; caps PC `22` (centre mark), `26 / 20 / 30` (product drawings, deliberately unequal so the three objects slip against each other), `18` (chapter drawings); SP caps `10 / 12 / 9 / 14 / 8` | scroll-coupled; symmetric; zero exactly when the object is centred | pure function of scroll and cached bounds; bounds refresh on resize/ResizeObserver | SP caps are roughly 45 % of PC so the smaller composition keeps the same optical slip | none at rest, and zero at the centred moment | compositor transform on eight small elements | `0` for every object | assert `--object-parallax-y` sign flips across the centred scroll position and is `0` under reduce | provisional implementation judgment |
| M-03 scroll line (DA-MOTION-03) | `.scroll-indicator span` (48.95 × 1 CSS px rule) | idle CSS loop, gated by `data-motion-visible` from one `IntersectionObserver` | first view only; paused when the indicator leaves the viewport | `scaleY` 0 → 1 → 0 about `transform-origin: top` then `bottom`, so the rule extends downwards and then drains downwards | `3.2 s` linear-infinite envelope: `0–6 %` empty gap, `6–48 %` extend on `cubic-bezier(0.16, 1, 0.3, 1)`, `48–62 %` hold, `62–96 %` drain on `cubic-bezier(0.4, 0, 0.2, 1)`, `96–100 %` empty | CSS animation; interruption is not user-reachable; resize does not affect it; reload restarts the loop | identical on all widths (natural-scale artwork) | the static reference shows the rule at full length, which the reduced-motion and `animation-play-state: paused` states both reproduce | one 1 × 49 px compositor layer | `animation: none`, rule rendered at full length | screenshot the indicator at `animation-delay` offsets and under reduce | provisional implementation judgment |
| M-04 chapter photo continuity (DA-MEDIA-01) | `.chapter-photo img` inside `.chapter-photo`, whose separate alpha-only PC/SP resource is the approved static `mask-image` | document scroll | starts when the chapter's top reaches the viewport bottom, ends when its bottom leaves the viewport top | `offset = progress × cap`, downward only; caps PC ROOT `20`, DUSK/DAWN/ALPINE `72`; SP ROOT `8`, others `30` CSS px | scroll-coupled, monotonic, no easing beyond the scroll | continuous function of scroll; bounds cached and refreshed on resize | same model; SP caps sized to the 375/751 mask scale | none at rest (offset 0 at chapter entry, which is the exported reference state) | one masked layer per chapter plus a compositor transform on the image | `0` for every chapter | measure each chapter's `--chapter-photo-y` at enter / mid / leave and under reduce | provisional implementation judgment; see the deviation note below |
| M-05 modal transition | `dialog#site-menu` | user open/close | — | — | not implemented | — | — | none | none | nothing to suppress | — | deferred, unchanged |

Direction rationale (why these numbers, not larger ones): the approved composition is a
quiet organic editorial page whose whole signature is negative space and a single
continuous contour system. The motion budget is therefore spent on **layered lag**
rather than displacement: the contour ground moves least (8 %), decorative objects slip
against it by 18–30 px, and the photographic chapters hold longest. Every value stays
inside the annotation's qualitative wording ("少しズレながら", "少し遅れて",
"ゆっくりめにリピート") and inside the ranges the owner named as a starting point.

**Recorded limitation for M-04.** A literal viewport-pinned background would require
chapter derivatives with vertical bleed, because the current approved derivatives are
exact silhouette crops whose RGB data does not exist outside the alpha. The candidate
therefore separates the silhouette (a static `mask-image` taken from the same file) from
the photograph (the `<img>` inside it) and drifts the photograph downward only, which is
the largest continuity the approved assets can carry without exposing an undefined
region or moving a chapter boundary. ROOT's cap is smaller than the others because its
upper edge is covered by the separate beige foreground with only ~26 px of overlap. A
full pin remains an open request against new derivatives.

### 2026-08-19 contour and menu correction contract

The owner-requested fidelity correction uses the approved 1200 px PC and 375 px SP
source frames as the static anchors. Values below were recovered by matching identical
contour path landmarks in the source-layout render and the approved Web derivatives;
they are not inferred from the current CSS.

| Region | PC source geometry | SP source geometry |
| --- | --- | --- |
| Hero contour | x `-74.14`, y `-17.47`, width `1287.14` | x `-104.02`, y `-6.50`, width `495.95` |
| Footer contour, final NEWS-less document | x `162.32`, y `8950.63`, width `1064.96` | x `-49.37`, y `6112.81`, width `600.13` |
| Menu visual bounds | x `1111.29`, y `20`, `68.71×21` | x `330.85`, y `20`, `26.15×40.6` |

The isolated contour derivatives retain `stroke-width: 0.25px`. Original-detail
browser comparison showed that changing those derivatives to `1px` over-darkens the
render. The material faintness was instead caused by a second CSS `opacity: 0.2`
composite together with incorrect placement/scale. Production therefore removes that
CSS opacity while preserving the derivative stroke. This conclusion is based on the
rendered result, not on either source declaration in isolation.

The corrected normal-motion candidate applies an `0.08` lag ratio: hero displacement
is `clamp(scrollY × 0.08, 0, 72px)` and is anchored at page top; footer displacement is
`clamp((scrollY - maximumScroll) × 0.08, -48px, 0)` and is anchored at page end. On a
scaled PC canvas the local transform is divided by the canvas scale so the viewport
lag remains eight percent. The effect is transform-only, requestAnimationFrame-throttled,
passive, resize-aware, and does not own visibility or layout. Under
`prefers-reduced-motion: reduce`, both CSS and the client island force a zero transform.

The 8% ratio and caps are measurable implementation judgment for the qualitative
annotation, not designer-approved timing. Static PC/SP source geometry can be compared
to approved exact frames. The 1440, 768, and 390 responsive results and every animated
intermediate frame remain `UNVERIFIED` until external exact-frame or motion approval is
provided.

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
| NEWS placeholder titles/images               | omit entirely in initial scope      | owner-approved initial omission     |
| Inaccessible small text/targets, if measured | raise to WCAG floor                 | accessibility outranks raster       |
| Exact text wrap under zoom                   | allow reflow                        | readable HTML and WCAG reflow       |
| Modal surface                                | solid `#68702f` rather than 217/255 | white/reference composite is 4.08:1; solid token is 5.32:1 and WCAG outranks pixel matching |
| White text over chapter photography         | high-opacity dark glyph halo         | source-photo sampling found substantial sub-4.5:1 regions without obscuring the photographs |
| Audit-render shading variance                | follow clean designer export        | audit SVG omitted some PDF forms    |
| Reference fonts                              | approved metric-compatible fallback | reference binaries are not used     |
| One joined full-height photo bitmap          | four separately masked chapter media | loading, responsive art direction, future motion, and memory |

Additional deviations require a row here before implementation, not after a failed
comparison.

## 10. Acceptance thresholds

These Gate C thresholds are predeclared and may not be relaxed after seeing an
implementation result. Exact-frame reference approval remains a separate Gate D/E input.

| Viewport/state                   | Gated region                  | Threshold                                                                     |
| -------------------------------- | ----------------------------- | ----------------------------------------------------------------------------- |
| 1440×900 menu closed             | frame/content axis            | content x offset and major section edges ±2 CSS px                            |
| 1440×900 named chapter frames    | irregular clip and photo crop | major clip landmarks ±2 px; focal anchors ±4 px                               |
| 390×844 menu closed              | SP reflow geometry            | landmark delta ≤2 px; core MAE ≤0.020, diff ratio ≤0.050, edge MAE ≤0.030       |
| 768×1024 menu closed             | tablet written spec           | landmark delta ≤2 px; core MAE ≤0.020, diff ratio ≤0.050, edge MAE ≤0.030       |
| menu open at all three viewports | modal bounds/state            | drawer-left delta ≤2 px; masked MAE ≤0.020, diff ratio ≤0.050, edge MAE ≤0.030 |
| all authoritative text           | copy/wrapping                 | exact copy and line count at 100% for approved font; baseline landmarks ±2 px |
| logo/hairlines/icons             | vector bounds                 | ±1 CSS px and exact approved token color                                      |
| neutral/vector regions           | pixel diagnostics             | MAE ≤0.015, changed-pixel ratio ≤0.035, edge MAE ≤0.025 at 16/255              |
| photo regions                    | pixel diagnostics             | MAE ≤0.045, changed-pixel ratio ≤0.180, edge MAE ≤0.060, plus landmark gate    |
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

### Gate C fidelity contract

- Ready marker: `main[data-page='moyoy-lp'][data-ready='true']` after fonts and images.
- Top: the ready marker at absolute `(0,0)`.
- Chapters: `section#root[data-chapter='root']`, `#dusk`, `#dawn`, and `#alpine`,
  selector-anchored at block start / inline center / y offset `-96`.
- Footer: `footer[data-fidelity='footer']`, selector-anchored at block end / inline
  center / offset `0`.
- Menu invoker/state: `button[data-fidelity-action='open-menu']` opens
  `dialog#site-menu[open][data-state='open']`; expected attributes are
  `aria-modal="true"` and `data-state="open"`.
- The hash-bound `perpendicular-median-luma-edge-v2` detector scans the predeclared
  normalized ROI, finds the strongest edge on each perpendicular sample line, and uses
  their median so irregular contours are not averaged away. It is imported once for
  both reference and actual raster. Passing requires both confidences ≥0.04 and position
  delta ≤2 CSS px. No implementation-only DOM coordinate may satisfy this landmark.
- Hash-bound exact-size JSON rectangle masks select the 1200 px PC canvas, 48/24 px
  tablet/mobile content regions, or the rightmost 250 px drawer. The comparator verifies
  mask hashes/dimensions, rasterizes them identically, then emits landmark and masked-region
  results. Global metrics alone remain insufficient.
- Twenty-one concrete frames cover top, ROOT, DUSK, DAWN, ALPINE, footer, and menu-open
  at all three target viewports. Their selectors, state setup, anchors, result IDs, and
  thresholds are approved as a Gate C contract. Reference hashes and executed PASS
  results deliberately remain unavailable until reviewed exact-frame artifacts exist.

## 11. Gate status

| Gate                     | Status          | Evidence / blocker                                                                                |
| ------------------------ | --------------- | ------------------------------------------------------------------------------------------------- |
| A — truth ready          | READY FOR LIMITED PC/SP SCOPE | current design copy/assets approved for Web use; NEWS and links intentionally omitted/deferred |
| B — direction approved   | APPROVED        | menu-closed/open PC 1200 and SP 375 static references are hash-bound and approved                  |
| C — specification ready  | READY           | mask/font/SP/footer/modal/responsive and fidelity contracts measured; no production UI authorization implied |
| D — implementation ready | CANDIDATE BLOCKED | local static/motion candidate exists; exact external references, human visual review, and motion approval remain open |
| E — human release approval | BLOCKED       | exact references/diffs, detached signature, CI evidence, named human/AT review, clean authorized revision, and stakeholder release approval remain absent |

The initial strict project audit reported three blockers: no tracked project files, no
reference-fidelity script/package surface, and no CI workflow. After the pinned
package/Playwright/fidelity harness and repository instructions were added, the
pre-baseline rerun reported **19 PASS, 0 WARN, 1 BLOCK** because `git.tracking` had no
first commit. Local code-only baseline commit `c78be61` now exists, and the fresh
2026-08-18 strict Mode C rerun reports **20 PASS, 0 WARN, 0 BLOCK**. This structural
audit does not supply approved exact-frame 390/768 references, production captures,
trusted signer or signed approval, CI-run evidence, target/current comparison, or
stakeholder decision; Gate D/E remain blocked as stated above. No push or deployment
occurred.

The 2026-08-19 manual WCAG record covers the local production candidate, including the
viewport-fixed modal and normal/reduced-motion paths; its executable observations are in
`docs/manual-wcag-review.md`. Named human/assistive-technology approval is still absent.
The local Playwright WebKit host dependency blocker is resolved and the current candidate
runs in the three-engine gates, but Q-10 still governs the supported Safari/iOS range.
