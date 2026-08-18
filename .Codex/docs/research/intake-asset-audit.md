# Intake asset audit — sanitized summary

Status: audited, not approved for public use\
Audit date: 2026-08-18\
Scope: supplied MOYOY design bundle; read-only source inspection

## Executive result

- The intake contains 32 files and 268,996,584 bytes.
- Fifteen files are substantive design assets: three Illustrator/PDF documents, four
  high-resolution EPS photographs, and eight linked JPEG/PNG images.
- Seventeen files are macOS metadata: one `.DS_Store` and sixteen AppleDouble sidecars.
  None of the AppleDouble files contains a non-empty resource fork.
- No archive is present in the intake. The `__MACOSX` layout shows that the bundle was
  previously transported in a Mac-created archive, but that original archive is
  unavailable for transport-level verification.
- No structurally corrupt substantive file was found. Conversion, licensing, and
  missing-state blockers remain.

The complete per-file report, SHA-256 manifest, extracted text, and sensitive metadata
are retained in the local private evidence pack and are intentionally excluded from the
public repository.

## Design documents

| Source                |                          Portable visual |                   Editable copy | Primary role                                    |
| --------------------- | ---------------------------------------: | ------------------------------: | ----------------------------------------------- |
| `moyoy_web_02.ai`     | No; saved without PDF-compatible content |                             Yes | Editable design and authoritative copy recovery |
| `moyoy_web_02_ol.ai`  | No; saved without PDF-compatible content |    No; visible text is outlined | Native outlined source                          |
| `moyoy_web_02_ol.pdf` |                                      Yes | No; body text is outlined paths | Portable visual reference                       |

The PDF is one authored page measuring 1920 × 10600 units. Its layers are `browser`,
`PC`, `SP`, `modal`, and `guide`.

| Layer   | Initial state |     Verified design extent |          Portable single-layer render |
| ------- | ------------: | -------------------------: | ------------------------------------: |
| browser |       visible | 1298 px presentation frame |                                   yes |
| PC      |       visible |           1200 × 10326.343 |                                   yes |
| SP      |       visible |             375 × 7066.723 |                                   yes |
| modal   |        hidden |                 unresolved | no; the exported PDF content is empty |
| guide   |       visible |           page annotations |     yes, but never production content |

Both Illustrator native sources preserve a substantial hidden modal layer. Its copy
references include close/navigation/shop/social/legal items, but its exact
desktop/mobile geometry and interaction cannot be established from the portable PDF. A
designer export is required.

## Visual direction and information architecture

Design read: **香りで内面の旅を呼び覚ます organic editorial LP, organic direction**.

Signature composition:

- contour/topographic line work over a warm paper-like neutral surface;
- a quiet, editorial first view with a long horizontal brand rule;
- fixed or slow-moving photography chapters that flow continuously;
- ROOT → DUSK → DAWN → ALPINE as the narrative image sequence;
- restrained black typography and product line drawings;
- NEWS and footer returning to the neutral surface.

Verified section order:

1. first view / scroll indicator;
2. brand/about statement;
3. perfume and diffuser overview;
4. ROOT;
5. DUSK;
6. DAWN;
7. ALPINE;
8. NEWS;
9. footer.

The exact extracted prose remains private until copy approval. Public implementation
must not substitute invented claims, prices, contact details, legal text, or article
titles.

## Image assets

The four chapter masters are DOS binary EPS containers with TIFF previews and
full-resolution 8-bit CMYK photographic payloads. Their natural dimensions are between
6117–7349 px wide and 11024 px high, at 200 dpi, with an embedded Japan Color print
profile. They must be converted through a color-managed sRGB pipeline; direct CMYK
decoding gives visibly incorrect output.

The linked assets also include three browser-presentation slices and five NEWS images.
The NEWS images contain people, a worksite, and a third-party corporate booth/logo. They
are treated as placeholders and are not cleared for production.

## Privacy and rights findings

The private sources contain metadata and copy that must not enter the public repository
or deployment payload, including:

- unapproved business contact copy;
- source-workstation path information;
- camera/lens identifiers and edit history;
- full-resolution client photographs;
- an Adobe Fonts web-project identifier;
- third-party people, logos, and reference material with no supplied rights
  documentation.

No credential, password, private key, or server secret was identified. This does not
convert any of the above material into a public asset.

## Conversion and release status

Required before production:

1. Resave the Illustrator files with PDF-compatible content and export PC, SP, and modal
   states separately with browser/guide layers disabled.
2. Confirm owner, license, territory, term, and permitted web use for every photograph,
   logo, font, and copy source.
3. Convert approved EPS masters to metadata-stripped sRGB derivatives with
   desktop/mobile art direction; keep masters private.
4. Replace NEWS placeholders with approved content or omit the feature.
5. Export clean SVGs for the brand mark, contour lines, and product drawings.

Gate impact: asset integrity is understood, but Gate A and Gate C remain blocked by copy
approval, rights, modal geometry, font delivery, and responsive mapping.
