# Technical-candidate evidence contract

Status: configured but blocked\
Authority: technical evidence only; never deployment or release authorization

## Gate order

`pnpm verify:technical-candidate` runs the foundation gates, deterministic capture,
comparison/evidence generation, and then `candidate:preflight`. The final preflight must
inspect already-produced evidence; configuration declarations cannot pass the gate.

Publishing, deployment, alias/domain changes, and production promotion require a
separate explicit human action.

## Measured configuration

`fidelity.config.json` schema v2 must map concrete frame IDs to the complete canonical
coverage matrix:

- desktop top/menu closed at 1440×900;
- desktop ROOT, DUSK, DAWN, ALPINE, and footer frames;
- tablet top/menu closed at 768×1024;
- mobile top/menu closed at 390×844;
- menu open at all three viewports.

Every label must be a unique safe basename. Every frame binds route, state, viewport,
capture mode, an immutable reference path, a deterministic `actualFile`, normalized
thresholds, and an immutable reference contract. `actualFile` is resolved only below the
current content-addressed capture run. A frame also has an explicit
`semanticObservation`; meaning is never
inferred from an ID or label. Top/menu-open observations may use absolute `(0,0)`.
ROOT/DUSK/DAWN/ALPINE/footer observations require a selector-anchor strategy and a null
absolute `scroll`, plus exact visible/state/DOM-attribute expectations. Landmark
contracts require a tracked executable detector identity/path/hash and thresholds.
Region contracts require an approved exact-size mask path/hash/dimensions and
thresholds. Observation bindings name concrete detector and mask result IDs. A `status`
string or nonempty array alone has no authority.

## Cryptographic approval

The private approval file remains
`.private/approvals/fidelity-approval.json`; its public schema is
`config/fidelity-approval.schema.json` schema v2. It contains a canonical JSON payload
and detached Ed25519 signature. The payload binds the current configuration hash,
private reference root, generated-actual root, every reference hash/dimension, and all
coverage IDs.

Signature verification uses an active public key with the
`fidelity-reference-approver` role in
`config/trusted-approval-signers.json`. The signer policy and configuration must exist
unchanged in the current clean revision. An unsigned record, an identity string, a
non-verified signature string, an untracked key, or an automation-authored assertion
cannot unlock the gate.

No trusted signer is enrolled in the current foundation. This intentionally keeps the
technical candidate blocked. Enrolling or rotating a signer requires protected human
review of the tracked signer policy; private signing keys never enter this repository.

## Machine evidence

The final aggregate is
`artifacts/fidelity/comparisons/fidelity-evidence-manifest.json`, schema v1. It must bind:

- current configuration SHA-256;
- current clean source revision and current `.next/BUILD_ID`;
- deterministic capture environment and Playwright-owned server contract;
- the current opaque capture-run ID and SHA-256 of its immutable `COMPLETE` manifest;
- every frame's exact reference/actual hashes and dimensions;
- a hashed capture-provenance sidecar tied to the same config, build, revision, browser,
  route, state, explicit scroll strategy, observed scroll, viewport, and server;
- a PASS DOM observation tied to the frame and actual hash: exactly one selector match,
  visible positive bounds/intersection, exact expected attributes, and concrete
  landmark/region result IDs;
- a hashed per-frame comparison report tied to the same inputs;
- numeric global metrics and all-PASS results;
- exact executed landmark detector and region-mask identities/hashes, numeric payloads,
  contract thresholds, and empty failure lists;
- every configured coverage item, all concrete frame and semantic-observation results,
  exact executed landmark/region result IDs, and no missing frames.

Capture output is restricted to deterministic PNG names below
`artifacts/fidelity/captures/runs/<run-id>/`. The opaque run ID is the SHA-256 of a
canonical identity containing the config hash, source revision/state, build ID, server
contract, and capture environment. All configured destinations are checked before
browser capture. Component-wise `lstat`/canonical containment rejects traversal,
absolute or NFKC-confusable values, non-directory parents, symbolic links, and duplicate
destinations. Playwright captures to memory; same-directory fsynced temporary files are
published without clobbering. The frame PNG, provenance sidecar, and final `COMPLETE`
run manifest are immutable. An identical run may reuse only byte-identical files;
different bytes block that run. A changed build or other identity input creates a new
run and leaves prior runs intact.

The aggregate manifest is the only refreshable current-run pointer. It binds the exact
run ID and run-manifest hash, and may be atomically replaced only after validating an
existing tool-owned aggregate. Preflight independently recomputes the current identity
and verifies aggregate pointer → run manifest → every actual/provenance path and hash.
A stale build, stale run, pointer swap, partial run, or mismatched manifest fails closed.

The Playwright server PID may be `null` only when the server is owned by Playwright,
reuse is disabled, command is exactly `corepack pnpm start:test`, origin is exactly
`http://127.0.0.1:4173`, and the sidecar records a nonempty PID limitation statement.
The gate never fabricates a PID.

Current comparison evidence is intentionally `UNAVAILABLE` because executable
detectors and approved masks do not exist. It cannot be promoted to PASS by changing a
declarative status.

## Public-repository policy

The public policy reads staged bytes from Git index blobs and separately scans untracked
and modified worktree evidence. A staged/worktree mismatch blocks the pre-commit gate.
It reads full permitted-size evidence, detects source-master and archive magic even
after renaming, rejects embedded or external image resources and active content in SVG,
and scans text for secret signatures, workstation paths, private raw identifiers,
contact patterns, and unusually large encoded payloads.

Only enumerated roots and file types are accepted. Binary files require an exact path
and SHA-256 allowlist entry. The current binary exception is restricted in code to
synthetic foundation PNG regression baselines under the test-snapshot root; it does not
authorize client production assets.

Automated scanning has semantic limits. It cannot prove that arbitrary prose is public,
prove copyright or model/property releases, recognize every obfuscation/encoding, or
replace original-detail inspection. Before any baseline, push, or release, a human must
review staged names and content, asset provenance/rights, copy/legal claims, and the
complete index diff. Protected review is part of the trust boundary, not an optional
follow-up.

## Current blockers

- no CI evidence for local code-only baseline commit `c78be61`;
- no trusted approval signer or valid signed reference manifest;
- no approved clean exact-frame PC/tablet/mobile/menu references;
- no concrete chapter/footer/menu-open frame matrix;
- no approved chapter/footer/modal selectors, selector anchors, or expected DOM states;
- no executable detector or approved mask contracts/results;
- no current-build aggregate evidence with every frame and coverage result passing.

Gate C and Gate E remain blocked.
