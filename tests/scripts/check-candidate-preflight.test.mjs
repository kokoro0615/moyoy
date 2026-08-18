import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign as createSignature } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import sharp from "sharp";

import {
  canonicalizeJson,
  validateSignedPayload,
  validateEvidenceFrame,
  verifySignedApproval,
} from "../../scripts/check-candidate-preflight.mjs";
import * as candidateContracts from "../../scripts/candidate-config-contract.mjs";
import {
  createCaptureRunIdentity,
  resolveCaptureRunPaths,
} from "../../scripts/fidelity-run-contract.mjs";

const { validateConfig } = candidateContracts;

const hashA = "a".repeat(64);
const hashB = "b".repeat(64);
const hashC = "c".repeat(64);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function createFrame(id, width, height, state = "menu-closed", semantic = "top") {
  const isTop = semantic === "top" || semantic === "menu-open";
  return {
    id,
    label: id,
    viewport: { width, height },
    route: "/",
    state: { id: state, setup: "none" },
    scroll: isTop ? { x: 0, y: 0 } : null,
    readiness: { selector: "main", images: "decode" },
    capture: { fullPage: false },
    reference: `.private/references/approved/${id}.png`,
    actualFile: `${id}.png`,
    approvalStatus: "approved",
    referenceContract: {
      status: "approved",
      sha256: hashA,
      width,
      height,
    },
    geometryContract: {
      status: "approved",
      landmarks: [
        {
          id: "hero-anchor",
          detector: {
            id: "hero-anchor-v1",
            path: "scripts/fidelity/detectors/hero-anchor.mjs",
            sha256: hashB,
          },
          thresholds: { maxDelta: 0 },
        },
      ],
      regions: [
        {
          id: "viewport-region",
          mask: {
            path: `.private/references/approved/masks/${id}.png`,
            sha256: hashC,
            width,
            height,
          },
          thresholds: { maxMae: 0 },
        },
      ],
    },
    semanticObservation: {
      id: `semantic-${id}`,
      semantic,
      status: "approved",
      selector: isTop ? "main" : `[data-fidelity-semantic="${semantic}"]`,
      scrollStrategy: isTop
        ? { kind: "absolute", x: 0, y: 0 }
        : {
            kind: "selector-anchor",
            block: "center",
            inline: "nearest",
            offsetX: 0,
            offsetY: 0,
          },
      expected: {
        visible: true,
        stateId: state,
        attributes: { "data-fidelity-semantic": semantic },
      },
      landmarkIds: ["hero-anchor"],
      regionIds: ["viewport-region"],
    },
    thresholds: {
      pixelThreshold: 0.04,
      maxAspectDelta: 0,
      maxMae: 0.02,
      maxDiffRatio: 0.02,
      maxEdgeMae: 0.03,
    },
  };
}

