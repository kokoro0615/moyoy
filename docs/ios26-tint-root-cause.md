# iOS 26 Safari browser-bar tint — root cause, from WebKit source

Investigation of the symptom reported against `ceb7ae5`: an unwanted band of colour above
and below the page in iOS 26 Safari.

**The goal changed once the mechanism was understood.** Three commits, and the first half of
this investigation, went into making that band the *right* colour. What the page actually
wants is no band at all: DA-MEDIA-01 runs photography to both window edges, and any fill is
a stripe across it. Safari 26 has a mode for that — it simply requires that nothing on the
page qualify as an edge candidate. §7 is the change that reaches it; §1–§6 are the mechanism,
and they hold either way.

All claims below are read out of the shipping WebKit tree
(`https://github.com/WebKit/WebKit`, `main`), not out of community blog posts. The two
secondary sources the earlier work relied on are both wrong on the point that mattered.

---

## 1. Where the tint actually comes from

`LocalFrameView::fixedContainerEdges(BoxSideSet sides)` —
`Source/WebCore/page/LocalFrameView.cpp`.

Per requested side the algorithm is:

1. `fixedRect` = `rectForFixedPositionLayout()` ∩ `renderView->unscaledDocumentRect()`,
   then **contracted by `sampleRectMargin = 4`**.
2. **Hit-test one point**: `midpointOnSide(side, fixedRect)` — for `Top`, the horizontal
   centre of the viewport, 4 px down. This is a hit test, *not* a proximity scan, so the
   candidate must be the topmost hit-testable box at that single point (or an ancestor of
   it).
3. The first pass runs with `IgnoreCSSPointerEventsProperty`, so `pointer-events: none`
   does **not** disqualify an anchor on the first pass.
4. Walk `lineageOfType<RenderElement>` upward from the hit node, classifying each ancestor
   with `containerEdgeCandidateResult`, and return the first accepted one.
5. The accepted container's colour comes from `primaryBackgroundColorForRenderer`, i.e.
   `renderer.style().backgroundColor()` — the **declared** background colour, unaffected by
   the element's `opacity`.

## 2. Root cause: `opacity: 0` is explicitly rejected

`containerEdgeCandidateResult` rejects a box as `IsHiddenOrTransparent` when
`isHiddenOrNearlyTransparent(box)` is true, and `primaryBackgroundColorForRenderer` returns
an empty colour on the same predicate. That predicate is:

```cpp
static bool isHiddenOrNearlyTransparent(const RenderBox& box)
{
    if (CheckedPtr layer = box.layer(); layer && layer->isVisibilityHiddenOrOpacityZero())
        return true;

    if (box.opacity() < PageColorSampler::nearlyTransparentAlphaThreshold)
        return true;

    if (!box.hasBackground() && !box.hasBackdropFilter() && !box.firstChild() && !is<RenderReplaced>(box))
        return true;

    return false;
}
```

with, in `Source/WebCore/page/PageColorSampler.h`:

```cpp
static constexpr auto nearlyTransparentAlphaThreshold = 0.1;
```

`.chrome-tint` is `opacity: 0`. It is rejected **twice** — once by
`isVisibilityHiddenOrOpacityZero()`, once by `opacity() < 0.1`. The rejection is deliberate:
the guard exists precisely to stop a page tinting the browser UI from something the reader
cannot see.

### WebKit ships a layout test for exactly this element

`LayoutTests/fast/page-color-sampling/color-sampling-ignores-transparent-pointer-events-none-container.html`
declares our anchor almost verbatim:

```css
.invisible-popup {
    opacity: 0;
    pointer-events: none;
    background-color: rgb(255, 59, 48);
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 50px;
    z-index: 100;
}
```

and asserts `shouldBeNull("colorsBeforeShowingPopup.top")` — the element contributes
nothing. The name of the test is the finding. This is not an inference from reading the
algorithm; it is the behaviour WebKit regression-tests.

