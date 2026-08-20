# Functional invariants

Status: Gate C invariant ledger for `image-to-code` Mode C\
Affected template: landing page `/`

These invariants are the behavior and content constraints that implementation must
preserve. Remaining release unknowns stay blocked rather than inferred from the design.
The [design annotation ledger](design-annotation-ledger.md) is the stable mapping for
all 13 readable pink source stories or clusters. Its nine implementation instructions
constrain intent; its four guide records are measurement aids only.

## Content and information architecture

- The initial narrative order is hero → about → product overview → ROOT → DUSK → DAWN
  → ALPINE → footer. NEWS is omitted rather than hidden.
- ROOT, DUSK, DAWN, and ALPINE names, numbering, image identity, and prose must not be
  cross-wired.
- The current design copy was approved for Web use on 2026-08-18. Map it from the
  private copy ledger without inventing or silently changing prices, claims, legal text,
  contact details, or CTAs.
- Omit the entire NEWS feature from the initial implementation. NEWS placeholder titles,
  images, links, and empty containers do not ship.

## Visual identity

- Design read: **香りで内面の旅を呼び覚ます organic editorial LP, organic direction**.
- Signature: contour/topographic lines plus continuous fixed-photography fragrance
  chapters.
- Preserve the warm neutral paper surface, restrained black line work, generous negative
  space, vertical editorial type, and product line drawings.
- Do not replace the composition with generic cards, gradients, glass effects, or
  repeated centered marketing blocks.
- Browser-frame and guide artifacts never ship.
- Pink annotation text and marks never ship as UI. Their readable implementation intent
  remains binding through the sanitized annotation ledger, subject to its open values.

## Responsive layout

- The supplied PC canvas is 1200 CSS px wide; the supplied SP canvas is 375 CSS px wide.
  They are independent compositions, not a uniform scale transform.
- At wide desktop, scale the complete 1200 px PC artboard uniformly to the viewport
  width so chapter photographs, contour/brand artwork, and page surface all reach both
  viewport edges. Select a sufficiently large approved derivative; never upscale a
  raster source. The 768/390 reflows remain independent compositions.
- Preserve section order and prose order at all widths.
- At 390 px, retain SP semantic order with 24 px readable gutters and recompute layout;
  never apply a scale transform to the 375 px page. Full-bleed SP media scales uniformly
  from its 751 px source width.
- At 768 px, use the ≥640 px tablet reflow: 48 px content insets, three product columns,
  and full-bleed media. The breakpoint is content-stress derived, not device named.
- Exact-frame 390/768 visual approval is still unavailable. A complete written spec is
  not a passing external-reference comparison.
- Text remains reflowable and usable at 200% and 400% zoom; reference line wraps may
  diverge where accessibility requires it, with a recorded deviation.

## Navigation and modal

- The desktop menu control belongs to the page top; the SP menu control remains fixed
  and reachable while scrolling.
- The hash-bound private PC 1200 px and SP 375 px menu-open rasters were visually
  approved on 2026-08-18. They establish the static appearance of a 250 CSS px right
  drawer on those authored canvases. Preserve the approved appearance except where the
  recorded WCAG contrast deviation is required.
- The open modal is anchored to the visible viewport, not the full document: right 0,
  top 0, and viewport height.
- Use a native `<dialog>` with modal semantics. Opening stores the invoker and scroll
  position, makes the background inert, locks scroll without a jump, and focuses the
  explicit close button. Tab/Shift+Tab remain inside the dialog. The dialog is opened
  non-modally (`show()`) and the modality comes from the shell `inert` plus the focus
  trap: the top layer sits above every z-index on the page, including the boxes that keep
  Safari 26 from tinting the browser bars, and the drawer reaches the sampled window edge
  on any narrow window (VF-47). For the same reason the scroll lock fixes the application
  shell rather than `<body>`.