function createMeasuredConfig() {
  const frames = [
    createFrame("desktop-top", 1440, 900),
    createFrame("tablet-top", 768, 1024),
    createFrame("mobile-top", 390, 844),
    createFrame("desktop-root", 1440, 900, "menu-closed", "root"),
    createFrame("desktop-dusk", 1440, 900, "menu-closed", "dusk"),
    createFrame("desktop-dawn", 1440, 900, "menu-closed", "dawn"),
    createFrame("desktop-alpine", 1440, 900, "menu-closed", "alpine"),
    createFrame("desktop-footer", 1440, 900, "menu-closed", "footer"),
    createFrame("desktop-menu-open", 1440, 900, "menu-open", "menu-open"),
    createFrame("tablet-menu-open", 768, 1024, "menu-open", "menu-open"),
    createFrame("mobile-menu-open", 390, 844, "menu-open", "menu-open"),
  ];
  const byId = new Map(frames.map((frame) => [frame.id, frame]));
  const observationFor = (frameId) => {
    const frame = byId.get(frameId);
    return {
      id: `coverage-${frameId}`,
      status: "approved",
      frameId,
      semanticObservationId: frame.semanticObservation.id,
      semantic: frame.semanticObservation.semantic,
      landmarkResultIds: [...frame.semanticObservation.landmarkIds],
      regionResultIds: [...frame.semanticObservation.regionIds],
    };
  };
  const coverage = (id, frameIds) => ({
    id,
    status: "approved",
    frameIds,
    observations: frameIds.map(observationFor),
  });
  return {
    schemaVersion: 2,
    foundationOnly: false,
    approvalManifest: ".private/approvals/fidelity-approval.json",
    captureArtifacts: {
      schemaVersion: 1,
      runsRoot: "artifacts/fidelity/captures/runs",
      runManifestFile: "capture-run-manifest.json",
    },
    captureEnvironment: {
      colorScheme: "light",
      deviceScaleFactor: 1,
      locale: "ja-JP",
      timezoneId: "Asia/Tokyo",
    },
    frames,
    requiredCoverage: [
      coverage("desktop-top-menu-closed", ["desktop-top"]),
      coverage("desktop-root-dusk-dawn-alpine-footer", [
        "desktop-root",
        "desktop-dusk",
        "desktop-dawn",
        "desktop-alpine",
        "desktop-footer",
      ]),
      coverage("tablet-top-menu-closed", ["tablet-top"]),
      coverage("mobile-top-menu-closed", ["mobile-top"]),
      coverage("menu-open-all-viewports", [
        "desktop-menu-open",
        "tablet-menu-open",
        "mobile-menu-open",
      ]),
    ],
  };
}

function createSignedApproval(
  payload = {
    decision: "approved",
    approvalScope: "technical-fidelity-references",
    approvedAt: "2026-08-18T00:00:00.000Z",
    fidelityConfig: { path: "fidelity.config.json", sha256: hashA },
    referenceRoot: ".private/references/approved",
    actualRoot: "artifacts/fidelity/captures/runs",
    frames: [],
    requiredCoverage: [],
  },
) {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const payloadBytes = Buffer.from(canonicalizeJson(payload));
  const manifest = {
    schemaVersion: 2,
    payload,
    signature: {
      algorithm: "ed25519",
      signerId: "test-fidelity-approver",
      payloadSha256: sha256(payloadBytes),
      value: createSignature(null, payloadBytes, privateKey).toString("base64"),
    },
  };
  const policy = {
    schemaVersion: 1,
    requiredRole: "fidelity-reference-approver",
    signers: [
      {
        id: "test-fidelity-approver",
        algorithm: "ed25519",
        status: "active",
        roles: ["fidelity-reference-approver"],
        publicKeyPem: publicKey.export({ type: "spki", format: "pem" }),
      },
    ],
  };
  return { manifest, policy };
}

test("cryptographic approval verifies against a tracked trusted signer", () => {
  const { manifest, policy } = createSignedApproval();
  assert.deepEqual(verifySignedApproval(manifest, policy), []);
});

test("self-asserted approval is non-authoritative without a trusted signer", () => {
  const { manifest } = createSignedApproval();
  const errors = verifySignedApproval(manifest, {
    schemaVersion: 1,
    requiredRole: "fidelity-reference-approver",
    signers: [],
  });
  assert.ok(
    errors.includes("approval signer is not in the tracked trusted signer policy"),
  );
});

test("cryptographic approval rejects a payload changed after signing", () => {
  const { manifest, policy } = createSignedApproval();
  manifest.payload.approvedAt = "2026-08-19T00:00:00.000Z";
  const errors = verifySignedApproval(manifest, policy);
  assert.ok(errors.includes("approval signed payload SHA-256 is invalid or changed"));
  assert.ok(errors.includes("approval signature verification failed"));
});

