#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import { constants, createReadStream } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  unlink,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";

import {
  createCaptureRunIdentity,
  resolveCaptureRunPaths,
  validateCaptureArtifactContract,
} from "./fidelity-run-contract.mjs";

const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256 = /^[a-f0-9]{64}$/;
const SERVER = {
  command: "corepack pnpm start:test",
  origin: "http://127.0.0.1:4173",
  ownedByPlaywright: true,
  pid: null,
  pidEvidence: "Playwright does not expose the owned webServer PID to test code.",
  reuseExistingServer: false,
};
const args = parseArguments(process.argv.slice(2));
const root = await realpath(resolve(args.root ?? process.cwd()));
const configFile = await resolveExistingFile(root, "fidelity.config.json", "config");
const configBytes = await readFile(configFile.absolute);
const configSha256 = sha256Buffer(configBytes);
let config;
try {
  config = JSON.parse(configBytes.toString("utf8"));
} catch {
  fail("fidelity.config.json is invalid JSON");
}

const manifestLogicalPath = normalizeRelativePath(
  config.evidenceContract?.manifest ??
    "artifacts/fidelity/comparisons/fidelity-evidence-manifest.json",
  "evidence manifest",
);
const outputDirectory = await prepareOutputDirectory(
  root,
  dirname(manifestLogicalPath),
);
const manifestLeaf = posix.basename(manifestLogicalPath);
const blockers = validateConfig(config);
const source = readSource(root);
const build = { id: await readOptionalText(resolve(root, ".next/BUILD_ID")) };
let captureRun = null;
let captureRunEvidence = null;
try {
  validateCaptureArtifactContract(config.captureArtifacts);
  const identity = createCaptureRunIdentity({
    build,
    captureEnvironment: config.captureEnvironment,
    configSha256,
    server: SERVER,
    source,
  });
  const paths = (config.frames ?? []).map((frame) => ({
    frame,
    ...resolveCaptureRunPaths(config.captureArtifacts, identity, frame.actualFile),
  }));
  captureRun = { identity, paths };
  captureRunEvidence = await readAndValidateCaptureRun({
    build,
    config,
    configSha256,
    identity,
    paths,
    source,
  });
} catch (error) {
  blockers.push(
    error instanceof Error
      ? error.message
      : "current immutable capture run is unavailable",
  );
}

if (blockers.length > 0) {
  const manifest = createUnavailableManifest({
    blockers,
    build,
    config,
    configSha256,
    captureRun,
    captureRunEvidence,
    source,
  });
  await publishAggregateManifest(
    outputDirectory.absolute,
    manifestLeaf,
    Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`),
  );
  printBlocked(blockers);
  process.exit(1);
}

const comparisonDirectory = await prepareOutputDirectory(
  root,
  `${outputDirectory.logical}/runs/${captureRun.identity.id}`,
);
const frameEvidence = [];
for (const frame of config.frames) {
  const runPaths = captureRun.paths.find((item) => item.frame.id === frame.id);
  if (!runPaths) fail(`${frame.id} is missing from the current capture run`);
  const provenance = await readAndValidateProvenance(
    frame,
    config,
    configSha256,
    captureRun.identity,
    runPaths,
  );
  const result = spawnSync(
    process.execPath,
    [
      resolve(root, "scripts/visual-fidelity.mjs"),
      "--root",
      root,
      "--reference",
      frame.reference,
      "--actual",
      runPaths.actual,
      "--label",
      frame.label,
      "--frame-id",
      frame.id,
      "--config-sha256",
      configSha256,
      "--out",
      comparisonDirectory.logical,
      "--pixel-threshold",
      String(frame.thresholds.pixelThreshold),
      "--max-aspect-delta",
      String(frame.thresholds.maxAspectDelta),
      "--max-mae",
      String(frame.thresholds.maxMae),
      "--max-diff-ratio",
      String(frame.thresholds.maxDiffRatio),
      "--max-edge-mae",
      String(frame.thresholds.maxEdgeMae),
    ],
    { cwd: root, encoding: "utf8" },
  );
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.status !== 0) process.exit(result.status ?? 1);

  const comparisonLogicalPath = `${comparisonDirectory.logical}/${frame.label}-evidence.json`;
  const comparisonFile = await resolveExistingFile(
    root,
    comparisonLogicalPath,
    `${frame.id} comparison evidence`,
  );
  const comparisonBytes = await readFile(comparisonFile.absolute);
  const comparison = JSON.parse(comparisonBytes.toString("utf8"));
  frameEvidence.push(
    validateAndComposeFrameEvidence({
      comparison,
      comparisonLogicalPath,
      comparisonSha256: sha256Buffer(comparisonBytes),
      frame,
      provenance,
      runPaths,
    }),
  );
}

const coverage = composeCoverage(config.requiredCoverage, frameEvidence);
const runFailures = [
  ...frameEvidence.flatMap((frame) =>
    frame.failures.map((failure) => `${frame.id}: ${failure}`),
  ),
  ...coverage.flatMap((item) =>
    item.failures.map((failure) => `${item.id}: ${failure}`),
  ),
];
const firstProvenance = frameEvidence[0]?.captureProvenance;
const manifest = {
  schemaVersion: 1,
  kind: "fidelity-evidence-manifest",
  status: runFailures.length === 0 ? "PASS" : "UNAVAILABLE",
  config: { path: "fidelity.config.json", sha256: configSha256 },
  source: firstProvenance?.source ?? source,
  build: firstProvenance?.build ?? build,
  server: firstProvenance?.server ?? null,
  captureEnvironment: config.captureEnvironment,
  captureRun: captureRunEvidence,
  frames: frameEvidence,
  requiredCoverage: coverage,
  failures: runFailures,
};
await publishAggregateManifest(
  outputDirectory.absolute,
  manifestLeaf,
  Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`),
);
if (manifest.status !== "PASS") {
  printBlocked(runFailures);
  process.exit(1);
}
process.stdout.write(`Fidelity evidence manifest: ${manifestLogicalPath}\n`);

