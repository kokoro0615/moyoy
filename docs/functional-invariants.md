# Functional invariants

Status: provisional ledger for `image-to-code` Mode C\
Affected template: landing page `/`

These invariants are the behavior and content constraints that implementation must
preserve. Unknowns remain blocked rather than inferred from the static design.
The [design annotation ledger](design-annotation-ledger.md) is the stable mapping for
all 13 readable pink source stories or clusters. Its nine implementation instructions
constrain intent; its four guide records are measurement aids only.

## Content and information architecture

- The narrative order is hero → about → product overview → ROOT → DUSK → DAWN → ALPINE →
  NEWS → footer.
- ROOT, DUSK, DAWN, and ALPINE names, numbering, image identity, and prose must not be
  cross-wired.
- Extracted copy is provisional until the content owner approves it. Do not invent
  prices, claims, article titles, legal text, contact details, or CTAs.
- NEWS titles and images are placeholders. The feature may be omitted from the initial
  release; visible mock content is not production truth.
- Footer contact/legal content ships only after explicit approval.

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
- At wide desktop, center the 1200 px design canvas and extend only approved open-ended
  line work into outer space.
- Preserve section order and prose order at all widths.
- The 768 px tablet layout and the exact desktop/mobile switch trigger require approval
  before implementation.
- Text remains reflowable and usable at 200% and 400% zoom; reference line wraps may
  diverge where accessibility requires it, with a recorded deviation.

## Navigation and modal

- The SP menu control remains reachable at the top of the page.
- Modal geometry is not specified by the portable PDF. Do not implement a guessed
  overlay and call it faithful.
- Once approved, the modal must support keyboard open/close, Escape, focus trap, focus
  restoration, a visible focus indicator, labelled controls, and body scroll locking
  without losing page position.
- Navigation labels include the four fragrance chapters, about, product, NEWS
  categories, shop/social links, and legal links; destinations remain open.

## Motion

- Approved intent includes slow relative parallax, slower contour-line movement, a
  repeating scroll line, and fixed chapter photography.
- The exact motion target, distance, trigger, timing, easing, platform behavior, and
  fixed/sticky technique remain unresolved; qualitative annotation wording is not a
  numerical implementation contract.
- Motion cannot own content visibility or block reading/navigation.
- `prefers-reduced-motion: reduce` removes parallax/scrub/repeating decorative motion
  and provides stable static composition.
- Motion must tolerate resize, interruption, back/forward navigation, and restored
  scroll without duplicating listeners.

## Design annotation reconciliation

- Exactly 13 readable pink stories/clusters are accounted for: nine implementation
  instructions and four non-implementation guides.
- The two NEWS instructions remain separately preserved because their launch scopes
  conflict; Q-02 must resolve them.
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

## Performance and privacy

- Raw AI/EPS/PDF, audits, private copy, and full-resolution masters never enter Git,
  `public/`, Preview, or production.
- Repository policy rejects source-master extensions anywhere and requires every public
  binary derivative or regression fixture to be hash-allowlisted; ignore paths alone
  are not a privacy control.
- Approved images have explicit dimensions, responsive sources, correct `sizes`, and no
  upscale. Only one measured LCP candidate may preload.
- Strip source metadata from public derivatives.
- Keep the main content statically rendered; do not require hydration to see the hero,
  prose, or navigation destinations.
- Analytics, consent, and field monitoring are absent requirements until the owner
  approves them.

## Route, SEO, and external state

- The foundation exposes `/`; it is not an approved production implementation of the
  MOYOY design.
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
  frame IDs or labels never establish semantics. Until approved selectors, anchors,
  DOM states, detectors, and masks exist, those observations remain unavailable.
- Approved production selectors, APIs, forms, persistence, auth, and analytics do not
  exist; none may be fabricated as a preserved behavior.