test("one canonical approval satisfies the public schema and preflight payload contract", async () => {
  const root = await mkdtemp(join(tmpdir(), "moyoy-approval-contract-"));
  const config = createMeasuredConfig();
  const configBytes = Buffer.from(`${JSON.stringify(config, null, 2)}\n`);
  await writeFile(join(root, "fidelity.config.json"), configBytes);
  const payload = {
    decision: "approved",
    approvalScope: "technical-fidelity-references",
    approvedAt: "2026-08-18T00:00:00.000Z",
    fidelityConfig: {
      path: "fidelity.config.json",
      sha256: sha256(configBytes),
    },
    referenceRoot: ".private/references/approved",
    actualRoot: "artifacts/fidelity/captures/runs",
    frames: config.frames.map((frame) => ({
      id: frame.id,
      reference: frame.reference,
      sha256: frame.referenceContract.sha256,
      width: frame.viewport.width,
      height: frame.viewport.height,
    })),
    requiredCoverage: config.requiredCoverage.map((coverage) => coverage.id),
  };
  const { manifest, policy } = createSignedApproval(payload);
  const schema = JSON.parse(
    await readFile("config/fidelity-approval.schema.json", "utf8"),
  );
  const validator = new Ajv2020({ allErrors: true, strict: true });
  validator.addFormat("date-time", {
    type: "string",
    validate(value) {
      const timestamp = Date.parse(value);
      return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
    },
  });
  const validateSchema = validator.compile(schema);

  assert.equal(
    validateSchema(manifest),
    true,
    JSON.stringify(validateSchema.errors, null, 2),
  );
  assert.deepEqual(verifySignedApproval(manifest, policy), []);
  const runtimeErrors = [];
  await validateSignedPayload(root, config, manifest, runtimeErrors);
  assert.deepEqual(runtimeErrors, []);
});

test("measured config rejects traversal labels and declaration-only geometry", () => {
  const config = createMeasuredConfig();
  config.frames[0].label = "../overwrite";
  config.frames[0].geometryContract = {
    status: "approved",
    landmarks: [{ id: "dummy" }],
    regions: [{ id: "dummy" }],
  };
  const errors = [];
  validateConfig(config, errors);
  assert.ok(errors.some((error) => error.includes("safe basename")));
  assert.ok(errors.some((error) => error.includes("lacks executable detector")));
  assert.ok(
    errors.some((error) => error.includes("lacks an approved exact-size mask")),
  );
});

test("measured config rejects chapter coverage without every concrete state", () => {
  const config = createMeasuredConfig();
  config.requiredCoverage.find(
    (item) => item.id === "desktop-root-dusk-dawn-alpine-footer",
  ).frameIds = ["desktop-root"];
  const errors = [];
  validateConfig(config, errors);
  for (const token of ["dusk", "dawn", "alpine", "footer"]) {
    assert.ok(
      errors.includes(`desktop chapter coverage lacks concrete ${token} frame`),
    );
  }
});

test("measured config rejects semantic-looking chapter labels at absolute scroll zero", () => {
  const config = createMeasuredConfig();
  const chapterFrameIds = config.requiredCoverage.find(
    (item) => item.id === "desktop-root-dusk-dawn-alpine-footer",
  ).frameIds;
  for (const frame of config.frames.filter((item) =>
    chapterFrameIds.includes(item.id),
  )) {
    frame.scroll = { x: 0, y: 0 };
  }
  const errors = [];
  validateConfig(config, errors);
  for (const semantic of ["root", "dusk", "dawn", "alpine", "footer"]) {
    assert.ok(
      errors.some((error) =>
        error.includes(`${semantic} semantic frame scroll must be null`),
      ),
    );
  }
});

test("measured config requires selector anchors and concrete coverage result bindings", () => {
  const config = createMeasuredConfig();
  const rootFrame = config.frames.find((frame) => frame.id === "desktop-root");
  rootFrame.semanticObservation.scrollStrategy = { kind: "absolute", x: 0, y: 0 };
  rootFrame.semanticObservation.expected.visible = false;
  const chapterCoverage = config.requiredCoverage.find(
    (item) => item.id === "desktop-root-dusk-dawn-alpine-footer",
  );
  chapterCoverage.observations[0].landmarkResultIds = [];
  chapterCoverage.observations[0].semantic = "dusk";
  const errors = [];
  validateConfig(config, errors);
  assert.ok(errors.some((error) => error.includes("requires selector-anchor")));
  assert.ok(errors.some((error) => error.includes("expected.visible must be true")));
  assert.ok(errors.some((error) => error.includes("semantic binding does not match")));
  assert.ok(errors.some((error) => error.includes("result IDs must exactly match")));
});