function validateConfig(value) {
  const errors = [];
  if (value.schemaVersion !== 2)
    errors.push("fidelity.config.json must use schemaVersion=2");
  if (value.foundationOnly !== false) {
    errors.push("external-reference fidelity cannot pass while foundationOnly=true");
  }
  if (value.evidenceContract?.status !== "approved") {
    errors.push("machine evidence contract is unavailable");
  }
  try {
    validateCaptureArtifactContract(value.captureArtifacts);
  } catch (error) {
    errors.push(error.message);
  }
  const frames = Array.isArray(value.frames) ? value.frames : [];
  if (frames.length === 0) errors.push("fidelity frame contract is missing");
  const ids = new Set();
  const labels = new Set();
  const destinations = new Set();
  for (const frame of frames) {
    validateId(frame.id, "frame id", errors);
    validateId(frame.label, `${frame.id} label`, errors);
    if (frame.actualFile !== `${frame.label}.png`) {
      errors.push(`${frame.id} actualFile must equal its deterministic label PNG`);
    }
    if (ids.has(frame.id)) errors.push(`duplicate fidelity frame id: ${frame.id}`);
    if (labels.has(frame.label))
      errors.push(`duplicate fidelity artifact label: ${frame.label}`);
    ids.add(frame.id);
    labels.add(frame.label);
    for (const suffix of [
      "overlay.png",
      "difference.png",
      "side-by-side.png",
      "evidence.json",
    ]) {
      const destination = `${frame.label}-${suffix}`;
      if (destinations.has(destination))
        errors.push(`duplicate artifact destination: ${destination}`);
      destinations.add(destination);
    }
    if (frame.approvalStatus !== "approved") errors.push(`${frame.id} is not approved`);
    if (!validThresholds(frame.thresholds))
      errors.push(`${frame.id} has no valid thresholds`);
    if (
      frame.referenceContract?.status !== "approved" ||
      !SHA256.test(frame.referenceContract?.sha256 ?? "") ||
      frame.referenceContract?.width !== frame.viewport?.width ||
      frame.referenceContract?.height !== frame.viewport?.height
    ) {
      errors.push(`${frame.id} has no approved immutable exact-frame reference`);
    }
    const geometry = frame.geometryContract;
    if (
      geometry?.status !== "approved" ||
      geometry?.executionStatus !== "available" ||
      !Array.isArray(geometry?.landmarks) ||
      geometry.landmarks.length === 0 ||
      !Array.isArray(geometry?.regions) ||
      geometry.regions.length === 0
    ) {
      errors.push(`${frame.id} has no executable landmark and region contract`);
    }
    for (const item of geometry?.landmarks ?? []) {
      validateId(item.id, `${frame.id} landmark id`, errors);
      if (
        item.status !== "approved" ||
        item.detector?.status !== "available" ||
        !validateExecutableIdentity(item.detector) ||
        !validObject(item.thresholds)
      ) {
        errors.push(`${frame.id}/${item.id} landmark detector is unavailable`);
      }
    }
    for (const item of geometry?.regions ?? []) {
      validateId(item.id, `${frame.id} region id`, errors);
      if (
        item.status !== "approved" ||
        item.mask?.status !== "available" ||
        !validateMaskIdentity(item.mask, frame.viewport) ||
        !validThresholds(item.thresholds)
      ) {
        errors.push(`${frame.id}/${item.id} region mask is unavailable`);
      }
    }
    validateSemanticObservation(frame, errors);
    try {
      normalizeRelativePath(frame.reference, `${frame.id} reference`);
    } catch (error) {
      errors.push(error.message);
    }
  }
  const coverage = Array.isArray(value.requiredCoverage) ? value.requiredCoverage : [];
  if (coverage.length === 0) errors.push("required coverage contract is missing");
  const coverageIds = new Set();
  for (const item of coverage) {
    validateId(item.id, "coverage id", errors);
    if (coverageIds.has(item.id)) errors.push(`duplicate coverage id: ${item.id}`);
    coverageIds.add(item.id);
    if (item.status !== "approved") errors.push(`${item.id} coverage is unavailable`);
    if (!Array.isArray(item.frameIds) || item.frameIds.length === 0) {
      errors.push(`${item.id} has no concrete frameIds`);
    } else if (item.frameIds.some((frameId) => !ids.has(frameId))) {
      errors.push(`${item.id} references an unknown frame`);
    }
    if (!Array.isArray(item.observations) || item.observations.length === 0) {
      errors.push(`${item.id} has no concrete frame observations`);
      continue;
    }
    for (const observation of item.observations) {
      validateId(observation.id, `${item.id} observation id`, errors);
      const frame = frames.find((candidate) => candidate.id === observation.frameId);
      if (
        observation.status !== "approved" ||
        !frame ||
        !Array.isArray(item.frameIds) ||
        !item.frameIds.includes(observation.frameId) ||
        observation.semanticObservationId !== frame?.semanticObservation?.id ||
        observation.semantic !== frame?.semanticObservation?.semantic ||
        !same(observation.landmarkResultIds, frame?.semanticObservation?.landmarkIds) ||
        !same(observation.regionResultIds, frame?.semanticObservation?.regionIds) ||
        !nonemptySafeIds(observation.landmarkResultIds) ||
        !nonemptySafeIds(observation.regionResultIds)
      ) {
        errors.push(
          `${item.id}/${observation.id} has no executable frame/result mapping`,
        );
      }
    }
    const observationFrameIds = item.observations?.map(
      (observation) => observation.frameId,
    );
    if (!sameUniqueIds(item.frameIds, observationFrameIds)) {
      errors.push(`${item.id} frameIds do not exactly match its observations`);
    }
  }
  return [...new Set(errors)];
}

