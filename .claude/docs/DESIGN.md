# MOYOY project design ledger

Last updated: 2026-08-18\
Workflow: `image-to-code` **Mode C — supplied precise design**\
Mirror policy: this file and the sibling DESIGN ledger must remain semantically
identical.

## Overview

Build a faithful, accessible, performance-conscious MOYOY landing page from the supplied
desktop/mobile design after truth, rights, and measured-spec blockers are resolved.

Design read: **香りで内面の旅を呼び覚ます organic editorial LP, organic direction**.

Signature system:

- warm neutral editorial surface;
- topographic/contour line work;
- continuous fixed-photography chapters;
- ROOT → DUSK → DAWN → ALPINE narrative;
- quiet black typography, generous negative space, and line-drawn products.

## Architecture

### Rendering

- Selected baseline: Next.js App Router, static-first.
- The landing route is a Server Component; core copy, SEO, and imagery do not depend on
  hydration.
- Client islands are limited to approved navigation/modal state, motion, analytics
  consent, or a future form.
- CSS owns layout and ordinary state transitions. Motion is conditional. GSAP is not an
  initial dependency and requires an approved complex-timeline need.

### Content

- One typed static content model binds each fragrance identity, number, prose, image,
  and alt intent.
- NEWS is placeholder/blocked and does not ship without a product and rights decision.
- Modal destinations, contact/legal copy, metadata, analytics, forms, CMS, and
  localization remain open requirements rather than inferred behavior.
- The sanitized design-annotation ledger reconciles exactly 13 readable pink source
  stories/clusters: nine implementation instructions and four non-implementation
  guides. Annotation styling does not ship, and qualitative instructions do not supply
  missing timing, distance, easing, target, breakpoint, state, or rights values.

### Asset pipeline

- Raw AI/EPS/PDF, audits, private copy, and full-resolution sources remain local and
  private.
- Approved photographs are color-managed to sRGB, metadata-stripped, hashed, and emitted
  as responsive derivatives.
- Logo, contours, and product drawings use clean SVG exports.
- Fonts use licensed web delivery only; design-file embedding is not a license.

## Public / private boundary

The configured remote is public. The repository is **code and sanitized documentation
only**.

Public candidates after approval:

- application code and tests;
- sanitized documentation;
- approved, optimized production derivatives;
- licensed font delivery configuration without source secrets.

Private-only:

- `20260818_web/**`;
- `.private/**` except its local ignore boundary;
- AI/EPS/PDF masters and extracted full-resolution images;
- full audit reports/manifests, private copy, sensitive metadata, and rights documents;
- unapproved references and visual-diff artifacts containing client material.

No push, deployment, alias change, or production promotion is implied by local
implementation work.

## Implementation plan

1. Resolve Gate A questions: copy, NEWS behavior, destinations, rights, fonts,
   deployment ownership.
2. Obtain clean PC/SP/modal exports and approve tablet/390 responsive behavior.
3. Close the measured-spec gaps and approve thresholds.
4. Maintain the exact-pinned Next.js toolchain and committed code-only baseline without
   admitting raw intake.
5. Build semantic static content and small client islands.
6. Run deterministic external-reference fidelity at 1440×900, 768×1024, and 390×844,
   with menu states.
7. Run technical gates and obtain stakeholder approval before deployment.

## Libraries

Pinned foundation dependencies and conditional additions:

| Family          |                                         Version | Decision                         |
| --------------- | ----------------------------------------------: | -------------------------------- |
| Runtime         |              Node 24.19.0 local/CI; Vercel 24.x | selected                         |
| Package manager |                                  pnpm 10.34.5 | exact pin for stable Vercel path |
| Framework       |                                  Next.js 16.3.1 | selected                         |
| UI              |                        React / React DOM 19.2.8 | selected                         |
| CSS             | Tailwind 4.3.3 + adapter 4.3.3 + PostCSS 8.5.26 | selected subject to Safari floor |
| Image intake    |                                    Sharp 0.35.3 | selected                         |
| Motion          |                                   Motion 13.1.0 | conditional                      |
| Complex motion  |                     GSAP 3.15.0 + adapter 2.1.2 | deferred                         |
| Browser tests   |                               Playwright 1.62.1 | selected                         |
| A11y            |                     @axe-core/playwright 4.13.0 | selected                         |
| Lab performance |                                     LHCI 0.15.1 | selected                         |
| Storybook       |                                               — | excluded initially               |

