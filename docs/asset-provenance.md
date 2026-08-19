# Asset provenance policy

Status: approved production derivatives are recorded for this local candidate; release
still requires exact-reference fidelity, human review, and the repository's remaining
approval gates\
Private masters: local-only evidence store\
Public policy: code and approved derivatives only

The client confirmed paid web-use permission for the four chapter photographs and Web
use for the current design copy, brand mark, contour lines, and product drawings on
2026-08-18. On 2026-08-19 the owner approved the production candidate derivatives and
their public paths. NEWS and its placeholder assets remain excluded from the initial
implementation. Source re-reading on 2026-08-19 established that the design does not
merely name Futura PT and 秀英角ゴシック銀 Std as references: it supplies the Adobe Fonts
web project (kit `yhj3ndj`) that delivers them. That hosted project is the approved
webfont delivery; the two self-hosted OFL subsets remain in the stack as the measured
metric-compatible fallback, and no font binary is extracted or republished. Registering
the deploy origin on the kit is tracked as Q-05.

The client-supplied PC/SP transparent chapter exports were inspected on 2026-08-19.
They are clean photo-only clipping references with alpha and no embedded EXIF, XMP, or
ICC profile. They remain private source/reference inputs. The public candidate contains
deterministic sRGB derivatives only; the exact output path, dimensions, bytes, and
SHA-256 for every shipped candidate file are recorded in the CSV ledger.

## Rules

1. Raw AI, EPS, PDF, extracted full-resolution raster, audit output, and metadata never
   enter Git, `public/`, build artifacts, Preview, or production.
2. A production derivative requires a known source, owner, license, web-use scope, role,
   dimensions, color treatment, loading strategy, and alt intent.
3. `pending-rights`, `placeholder`, `exclude`, and `reference-only-fallback-approved`
   assets cannot ship. `approved-production-derivative` rows are the owner-approved
   candidate outputs; reference-only fonts are replaced rather than redistributed.
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
5. Only then place the derivative at its final code-owned path. The current candidate
   completed this intake for 51 production assets on 2026-08-19.

## Intended image treatment

- ROOT, DUSK, DAWN, and ALPINE are full-bleed chapter photographs with desktop/mobile
  art direction and a stable focal point.
- Each chapter has an independent RGB photo, a 1200 px PC alpha mask, and a 751 px SP
  alpha mask. The mask files contain white RGB plus the approved silhouette alpha and
  are intentionally separate from the photograph so CSS does not fetch below-fold RGB.
- 2560 px PC derivatives are generated from the high-resolution source inputs with
  Lanczos3 downsampling and the approved chapter alpha, never by enlarging a 2400 px
  derivative. They are selected only above 2400 CSS px.
- The logo, contour lines, and product illustrations should be clean SVGs.
- NEWS imagery is placeholder-only until content and rights are approved.
- One hero/first-visible image may be preload-eligible after LCP measurement; later
  chapter and NEWS imagery should lazy-load with explicit dimensions.

## Public/private boundary

The public ledger contains only code-owned public paths and sanitized role identifiers;
it contains no private source paths, original filenames, or sensitive metadata. Full
source mappings and rights documents remain private. The binary allowlist binds each
public file by exact path, media type, classification, and SHA-256. The copy allowlist
binds the two approved footer contact values by exact UTF-8 value and SHA-256.

## 2026-08-19 webfont delivery

DA-ASSET-01 requires the two named type roles to be reproduced through licensed webfont
delivery. The candidate self-hosts OFL 1.1 variable subsets rather than any reference
binary:

| Asset | Upstream source | Licence | Subset | Size | SHA-256 |
| --- | --- | --- | --- | ---: | --- |
| `moyoy-jost-subset.woff2` | `google/fonts` `ofl/jost/Jost[wght].ttf` | OFL 1.1 (`ofl/jost/OFL.txt`) | 107 Latin/punctuation code points, 104 glyphs | 14 196 B | `0a7707f239cc33dcdb0646f536179834df4fc504f0922b7438e052330dfbe728` |
| `moyoy-noto-sans-jp-subset.woff2` | `google/fonts` `ofl/notosansjp/NotoSansJP[wght].ttf` | OFL 1.1 (`ofl/notosansjp/OFL.txt`) | full kana blocks plus the production kanji/punctuation, 648 glyphs, `vmtx` retained | 132 316 B | `809e24ec3196d6f3798529b6ab58997e55ff4c033c78f8662203827ec38996ec` |

Both are variable (`wght` axis) and keep `kern, liga, vert, vrt2, palt, locl, ccmp` so
vertical Japanese typesetting is correct. Neither font is redistributed as a source
master, and no design-file binary was extracted. The public policy now accepts them only
as exact hash-bound `approved-production-asset` WOFF2 files.

The third-party Instagram mark that appears in the reference footer and drawer is
**excluded**: it is someone else's trademark and no rights record covers it. The account
name renders as accessible text instead, which is recorded as an intentional deviation.
