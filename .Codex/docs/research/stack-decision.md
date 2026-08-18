# Stack decision — MOYOY LP

Decision date: 2026-08-18\
Decision status: foundation pinned; production design implementation not started\
Workflow: `image-to-code` Mode C

## Selected baseline

Use a static-first Next.js App Router application with React client islands only where
interaction or approved motion requires browser runtime.

| Area             |                                   Selected baseline | Policy                                                               |
| ---------------- | --------------------------------------------------: | -------------------------------------------------------------------- |
| Local/CI runtime |                                 Node.js 24.19.0 LTS | exact local and CI pin; Vercel uses `24.x` and logs the actual patch |
| Package manager  |                                         pnpm 10.34.5 | exact `latest-10`; stable Vercel-supported path                      |
| Framework        |                                      Next.js 16.3.1 | App Router; server/static rendering first                            |
| UI runtime       |                            React / React DOM 19.2.8 | same exact patch                                                     |
| Styling          | Tailwind CSS 4.3.3 + adapter 4.3.3 + PostCSS 8.5.26 | semantic tokens plus measured CSS; no CSS-in-JS                      |
| Raster pipeline  |                                        Sharp 0.35.3 | intake/build-time conversion, not request-time source conversion     |
| Default motion   |                                       Motion 13.1.0 | add only for approved component motion                               |
| Complex motion   |                         GSAP 3.15.0 + adapter 2.1.2 | conditional; only for authored timeline/scrub/pin/vector needs       |
| Browser/E2E      |                                   Playwright 1.62.1 | Chromium, Firefox, WebKit; matching browser binaries                 |
| Automated a11y   |                       `@axe-core/playwright` 4.13.0 | material states, separate from manual WCAG review                    |
| Lab performance  |                                         LHCI 0.15.1 | log the bundled Lighthouse version                                   |
| Hosting          |                            Vercel Pro or Enterprise | commercial client project; protected Preview                         |

The manifest and lockfile now pin the foundation dependencies above, except Motion and
GSAP, which remain uninstalled conditional choices. Node 24.19.0 is pinned locally while
the package and deployment contract use `24.x`. The package manager is exact-pinned to
pnpm 10.34.5. A foundation application shell exists; the approved design-led production
UI does not. Deliberate upgrades require official support and release review plus a
fresh full gate run.

## Package-manager and CI decision