The foundation pins direct dependencies and `pnpm@10.34.5` in the manifest and lockfile.
Vercel's stable automatic pnpm support covers versions 6–10; pnpm 11 requires
experimental Corepack. The exact current `latest-10` line is therefore selected for the
deployment foundation. Motion and GSAP remain uninstalled conditional choices. Any
upgrade requires official support/release review and a fresh full gate run.

On WSL, an explicit Linux Chromium path still passed through `chrome-launcher`'s Win32
temporary-path conversion and created `C:\...` profile directories in the repository.
An intentional no-op `puppeteerScript` now activates LHCI's PuppeteerManager path; the
ignore pattern remains defense in depth. A fresh three-run LHCI assertion set passed and
no `C:*` directory recurred. This operational fix does not waive the separately recorded
LHCI dev-only dependency advisories.

## Key decisions

1. Mode C uses the supplied design; no exploratory generation is needed.
2. The PC reference is a 1200 px canvas, not a raster to stretch to 1440 px.
3. The SP reference is a 375 px independent composition; 390 and tablet behavior need
   approval.
4. Browser/guide layers are non-production.
5. Modal fidelity is blocked until clean PC/SP modal references exist.
6. NEWS placeholder copy and imagery do not ship.
7. Reference fidelity and implementation regression are separate gates.
8. Accessibility and approved copy/rights outrank pixel matching.
9. Vercel Preview must be protected; production is a human-authorized action.
10. A technical-candidate pass is evidence only; it requires a private hash-bound
    approval record and never authorizes deployment or human release.
11. Exact-frame landmark/region and modal coverage remain blocked until approved
    references and symmetric detectors exist; empty contracts cannot pass.
12. Pink annotation content is governed by `docs/design-annotation-ledger.md`: all 13
    stories/clusters are accounted for, implementation intent is preserved, guides are
    excluded from UI, and unresolved values keep Gate C blocked. The non-pink page-title
    candidate is not part of that ledger.
13. Fidelity evidence is an immutable hash chain from config and clean build/capture
    provenance through exact frame inputs, atomic comparison artifacts, executable
    detector/mask results, and concrete coverage observations. Labels and paths are
    normalized and non-clobbering; declarations or nonempty arrays never count as
    executed evidence. Missing references/detectors remain `UNAVAILABLE`. Per-frame
    evidence stays exclusive/non-clobbering; the single aggregate is a repeatable
    current-run index that reuses identical valid bytes or atomically replaces only a
    validated prior aggregate, so stale output cannot suppress Gate C diagnostics.
14. Capture publication is a separate fail-closed boundary: all deterministic paths are
    normalized and component-checked before browser work. Capture PNGs, provenance
    sidecars, and a `COMPLETE` manifest are same-directory fsynced/non-clobber published
    inside an opaque content-addressed run whose identity binds config, source, build,
    server, and capture environment. Identical runs reuse only identical bytes; an
    identity change creates a new immutable run and preserves prior runs. The aggregate
    pointer and preflight hash-bind the exact current run, so stale build/run evidence is
    rejected. Capture provenance schema v3 binds the actual hash to the explicit DOM
    observation result.
15. Coverage semantics are declared only by `semanticObservation`, never inferred from
    frame IDs or labels. Top/menu-open may use absolute `(0,0)`; chapter/footer frames
    require selector anchors with null absolute scroll. PASS evidence requires exactly
    one visible DOM target with positive bounds/intersection, exact expected attributes,
    and concrete executed landmark/region result IDs. Approved selectors/anchors/modal
    states do not yet exist, so Gate C/E remains blocked.

## Gate status