function validateSemanticObservation(frame, errors) {
  const contract = frame.semanticObservation;
  if (!validObject(contract)) {
    errors.push(`${frame.id} semantic observation contract is missing`);
    return;
  }
  validateId(contract.id, `${frame.id} semantic observation id`, errors);
  validateId(contract.semantic, `${frame.id} semantic`, errors);
  if (
    contract.status !== "approved" ||
    !validSelector(contract.selector) ||
    contract.expected?.visible !== true ||
    contract.expected?.stateId !== frame.state?.id ||
    !validExpectedAttributes(contract.expected?.attributes)
  ) {
    errors.push(`${frame.id} semantic observation is unavailable`);
  }
  const landmarkIds = new Set(
    (frame.geometryContract?.landmarks ?? []).map((item) => item.id),
  );
  const regionIds = new Set(
    (frame.geometryContract?.regions ?? []).map((item) => item.id),
  );
  if (
    !nonemptySafeIds(contract.landmarkIds) ||
    contract.landmarkIds.some((id) => !landmarkIds.has(id)) ||
    !nonemptySafeIds(contract.regionIds) ||
    contract.regionIds.some((id) => !regionIds.has(id))
  ) {
    errors.push(`${frame.id} semantic observation has no concrete geometry result IDs`);
  }
  const topSemantic = contract.semantic === "top" || contract.semantic === "menu-open";
  const strategy = contract.scrollStrategy;
  if (strategy?.kind === "absolute") {
    if (
      !topSemantic ||
      !nonnegativeInteger(strategy.x) ||
      !nonnegativeInteger(strategy.y) ||
      !same(frame.scroll, { x: strategy.x, y: strategy.y })
    ) {
      errors.push(`${frame.id} absolute semantic scroll strategy is invalid`);
    }
  } else if (strategy?.kind === "selector-anchor") {
    if (
      topSemantic ||
      frame.scroll != null ||
      !["start", "center", "end"].includes(strategy.block) ||
      !["start", "center", "end", "nearest"].includes(strategy.inline) ||
      !Number.isInteger(strategy.offsetX) ||
      !Number.isInteger(strategy.offsetY)
    ) {
      errors.push(`${frame.id} selector-anchor semantic scroll strategy is invalid`);
    }
  } else {
    errors.push(`${frame.id} semantic scroll strategy is missing`);
  }
}

async function readAndValidateCaptureRun({
  build,
  config,
  configSha256,
  identity,
  paths,
  source,
}) {
  const manifestPath = `${config.captureArtifacts.runsRoot}/${identity.id}/${config.captureArtifacts.runManifestFile}`;
  const file = await resolveExistingFile(
    root,
    manifestPath,
    "current capture run manifest",
  );
  const bytes = await readFile(file.absolute);
  const value = JSON.parse(bytes.toString("utf8"));
  const failures = [];
  if (
    value.schemaVersion !== 1 ||
    value.kind !== "fidelity-capture-run-manifest" ||
    value.status !== "COMPLETE" ||
    !same(value.failures, [])
  ) {
    failures.push("capture run manifest is not COMPLETE");
  }
  if (
    value.run?.id !== identity.id ||
    !same(value.run?.identity, identity.identity) ||
    value.config?.path !== "fidelity.config.json" ||
    value.config?.sha256 !== configSha256 ||
    !same(value.source, source) ||
    !same(value.build, build) ||
    !same(value.server, SERVER) ||
    !same(value.captureEnvironment, config.captureEnvironment)
  ) {
    failures.push("capture run identity/config/build binding mismatch");
  }
  const records = Array.isArray(value.frames) ? value.frames : [];
  const recordById = new Map(records.map((record) => [record.id, record]));
  if (
    records.length !== paths.length ||
    recordById.size !== records.length ||
    !same([...recordById.keys()].sort(), paths.map((item) => item.frame.id).sort())
  ) {
    failures.push("capture run frame IDs do not exactly match config");
  }
  for (const runPath of paths) {
    const record = recordById.get(runPath.frame.id);
    if (
      record?.label !== runPath.frame.label ||
      record?.actual?.path !== runPath.actual ||
      record?.provenance?.path !== runPath.provenance ||
      !SHA256.test(record?.actual?.sha256 ?? "") ||
      !SHA256.test(record?.provenance?.sha256 ?? "")
    ) {
      failures.push(`${runPath.frame.id} capture run record is invalid`);
      continue;
    }
    const [actual, provenance] = await Promise.all([
      resolveExistingFile(root, runPath.actual, `${runPath.frame.id} run actual`),
      resolveExistingFile(
        root,
        runPath.provenance,
        `${runPath.frame.id} run provenance`,
      ),
    ]);
    const [actualHash, provenanceHash] = await Promise.all([
      sha256File(actual.absolute),
      sha256File(provenance.absolute),
    ]);
    if (
      actualHash !== record.actual.sha256 ||
      provenanceHash !== record.provenance.sha256
    ) {
      failures.push(`${runPath.frame.id} capture run file hash changed`);
    }
  }
  if (failures.length > 0) {
    throw new Error(`current immutable capture run invalid: ${failures.join("; ")}`);
  }
  return {
    id: identity.id,
    manifest: { path: manifestPath, sha256: sha256Buffer(bytes) },
  };
}