Vercel's [package-manager support](https://vercel.com/docs/package-managers) provides a
stable automatic pnpm path through v10. Its
[build configuration documentation](https://vercel.com/docs/builds/configure-a-build)
requires `ENABLE_EXPERIMENTAL_COREPACK=1` to honor a newer exact `packageManager` value
through Corepack and warns that this path is experimental. We therefore selected the
current exact `latest-10`, pnpm 10.34.5, instead of pnpm 11 for this public deployment
foundation.

The official [`pnpm/action-setup` migration
guide](https://github.com/pnpm/action-setup/blob/master/README.md) now directs pnpm 11+
projects to [`pnpm/setup`](https://github.com/pnpm/setup), while retaining
`pnpm/action-setup` for pnpm 10 and older. Because this project deliberately uses pnpm
10, the existing SHA-pinned `pnpm/action-setup` v6 workflow remains the supported action
family. Runtime checks compare the complete version rather than only the major.

## Why Next.js

- Vercel build/deploy integration and protected Preview workflow;
- static Server Component output for the landing page;
- `next/image`, metadata primitives, and local-font integration;
- room for a future form/API without changing the rendering model;
- React-compatible interaction/motion where required.

Framework choice does not create visual fidelity. Fidelity comes from the measured
implementation specification, licensed assets, deterministic capture, and
external-reference comparison.

## Rendering boundaries

- `app/page.tsx` should remain a Server Component and statically render the approved
  copy, section order, SEO metadata, and asset descriptors.
- Keep cookies, request headers, clocks, and other dynamic inputs out of `/` unless a
  product requirement is approved.
- Limit client components to navigation/modal behavior, approved motion, analytics
  consent, or future form state.
- Do not make hero HTML, LCP imagery, or core copy depend on hydration.
- Do not default to `output: "export"`; reconsider it only if a fully static hosting
  contract is confirmed.

## CSS and motion ownership

CSS owns layout, typography, responsive flow, focus/hover states, short transitions, and
decorative keyframes. Motion may own presence/gesture/in-view behavior. GSAP may own a
complex authored timeline only after its need and license are approved. Two systems must
never animate the same property.

The supplied behavior notes call for contour-line parallax, slow scroll-offset objects,
a repeating scroll indicator, and fixed chapter photography. These are requirements to
specify—not permission to add a motion dependency. All content and navigation must
remain usable under `prefers-reduced-motion: reduce`.

## Asset and font pipeline

- Raw AI/EPS/PDF, private evidence, and full-resolution masters stay outside `public/`,
  Git, and Vercel upload.
- Convert approved CMYK photographs through the embedded profile to sRGB before
  producing AVIF/WebP/JPEG derivatives; normalize orientation and strip private
  metadata.
- Use distinct desktop/mobile crops when the approved references require them.
- Use clean SVG for logo, contour, and product line art.
- Use only licensed WOFF2 through `next/font/local` or an approved hosted font project;
  never extract font binaries from design files.
- Record every derivative's dimensions, bytes, hash, role, owner, license, loading
  strategy, and alt intent.

## Quality-gate contract

The repository exposes pinned scripts for runtime, public-repository policy, production
dependency audit, format, lint, typecheck, unit, production build, Playwright
E2E/axe/visual/capture, external-reference fidelity, and LHCI.
`verify:foundation` composes the technical foundation checks;
`verify:technical-candidate` adds the hash-bound approval preflight and reference
comparison. A technical-candidate result is evidence only and never authorizes
deployment or human release. Presence is not passage: no result is reported as passing
here.

Reference fidelity and visual regression are separate:

- reference fidelity compares the supplied external design with a deterministic
  current-build capture;
- regression compares an already approved implementation golden with later captures.

The first implementation screenshot cannot prove fidelity by comparing to itself.

## Alternatives

- Astro remains a fallback only if the application is confirmed overwhelmingly static,
  material client state is minimal, and the owner prefers its adapter model.
- Pure HTML/CSS/JS remains a fallback only for a frozen single route with almost no
  client state and a team willing to own the entire asset/test pipeline.
- Storybook is excluded initially; reconsider only if reusable component states
  materially outgrow route-level fixtures.
- GSAP is excluded initially pending an approved complex-motion specification.

## Browser and release assumptions

Tailwind 4's supported-browser floor includes Safari 16.4+. A stricter legacy Safari
requirement must be decided before bootstrap and may change the CSS choice. Playwright
WebKit is required but does not replace final macOS Safari and iPhone Safari checks.

Initial performance goals are Lighthouse performance ≥0.90 and Core Web Vitals budgets
of LCP ≤2.5 s, CLS ≤0.1, and lab TBT ≤200 ms, while field INP targets ≤200 ms at the
75th percentile. These are release goals, not current results.

## Dev-tool advisory disposition

Fresh `pnpm audit --prod --json` reported zero production advisories. The full audit
reported two high, one moderate, and one low advisory, all reachable only through the
dev-only `@lhci/cli@0.15.1` graph:

- `tmp@0.0.33/0.1.0`: [symlink write](https://github.com/advisories/GHSA-52f5-9888-hmc6)
  and [path traversal](https://github.com/advisories/GHSA-ph9p-34f9-6g65). LHCI's
  `autorun` path receives trusted repository configuration; the observed direct call
  uses a constant postfix, not user input.
- `uuid@8.3.2`: [bounds check issue](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
  affects v3/v5/v6 with a supplied buffer; LHCI uses `uuid.v4()` without a buffer.
- `extract-zip@2.0.1`: [symlink path traversal](https://github.com/advisories/GHSA-jmr9-qjv8-65gv)
  sits below Puppeteer's optional browser-download path. This project launches the
  Playwright-managed Chromium binary and does not invoke that downloader during LHCI.

The exposure is build/CI-only and not in the shipped Next.js graph, but it remains an
open supply-chain exception. No safe complete override was applied: LHCI's constraints
exclude patched `tmp`/`uuid` majors, and the advisory's patched `extract-zip@2.0.2` is not
published in the npm registry. Re-evaluate an upstream LHCI/Lighthouse release; do not
silence the full audit or force incompatible transitive overrides.

## Current blockers

- no tracked first-commit baseline; the CI workflow has no run evidence and the
  comparator harness has no approved target/current capture pair yet;
- modal, NEWS behavior, breakpoints, approved copy, and asset/font rights open;
- Vercel project/scope and protected Preview not established;
- production UI, clean public derivatives, and release evidence are absent.

Gate impact: architecture is decided, but Gate A, Gate C, and Gate E remain blocked.