- Escape and the visible ≥44×44 close button use one idempotent close path, restore the
  exact scroll position, remove inertness, and return focus to the invoker or stable menu
  fallback. Backdrop click does not close; no unapproved destination/history behavior
  is inferred.
- Only approved labels with resolved behavior may be interactive. NEWS and unresolved
  shop/social/legal destinations create no focusable dead links.
- The reference 217/255 olive surface composites to only 4.08:1 for white text over
  paper. Until a different approved palette exists, production uses solid `#68702f`
  (5.32:1) and high-opacity dark glyph halos over variable chapter photography. These are
  accessibility-required visual deviations awaiting exact-frame/design approval.

## Motion

- Approved source intent includes slow relative parallax, slower contour-line movement,
  a repeating scroll line, and fixed chapter photography. The owner reopened slower
  contour-line movement on 2026-08-19; a static normal-motion contour is no longer an
  accepted completion state. Other motion remains deferred unless separately approved.
- The contour target, distance/ratio, trigger, timing, easing, resize, and platform
  behavior require measured implementation and review. The 2026-08-19 candidate uses an
  8% scroll lag, with hero anchored at page top and capped at +72 px and footer anchored
  at page end and capped at -48 px. Those values are testable implementation judgment,
  not designer-approved motion. Fixed/sticky and other deferred motion details remain
  unresolved; qualitative annotation wording alone is not passing evidence.
- The 2026-08-19 candidate implements all four annotated motions through one
  dependency-free client island plus CSS: contour lag, decorative object parallax, the
  repeating first-view line, and fixed chapter photography. Values are measured implementation
  judgment recorded in the implementation specification, not designer-approved timing.
- Chapter photography must never move a chapter boundary. The silhouette stays pinned as
  a static `mask-image`; the photograph inside it is sized to the viewport and translated
  by the whole scrolled distance so it holds still on screen (DA-MEDIA-01
  「背景写真は固定（スクロールしない）」). **Superseded 2026-08-20:** the artboard resolves its
  canvas with `zoom` rather than `transform: scale()`, so it is no longer the containing
  block for a fixed descendant and the pin is a real `position: fixed` plate owned by the
  browser. `.chapter-photo-pin` must stay `position: fixed` under normal motion.
- The chapter also carries the photograph a second time as ordinary document content
  (`.chapter-photo-mirror`), because iOS Safari's translucent bars show the document's own
  scrolled paint and a fixed box is clipped to the window. That mirror is held still by a
  scroll-driven CSS animation, never by a frame loop; its keyframe endpoints are derived
  from the chapter's measured document top and re-derived whenever the window height
  changes; and it is a progressive enhancement that is never displayed where scroll
  timelines are absent or the geometry has not been measured. It contributes no second
  image to the accessibility tree.
- Every chapter photograph is full bleed: its box starts at x = 0 and spans the whole
  viewport width at 390, 768, 1200, 1440 and 2560.
- Motion cannot own content visibility or block reading/navigation.
- `prefers-reduced-motion: reduce` removes parallax/scrub/repeating decorative motion
  and provides stable static composition.
- Motion must tolerate resize, interruption, back/forward navigation, and restored
  scroll without duplicating listeners.

## Design annotation reconciliation

- Exactly 13 readable pink stories/clusters are accounted for: nine implementation
  instructions and four non-implementation guides.
- The two instructions once read as a NEWS pair are one NEWS instruction and one footer
  legal-link instruction; re-measured leaders bind the second to 個人情報保護方針 and
  サイトご利用にあたって. Q-02 omits NEWS entirely and DA-FOOTER-01 hides the two links at
  launch, with no conflict between them.
- The PC center/wide-line cluster and the font/Retina story each contain two clauses but
  remain one source record.
- The page-title candidate is excluded because it was confirmed non-pink.
- No implementation may claim fidelity by guessing an unspecified annotation value.

## Accessibility

- Target WCAG 2.2 AA.
- Use semantic landmarks and one coherent heading hierarchy; production prose is real
  HTML, never baked into a screenshot.