async function readAndValidateProvenance(
  frame,
  config,
  configHash,
  identity,
  runPaths,
) {
  const provenancePath = runPaths.provenance;
  const file = await resolveExistingFile(
    root,
    provenancePath,
    `${frame.id} provenance`,
  );
  const bytes = await readFile(file.absolute);
  const value = JSON.parse(bytes.toString("utf8"));
  const actual = await resolveExistingFile(root, runPaths.actual, `${frame.id} actual`);
  const actualHash = await sha256File(actual.absolute);
  const failures = [];
  if (value.version !== 3 || value.kind !== "fidelity-capture-provenance") {
    failures.push("capture provenance schema mismatch");
  }
  if (value.frameId !== frame.id || value.frameLabel !== frame.label)
    failures.push("frame identity mismatch");
  if (
    value.actual !== runPaths.actual ||
    value.actualFile !== frame.actualFile ||
    value.actualSha256 !== actualHash
  )
    failures.push("actual hash binding mismatch");
  if (value.configSha256 !== configHash) failures.push("config hash binding mismatch");
  if (value.run?.id !== identity.id || !same(value.run?.identity, identity.identity)) {
    failures.push("capture run identity mismatch");
  }
  if (!same(value.capture?.viewport, frame.viewport))
    failures.push("capture viewport mismatch");
  if (!same(value.capture?.scrollStrategy, frame.semanticObservation?.scrollStrategy))
    failures.push("capture scroll strategy mismatch");
  if (value.capture?.route !== frame.route || value.capture?.state !== frame.state?.id)
    failures.push("capture route/state mismatch");
  if (value.capture?.fullPage !== frame.capture?.fullPage)
    failures.push("capture mode mismatch");
  const semanticFailures = validateSemanticObservationResult(
    value.semanticObservationResult,
    frame,
  );
  failures.push(...semanticFailures);
  if (
    frame.semanticObservation?.scrollStrategy?.kind === "absolute" &&
    !same(value.capture?.scroll, frame.scroll)
  ) {
    failures.push("absolute capture scroll mismatch");
  }
  if (
    frame.semanticObservation?.scrollStrategy?.kind === "selector-anchor" &&
    !same(value.capture?.scroll, value.semanticObservationResult?.observed?.scroll)
  ) {
    failures.push("selector-anchor capture scroll mismatch");
  }
  if (
    value.capture?.locale !== config.captureEnvironment?.locale ||
    value.capture?.timezoneId !== config.captureEnvironment?.timezoneId ||
    value.capture?.deviceScaleFactor !== config.captureEnvironment?.deviceScaleFactor ||
    value.capture?.colorScheme !== config.captureEnvironment?.colorScheme
  )
    failures.push("capture environment mismatch");
  if (
    !value.build?.id ||
    value.build?.sourceState !== "clean" ||
    !value.build?.sourceRevision
  )
    failures.push("capture is not tied to a clean committed build");
  if (!same(value.server, SERVER)) failures.push("owned-server provenance mismatch");
  if (failures.length > 0)
    fail(`${frame.id} provenance invalid: ${failures.join("; ")}`);
  return {
    path: provenancePath,
    sha256: sha256Buffer(bytes),
    browser: value.browser,
    configSha256: value.configSha256,
    actualSha256: value.actualSha256,
    build: { id: value.build.id },
    source: { revision: value.build.sourceRevision, state: value.build.sourceState },
    server: value.server,
    capture: value.capture,
    run: value.run,
    semanticObservationResult: value.semanticObservationResult,
  };
}