**The claim in `andesco/safari-color-tinting` that `opacity: 0` is still sampled and only
`display: none` is excluded is false for this code path.** The previous session changed the
anchors from one non-sampled state (`z-index: -1`, buried under the opaque canvas, so never
the hit node) to a different non-sampled state. Both fail; the deploy is live and correct,
the technique is not.

## 3. Why the band freezes instead of falling back to paper

After the anchor is rejected, the lineage walk records
`hitInvisiblePointerEventsNoneContainer = ancestor->usedPointerEvents() == PointerEvents::None`
— true, because `.chrome-tint` also carries `pointer-events: none`. That sets
`retryHonoringPointerEvents`, and the caller runs a **second** hit test that honours
`pointer-events`, so the anchor is skipped entirely:

```cpp
auto result = findFixedContainer(side, IgnoreCSSPointerEvents::Yes);
if (result.retryHonoringPointerEvents)
    result = findFixedContainer(side, IgnoreCSSPointerEvents::No);
```

The next fixed box under that point is `.chapter-photo-pin` (`position: fixed; inset: 0`),
which is viewport-sized, so `containerEdgeCandidateResult` returns
`IsViewportSizedCandidate`, and then:

```cpp
bool preferExistingColor = result.isDimmingLayer || result.isViewportSized || result.isSidebar;
if (preferExistingColor && page->fixedContainerEdges().hasFixedEdge(side)) {
    edges.colors.setAt(side, page->fixedContainerEdges().colors.at(side));
    continue;
}
```

**A viewport-sized container makes WebKit reuse the colour it already had.** That is the
mechanism behind "the band never changes" — not a missing update, an explicit
keep-the-previous-value branch. It matches the reported symptom exactly.

## 4. Contradiction resolved: JS-driven updates *do* re-sample