test("measured config requires immutable capture artifacts and deterministic actualFile names", () => {
  const config = createMeasuredConfig();
  config.captureArtifacts = {
    schemaVersion: 1,
    runsRoot: "artifacts/fidelity/captures/runs",
    runManifestFile: "capture-run-manifest.json",
  };
  for (const frame of config.frames) {
    frame.actualFile = `${frame.label}.png`;
    delete frame.actual;
  }
  const validErrors = [];
  validateConfig(config, validErrors);
  assert.deepEqual(validErrors, []);

  config.frames[0].actualFile = "stale.png";
  config.frames[0].actual = "artifacts/fidelity/captures/stale.png";
  const errors = [];
  validateConfig(config, errors);
  assert.ok(errors.some((error) => error.includes("actualFile must equal its label")));
  assert.ok(errors.some((error) => error.includes("legacy actual path is forbidden")));
});

test("aggregate coverage requires exact PASS semantic observation results", () => {
  assert.equal(typeof candidateContracts.validateCoverageEvidence, "function");
  const config = createMeasuredConfig();
  const configErrors = [];
  const { coverageById, frameById } = validateConfig(config, configErrors);
  assert.deepEqual(configErrors, []);
  const coverage = coverageById.get("desktop-root-dusk-dawn-alpine-footer");
  const evidenceFrameById = new Map(
    coverage.frameIds.map((frameId) => {
      const frame = frameById.get(frameId);
      return [
        frameId,
        {
          semanticObservationResult: {
            id: frame.semanticObservation.id,
            semantic: frame.semanticObservation.semantic,
            status: "PASS",
            landmarkResultIds: [...frame.semanticObservation.landmarkIds],
            regionResultIds: [...frame.semanticObservation.regionIds],
            failures: [],
          },
          landmarkResults: frame.semanticObservation.landmarkIds.map((contractId) => ({
            contractId,
            status: "PASS",
          })),
          regionResults: frame.semanticObservation.regionIds.map((contractId) => ({
            contractId,
            status: "PASS",
          })),
        },
      ];
    }),
  );
  const result = {
    id: coverage.id,
    frameIds: [...coverage.frameIds],
    status: "PASS",
    failures: [],
    missingFrameIds: [],
    frameResults: coverage.frameIds.map((frameId) => ({ frameId, status: "PASS" })),
    observationResults: coverage.observations.map((binding) => ({
      ...binding,
      status: "PASS",
      failures: [],
    })),
  };
  const passingErrors = [];
  candidateContracts.validateCoverageEvidence(
    coverage,
    result,
    evidenceFrameById,
    passingErrors,
  );
  assert.deepEqual(passingErrors, []);

  result.observationResults[0].status = "UNAVAILABLE";
  result.observationResults[0].semantic = "dusk";
  result.observationResults[0].landmarkResultIds = ["not-executed"];
  const errors = [];
  candidateContracts.validateCoverageEvidence(
    coverage,
    result,
    evidenceFrameById,
    errors,
  );
  assert.ok(errors.some((error) => error.includes("observation did not PASS")));
  assert.ok(errors.some((error) => error.includes("observation binding changed")));
  assert.ok(errors.some((error) => error.includes("result IDs do not exactly")));
});