function validateSemanticObservationResult(result, frame) {
  const contract = frame.semanticObservation;
  const failures = [];
  if (
    result?.id !== contract?.id ||
    result?.semantic !== contract?.semantic ||
    result?.selector !== contract?.selector ||
    !same(result?.scrollStrategy, contract?.scrollStrategy) ||
    !same(result?.expected, contract?.expected)
  ) {
    failures.push("semantic observation contract binding mismatch");
  }
  if (result?.status !== "PASS" || !same(result?.failures, [])) {
    failures.push("semantic observation did not pass");
  }
  if (
    !same(result?.landmarkResultIds, contract?.landmarkIds) ||
    !same(result?.regionResultIds, contract?.regionIds)
  ) {
    failures.push("semantic observation geometry result binding mismatch");
  }
  const observed = result?.observed;
  if (
    observed?.selectorCount !== 1 ||
    observed?.visible !== true ||
    !positiveFiniteRectangle(observed?.bounds) ||
    !positiveFiniteSize(observed?.viewportIntersection) ||
    !finitePoint(observed?.scroll)
  ) {
    failures.push("semantic DOM observation is not executable PASS evidence");
  }
  if (!sameRecord(observed?.attributes, contract?.expected?.attributes)) {
    failures.push("semantic DOM state attributes mismatch");
  }
  return failures;
}

function validateAndComposeFrameEvidence({
  comparison,
  comparisonLogicalPath,
  comparisonSha256,
  frame,
  provenance,
  runPaths,
}) {
  const failures = [];
  if (comparison.label !== frame.label) failures.push("comparison label mismatch");
  if (
    comparison.frameId !== frame.id ||
    comparison.configSha256 !== provenance.configSha256
  ) {
    failures.push("comparison config/frame binding mismatch");
  }
  if (
    comparison.reference?.path !== frame.reference ||
    comparison.reference?.sha256 !== frame.referenceContract.sha256
  )
    failures.push("reference binding mismatch");
  if (
    comparison.actual?.path !== runPaths.actual ||
    comparison.actual?.sha256 !== provenance.actualSha256
  )
    failures.push("actual binding mismatch");
  if (
    comparison.actual?.width !== frame.viewport.width ||
    comparison.actual?.height !== frame.viewport.height
  )
    failures.push("actual dimensions mismatch");
  if (
    comparison.reference?.width !== frame.viewport.width ||
    comparison.reference?.height !== frame.viewport.height
  )
    failures.push("reference dimensions mismatch");
  const landmarkResults = comparison.landmarkResults ?? [];
  const regionResults = comparison.regionResults ?? [];
  validateExecutedGeometryResults(
    frame.geometryContract?.landmarks ?? [],
    landmarkResults,
    "landmark",
    failures,
  );
  validateExecutedGeometryResults(
    frame.geometryContract?.regions ?? [],
    regionResults,
    "region",
    failures,
  );
  if (
    comparison.status !== "PASS" ||
    comparison.evidenceStatus !== "PASS" ||
    !same(comparison.failures, []) ||
    !same(comparison.evidenceFailures, []) ||
    comparison.globalResult?.status !== "PASS" ||
    !same(comparison.globalResult?.failures, [])
  ) {
    failures.push("comparison evidence did not pass every declared contract");
  }
  return {
    id: frame.id,
    label: frame.label,
    route: frame.route,
    state: frame.state,
    scroll: frame.scroll,
    viewport: frame.viewport,
    capture: frame.capture,
    reference: comparison.reference,
    actual: comparison.actual,
    captureProvenance: provenance,
    semanticObservationResult: provenance.semanticObservationResult,
    comparisonArtifact: { path: comparisonLogicalPath, sha256: comparisonSha256 },
    thresholds: frame.thresholds,
    globalResult: comparison.globalResult,
    landmarkResults,
    regionResults,
    status: failures.length === 0 ? "PASS" : "UNAVAILABLE",
    failures,
  };
}

function validateExecutedGeometryResults(contracts, results, kind, failures) {
  if (!Array.isArray(results) || results.length !== contracts.length) {
    failures.push(`${kind} result cardinality mismatch`);
    return;
  }
  const contractIds = contracts.map((contract) => contract.id);
  const resultIds = results.map((result) => result.contractId);
  if (!same(contractIds, resultIds)) {
    failures.push(`${kind} result IDs do not exactly match their contracts`);
  }
  for (const contract of contracts) {
    const result = results.find((candidate) => candidate.contractId === contract.id);
    if (!result || result.status !== "PASS" || !same(result.failures, [])) {
      failures.push(`${kind} ${contract.id} has no executable PASS result`);
      continue;
    }
    if (!same(result.thresholds, contract.thresholds)) {
      failures.push(`${kind} ${contract.id} threshold binding mismatch`);
    }
    if (kind === "landmark") {
      if (
        result.detector?.id !== contract.detector?.id ||
        result.detector?.path !== contract.detector?.path ||
        result.detector?.sha256 !== contract.detector?.sha256
      ) {
        failures.push(`${kind} ${contract.id} detector binding mismatch`);
      }
    } else if (
      result.mask?.path !== contract.mask?.path ||
      result.mask?.sha256 !== contract.mask?.sha256 ||
      result.mask?.width !== contract.mask?.width ||
      result.mask?.height !== contract.mask?.height
    ) {
      failures.push(`${kind} ${contract.id} mask binding mismatch`);
    }
  }
}

function unavailableLandmark(contract) {
  return {
    contractId: contract.id,
    detector: {
      id: contract.detector?.id ?? null,
      path: contract.detector?.path ?? null,
      sha256: contract.detector?.sha256 ?? null,
    },
    reference: null,
    actual: null,
    thresholds: contract.thresholds ?? null,
    status: "UNAVAILABLE",
    failures: ["No approved symmetric detector execution result is available."],
  };
}

