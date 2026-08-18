# Asset provenance policy

Status: no production asset is approved\
Private masters: local-only evidence store\
Public policy: code and approved derivatives only

## Rules

1. Raw AI, EPS, PDF, extracted full-resolution raster, audit output, and metadata never
   enter Git, `public/`, build artifacts, Preview, or production.
2. A production derivative requires a known source, owner, license, web-use scope, role,
   dimensions, color treatment, loading strategy, and alt intent.
3. `pending-rights`, `placeholder`, and `exclude` assets cannot ship.
4. Photograph conversion must be color-managed to sRGB and strip private metadata. Never
   upscale.
5. Fonts must arrive through a licensed webfont source; design-file embedding does not
   grant redistribution rights.
6. The browser frame and guide layer are presentation aids, not page assets.

The machine-readable sanitized ledger is [asset-provenance.csv](asset-provenance.csv).
Open approvals are tracked in [open-questions.md](open-questions.md).

## Production intake sequence

1. Rights owner approves source and intended public use.
2. A deterministic converter creates a neutral or web derivative outside the runtime
   build.
3. Record output format, natural dimensions, bytes, SHA-256, focal point, and responsive
   role.
4. Review the derivative against the supplied design reference.
5. Only then place the derivative at its final code-owned path.

## Intended image treatment

- ROOT, DUSK, DAWN, and ALPINE are full-bleed chapter photographs with desktop/mobile
  art direction and a stable focal point.
- The logo, contour lines, and product illustrations should be clean SVGs.
- NEWS imagery is placeholder-only until content and rights are approved.
- One hero/first-visible image may be preload-eligible after LCP measurement; later
  chapter and NEWS imagery should lazy-load with explicit dimensions.

## Public/private boundary

The public ledger uses opaque role identifiers and contains no original filename/source
identifier column. Full hashes, source mappings, and original metadata remain in the
private manifest. This document must not be expanded by copying private XMP, contact
details, or source paths into the repository.