async function createEvidenceFixture() {
  const root = await mkdtemp(join(tmpdir(), "moyoy-evidence-"));
  const frame = createFrame("desktop-top", 10, 10);
  frame.referenceContract.width = 10;
  frame.referenceContract.height = 10;
  frame.reference = ".private/references/approved/desktop-top.png";
  const referencePath = join(root, frame.reference);
  await mkdir(dirname(referencePath), { recursive: true });
  await sharp({ create: { width: 10, height: 10, channels: 3, background: "#ddd" } })
    .png()
    .toFile(referencePath);
  const config = {
    sha256: hashA,
    captureArtifacts: {
      schemaVersion: 1,
      runsRoot: "artifacts/fidelity/captures/runs",
      runManifestFile: "capture-run-manifest.json",
    },
    captureEnvironment: {
      colorScheme: "light",
      deviceScaleFactor: 1,
      locale: "ja-JP",
      timezoneId: "Asia/Tokyo",
    },
    frames: [frame],
  };
  const source = { revision: "1".repeat(40), state: "clean" };
  const buildId = "test-build";
  const server = {
    command: "corepack pnpm start:test",
    origin: "http://127.0.0.1:4173",
    ownedByPlaywright: true,
    pid: null,
    pidEvidence: "Managed by Playwright; PID is not exposed to the test process.",
    reuseExistingServer: false,
  };
  const run = createCaptureRunIdentity({
    configSha256: config.sha256,
    source,
    build: { id: buildId },
    server,
    captureEnvironment: config.captureEnvironment,
  });
  const runPaths = resolveCaptureRunPaths(
    config.captureArtifacts,
    run,
    frame.actualFile,
  );
  const actualPath = join(root, runPaths.actual);
  await mkdir(dirname(actualPath), { recursive: true });
  await sharp({ create: { width: 10, height: 10, channels: 3, background: "#eee" } })
    .png()
    .toFile(actualPath);
  const reference = {
    path: frame.reference,
    sha256: sha256(await readFile(referencePath)),
    width: 10,
    height: 10,
  };
  const actual = {
    path: runPaths.actual,
    sha256: sha256(await readFile(actualPath)),
    width: 10,
    height: 10,
  };
  frame.referenceContract.sha256 = reference.sha256;
  const semanticObservationResult = {
    id: frame.semanticObservation.id,
    semantic: frame.semanticObservation.semantic,
    status: "PASS",
    selector: frame.semanticObservation.selector,
    scrollStrategy: frame.semanticObservation.scrollStrategy,
    expected: frame.semanticObservation.expected,
    observed: {
      selectorCount: 1,
      visible: true,
      bounds: { x: 0, y: 0, width: 10, height: 10 },
      viewportIntersection: { width: 10, height: 10 },
      scroll: { x: 0, y: 0 },
      attributes: frame.semanticObservation.expected.attributes,
    },
    landmarkResultIds: [...frame.semanticObservation.landmarkIds],
    regionResultIds: [...frame.semanticObservation.regionIds],
    failures: [],
  };
  const capture = {
    colorScheme: "light",
    deviceScaleFactor: 1,
    locale: "ja-JP",
    reducedMotion: "reduce",
    route: "/",
    scroll: frame.scroll,
    scrollStrategy: frame.semanticObservation.scrollStrategy,
    state: frame.state.id,
    timezoneId: "Asia/Tokyo",
    viewport: frame.viewport,
    fullPage: frame.capture.fullPage,
  };
  const browser = { name: "chromium", version: "test" };
  const sidecar = {
    version: 3,
    kind: "fidelity-capture-provenance",
    frameId: frame.id,
    frameLabel: frame.label,
    actualFile: frame.actualFile,
    actual: runPaths.actual,
    actualSha256: actual.sha256,
    browser,
    build: { id: buildId, sourceRevision: source.revision, sourceState: "clean" },
    capture,
    configSha256: config.sha256,
    run: { id: run.id, identity: run.identity },
    semanticObservationResult,
    server,
  };
  const provenancePath = runPaths.provenance;
  await writeFile(join(root, provenancePath), `${JSON.stringify(sidecar, null, 2)}\n`);
  const captureProvenance = {
    path: provenancePath,
    sha256: sha256(await readFile(join(root, provenancePath))),
    browser,
    configSha256: config.sha256,
    actualSha256: actual.sha256,
    build: { id: buildId },
    source,
    server,
    capture,
    semanticObservationResult,
  };
  const landmarkResults = [
    {
      contractId: "hero-anchor",
      detector: frame.geometryContract.landmarks[0].detector,
      reference: { x: 5, y: 5 },
      actual: { x: 5, y: 5 },
      thresholds: { maxDelta: 0 },
      status: "PASS",
      failures: [],
    },
  ];
  const regionResults = [
    {
      contractId: "viewport-region",
      mask: frame.geometryContract.regions[0].mask,
      reference: { mae: 0 },
      actual: { mae: 0 },
      thresholds: { maxMae: 0 },
      status: "PASS",
      failures: [],
    },
  ];
  const globalResult = {
    metrics: { mae: 0, diffRatio: 0 },
    status: "PASS",
    failures: [],
  };
  const report = {
    evidenceStatus: "PASS",
    failures: [],
    frameId: frame.id,
    configSha256: config.sha256,
    reference,
    actual,
    thresholds: frame.thresholds,
    globalResult,
    semanticObservationResult,
    landmarkResults,
    regionResults,
  };
  const reportPath = `artifacts/fidelity/comparisons/${frame.id}.json`;
  await mkdir(dirname(join(root, reportPath)), { recursive: true });
  await writeFile(join(root, reportPath), `${JSON.stringify(report, null, 2)}\n`);
  const evidenceFrame = {
    status: "PASS",
    failures: [],
    id: frame.id,
    label: frame.label,
    route: frame.route,
    state: frame.state,
    scroll: frame.scroll,
    viewport: frame.viewport,
    capture: frame.capture,
    reference,
    actual,
    captureProvenance,
    thresholds: frame.thresholds,
    globalResult,
    semanticObservationResult,
    comparisonArtifact: {
      path: reportPath,
      sha256: sha256(await readFile(join(root, reportPath))),
    },
    landmarkResults,
    regionResults,
  };
  const runManifest = {
    schemaVersion: 1,
    kind: "fidelity-capture-run-manifest",
    status: "COMPLETE",
    run: { id: run.id, identity: run.identity },
    config: { path: "fidelity.config.json", sha256: config.sha256 },
    source,
    build: { id: buildId },
    server,
    captureEnvironment: config.captureEnvironment,
    frames: [
      {
        id: frame.id,
        label: frame.label,
        actual: { path: actual.path, sha256: actual.sha256 },
        provenance: {
          path: captureProvenance.path,
          sha256: captureProvenance.sha256,
        },
      },
    ],
    failures: [],
  };
  await writeFile(
    join(root, runPaths.manifest),
    `${JSON.stringify(runManifest, null, 2)}\n`,
  );
  const captureRun = {
    id: run.id,
    manifest: {
      path: runPaths.manifest,
      sha256: sha256(await readFile(join(root, runPaths.manifest))),
    },
  };
  return {
    actualPath,
    buildId,
    captureRun,
    config,
    evidenceFrame,
    evidenceFrameById: new Map([[frame.id, evidenceFrame]]),
    frame,
    root,
    runManifest,
    server,
    source,
  };
}