The nasedk.in claim ("changes via JavaScript don't trigger re-sampling ... derivation occurs
at initial render") is wrong as a general statement. The dirty flag is set from
`Source/WebCore/rendering/RenderLayerBacking.cpp`:

```cpp
void RenderLayerBacking::setNeedsFixedContainerEdgesUpdateIfNeeded()
{
    if (!m_owningLayer.isViewportConstrained())
        return;

    renderer().page().chrome().client().setNeedsFixedContainerEdgesUpdate();
}
```

called from `updateGeometry()`, `setContentsNeedDisplay()` and
`setContentsNeedDisplayInRect()` — i.e. any repaint or geometry change of a
viewport-constrained (fixed/sticky) layer. It is consumed once per main-frame commit in
`Source/WebKit/WebProcess/WebPage/Cocoa/WebPageCocoa.mm`:

```cpp
if (std::exchange(m_needsFixedContainerEdgesUpdate, false)) {
    page->updateFixedContainerEdges(sidesRequiringFixedContainerEdges());
    data.fixedContainerEdges = page->fixedContainerEdges();
}
```

The same layout test proves the dynamic path end to end: it flips the anchor with
**JavaScript**,

```js
document.querySelector(".invisible-popup").style.opacity = 1;
document.querySelector(".invisible-popup").style.pointerEvents = "auto";
await UIHelper.ensurePresentationUpdate();
```

and then asserts `colorsAfterShowingPopup.top === "rgb(255, 59, 48)"`. One presentation
update after a JS style write, the tint has changed. The existing `--chrome-tint`
architecture in `page-motion.tsx` is sound and does not need replacing.

Three caveats:

- Scrolling **alone** does not dirty a fixed layer. The tint only follows the page because
  our JS rewrites the anchor's colour. A design that expects the browser to re-derive on
  scroll by itself will not work.
- The test exercises an `opacity`/`pointer-events` write, which changes the element's
  *candidacy*, whereas our steady-state case is a `background-color`-only write on an
  already-qualifying element. Source says that repaints the layer
  (`RenderLayerBacking::setContentsNeedDisplay` → `setNeedsFixedContainerEdgesUpdateIfNeeded`)
  and no layout test pins it, so this was carried as the one residual risk —
  **settled on hardware**: with the opaque anchors deployed, both bars track the page across
  scroll on an iPhone. WebKit Bug 301108, which records the same failure on the `<body>`
  path, does not extend to a fixed candidate.
- The `preferExistingColor` branch above bypasses re-derivation for viewport-sized /
  dimming / sidebar containers regardless of how often the flag is set. Anything that makes
  a viewport-sized element win the hit test freezes the tint.

### The top-edge scroll gate — and why it does not apply here

`Page::updateFixedContainerEdges` can drop the top side entirely:

```cpp
bool canSampleTopEdge = settings().topContentInsetBackgroundCanChangeAfterScrolling()
    || (!frameView->wasEverScrolledExplicitlyByUserBelowTopEdge() && !m_userHasInteractedSinceLastPageLoadExcludingForcedUserGestures)
    || document->parsing();

if (scrollOffset.y() < minimumOffset.y() || !canSampleTopEdge)
    sidesToSample.remove(BoxSide::Top);
```

`m_wasEverScrolledExplicitlyByUserBelowTopEdge` latches `true` on the first explicit user
scroll past offset 0 and is only reset on `didCommitLoad`. When the top side is dropped, the
loop below carries the **previous** element and colour forward, so the status bar would
freeze at its first-paint value for the rest of the page's life
(`LayoutTests/fast/page-color-sampling/no-resampling-after-scrolling.html` asserts exactly
that).

That gate is off on our target device. `Source/WebKit/Shared/Cocoa/WebPreferencesDefaultValuesCocoa.mm`:

```cpp
bool defaultTopContentInsetBackgroundCanChangeAfterScrolling()
{
#if PLATFORM(IOS_FAMILY)
    return PAL::currentUserInterfaceIdiomIsSmallScreen();
#else
    return false;
#endif
}
```

**iPhone → `true`, so the top edge keeps re-sampling after scroll.** On iPad and macOS it is
`false` and per-scroll top tinting is impossible from the page. Worth recording: any iPad
acceptance criterion on the status bar colour cannot be met.

## 5. Corrected geometry thresholds

The numbers in `globals.css` came from community reverse-engineering and are wrong. From
source:

| Constraint | Comment in our CSS | WebKit source | Our anchor |
|---|---|---|---|
| Edge proximity | "within 4 px of top / 3 px of bottom" | single hit test at the side's midpoint, inset `sampleRectMargin = 4` | 16 px tall from the edge — contains the point ✅ |
| Width | "at least 80 % of the width" | `minimumRatio = 0.9` in `compareWithViewportSize`; `maximumRatio = 1.05` above which the adjacent side makes it `TooLarge` | `width: 100%` ✅ |
| Height | "at least 3 px high" | `thinBorderWidth = 10`, rejected when `borderBoxWidth() <= 10 \|\| borderBoxHeight() <= 10` | `height: 16px` ✅ |
| Opacity | "`opacity: 0` … still sampled" | rejected below `0.1`, and separately by `isVisibilityHiddenOrOpacityZero()` | `opacity: 0` ❌ **the defect** |
| `z-index` | — | negative `usedZIndex` rejected only on the viewport-sized branch (`NegativeZIndex`) | `120` ✅ |
| `pointer-events` | — | ignored on the first pass; only matters once the element is already rejected | `none` ✅ (safe once opacity is fixed) |
| Background colour | — | must be `isResolvedColor()`; alpha `< 0.75` is blended against the page background, otherwise forced opaque | opaque hex from JS ✅ |

## 6. What was cleared, and what was not

| Hypothesis from the brief | Status |
|---|---|
| P1 — JS re-sampling never happens | **Refuted, then confirmed on hardware.** Re-sampling works; the anchor was what was not sampled. With the opaque anchors deployed, both bars track the page across scroll on an iPhone. |
| P2 — not deployed / stale cache | **Cleared.** `ceb7ae5` → production `success` at 2026-08-20T10:42:31Z. |
| P4 — geometry thresholds unmet | **Partly true.** Width/height/position are fine; the disqualifier is `opacity`. |
| P4 — another fixed element wins | **Confirmed and load-bearing.** `.chapter-photo-pin` wins the retry pass and freezes the colour. |
| P5 — canvas taint / CSP | **Cleared.** `readRamp()` catches and caches failure, degrading to `--chapter-tone`; assets are same-origin; `next.config.ts` ships no CSP. Neither can produce a frozen band. |
| P3 — device settings ("ウェブサイトの色を表示" off, reduced transparency) | **Cleared.** The tint responds on the device, so the setting is on. |

## 7. The change: refuse the fill

Safari 26 runs one of two modes over each window edge. The demo page for
[`klmkyo/ios-safari-restore-meta-theme-color`](https://ios-safari-restore-meta-theme-color.pages.dev/)
states it plainly:

> If it does not detect an element touching the top or bottom edge, browser UI tends to stay
> transparent-ish. If it does detect an element close to the edge, Safari tries to sample its
> color and tint the browser UI to match.

Confirmed on an iPhone running iOS 26.6.1: with the demo's anchors disabled, both bars are
translucent and the page runs under them. That is the mode this page wants.

### 7.1 What supplies the fill here

Nothing on the page asks to tint the bars, but `.chapter-photo-pin` supplies a candidate
anyway. It is `position: fixed; inset: 0` — exactly window-sized — so
`containerEdgeCandidateResult()` returns `IsViewportSizedCandidate`. The silhouette does not
help: a CSS mask does not affect hit testing, so the plate answers the edge hit test even
where its mask is fully transparent. That is the original defect, and `src/app/layout.tsx`
recorded it before anyone understood it:

> Without a declared tint iOS Safari picks its own from the rendered page, and on the
> approved paper page it settled on the chapter tone behind the fixed plate: a dark green
> band above the status bar and below the toolbar.

Being window-sized it also lands on `preferExistingColor` (§3), which is why the band then
refused to change.

### 7.2 `.chrome-shield` — take the hit, then fail

`fixedContainerEdges()` hit-tests one point per edge and walks up the lineage **of the box it
hit**. A box that fails the candidate test does not hand the edge back to the rest of the
page — the walk continues to that box's own ancestors. So a small fixed box at the sample
point, whose ancestors are not fixed, ends the walk with no candidate at all:

```css
.chrome-shield {
  position: fixed;
  z-index: 120;
  left: calc(50% - 12px);
  width: 24px;
  height: 24px;
  background-color: var(--paper);
  opacity: 1;
  visibility: visible;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(#0000, #0000);
  mask-image: linear-gradient(#0000, #0000);
}
.chrome-shield[data-edge="top"]    { top: 0; }
.chrome-shield[data-edge="bottom"] { bottom: 0; }
```

Every value is doing work:

| property | why |
|---|---|
| `24px` wide, `200px` tall, straddling the edge by 100 px | `compareWithViewportSize()` returns `Smaller` below 90 % of the window on a side, and `Smaller` on both axes is `TooSmall` — rejected. 200 px clears that even in landscape on the shortest supported phone. The height and the overhang are deliberate: the sampled point is 4 px inside `rectForFixedPositionLayout()`, and on iOS that rect comes from the UI process and need not coincide with where CSS `bottom: 0` lands — the toolbar's obscured inset moves as the bar collapses, and the page is laid out above it. A box flush to the edge assumes the two agree. |
| `background-color` | **Load-bearing.** Without a background the box is `IsHiddenOrTransparent`, which *does* set `retryHonoringPointerEvents`; the retry honours `pointer-events: none`, steps over the shield, and finds the plate. `TooSmall` is one of the three results that set no retry flag. The colour itself is never read — `primaryBackgroundColorForRenderer()` returns nothing once the box is `Smaller` — so it is the paper only so that anything which ever defeats the mask shows the page's own ground. |
| `left: calc(50% - 12px)` | The sample point is the midpoint of the edge, inset `sampleRectMargin = 4`. |
| `z-index: 120` | The shield must be the box the hit test lands on, above the plate. |
| `pointer-events: none` | It must not take taps. Safe: the first pass carries `IgnoreCSSPointerEventsProperty`, and `TooSmall` never triggers the second. |
| transparent mask | Paints nothing. No gate in the sampler reads a mask — grep the whole of `fixedContainerEdges()` and the only properties it touches are `visibility`, `opacity`, background, `backdrop-filter`, `z-index`, `pointer-events` and the border box. |

`clip-path` cannot be used for the hiding: `RenderLayer::hitTestLayer()` calls
`hitTestClipPath()` explicitly, so a clipped-away box is not hit at all and the plate wins.

### 7.3 What was removed

The whole tint pipeline in `page-motion.tsx` — the ramp cache, `readRamp`/`loadRamp`,
`rampColour`/`rampCoverage`, `parseHex`, `maskSourceOf`, `ChapterSurface`, the `PaperBand`
alpha ramp, `STATUS_BAR`/`TOOL_BAR`, and `renderChromeSurface()` including its writes to
`document.body.style.backgroundColor` and to the `theme-color` meta. 875 lines to 521. The
`theme-color` meta stays declared in `layout.tsx` as a static paper tint, which is what
Chrome and pre-26 iOS still read.

The e2e check was inverted with it. It asserted that each anchor's colour matched the page;
it now asserts that **nothing on the page qualifies as an edge candidate**, at both edges,
across the same eight scroll offsets, by re-implementing the source predicate
(`MARGIN = 4`, `MINIMUM_RATIO = 0.9`, lineage walk). It lifts `pointer-events` for the read
because `elementFromPoint` has no equivalent of `IgnoreCSSPointerEventsProperty`.

### 7.4 No sanctioned alternative exists

- `<meta name="theme-color">` is still parsed and surfaced to embedders as
  `WKWebView.themeColor`, but the public `ContentInsetBackgroundFill` path resolves fixed
  edges → fixed colour → `underPageBackgroundColor` and never consults it. Apple's documented
  control for home-screen apps remains `apple-mobile-web-app-status-bar-style`.
- `sampledPageTopColor` / `PageColorSampler::sampleTop()` samples actually-rendered pixels,
  disqualifies background images, canvas and iframes, and its `maxDifference` / `minHeight`
  settings default to 0 (disabled). No page-level opt-in.
- Nothing in the Safari 26.0–26.6 release notes, WWDC26 (which targets Safari 27), the WHATWG
  HTML standard, or CSSWG drafts offers an author API.

The whole mechanism is an unstandardised internal heuristic. Treat translucent bars as a
progressive enhancement, never as an acceptance criterion.

### 7.5 Failure mode

If Apple changes the classification so the shield becomes a candidate, its declared
`background-color` is the paper — so the bars fill with paper rather than with a chapter
tone. That is the mildest available failure. If instead the shield stops taking the hit, the
plate wins and the old chapter-tone band returns.

## 8. Verification

Playwright cannot verify the bars. The sampling path is Cocoa-only
(`WebPage::sidesRequiringFixedContainerEdges` is gated on
`settings().contentInsetBackgroundFillEnabled()` and on `obscuredInsets` supplied by the
Safari UI process) and the bars are painted by native chrome that never appears in a page
screenshot.

What it *can* verify is both halves of the predicate, deterministically:

- **Nothing qualifies as an edge candidate** — the e2e check above, green on Chromium,
  Firefox and WebKit at eight scroll offsets on both edges.
- **The shields paint nothing** — all 21 visual baselines are the `ceb7ae5` frames, taken
  when no shield existed. Pixel-identical to not being there.

Device checks:

1. Mac + cable, Safari → Develop → device → page, open Web Inspector.
2. Console: no exceptions.
3. `document.elementFromPoint(innerWidth / 2, 4)` after lifting `pointer-events` on
   `.chrome-shield[data-edge="top"]` should return the shield.
4. Both bars translucent, photography running under them, at first load and after scrolling
   into each chapter. This is the only check that proves the outcome.
5. The menu control must not sit under the Dynamic Island — that would mean
   `env(safe-area-inset-top)` is returning 0 (WebKit 301994, see §9).

## 9. Known limitations no page-level fix can reach

- **Menu open on a narrow window.** The modal `<dialog>` is in the top layer, above the
  shield. At 390 px it is 250 px wide and spans the full height, so it covers the sample
  point and classifies as `IsSidebar` — a candidate — and the bars take its colour while the
  menu is open. At 1440 px the drawer does not reach the midpoint and the shield still wins.
  Its `::backdrop` takes the `containerResultFromBackdrop` path, which sets `isDimmingLayer`
  and therefore `preferExistingColor`.
- **Landscape.** `sidesRequiringFixedContainerEdges` adds `Left`/`Right` when those obscured
  insets are non-zero. The shields sit at the top and bottom midpoints, so a side edge would
  still be answered by the plate. Untested.
- **iPad / macOS.** `topContentInsetBackgroundCanChangeAfterScrolling` is `false` there
  (`PAL::currentUserInterfaceIdiomIsSmallScreen()` on iOS family, `false` elsewhere), so the
  top inset colour is fixed at first paint after the first user scroll. Any acceptance
  criterion on the top edge should be scoped to iPhone.
- Open WebKit bugs, all still `NEW`:
  - [301994](https://bugs.webkit.org/show_bug.cgi?id=301994) — `env(safe-area-inset-top)`
    returns 0 and a status-bar strip reclaims space. Reported broken on 26.1, 26.5.2 and
    iOS 27 beta; working on 26.0, 26.2, 18.7.2; **reopened 2026-08-04**. Every report is a
    Home Screen web app, so a normal Safari tab should be unaffected — but this page uses
    `viewport-fit=cover` and `max(9.5px, calc(env(safe-area-inset-top) + 9.5px))`, which
    collapses to 9.5 px if the inset ever returns 0, putting the menu control under the
    Dynamic Island. Worth a glance on any new iOS version.
  - [301108](https://bugs.webkit.org/show_bug.cgi?id=301108) — `<body>` CSS-variable changes
    do not reach the native chrome until reload. Does not apply: no `<body>`-driven tint any
    more.
  - [303167](https://bugs.webkit.org/show_bug.cgi?id=303167) — inset extension is wrong for
    dialogs and overlays using gradients or complex `backdrop-filter`. This page uses no
    `backdrop-filter` at all; keep it that way, since one anywhere in an edge lineage forces
    `PredominantColorType::Multiple`.
  - [305546](https://bugs.webkit.org/show_bug.cgi?id=305546) — fixed-header status-bar colour
    reverts after swipe-back / SPA routing. Low risk: single document, no client-side routing.
  - [302272](https://bugs.webkit.org/show_bug.cgi?id=302272) (dup of
    [300965](https://bugs.webkit.org/show_bug.cgi?id=300965)) — resolved in 26.2, but the fix
    is about structural dialog/backdrop open-close. It must **not** be read as "arbitrary
    dynamic background colours now re-sample".

---

## 10. The band that was left: the bottom edge, and why it was never a tint

Reported against `4d74b4b`, with the shields deployed: **the top bar is translucent and the
bottom bar still carries a band of colour, in every photographic chapter, clearing again on
the paper page.**

§1–§9 answer "what colour does Safari fill the bar with". That was the wrong question for
this band. The band is not a fill. It is the page.

### 10.1 What the device screenshots measure

Four device captures (iOS 26.6.1, iPhone at 1206 device px wide) were sampled column by
column, against the declared `--chapter-tone` of the chapter on screen and against the
photograph's own pixels immediately above the band:

| capture | band | `--chapter-tone` | Δ | photo pixels just above | Δ |
| --- | --- | --- | --- | --- | --- |
| ROOT | `#17271d` | `#12281d` | 5 | `#131b17` | 13 |
| DUSK | `#654631` | `#6b442c` | 6 | `#593723` | 18 |
| DAWN | `#496242` | `#42633e` | 7 | `#24331e` | 48 |
| ALPINE | `#7f9ea3` | `#779fa4` | 8 | `#98b3b5` | 33 |

The band is the **declared** tone (Δ ≤ 8, which is screenshot and bar-material noise), not
the rendered edge. DAWN's band is far lighter than the dark trees above it and ALPINE's is
far darker than the snow, so it is not `PageColorSampler` reading the last rows of the
photograph either. The band is 172–174 device px in all four — **58 CSS px, one Safari
bottom toolbar** — and the page content stops exactly at its top edge.

### 10.2 The mechanism

On iOS the containing block for `position: fixed` is the layout viewport, and Safari
shrinks that by the obscured inset its bottom toolbar occupies. The document is not
shrunk: it keeps painting under the toolbar, and in iOS 26 the toolbar is translucent.

`.chapter-photo-pin` is `position: fixed; inset: 0` with `overflow: clip`, so it stops at
the toolbar's top edge and clips the photograph there. Everything below is painted by its
parent `.chapter-photo`, which carried `background: var(--chapter-tone)` as its
undecoded-frame fallback. **A flat rectangle of chapter tone, exactly one toolbar tall,
seen through a translucent bar, is indistinguishable from an opaquely tinted bar.**

Top and bottom differ because the two insets differ. In iOS 26 Safari the address bar is at
the bottom, so `obscuredInsets.bottom() > 0` and `obscuredInsets.top()` is not — the status
bar is a safe-area inset with `viewport-fit=cover`, which the page is laid out *under*. The
plate reaches the top of the window and the photograph runs behind the status bar. It never
reaches the bottom.

That asymmetry also means `sidesRequiringFixedContainerEdges()` (§7) does not add
`BoxSide::Top` at all on this configuration, so the top bar's translucency is not evidence
that `.chrome-shield` works. The shields are retained — the plate is still a candidate at
the bottom and they still take that hit — but they were never the thing standing between
this page and this band.

### 10.3 Reproduced and measured, not inferred

WebKit under Playwright at 390 × 902 with an 844 px layout viewport supplied by hand
(`.chapter-photo-pin { height: calc(844px / var(--mobile-scale)) }`), sweeping every 100 px
of scroll through all four chapters, counting rows of the 58 px obscured strip that are a
flat `--chapter-tone` band across 2–98 % of the width:

| chapter | plate at the layout viewport bottom | plate sized to `lvh` |
| --- | --- | --- |
| ROOT | **58 / 58** | 0 |
| DUSK | **58 / 58** | 1 |
| DAWN | **58 / 58** | 0 |
| ALPINE | **58 / 58** | 3 |

The unemulated render at 390 × 844 has no flat tone in its last 20 rows at any of those
offsets, so the ≤ 3 px ALPINE residue appears only under emulation and is most likely an
artefact of forcing the plate height against `min-height: 100%`. It is not explained, and
it is recorded here rather than claimed away.

### 10.4 The change

1. **`.chapter-photo-pin` is sized to the window, not to the layout viewport.**
   `height: max(100%, var(--window-height))`, where `--window-height` is
   `calc(100lvh / var(--desktop-scale))` — `lvh` because it is the viewport with
   retractable UI *retracted*, i.e. the whole window, and divided by the artboard scale for
   the same reason `--first-view-height` is: viewport units ignore `zoom`. `max()` holds
   every engine without retractable browser UI at exactly the height `bottom: 0` gives, so
   the plate is pixel-identical off iOS — verified as `Δbottom 0` on WebKit, Chromium and
   Firefox at 1440 × 900, 1200 × 800, 768 × 1024, 390 × 844 and 360 × 844, and by all 21
   visual baselines passing unchanged.

2. **The pan range is measured against the plate, not the window.** `overflowRatio` used
   `window.innerHeight`; once the plate is taller than the layout viewport that overstates
   the hidden remainder and pans the frame clear of the plate's bottom edge — reopening the
   gap. It now measures the plate's own box. At full pan the frame lands *on* that edge and
   layout rounding decides the last fraction of a pixel (worst measured: −0.078 px). A
   safety margin was tried and reverted: it moved the ALPINE residue 4 px → 3 px, which does
   not justify perturbing approved DA-MEDIA-01 motion.

3. **The undecoded-frame fallback is a gradient, not a `background-color`.** Defence in
   depth for the sampler path, at zero visual cost: `primaryBackgroundColorForRenderer()`
   reads `style().backgroundColor()` off **every** box in the lineage of whatever answered
   an edge hit test — only `containerEdgeCandidateResult()` requires fixed positioning — so
   an absolutely positioned ancestor with a declared colour is a legal colour source.
   `linear-gradient(tone, tone)` is a `background-image`: it still satisfies
   `isHiddenOrNearlyTransparent()`'s `hasBackground()`, so the box is classified by size
   rather than as transparent, and there is no colour to take. Two identical stops render
   as a flat fill.

   This is also why the brief's proposal to move the fallback onto the `<img>` was not
   taken: the `<img>` is the box the bottom hit test lands on, so a declared colour there is
   harvested and returned with `.chapter-photo-pin`'s `IsViewportSizedCandidate` — handing
   Safari the exact tone the shields exist to withhold.

### 10.5 `theme-color`: evaluated, kept

`WebPage::willCommitMainFrameData` carries `page->themeColor()` to the UI process in the
same payload as `fixedContainerEdges`, but nothing in `LocalFrameView::fixedContainerEdges`
or `Page::updateFixedContainerEdges` reads it — grep both files: the only `themeColor` in
`Page.cpp` is the accessor. The two are independent channels, so removing the meta cannot
change the iOS 26 bar fill in either direction, while it would drop Chrome, Android and
iOS < 26 from the paper tint to a UA default. `themeColor: paperTint` stays in
`src/app/layout.tsx`.

### 10.6 Answers to the four questions the brief put to the source

- **(a) Zero candidates — cleared or carried?** **Carried.** `Page::updateFixedContainerEdges`
  ends with a loop that, for any side without a fixed edge, restores
  `m_fixedContainerEdgesAndElements.second.at(side)` and its colour, skipping only if that
  element has lost its renderer or its visibility. A side that once had a colour keeps it,
  and the carry-forward re-arms itself every commit. **`.chrome-shield` is a "do not add"
  device, never a "remove" one** — nothing a page can do releases an edge it has already
  claimed. Recorded because it bounds what any future shield-style fix can achieve.
- **(b) A separate route for the bottom?** No. `pageExtendedBackgroundColor` appears only
  inside `fixedContainerEdges` (the `::backdrop` fallback and the alpha blend), and
  `sampledPageTopColor` is committed independently and is top-only. The bottom band was not
  a WebKit route at all.
- **(c) Does the lineage walk accept an absolute ancestor as a colour source?** **Yes** — see
  §10.4 item 3. The fixed/sticky requirement lives in `containerEdgeCandidateResult()`, not
  in `primaryBackgroundColorForRenderer()`, and the walk harvests colour *before* it
  consults the classification.
- **(d) When does the bottom sample point diverge from CSS `bottom: 0`?** Whenever
  `obscuredInsets.bottom() > 0` — every iOS 26 Safari tab with the bottom address bar. The
  divergence is the toolbar height, and the shields' ±100 px straddle already covers it;
  what it does not cover is that the *page* stops there too, which is §10.2.

### 10.7 What is still unverified

Everything above is measured — on the device screenshots, or in WebKit with the inset
emulated. **None of it has been re-checked on the device.** Specifically unverified:

- That iOS 26 resolves `100lvh` to the full window rather than to the unobscured area. If it
  does not, the plate is unchanged and the band remains.
- Whether the residual band would be page paint or a native fill, since both produce the
  same colour here; the fix addresses the strip itself, so it closes either.
- The ≤ 3 px ALPINE residue of §10.3.
- Landscape, iPad, and the menu-open state of §9, all unchanged by this work.