function unavailableRegion(contract) {
  return {
    contractId: contract.id,
    mask: {
      path: contract.mask?.path ?? null,
      sha256: contract.mask?.sha256 ?? null,
      width: contract.mask?.width ?? null,
      height: contract.mask?.height ?? null,
    },
    reference: null,
    actual: null,
    thresholds: contract.thresholds ?? null,
    status: "UNAVAILABLE",
    failures: ["No approved region-mask comparison result is available."],
  };
}

function composeCoverage(contracts, frames) {
  const byId = new Map(frames.map((frame) => [frame.id, frame]));
  return contracts.map((contract) => {
    const frameIds = [...new Set(contract.frameIds ?? [])];
    const missingFrameIds = frameIds.filter((id) => !byId.has(id));
    const frameResults = frameIds
      .filter((id) => byId.has(id))
      .map((frameId) => ({ frameId, status: byId.get(frameId).status }));
    const failures = [];
    if (missingFrameIds.length > 0)
      failures.push("One or more configured frames are missing.");
    if (frameResults.some((item) => item.status !== "PASS"))
      failures.push("One or more mapped frame results did not pass.");
    const observationResults = (contract.observations ?? []).map((binding) => {
      const frame = byId.get(binding.frameId);
      const semanticResult = frame?.semanticObservationResult;
      const observationFailures = [];
      if (
        !frame ||
        frame.status !== "PASS" ||
        semanticResult?.status !== "PASS" ||
        semanticResult.id !== binding.semanticObservationId ||
        semanticResult.semantic !== binding.semantic ||
        !same(semanticResult.landmarkResultIds, binding.landmarkResultIds) ||
        !same(semanticResult.regionResultIds, binding.regionResultIds)
      ) {
        observationFailures.push("Frame semantic PASS result binding is unavailable.");
      }
      const passedLandmarks = new Set(
        (frame?.landmarkResults ?? [])
          .filter((result) => result.status === "PASS")
          .map((result) => result.contractId),
      );
      const passedRegions = new Set(
        (frame?.regionResults ?? [])
          .filter((result) => result.status === "PASS")
          .map((result) => result.contractId),
      );
      if (
        !nonemptySafeIds(binding.landmarkResultIds) ||
        binding.landmarkResultIds.some((id) => !passedLandmarks.has(id)) ||
        !nonemptySafeIds(binding.regionResultIds) ||
        binding.regionResultIds.some((id) => !passedRegions.has(id))
      ) {
        observationFailures.push(
          "Executed geometry PASS result binding is unavailable.",
        );
      }
      return {
        id: binding.id,
        frameId: binding.frameId,
        semanticObservationId: binding.semanticObservationId,
        semantic: binding.semantic,
        landmarkResultIds: binding.landmarkResultIds ?? [],
        regionResultIds: binding.regionResultIds ?? [],
        status: observationFailures.length === 0 ? "PASS" : "UNAVAILABLE",
        failures: observationFailures,
      };
    });
    if (
      observationResults.length !== (contract.observations ?? []).length ||
      observationResults.some((item) => item.status !== "PASS")
    ) {
      failures.push("One or more semantic observation results did not pass.");
    }
    return {
      id: contract.id,
      frameIds,
      status: failures.length === 0 ? "PASS" : "UNAVAILABLE",
      frameResults,
      observationResults,
      missingFrameIds,
      failures,
    };
  });
}