test("capture run evidence accepts only the current identity and build", async () => {
  assert.equal(typeof candidateContracts.validateCaptureRunEvidence, "function");
  const fixture = await createEvidenceFixture();
  const errors = [];
  candidateContracts.validateCaptureRunEvidence(
    {
      captureRun: fixture.captureRun,
      config: fixture.config,
      configSha256: fixture.config.sha256,
      source: fixture.source,
      build: { id: fixture.buildId },
      server: fixture.server,
      runManifest: fixture.runManifest,
      evidenceFrameById: fixture.evidenceFrameById,
    },
    errors,
  );
  assert.deepEqual(errors, []);

  const staleErrors = [];
  candidateContracts.validateCaptureRunEvidence(
    {
      captureRun: fixture.captureRun,
      config: fixture.config,
      configSha256: fixture.config.sha256,
      source: fixture.source,
      build: { id: "different-build" },
      server: fixture.server,
      runManifest: fixture.runManifest,
      evidenceFrameById: fixture.evidenceFrameById,
    },
    staleErrors,
  );
  assert.ok(staleErrors.some((error) => error.includes("current capture run ID")));
  assert.ok(staleErrors.some((error) => error.includes("current build")));

  const pointerErrors = [];
  candidateContracts.validateCaptureRunEvidence(
    {
      captureRun: {
        ...fixture.captureRun,
        manifest: {
          ...fixture.captureRun.manifest,
          path: `artifacts/fidelity/captures/runs/${"0".repeat(64)}/capture-run-manifest.json`,
        },
      },
      config: fixture.config,
      configSha256: fixture.config.sha256,
      source: fixture.source,
      build: { id: fixture.buildId },
      server: fixture.server,
      runManifest: fixture.runManifest,
      evidenceFrameById: fixture.evidenceFrameById,
    },
    pointerErrors,
  );
  assert.ok(pointerErrors.some((error) => error.includes("manifest pointer")));
});

