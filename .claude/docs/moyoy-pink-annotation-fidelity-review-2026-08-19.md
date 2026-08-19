# MOYOY pink-annotation fidelity review — 2026-08-19

Source of truth re-derived independently from `20260818_web/20260818_web/moyoy_web_02_ol.pdf`
(single artboard, 1920x10600 pt, 1 pt = 1 CSS px). `moyoy_web_02.ai` was saved without PDF
compatibility and contains no artwork; `_ol.pdf` / `_ol.ai` are the only readable sources.

Method: pdf.js operator-list extraction with CTM tracking; pink annotations isolated by
paint colour `rgb(255,0,140)` filtered on the actual paint operation (fill vs stroke).
1041 pink paint operations, 7 y-bands, 13 annotation stories. Rendering via
Chromium + pdf.js at scale 1-6. Live build measured with Playwright at
1200/1440/1920/2560/768/390.

## Measured source geometry

| Item | Value |
| --- | --- |
| PC page frame | x 100-1300 (1200 px), topY 100-10430 -> 10330 px tall |
| SP page frame | x 1473-1848 (375 px), topY 100-7167 -> 7067 px tall |
| PC first view | topY 100-900 -> 1200 x 800 |
| SP first view | topY 100-767 -> 375 x 667 |
| Rulers | `1200px` over PC frame, `750px` over SP frame (= 375 CSS px @2x) |
| Contour stroke | `lw=0.25` black (matches shipped SVG `stroke-width:.25px`) |
| Chapter product icons | `lw=1` **stroke white, no fill** (240 stroke ops) |

## The 13 pink stories, verbatim