- Decorative contour and product lines are hidden from assistive technology when
  adjacent text conveys the same meaning.
- Meaningful photographs have concise approved alt text; decorative background crops use
  empty alt or CSS backgrounds as appropriate.
- Keyboard order follows visual/narrative order. Focus never enters hidden modal
  content.
- Contrast, reflow, target size, reduced motion, and screen-reader names require manual
  review in addition to axe.
- The dialog has an accessible name, `aria-modal="true"`, an explicit close button,
  deterministic focus containment/return, background inertness, Escape handling, and
  no pointer-only operation.
- The 2026-08-19 manual record covers the local production candidate, including required
  viewport/reflow states, the modal keyboard contract, and reduced motion. Its executable
  checks do not replace named human/assistive-technology review or visual approval. The
  remaining checklist is recorded in `docs/manual-wcag-review.md` and remains Gate E work.

## Performance and privacy

- Raw AI/EPS/PDF, audits, private copy, and full-resolution masters never enter Git,
  `public/`, Preview, or production.
- Repository policy rejects source-master extensions anywhere and requires every public
  binary derivative or regression fixture to be hash-allowlisted; ignore paths alone
  are not a privacy control.
- Approved images have explicit dimensions, responsive sources, correct `sizes`, and no
  upscale. Only one measured LCP candidate may preload.
- Strip source metadata from public derivatives.
- Paid web-use permission for the four chapter photographs was client-confirmed on
  2026-08-18. Their private neutral conversions still require art-directed responsive
  derivatives, production-path provenance, and visual approval before shipping.
- Implement the irregular chapter boundaries with separate PC/SP masks or clipped
  transparent chapter derivatives. Keep ROOT, DUSK, DAWN, and ALPINE as independent
  media so they can be optimized and lazy-loaded separately. A single full-page joined
  bitmap may be retained as fidelity evidence but must not ship as the production page.
- PC mask coordinates are source/2 at y origin 2295. SP masks use the single exact
  factor `375/751` at y origin 2493; separate x/y stretching and edge cropping are
  forbidden.
- After NEWS omission, move the footer intact to rule y 9084 (PC) / 5929 (SP), with
  final page heights 9436 / 6382. Do not compress internal footer spacing.
- Keep the main content statically rendered; do not require hydration to see the hero,
  prose, or navigation destinations.
- Analytics, consent, and field monitoring are absent requirements until the owner
  approves them.

## Route, SEO, and external state

- `/` exposes an unapproved local production candidate; it is not a released or
  visually approved implementation of the MOYOY design.
- Metadata, canonical host, robots, sitemap, social images, and structured data require
  approved copy/domain decisions.
- The supplied live hostname currently has no deployment. Deployment, alias, domain, and
  production promotion require human authorization.
- Technical-candidate checks require three-viewport reference coverage and a private
  hash-bound approval record, but a green technical result never grants that human
  authorization.
- Fidelity capture validates every configured output before browser screenshot work,
  writes screenshots from memory into a content-addressed immutable run through
  non-clobbering atomic publication, and reuses an existing PNG, provenance sidecar, or
  `COMPLETE` run manifest only when its bytes are identical. Changed build provenance
  creates a new run; current-run evidence must hash-bind that run and cannot reuse a
  stale build pointer.
- ROOT, DUSK, DAWN, ALPINE, footer, and modal/menu coverage is proved by explicit
  selector/scroll/expected-state observations and concrete executed geometry result IDs;
  frame IDs or labels never establish semantics. The Gate C contracts exist; passing
  evidence still requires immutable exact-frame references and production captures.
- The approved fidelity raster detector must run symmetrically on reference and actual;
  implementation-only DOM coordinates cannot replace it. Exact-size region-mask hashes
  and predeclared thresholds are immutable inputs to a comparison run.
- Approved production APIs, forms, persistence, auth, and analytics do not exist; none
  may be fabricated as a preserved behavior.