| Gate               | Status          | Reason                                                                                       |
| ------------------ | --------------- | -------------------------------------------------------------------------------------------- |
| A — truth          | BLOCKED         | local code-only baseline exists; copy, rights, NEWS, and destinations remain unresolved       |
| B — direction      | PARTIAL         | organic direction is supplied; no generated exploration required                             |
| C — measured spec  | BLOCKED         | modal, tablet/390 mapping, annotation parameters, type metrics, clean exports, approvals missing |
| D — implementation | FOUNDATION ONLY | application shell/config/gate harness exists; production UI absent                           |
| E — release        | BLOCKED         | configured gates are not passing evidence; live app, fidelity artifacts, and approval absent |

The strict Mode C audit initially reported no tracked files, no reference-fidelity
package surface, and no CI. After the foundation shell, package/Playwright/fidelity
harness, and CI workflow were added, the pre-baseline rerun reported **19 PASS, 0 WARN,
1 BLOCK** because `git.tracking` had no first commit. Local commit `c78be61` now
establishes the audited code-only baseline, and the fresh 2026-08-18 strict rerun reports
**20 PASS, 0 WARN, 0 BLOCK**. This is a project-structure audit result only. No push,
deployment, CI-run, trusted signer, or approved external-reference evidence exists, so
Gate C/E remain blocked.

## TODO

- Resolve every blocking item in `docs/open-questions.md`.
- Resolve every open value linked from `docs/design-annotation-ledger.md`; do not infer
  timing, easing, distance, target binding, or sticky/fixed behavior.
- Approve the sanitized provenance ledger and add rights evidence privately.
- Obtain clean source exports and finish measured typography/SP geometry.
- Exercise the configured CI/comparator gates and establish a protected Preview.
- Repeat live audit after a real deployment exists.

## Open questions

The authoritative list is `docs/open-questions.md`. Gate status must be updated here
whenever an answer changes architecture, content, rights, or acceptance.

## Changelog

### 2026-08-18

- Selected `image-to-code` Mode C and the organic editorial direction.
- Recorded the topographic-line/fixed-photo signature.
- Established the public code-only and private evidence/source boundary.
- Selected the static-first Next.js candidate stack.
- Recorded Gate A/C/E as blocked; no false closure.
- Added sanitized audit, provenance, invariant, implementation-spec, and open- question
  documents.
- Synchronized the ledger after the pinned foundation, application shell, gate harness,
  and CI workflow were added; production implementation and Gate C remain blocked.
- Selected exact pnpm 10.34.5 for Vercel's stable supported path; pnpm 11 experimental
  Corepack was rejected for this baseline.
- Recorded the WSL LHCI PuppeteerManager workaround and fresh no-recurrence evidence.
- Added three-viewport regression, deterministic capture provenance, true midpoint
  overlay testing, path-redacted fidelity artifacts, and explicit blocked coverage
  contracts without closing Gate C/E.
- Reconciled all 13 readable pink design stories/clusters into a sanitized stable-ID
  ledger and private source map: nine implementation instructions, four guide-only
  records, and one confirmed non-pink page-title exclusion.
- Hardened fidelity artifact identifiers, canonical path containment, symbolic-link and
  duplicate-destination rejection, and atomic non-clobbering output; defined the
  config/capture/comparison hash-chain manifest with explicit unavailable detector,
  mask, chapter, footer, and modal results.
- Made blocked fidelity reruns deterministic: valid identical aggregate bytes are
  reused and changed aggregate bytes atomically replace only the tool-owned aggregate;
  per-frame evidence remains non-clobbering.
- Hardened capture publication with pre-browser path/config validation, component-wise
  symlink and containment checks, buffered non-clobbering atomic publication, and
  identical-only rerun reuse for both PNG and provenance sidecar.
- Replaced name-based coverage meaning with explicit selector/anchor/expected-DOM
  observations and exact executed geometry-result bindings; unavailable chapter and
  modal contracts continue to block Gate C/E.
- Replaced fixed capture sidecars with opaque content-addressed immutable runs and a
  hash-bound `COMPLETE` run manifest; changed build provenance creates a new preserved
  run, identical reruns reuse exact bytes, and stale current-run pointers fail closed.
- Established local code-only baseline commit `c78be61`; a fresh strict Mode C audit
  reports 20 PASS, 0 WARN, and 0 BLOCK. No push or deployment occurred, and missing
  approved references, rights, signer/approval evidence, and CI execution keep Gate C/E
  blocked.