| # | Verbatim | Leader target (measured) |
| --- | --- | --- |
| 1 | 「Futura PT」と「秀英角ゴシック銀Std」の部分は全てwebフォントで再現お願いします。それ以外の書体はSVGや画像等で対応お願いします。 | page-wide |
| 2 | 高解像度ディスプレイ（Retina等）対応で作成お願いします。画像関係は2倍のサイズで作成するか、SVGにするなどして対応 | page-wide |
| 3 | Adobe Fonts (Typekit) embed `<script>` with `kitId: 'yhj3ndj'`, `scriptTimeout: 3000`, `async: true` | page-wide (delivery mechanism for #1) |
| 4 | `1200px` | PC canvas ruler (guide) |
| 5 | `750px` | SP export ruler (guide) |
| 6 | ファーストビュー (PC) | topY 100-900 bracket (guide) |
| 7 | ファーストビュー (SP) | topY 100-767 bracket (guide) |
| 8 | 上部に固定表示 | **two leaders**: PC menu box (x 1190-1294, topY 114-148) **and** SP menu box (x 1789-1841, topY 109-170) |
| 9 | 背景の線はパララックス効果で少し遅れてスクロールする | 1 leader onto a hero contour line at (458, 803) |
| 10 | この部分がブラウザの中心に表示されるように調整 / ブラウザ幅が大きい時は、左側の線を伸ばして表示。 | bracket under the MOYOY wordmark (x 620-784 = canvas centre 602/1200) |
| 11 | 線が下に伸びるアニメーション / ゆっくりめにリピート | scroll indicator rule at (700, 871) |
| 12 | パララックススクロールエフェクト / それぞれのオブジェクトが少しズレながらスクロール | **2 leaders**, both onto product-band contour lines at (1240, 1992) and (1254, 2190) |
| 13 | 背景写真は固定（スクロールしない）参考 https://www.apple-q.jp | leader into the ROOT chapter photograph at (1152, 3184) |
| 14 | お知らせの機能は一旦ナシで公開する | encircles the NEWS carousel + VIEW ALL |
| 15 | この二つのコンテンツは一旦非表示で公開する | **2 leaders** onto the footer links 個人情報保護方針 (1052, 10187) and サイトご利用にあたって (1170, 10187) |

(#1+#2+#3 are one source text block; #4-#7 are guides. 9 implementation stories, 4 guides
— the same 9/4 split the project ledger records, but with different bindings, see below.)

## Ledger defects (root causes)

| Ledger record | Defect | Consequence |
| --- | --- | --- |
| DA-NEWS-02 | Bound to "two NEWS contents". The two leaders land on the **footer legal links**, not NEWS. | A non-existent conflict with DA-NEWS-01 was recorded and Q-02 blocked; the real, unambiguous instruction (hide the two footer links at launch) was never implemented. |
| DA-NAV-01 | Scoped "SP" only. The 上部に固定表示 leader forks to the **PC** menu box as well. | PC menu control ships `position: absolute` and scrolls away. |
| DA-ASSET-01 | Records "two named type families" without naming them and declares the licensed delivery account **unspecified**. The source names Futura PT / 秀英角ゴシック銀Std and supplies the Typekit kit id. | Shipped as Jost + Noto Sans JP substitutes; the specified delivery path was never evaluated. |
| DA-MEDIA-01 | Reference URL `https://www.apple-q.jp` withheld from the public ledger. | The concrete behavioural reference (fixed background photo) was lost; a drift was implemented instead. |
| DA-LAYOUT-01 | "Implementation hook: the 1200 px authored PC composition **uniformly scaled** to the full viewport". | Contradicts 「ブラウザ幅が大きい時は、左側の線を伸ばして表示」, which asks the *line* to extend while the composition holds. |
| DA-MOTION-01 | "annotated page objects; exact object ownership remains to be mapped". Both leaders land on contour lines. | Object drift was applied to `.brand-center`, `.chapter-product` and product drawings — motion the source does not mark. |

## Implementation conformance (measured on the live production build)

| Story | Status | Evidence |
| --- | --- | --- |
| 14 NEWS omitted | PASS | no NEWS DOM; PC height 9436 = design 10330 minus the ~900 px NEWS band |
| 11 scroll line | PASS | `moyoy-scroll-line` 3.2 s loop, scaleY 0->1 top-origin then drains; reduced motion keeps the full static rule |
| 9 + 12 contour parallax | PASS (values unapproved) | 8 % lag on hero/product/footer with per-band caps 72/40/48 (40/22/28 compact) |
| 2 Retina | PASS | 1200/1440/2400/2560 w derivatives + `sizes="100vw"`; line art as SVG; woff2 |
| 8 fixed menu (SP) | PASS | `position: fixed` at <=639 px |
| 8 fixed menu (PC) | **FAIL** | `.menu-open-button { position: absolute }`; measured `absolute` at 768/1200/1440/1920/2560 |
| 13 fixed chapter photo | **FAIL** | photo top moves -793.8 px per +800 px scroll = **99.2 % of page speed**. The requirement is 0 %. VF-16's "IMPLEMENTED — PARTIAL" overstates a <=72 px drift. |
| 15 hide two footer links | **FAIL** | `.footer-policy` renders `display:flex; visibility:visible` at every viewport, text 「個人情報保護方針 / サイトご利用にあたって」 |
| 10 wide-viewport line extension | **FAIL** | uniform `scale(100vw/1200)`: header rule 917 -> 1100 -> 1467 -> 1956 px and page height 9436 -> 11323 -> 15098 -> **20130 px**; type is zoomed 2.13x at 2560 instead of the line extending |
| 10 logo centred | PASS | wordmark centre 602/1200 preserved under the centred artboard |
| 1 + 3 web fonts | **FAIL** | ships `MOYOY Jost` + `MOYOY Noto Sans JP`; no Adobe Fonts delivery, kit `yhj3ndj` never referenced anywhere in the repo |

## Asset defect found outside the annotation set

`pc-chapter-product-{root,dusk,dawn,alpine}.svg` declare `.cls-4, .cls-5 { stroke: #fff }`
with **no `fill`**, so the paths take the SVG default `fill: black`. The source draws these
as stroke-only white outlines (240 `lw=1 stroke=255,255,255` ops, zero fills). The intended
neutraliser — `.chapter-product { mix-blend-mode: screen }` — cannot reach the photograph
because `.chapter-copy` (`position:absolute; z-index:2`) is a stacking-context boundary, and
the SVG itself wraps its own screen blend in `isolation: isolate`. Result: all four chapters
render solid black bottles instead of transparent white outlines. Verified by pixel-level
zoom comparison (`cmp_icons.png`).

## Non-findings (checked and cleared)

- Contour stroke weight: the shipped `0.25px` matches the source `lw=0.25` exactly. Reference
  renders look darker only because pdf.js clamps sub-pixel strokes to one device pixel.
- `pc-2560-*.webp` and `mask/mask-sp-*.webp`: present and 200 OK.
- Console errors / failed requests / 4xx: zero at all six measured viewports.

## Caveat

A `codex --dangerously-bypass-approvals-and-sandbox` process was writing to this repository
during the review (`src/app/page.tsx` changed at 07:26 mid-session). All conformance results
above were measured against the build of the 07:26 tree; source snapshot kept in the session
scratchpad.

---

# Remediation — 2026-08-19

Owner decisions taken during this pass: keep the uniform full-viewport scale (DA-LAYOUT-01),
and enable the Adobe Fonts kit immediately (DA-ASSET-01).

## Root cause → fix

| Finding | Root cause | Fix | Verification |
| --- | --- | --- | --- |
| Two footer legal links visible | Ledger bound PINK-02 to "two NEWS contents", inventing a conflict with DA-NEWS-01 and freezing Q-02 | Record renamed **DA-FOOTER-01** and rebound to the measured leaders. `implementationContract.launchHiddenFooterPolicyLinks` drops the row from the DOM; the removed row's measured height (15 px PC / 38 px SP) is reserved on `.footer-legal` | Absent from DOM and rendered text at 390/768/1200/1440/2560; copyright y unchanged to 0.1 px at every viewport (9216 / 7548 / 6341.6 …) |
| PC menu control scrolls away | Ledger scoped DA-NAV-01 to SP; the source's 上部に固定表示 forks a second leader to the PC menu box | `.menu-open-button` is `position: fixed` at all widths. It lives in `[data-app-shell]`, which carries no transform, so `fixed` resolves against the viewport even at desktop scale | `position: fixed` and unchanged offset after scrolling at 1440/768/390; e2e test rewritten to the corrected scope |
| Chapter photographs scrolled at 99.2 % of page speed | DA-MEDIA-01's reference `https://www.apple-q.jp` was withheld from the ledger, so "fixed" was implemented as a ≤72 px drift | Photograph sized to the viewport (`calc(100dvh / var(--desktop-scale))` + `object-fit: cover`) and translated by the whole scrolled distance in `PageMotion`. Transform-only, so it works inside the scaled artboard where `position: fixed` cannot | Screen movement **0 px across 800 px of scroll** at all five viewports; three-frame capture shows a stationary photograph under a scrolling silhouette |
| Chapter product icons rendered as black silhouettes | Illustrator export omitted `fill` on stroke-only classes (SVG default is black); the intended neutraliser `mix-blend-mode: screen` was inert because `.chapter-copy` is a stacking-context boundary and the SVG isolates its own blend group | `fill: none` added to `.cls-4, .cls-5` in all four `pc-chapter-product-*.svg`; the inert blend removed from CSS | Pixel comparison against the source: transparent interiors with white outlines, matching the 240 stroke-only white ops in the design |
| Specified web fonts never shipped | Ledger recorded the two families unnamed and the licensed delivery as "unspecified", although the source supplies the Adobe Fonts kit | Kit `yhj3ndj` loaded through Adobe's current CSS embed with preconnects; `futura-pt` and the 秀英角ゴシック銀 Std candidates lead the type stacks ahead of the OFL fallbacks. **`Referrer-Policy` changed from `no-referrer` to `strict-origin-when-cross-origin`** — Adobe Fonts validates the requesting origin and answers 412 without one | Request reaches the kit; unregistered origins receive 412 and fall back to the local subsets |
| Wide viewport does not extend the left rule | Ledger's implementation hook prescribed uniform scaling, contradicting the annotation | No code change, per owner decision. Recorded in DA-LAYOUT-01 as an **accepted deviation, not conformance**, with the measured consequence (page height 9436 → 20130 px at 2560) | — |
| Landscape photography full width | Already satisfied; re-confirmed after the pin change | — | `.chapter-photo` box starts at x = 0 and spans the full viewport width at 390/768/1200/1440/2560 |

## Known open item

The kit is domain-locked. `https://use.typekit.net/yhj3ndj.css` answers **412** to every
origin tested, including `localhost`, so the two specified faces do not render yet and the
page falls back to the local OFL subsets. Registering the deploy origin in the Adobe Fonts
web project clears it; the Japanese family's web slug must be read from the kit stylesheet
at the same time. Tracked as Q-05. The release-boundary check tolerates exactly this one
third-party response and nothing else.

## Gate results

`format:check` · `lint` · `typecheck` · `policy:public` · `test:unit` (37 + 3) ·
`build` · `test:e2e` (55) · `test:a11y` (5) · `test:visual` (21) — all pass.
Visual baselines for the four chapter frames and the footer at all three viewports were
regenerated for the intentional change, and `config/public-binary-allowlist.json` and
`docs/asset-provenance.csv` were regenerated for the edited SVGs and snapshots.
