# iOS 26 Safari browser-bar tint — root cause, from WebKit source

Investigation of the symptom reported against `ceb7ae5` (deployed to Vercel production
2026-08-20T10:42:31Z, deployment state `success`): the status bar / toolbar band does not
track the page and does not clear.

All claims below are read out of the shipping WebKit tree
(`https://github.com/WebKit/WebKit`, `main`), not out of community blog posts. The two
secondary sources the previous session relied on are both wrong on the point that mattered.

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
  *candidacy*. Our steady-state case is a `background-color`-only write on an
  already-qualifying element. Source says that repaints the layer
  (`RenderLayerBacking::setContentsNeedDisplay` → `setNeedsFixedContainerEdgesUpdateIfNeeded`),
  but there is no layout test pinning it, and WebKit Bug 301108 records a related failure on
  the **`<body>`** path. This is the one residual risk and it is what the device check must
  settle. Contingency in §7.5.
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
| P1 — JS re-sampling never happens | **Refuted.** Re-sampling works; the anchor is what is not sampled. |
| P2 — not deployed / stale cache | **Cleared.** `ceb7ae5` → production `success` at 2026-08-20T10:42:31Z. |
| P4 — geometry thresholds unmet | **Partly true.** Width/height/position are fine; the disqualifier is `opacity`. |
| P4 — another fixed element wins | **Confirmed and load-bearing.** `.chapter-photo-pin` wins the retry pass and freezes the colour. |
| P5 — canvas taint / CSP | **Cleared.** `readRamp()` catches and caches failure, degrading to `--chapter-tone`; assets are same-origin; `next.config.ts` ships no CSP. Neither can produce a frozen band. |
| P3 — device settings ("ウェブサイトの色を表示" off, reduced transparency) | **Not testable from here.** Still worth confirming on the device before the next build. |

## 7. The change

Minimal, and it keeps the existing architecture:

1. **Shipped: `opacity: 1` plus a mask fade.** `opacity` is the constraint that has already
   broken twice, so it is stated explicitly rather than left to the initial value, and it is
   the one option that does not depend on the exact value of a WebKit constant.

   Opacity alone was not enough. Measured against the approved 390×844 frames, a flat band
   sits 63–127 of mean per-pixel RGB distance from the photograph it covers: the *mean*
   colour matches — which is why the tint assertion passes — but the photograph's local
   variance (σ ≈ 40–80 per channel) does not survive, so the band reads as a flat strip
   wherever the chrome fails to cover it. The fade fixes that without touching sampling,
   because WebKit reads the box's declared `background-color` and neither
   `isHiddenOrNearlyTransparent()` nor `containerEdgeCandidateResult()` looks at masking:

   ```css
   .chrome-tint[data-edge="top"]    { mask-image: linear-gradient(to bottom, #000 0 4px, transparent); }
   .chrome-tint[data-edge="bottom"] { mask-image: linear-gradient(to top,    #000 0 4px, transparent); }
   ```

   The first 4 px stay solid so that the documented sample point (`sampleRectMargin = 4`) is
   covered by a fully opaque strip — nothing then rests on the assumption that masking does
   not affect hit testing. Measured per row at 390×844, the delta now ramps from the edge to
   nothing at the seam:

   | frame | before (mean) | after (mean) | after, row 0 → row 15 |
   |---|---|---|---|
   | ROOT top | 117.4 | 78.5 | 138 → 3 |
   | DUSK top | 104.8 | 67.0 | 113 → 5 |
   | ALPINE top | 98.5 | 62.4 | 103 → 4 |
   | FOOTER top | 77.2 | 47.1 | 79 → 4 |
   | DUSK bottom | 63.0 | 39.9 | 65 → 3 |

   What is left is concentrated in the 4–5 rows deepest inside the status bar and the home
   indicator; there is no longer an edge against the photograph.

2. Alternatives considered and not taken:
   - `opacity: 0.15`. WebKit samples the declared colour, so the bar would still be right
     while the band painted at 15 %. Rejected because it clears
     `nearlyTransparentAlphaThreshold` by only 0.05 and would break silently if Apple raised
     that constant.
   - `filter: opacity(0)`. Would work today — the predicate reads `opacity`, not `filter` —
     but it defeats a guard whose entire purpose is that the bar matches something the reader
     can see, so it is the option most likely to be closed.
