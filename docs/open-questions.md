# Open questions and blockers

Status: blocks Gate A/C unless noted

Annotation-linked questions below use stable IDs from the
[design annotation ledger](design-annotation-ledger.md). The safe default is not an
approval and does not convert qualitative notes into measurable values.

| ID   | Decision needed                                                                                              | Owner                        | Gate impact  | Safe default                                         |
| ---- | ------------------------------------------------------------------------------------------------------------ | ---------------------------- | ------------ | ---------------------------------------------------- |
| Q-01 | Approve the exact public copy, prices, legal/footer details, and copyright year                              | Client/content owner         | Gate A       | keep private; do not publish                         |
| Q-02 | Reconcile DA-NEWS-01/02: is NEWS removed entirely for launch, or which exact two approved contents are hidden? | Product owner                | Gate A/C     | omit NEWS implementation or keep feature-flagged off |
| Q-03 | Provide PC and SP modal exports, natural dimensions, destinations, and open/close behavior                   | Designer/product owner       | Gate C       | do not guess modal fidelity                          |
| Q-04 | Confirm owner/license/web-use scope for four chapter photos, five NEWS images, logo, illustrations, and copy | Rights owner                 | Gate A/E     | no public derivative                                 |
| Q-05 | Resolve DA-ASSET-01: confirm licensed font delivery, domains, fallback policy, role mapping, and each asset's 2× raster/SVG choice | Client/design owner          | Gate C/E     | do not redistribute font files or infer derivatives  |
| Q-06 | Approve the tablet composition and content-stress breakpoint between 1200 px PC and 375 px SP                | Designer                     | Gate C       | no production UI implementation                      |
| Q-07 | Resolve DA-LAYOUT-01: identify the centered target and approve the wide-desktop line anchor, trigger, extension, and full-bleed behavior | Designer                     | Gate C       | contain to the 1200 px canvas                        |
| Q-08 | Resolve DA-MOTION-01–03/DA-MEDIA-01: approve targets, geometry, distance, triggers, timing/easing, platform behavior, fixed/sticky technique, and reduced-motion substitutes | Designer/accessibility owner | Gate C/E     | static composition                                   |
| Q-09 | Define fragrance and legal/shop/social link destinations and missing-route behavior                          | Product owner                | Gate A/D     | render no dead links                                 |
| Q-10 | Confirm supported Safari/iOS versions; is Safari earlier than 16.4 required?                                 | Technical owner              | Bootstrap    | do not assume Tailwind 4 compatibility               |
| Q-11 | Confirm Vercel team/scope, project, commercial plan, protected Preview, and intended hostname                | Deployment owner             | Gate E       | do not deploy or change aliases                      |
| Q-12 | Approve analytics/consent/Speed Insights and privacy disclosures                                             | Product/legal owner          | Gate A/E     | no analytics                                         |
| Q-13 | Approve metadata, canonical host, robots policy, social image, and structured data                           | Content/SEO owner            | Gate A/E     | Preview noindex; production blocked                  |
| Q-14 | Confirm whether a form, CMS, or localization is in scope                                                     | Product owner                | Architecture | static content only                                  |
| Q-15 | Nominate the Gate C/reference approver and choose explicit-record or detached-signature approval evidence   | Client/technical owner       | Gate C/E     | technical-candidate preflight remains blocked        |
| Q-16 | Resolve DA-NAV-01: approve SP menu fixed/sticky technique, top/safe-area offset, trigger, height, stacking, focus-obstruction, and modal interaction | Designer/accessibility owner | Gate C/E     | keep the control reachable without claiming fidelity |
| Q-17 | Approve exact ROOT/DUSK/DAWN/ALPINE/footer/menu selectors, selector-anchor alignment/offsets, expected DOM state attributes, and their landmark/region result IDs | Designer/technical owner    | Gate C/E     | semantic evidence remains unavailable                |

Resolution protocol:

1. Record the answer in both DESIGN ledgers.
2. Update the invariant ledger and measured implementation specification.
3. Update asset provenance when rights or delivery changes.
4. Close a Gate only when all required evidence is present; do not reinterpret a safe
   default as approval.
