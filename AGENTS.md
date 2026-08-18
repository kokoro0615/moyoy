# AGENTS.md — MOYOY repository contract

## Scope and repository state

- This directory is an independent Git repository with a public remote.
- The project is in foundation/specification state. A pinned package manifest, lockfile,
  foundation application shell, configuration, gate scripts/tests, and CI workflow
  exist; the approved MOYOY production UI and a committed baseline do not.
- Use `image-to-code` Mode C. The supplied PC/SP design is the visual reference; do not
  generate a replacement direction.

## Privacy boundary

- Public Git is code and sanitized documentation only.
- Never stage, commit, push, upload, or deploy `20260818_web/**`, `.private/**`,
  AI/EPS/PDF masters, full-resolution sources, complete audits, private copy, sensitive
  metadata, or rights documents.
- Do not put private source paths, device identifiers, or unapproved contact copy in
  tracked docs, logs, fixtures, screenshots, or test artifacts.
- Production assets must be approved derivatives listed in `docs/asset-provenance.csv`.
  `pending-rights`, `placeholder`, and `exclude` items cannot ship.
- Publishing, deployment, alias/domain changes, and production promotion require
  explicit human approval.

## Source of truth

Resolve conflicts in this order:

1. approved requirements, copy, legal text, and rights;
2. `docs/functional-invariants.md` and resolved open questions;
3. `docs/moyoy-implementation-spec.md`;
4. approved clean PC/SP/modal references;
5. repository conventions and implementation judgment.

Browser/guide layers and NEWS placeholders are not production truth. Modal, rights,
fonts, NEWS behavior, and breakpoints are blocked until approved.

## Selected architecture

- Static-first Next.js App Router with Server Components for core content.
- React client islands only for approved state or motion.
- Tailwind/CSS tokens for layout; CSS owns ordinary motion.
- Motion or GSAP is conditional and must have one named responsibility.
- Raw conversion happens before build; never process client masters in runtime
  functions.
- Direct dependencies, package manager, browsers, and runtime must be exact pinned with
  a committed lockfile.

The pinned versions and conditional dependencies are recorded in
`.Codex/docs/research/stack-decision.md`. Recheck official support and release notes
before any deliberate upgrade; never update them incidentally.

## Required workflow

1. Read both DESIGN ledgers, `docs/design-annotation-ledger.md`, and the open-question,
   invariant, provenance, and measured-spec documents.
2. Run the strict Mode C project audit with `--require-reference-diff` before production
   UI edits.
3. Do not code past Gate C while reference scale, modal, responsive framing, typography,
   or thresholds are unresolved.
4. Keep semantic HTML and approved copy separate from decorative SVG/images.
5. Compare external reference and current production-build capture at 1440×900,
   768×1024, and 390×844. Keep regression snapshots separate.
6. Record every intentional visual or accessibility deviation before approval.

## Scripts and gates

Use only the scripts present in `package.json`:

- `pnpm check:runtime`
- `pnpm policy:public`
- `pnpm policy:staged`
- `pnpm audit:production`
- `pnpm audit:development`
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:unit`
- `pnpm build`
- `pnpm test:e2e`
- `pnpm test:a11y`
- `pnpm test:visual`
- `pnpm capture:fidelity`
- `pnpm test:fidelity`
- `pnpm test:lhci`
- `pnpm candidate:preflight`
- `pnpm verify:foundation`
- `pnpm verify:technical-candidate`

Configuration is not evidence of passage. Report a gate as passed only from a fresh
complete run; external-reference fidelity still requires approved target artifacts and
Gate C approval.

`candidate:preflight` and `verify:technical-candidate` are technical evidence checks.
Their success never authorizes publishing, deployment, alias changes, production
promotion, or human release approval. The preflight requires a private explicit or
signed approval manifest bound to immutable reference/configuration hashes.
The complete contract is `docs/technical-candidate-contract.md`.

Release requires configured and passing equivalents of:

- format check;
- lint with zero warnings;
- typecheck;
- unit/invariant tests;
- production build;
- Playwright E2E in Chromium, Firefox, and WebKit;
- axe plus manual WCAG 2.2 AA review;
- external-reference fidelity;
- approved-implementation visual regression;
- performance budgets.

If lint, typecheck, unit, Playwright, axe, fidelity, visual, or build is absent, Gate E
remains blocked unless a human accepts a documented exception and risk.

## Asset and accessibility rules

- Color-manage approved chapter photos to sRGB, strip private metadata, never upscale,
  and create art-directed responsive variants.
- Use licensed webfont delivery only; never extract embedded font binaries.
- One measured LCP candidate may preload; all media need dimensions and correct `sizes`.
- Target WCAG 2.2 AA, keyboard-safe modal behavior, logical focus, 200%/400% reflow,
  visible focus, and reduced-motion fallbacks.

## Documentation

- Record architecture or implementation decisions in both `.Codex/docs/DESIGN.md` and
  `.claude/docs/DESIGN.md`, with a dated changelog.
- Keep `docs/open-questions.md` and Gate tables current.
- User-facing handoff is Japanese; code, identifiers, and technical artifacts may use
  English.