function createUnavailableManifest({
  blockers,
  build,
  captureRun,
  captureRunEvidence,
  config,
  configSha256,
  source,
}) {
  const frames = (config.frames ?? []).map((frame) => {
    const runPaths = captureRun?.paths.find((item) => item.frame.id === frame.id);
    return {
      id: frame.id ?? null,
      label: frame.label ?? null,
      route: frame.route ?? null,
      state: frame.state ?? null,
      scroll: frame.scroll ?? null,
      viewport: frame.viewport ?? null,
      capture: frame.capture ?? null,
      reference: {
        path: safeLogicalOrNull(frame.reference),
        sha256: frame.referenceContract?.sha256 ?? null,
        width: frame.referenceContract?.width ?? null,
        height: frame.referenceContract?.height ?? null,
      },
      actual: {
        path: safeLogicalOrNull(runPaths?.actual),
        sha256: null,
        width: null,
        height: null,
      },
      captureProvenance: {
        path: safeLogicalOrNull(runPaths?.provenance),
        sha256: null,
        browser: null,
        configSha256,
        actualSha256: null,
        build,
        source,
        server: null,
        capture: null,
        run: captureRun?.identity
          ? {
              id: captureRun.identity.id,
              identity: captureRun.identity.identity,
            }
          : null,
        semanticObservationResult: null,
      },
      comparisonArtifact: {
        path:
          typeof frame.label === "string" && SAFE_ID.test(frame.label)
            ? `${posix.dirname(config.evidenceContract?.manifest ?? "artifacts/fidelity/comparisons/fidelity-evidence-manifest.json")}/runs/${captureRun?.identity.id ?? "unavailable"}/${frame.label}-evidence.json`
            : null,
        sha256: null,
      },
      globalResult: { metrics: null, status: "UNAVAILABLE", failures: blockers },
      semanticObservationResult: unavailableSemanticObservation(
        frame.semanticObservation,
        blockers,
      ),
      landmarkResults: (frame.geometryContract?.landmarks ?? []).map(
        unavailableLandmark,
      ),
      regionResults: (frame.geometryContract?.regions ?? []).map(unavailableRegion),
      status: "UNAVAILABLE",
      failures: blockers,
    };
  });
  const configuredFrameIds = new Set(frames.map((frame) => frame.id));
  const requiredCoverage = (config.requiredCoverage ?? []).map((item) => {
    const frameIds = [...new Set(item.frameIds ?? [])];
    const missingFrameIds = frameIds.filter((id) => !configuredFrameIds.has(id));
    return {
      id: item.id,
      frameIds,
      status: "UNAVAILABLE",
      frameResults: frameIds
        .filter((id) => configuredFrameIds.has(id))
        .map((frameId) => ({ frameId, status: "UNAVAILABLE" })),
      observationResults: (item.observations ?? []).map((observation) => ({
        id: observation.id ?? null,
        frameId: observation.frameId ?? null,
        semanticObservationId: observation.semanticObservationId ?? null,
        semantic: observation.semantic ?? null,
        landmarkResultIds: observation.landmarkResultIds ?? [],
        regionResultIds: observation.regionResultIds ?? [],
        status: "UNAVAILABLE",
        failures: [
          observation.reason ?? "Semantic observation evidence is unavailable.",
        ],
      })),
      missingFrameIds,
      failures: [item.reason ?? "Required coverage evidence is unavailable."],
    };
  });
  return {
    schemaVersion: 1,
    kind: "fidelity-evidence-manifest",
    status: "UNAVAILABLE",
    config: { path: "fidelity.config.json", sha256: configSha256 },
    source,
    build,
    server: captureRunEvidence ? SERVER : null,
    captureEnvironment: config.captureEnvironment ?? null,
    captureRun:
      captureRunEvidence ??
      (captureRun
        ? {
            id: captureRun.identity.id,
            manifest: {
              path: `${config.captureArtifacts.runsRoot}/${captureRun.identity.id}/${config.captureArtifacts.runManifestFile}`,
              sha256: null,
            },
          }
        : null),
    frames,
    requiredCoverage,
    failures: blockers,
  };
}

function unavailableSemanticObservation(contract, blockers) {
  return {
    id: contract?.id ?? null,
    semantic: contract?.semantic ?? null,
    status: "UNAVAILABLE",
    selector: contract?.selector ?? null,
    scrollStrategy: contract?.scrollStrategy ?? null,
    expected: contract?.expected ?? null,
    observed: null,
    landmarkResultIds: contract?.landmarkIds ?? [],
    regionResultIds: contract?.regionIds ?? [],
    failures: blockers,
  };
}

function safeLogicalOrNull(value) {
  try {
    return normalizeRelativePath(value, "evidence path");
  } catch {
    return null;
  }
}

function validThresholds(value) {
  return (
    validObject(value) &&
    ["pixelThreshold", "maxAspectDelta", "maxMae", "maxDiffRatio", "maxEdgeMae"].every(
      (key) => Number.isFinite(value[key]) && value[key] >= 0 && value[key] <= 1,
    )
  );
}

function validateExecutableIdentity(value) {
  return (
    validObject(value) &&
    typeof value.id === "string" &&
    SAFE_ID.test(value.id) &&
    typeof value.path === "string" &&
    SHA256.test(value.sha256 ?? "")
  );
}

function validateMaskIdentity(value, viewport) {
  return (
    validateExecutableIdentity(value) &&
    value.width === viewport?.width &&
    value.height === viewport?.height
  );
}

function validObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validSelector(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 512 &&
    value.normalize("NFKC") === value &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function validExpectedAttributes(value) {
  return (
    validObject(value) &&
    Object.keys(value).length > 0 &&
    Object.entries(value).every(
      ([name, attributeValue]) =>
        /^(?:aria|data)-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) &&
        typeof attributeValue === "string" &&
        attributeValue.normalize("NFKC") === attributeValue,
    )
  );
}

function nonemptySafeIds(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    new Set(value).size === value.length &&
    value.every(
      (id) =>
        typeof id === "string" &&
        id.length <= 96 &&
        id.normalize("NFKC") === id &&
        SAFE_ID.test(id),
    )
  );
}

function sameUniqueIds(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    same([...left].sort(), [...right].sort())
  );
}

function nonnegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function finitePoint(value) {
  return validObject(value) && Number.isFinite(value.x) && Number.isFinite(value.y);
}

function positiveFiniteRectangle(value) {
  return (
    validObject(value) &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Number.isFinite(value.width) &&
    Number.isFinite(value.height) &&
    value.width > 0 &&
    value.height > 0
  );
}

function positiveFiniteSize(value) {
  return (
    validObject(value) &&
    Number.isFinite(value.width) &&
    Number.isFinite(value.height) &&
    value.width > 0 &&
    value.height > 0
  );
}

function sameRecord(left, right) {
  if (!validObject(left) || !validObject(right)) return false;
  return same(
    Object.fromEntries(Object.entries(left).sort(([a], [b]) => a.localeCompare(b))),
    Object.fromEntries(Object.entries(right).sort(([a], [b]) => a.localeCompare(b))),
  );
}