3. Keep `pointer-events: none`, keep `z-index: 120`, keep `height: 16px`, keep the rAF
   `--chrome-tint` writes. All verified correct against source.
4. Rewrite the `.chrome-tint` comment block in `globals.css` and the `renderChromeSurface`
   comment in `page-motion.tsx`: both currently state the false `opacity: 0` claim and the
   wrong 80 % / 3 px thresholds.
5. **Contingency, only if the device shows the tint correct at first paint but frozen on
   scroll** — i.e. if a `background-color`-only write turns out not to invalidate. Do not
   build this pre-emptively; it is more machinery than the evidence currently justifies.
   Force the invalidation WebKit definitely honours (`WebPage.cpp`: adding/removing a
   viewport-constrained object sets the flag) by replacing the node instead of restyling it:
   give each anchor a React `key` derived from the quantised tint, so a colour change
   unmounts the old fixed node and mounts a new one. Quantise hard (chapter-level, or ~8
   steps) so this happens a handful of times per scroll, never per frame.

## 8. Verification

Playwright's `webkit` cannot verify any of this. The sampling path is Cocoa-only
(`WebPage::sidesRequiringFixedContainerEdges` is gated on
`settings().contentInsetBackgroundFillEnabled()` and on `obscuredInsets` supplied by the
Safari UI process) and the tint is painted by native chrome that never appears in a page
screenshot. A Playwright check can only prove that our JS computes the colour it intended —
which was already true in the broken build.

Valid verification is device-only:

1. Mac + cable, Safari → Develop → device → page, open Web Inspector.
2. Console: confirm no exceptions (canvas taint, etc.).
3. Evaluate on the device:
   `[...document.querySelectorAll('.chrome-tint')].map(n => [n.dataset.edge, n.getBoundingClientRect(), getComputedStyle(n).opacity, getComputedStyle(n).backgroundColor])`
   and confirm `opacity >= 0.1`, `height > 10`, `width >= 0.9 * innerWidth`, and that the
   rect contains the midpoint of its edge inset by 4 px.
4. `document.elementFromPoint(innerWidth / 2, 4)` should be the top anchor.
5. Screenshot at several scroll positions on the device, first load and after scrolling, and
   confirm the bars change with the page.
6. Confirm on the device: Settings → Apps → Safari → Tabs → show website colours is on, and
   Reduce Transparency is off.

## 9. Known limitations no page-level fix can reach

- Opening the modal `<dialog>` puts it in the top layer over the sample point on narrow
  windows, and its `::backdrop` takes the `containerResultFromBackdrop` path, which sets
  `isDimmingLayer` → `preferExistingColor` → the previous colour is reused. Tint changes
  while the menu is open are therefore not reliable.
- **iPad / macOS**: `topContentInsetBackgroundCanChangeAfterScrolling` is `false` there, so
  the status bar / top inset colour is fixed at first paint after the first user scroll. No
  page-level fix exists. Any acceptance criterion on top tint should be scoped to iPhone.
- Open WebKit bugs, from the Codex pass (all still `NEW` at time of writing):
  - [301108](https://bugs.webkit.org/show_bug.cgi?id=301108) — iOS 26, changing `body` CSS
    variables for light/dark updates the in-page header but not the native chrome until
    reload. Same shape as a custom-property-driven tint, on the `<body>` fallback path.
  - [303167](https://bugs.webkit.org/show_bug.cgi?id=303167) — inset extension is wrong for
    dialogs/overlays using gradients or complex `backdrop-filter`. Avoid both on any anchor.
  - [305546](https://bugs.webkit.org/show_bug.cgi?id=305546) — Safari 26.2, fixed-header
    status-bar colour reverts after swipe-back / SPA routing. Low risk here: single document,
    no client-side routing.
  - [302272](https://bugs.webkit.org/show_bug.cgi?id=302272) (dup of
    [300965](https://bugs.webkit.org/show_bug.cgi?id=300965)) — resolved, but the fix is about
    structural dialog/backdrop open-close. It must **not** be read as "arbitrary dynamic
    background colours now re-sample".
- Safari release notes for 26.1, 26.2 and 26.3 contain no fix for JS-driven background-colour
  re-sampling. The whole mechanism is an unstandardised internal heuristic introduced as
  "prototyping only" SPI, and its constants (`0.1`, `10`, `0.9`, `4`) can change without
  notice. It should stay a progressive enhancement, never an acceptance criterion.