test("machine evidence binds the exact actual image and executed results", async () => {
  const fixture = await createEvidenceFixture();
  const errors = [];
  await validateEvidenceFrame(
    fixture.root,
    fixture.config,
    fixture.source,
    fixture.buildId,
    fixture.frame,
    fixture.evidenceFrame,
    errors,
  );
  assert.deepEqual(errors, []);

  await writeFile(fixture.actualPath, "tampered actual");
  const tamperedErrors = [];
  await validateEvidenceFrame(
    fixture.root,
    fixture.config,
    fixture.source,
    fixture.buildId,
    fixture.frame,
    fixture.evidenceFrame,
    tamperedErrors,
  );
  assert.ok(tamperedErrors.some((error) => error.includes("actual SHA-256 changed")));
});

test("machine evidence rejects missing executed detector results", async () => {
  const fixture = await createEvidenceFixture();
  fixture.evidenceFrame.landmarkResults = [];
  const errors = [];
  await validateEvidenceFrame(
    fixture.root,
    fixture.config,
    fixture.source,
    fixture.buildId,
    fixture.frame,
    fixture.evidenceFrame,
    errors,
  );
  assert.ok(errors.some((error) => error.includes("landmark result IDs")));
});

test("machine evidence requires an observed PASS semantic contract and exact result IDs", async () => {
  const fixture = await createEvidenceFixture();
  fixture.evidenceFrame.semanticObservationResult.status = "FAIL";
  fixture.evidenceFrame.semanticObservationResult.observed.selectorCount = 2;
  fixture.evidenceFrame.semanticObservationResult.observed.attributes = {
    "data-fidelity-semantic": "wrong",
  };
  fixture.evidenceFrame.semanticObservationResult.landmarkResultIds = ["not-executed"];
  const errors = [];
  await validateEvidenceFrame(
    fixture.root,
    fixture.config,
    fixture.source,
    fixture.buildId,
    fixture.frame,
    fixture.evidenceFrame,
    errors,
  );
  assert.ok(
    errors.some((error) => error.includes("semantic observation did not PASS")),
  );
  assert.ok(errors.some((error) => error.includes("selectorCount must equal 1")));
  assert.ok(errors.some((error) => error.includes("observed attributes do not match")));
  assert.ok(
    errors.some((error) => error.includes("semantic result IDs do not exactly")),
  );
});

test("machine evidence rejects unavailable aggregate and comparison status", async () => {
  const fixture = await createEvidenceFixture();
  fixture.evidenceFrame.status = "UNAVAILABLE";
  const reportPath = join(fixture.root, fixture.evidenceFrame.comparisonArtifact.path);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  report.evidenceStatus = "UNAVAILABLE";
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  fixture.evidenceFrame.comparisonArtifact.sha256 = sha256(await readFile(reportPath));
  const errors = [];
  await validateEvidenceFrame(
    fixture.root,
    fixture.config,
    fixture.source,
    fixture.buildId,
    fixture.frame,
    fixture.evidenceFrame,
    errors,
  );
  assert.ok(
    errors.some((error) => error.includes("aggregate frame evidence did not PASS")),
  );
  assert.ok(
    errors.some((error) => error.includes("comparison artifact does not bind")),
  );
});