function validateId(value, label, errors) {
  if (
    typeof value !== "string" ||
    value.normalize("NFKC") !== value ||
    value.length > 96 ||
    !SAFE_ID.test(value)
  )
    errors.push(`${label} is not a safe artifact id`);
}

function normalizeRelativePath(value, label) {
  if (
    typeof value !== "string" ||
    !value ||
    value.includes("\\") ||
    value.normalize("NFKC") !== value
  ) {
    throw new Error(`${label} must be a normalized POSIX relative path`);
  }
  const normalized = posix.normalize(value);
  if (
    normalized !== value ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.startsWith("/")
  ) {
    throw new Error(`${label} must remain inside the project root`);
  }
  return normalized;
}

async function resolveExistingFile(projectRoot, value, label) {
  const logical = normalizeRelativePath(value, label);
  const absolute = resolve(projectRoot, ...logical.split("/"));
  assertContained(projectRoot, absolute);
  await assertNoSymlinks(projectRoot, logical, false, label);
  const metadata = await lstat(absolute).catch(() => null);
  if (!metadata?.isFile()) fail(`${label} must be an existing regular file`);
  const canonical = await realpath(absolute);
  assertContained(projectRoot, canonical);
  return { absolute: canonical, logical };
}

async function prepareOutputDirectory(projectRoot, logicalValue) {
  const logical = normalizeRelativePath(logicalValue, "evidence output directory");
  const absolute = resolve(projectRoot, ...logical.split("/"));
  assertContained(projectRoot, absolute);
  await assertNoSymlinks(projectRoot, logical, true, "evidence output directory");
  await mkdir(absolute, { recursive: true });
  await assertNoSymlinks(projectRoot, logical, false, "evidence output directory");
  return { absolute: await realpath(absolute), logical };
}

function assertContained(projectRoot, target) {
  const path = relative(projectRoot, target);
  if (!path || isAbsolute(path) || path === ".." || path.startsWith(`..${sep}`)) {
    fail("fidelity paths must remain inside the project root");
  }
}

async function assertNoSymlinks(projectRoot, logical, allowMissing, label) {
  let current = projectRoot;
  for (const part of logical.split("/")) {
    current = resolve(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink())
        fail(`${label} contains a symbolic-link component`);
    } catch (error) {
      if (error?.code === "ENOENT" && allowMissing) return;
      throw error;
    }
  }
}

async function publishAggregateManifest(directory, leaf, value) {
  const destination = join(directory, leaf);
  const existing = await lstat(destination).catch(() => null);
  if (existing) {
    if (existing.isSymbolicLink() || !existing.isFile()) {
      fail("aggregate evidence destination must be a regular non-symlink file");
    }
    const previous = await readFile(destination);
    let previousManifest;
    try {
      previousManifest = JSON.parse(previous.toString("utf8"));
    } catch {
      fail("refusing to replace an invalid aggregate evidence destination");
    }
    if (
      previousManifest?.schemaVersion !== 1 ||
      previousManifest?.kind !== "fidelity-evidence-manifest"
    ) {
      fail("refusing to replace a non-fidelity aggregate destination");
    }
    if (previous.equals(value)) return;
  }
  const temporary = join(directory, `.${leaf}.tmp-${randomBytes(12).toString("hex")}`);
  const handle = await open(
    temporary,
    constants.O_CREAT |
      constants.O_EXCL |
      constants.O_WRONLY |
      (constants.O_NOFOLLOW ?? 0),
    0o600,
  );
  try {
    await handle.writeFile(value);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    const current = await lstat(destination).catch(() => null);
    if (current && (current.isSymbolicLink() || !current.isFile())) {
      await unlink(temporary).catch(() => undefined);
      fail("aggregate evidence destination changed to an unsafe file type");
    }
    await rename(temporary, destination);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    fail(`aggregate evidence publication failed (${error?.code ?? "unknown"})`);
  }
}

function parseArguments(argv) {
  const parsed = { root: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== "--root") failUsage(`unknown argument: ${argv[index]}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) failUsage("--root requires a value");
    parsed.root = value;
    index += 1;
  }
  return parsed;
}

function failUsage(message) {
  process.stderr.write(`run-fidelity: ${message}\n`);
  process.exit(2);
}

async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function sha256Buffer(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readSource(projectRoot) {
  const revision = spawnSync("git", ["rev-parse", "--verify", "HEAD"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  if (revision.status !== 0) return { revision: null, state: "uncommitted" };
  const status = spawnSync("git", ["status", "--porcelain=v1"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  return {
    revision: revision.stdout.trim(),
    state: status.status === 0 && status.stdout.trim() === "" ? "clean" : "dirty",
  };
}

async function readOptionalText(path) {
  try {
    return (await readFile(path, "utf8")).trim() || null;
  } catch {
    return null;
  }
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function printBlocked(errors) {
  process.stderr.write("TECHNICAL FIDELITY BLOCKED:\n");
  for (const error of errors) process.stderr.write(`- ${error}\n`);
  process.stderr.write("This result does not authorize deployment or human release.\n");
}

function fail(message) {
  process.stderr.write(
    `run-fidelity: ${String(message).replaceAll(root, "<project-root>")}\n`,
  );
  process.exit(1);
}
