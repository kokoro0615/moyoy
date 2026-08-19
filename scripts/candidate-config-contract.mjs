import { posix } from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  CAPTURE_RUNS_ROOT,
  createCaptureRunIdentity,
  resolveCaptureRunPaths,
  validateCaptureArtifactContract,
} from "./fidelity-run-contract.mjs";

export const REQUIRED_VIEWPORTS = new Set(["1440x900", "768x1024", "390x844"]);
export const REQUIRED_COVERAGE = new Set([
  "desktop-top-menu-closed",
  "desktop-root-dusk-dawn-alpine-footer",
  "tablet-root-dusk-dawn-alpine-footer",
  "mobile-root-dusk-dawn-alpine-footer",
  "tablet-top-menu-closed",
  "mobile-top-menu-closed",
  "menu-open-all-viewports",
]);
export const REFERENCE_ROOT = ".private/references/approved";
export const ACTUAL_ROOT = CAPTURE_RUNS_ROOT;
export const DETECTOR_ROOT = "scripts/fidelity/detectors";
export const MASK_ROOT = "config/fidelity-masks";

const CHAPTER_SEMANTICS = ["root", "dusk", "dawn", "alpine", "footer"];
const SEMANTICS = new Set(["top", "menu-open", ...CHAPTER_SEMANTICS]);
const BLOCK_ALIGNMENTS = new Set(["start", "center", "end"]);
const INLINE_ALIGNMENTS = new Set(["start", "center", "end", "nearest"]);
const SHA256 = /^[a-f0-9]{64}$/;
const SAFE_LABEL = /^[a-z0-9][a-z0-9._-]*$/;
const SAFE_ACTUAL_FILE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.png$/;

function pathIsWithin(path, root) {
  return path.startsWith(`${root}/`);
}

function normalizeRelativePath(path, label) {
  if (
    typeof path !== "string" ||
    path.length === 0 ||
    path.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(path)
  ) {
    throw new Error(`${label} must be a non-empty POSIX relative path`);
  }
  const normalized = posix.normalize(path);
  if (
    normalized !== path ||
    normalized === "." ||
    normalized.startsWith("../") ||
    normalized.startsWith("/")
  ) {
    throw new Error(`${label} is unsafe: ${path}`);
  }
  return normalized;
}

function sorted(values) {
  return [...values].sort();
}

function arraysEqual(left, right) {
  return (
    left.length === right.length && left.every((value, index) => value === right[index])
  );
}

function exactUniqueIds(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    arraysEqual(sorted(actual), sorted(expected))
  );
}

function uniqueIds(items) {
  return new Set(Array.isArray(items) ? items.map((item) => item?.id) : []);
}

function validateThresholds(frame, errors) {
  const names = [
    "pixelThreshold",
    "maxAspectDelta",
    "maxMae",
    "maxDiffRatio",
    "maxEdgeMae",
  ];
  if (!frame.thresholds || typeof frame.thresholds !== "object") {
    errors.push(`${frame.id} has no predeclared thresholds`);
    return;
  }
  for (const name of names) {
    const value = frame.thresholds[name];
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      errors.push(`${frame.id} has invalid normalized ${name}`);
    }
  }
}

function validateContractIds(frame, field, contractIds, errors) {
  const ids = frame.semanticObservation?.[field];
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => typeof id !== "string" || !contractIds.has(id))
  ) {
    errors.push(
      `${frame.id} semanticObservation ${field} must be nonempty unique geometry contract IDs`,
    );
  }
}

function validateSelectorAnchor(frame, observation, errors) {
  const strategy = observation.scrollStrategy;
  if (strategy?.kind !== "selector-anchor") {
    errors.push(
      `${frame.id} ${observation.semantic} semantic requires selector-anchor`,
    );
    return;
  }
  if (
    !BLOCK_ALIGNMENTS.has(strategy.block) ||
    !INLINE_ALIGNMENTS.has(strategy.inline) ||
    !Number.isInteger(strategy.offsetX) ||
    !Number.isInteger(strategy.offsetY)
  ) {
    errors.push(`${frame.id} selector-anchor strategy is incomplete or invalid`);
  }
}

function validateSemanticObservation(frame, errors) {
  const observation = frame.semanticObservation;
  if (!observation || typeof observation !== "object") {
    errors.push(`${frame.id} needs an explicit semanticObservation`);
    return;
  }
  if (!SAFE_LABEL.test(observation.id ?? ""))
    errors.push(`${frame.id} semanticObservation id is invalid`);
  if (observation.status !== "approved")
    errors.push(`${frame.id} semanticObservation is not approved`);
  if (!SEMANTICS.has(observation.semantic))
    errors.push(`${frame.id} semanticObservation semantic is invalid`);
  if (
    typeof observation.selector !== "string" ||
    !observation.selector.trim() ||
    observation.selector.length > 512 ||
    observation.selector.normalize("NFKC") !== observation.selector ||
    /[\u0000-\u001f\u007f]/.test(observation.selector)
  ) {
    errors.push(`${frame.id} semanticObservation selector is required`);
  }
  if (observation.expected?.visible !== true) {
    errors.push(`${frame.id} semanticObservation expected.visible must be true`);
  }
  if (observation.expected?.stateId !== frame.state?.id) {
    errors.push(
      `${frame.id} semanticObservation expected.stateId must match frame state`,
    );
  }
  const expectedAttributes = observation.expected?.attributes;
  if (
    !expectedAttributes ||
    typeof expectedAttributes !== "object" ||
    Array.isArray(expectedAttributes) ||
    Object.keys(expectedAttributes).length === 0 ||
    Object.entries(expectedAttributes).some(
      ([name, value]) =>
        !/^(?:aria|data)-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) ||
        typeof value !== "string" ||
        value.normalize("NFKC") !== value,
    )
  ) {
    errors.push(
      `${frame.id} semanticObservation expected.attributes must contain exact string pairs`,
    );
  }

  if (observation.semantic === "top" || observation.semantic === "menu-open") {
    if (observation.scrollStrategy?.kind === "absolute") {
      if (
        observation.scrollStrategy.x !== 0 ||
        observation.scrollStrategy.y !== 0 ||
        frame.scroll?.x !== 0 ||
        frame.scroll?.y !== 0
      ) {
        errors.push(`${frame.id} top absolute scroll must be exactly x=0,y=0`);
      }
    } else {
      errors.push(`${frame.id} top/menu semantic requires absolute scroll`);
    }
  } else {
    validateSelectorAnchor(frame, observation, errors);
    if (frame.scroll != null) {
      errors.push(`${observation.semantic} semantic frame scroll must be null`);
    }
  }

  const landmarkIds = new Set(
    (frame.geometryContract?.landmarks ?? []).map((contract) => contract.id),
  );
  const regionIds = new Set(
    (frame.geometryContract?.regions ?? []).map((contract) => contract.id),
  );
  validateContractIds(frame, "landmarkIds", landmarkIds, errors);
  validateContractIds(frame, "regionIds", regionIds, errors);
}

export function validateSemanticEvidence(frame, evidenceFrame, errors) {
  const contract = frame.semanticObservation;
  const result = evidenceFrame?.semanticObservationResult;
  if (!result) {
    errors.push(`${frame.id} semantic observation did not PASS cleanly`);
    return;
  }
  if (
    result.status !== "PASS" ||
    !Array.isArray(result.failures) ||
    result.failures.length !== 0
  ) {
    errors.push(`${frame.id} semantic observation did not PASS cleanly`);
  }
  for (const field of ["id", "semantic", "selector", "scrollStrategy", "expected"]) {
    if (!isDeepStrictEqual(result[field], contract?.[field])) {
      errors.push(`${frame.id} semantic observation ${field} does not match contract`);
    }
  }
  if (
    !exactUniqueIds(result.landmarkResultIds, contract?.landmarkIds ?? []) ||
    !exactUniqueIds(result.regionResultIds, contract?.regionIds ?? [])
  ) {
    errors.push(`${frame.id} semantic result IDs do not exactly match contract`);
  }
  const executedLandmarkIds = new Set(
    (evidenceFrame.landmarkResults ?? [])
      .filter((item) => item?.status === "PASS")
      .map((item) => item.contractId),
  );
  const executedRegionIds = new Set(
    (evidenceFrame.regionResults ?? [])
      .filter((item) => item?.status === "PASS")
      .map((item) => item.contractId),
  );
  if (
    (result.landmarkResultIds ?? []).some((id) => !executedLandmarkIds.has(id)) ||
    (result.regionResultIds ?? []).some((id) => !executedRegionIds.has(id))
  ) {
    errors.push(`${frame.id} semantic result IDs do not bind executed PASS results`);
  }

  const observed = result.observed;
  if (observed?.selectorCount !== 1)
    errors.push(`${frame.id} semantic selectorCount must equal 1`);
  if (observed?.visible !== true)
    errors.push(`${frame.id} semantic observation is not visibly observed`);
  const positiveRect = (rect, fields) =>
    rect &&
    fields.every((field) => Number.isFinite(rect[field])) &&
    rect.width > 0 &&
    rect.height > 0;
  if (!positiveRect(observed?.bounds, ["x", "y", "width", "height"])) {
    errors.push(
      `${frame.id} semantic observed bounds are not positive finite geometry`,
    );
  }
  if (!positiveRect(observed?.viewportIntersection, ["width", "height"])) {
    errors.push(`${frame.id} semantic viewport intersection is not positive finite`);
  }
  if (
    !Number.isFinite(observed?.scroll?.x) ||
    !Number.isFinite(observed?.scroll?.y) ||
    (contract?.scrollStrategy?.kind === "absolute" &&
      (observed.scroll.x !== 0 || observed.scroll.y !== 0))
  ) {
    errors.push(`${frame.id} semantic observed scroll is invalid`);
  }
  if (!isDeepStrictEqual(observed?.attributes, contract?.expected?.attributes)) {
    errors.push(`${frame.id} semantic observed attributes do not match expected`);
  }
}

export function validateCoverageEvidence(coverage, result, evidenceFrameById, errors) {
  const frameIds = coverage?.frameIds ?? [];
  const frameResults = Array.isArray(result?.frameResults) ? result.frameResults : [];
  if (
    !result ||
    result.id !== coverage?.id ||
    result.status !== "PASS" ||
    !Array.isArray(result.failures) ||
    result.failures.length !== 0 ||
    !Array.isArray(result.missingFrameIds) ||
    result.missingFrameIds.length !== 0 ||
    !exactUniqueIds(result.frameIds, frameIds) ||
    frameResults.length !== frameIds.length ||
    new Set(frameResults.map((item) => item?.frameId)).size !== frameResults.length ||
    frameResults.some(
      (item) => !frameIds.includes(item?.frameId) || item.status !== "PASS",
    )
  ) {
    errors.push(
      `${coverage?.id} machine coverage result did not execute and PASS every frame`,
    );
  }

  const bindings = Array.isArray(coverage?.observations) ? coverage.observations : [];
  const observationResults = Array.isArray(result?.observationResults)
    ? result.observationResults
    : [];
  const resultById = new Map(
    observationResults.map((observation) => [observation?.id, observation]),
  );
  if (
    observationResults.length !== bindings.length ||
    resultById.size !== observationResults.length ||
    !arraysEqual(sorted(resultById.keys()), sorted(bindings.map((item) => item.id)))
  ) {
    errors.push(`${coverage?.id} observation result IDs do not exactly match config`);
  }
  for (const binding of bindings) {
    const observationResult = resultById.get(binding.id);
    if (!observationResult) {
      errors.push(`${coverage.id}/${binding.id} observation did not PASS cleanly`);
      continue;
    }
    if (
      observationResult.status !== "PASS" ||
      !Array.isArray(observationResult.failures) ||
      observationResult.failures.length !== 0
    ) {
      errors.push(`${coverage.id}/${binding.id} observation did not PASS cleanly`);
    }
    for (const field of ["id", "frameId", "semanticObservationId", "semantic"]) {
      if (observationResult[field] !== binding[field]) {
        errors.push(`${coverage.id}/${binding.id} observation binding changed`);
        break;
      }
    }
    if (
      !exactUniqueIds(
        observationResult.landmarkResultIds,
        binding.landmarkResultIds ?? [],
      ) ||
      !exactUniqueIds(observationResult.regionResultIds, binding.regionResultIds ?? [])
    ) {
      errors.push(
        `${coverage.id}/${binding.id} result IDs do not exactly match config`,
      );
    }
    const evidenceFrame = evidenceFrameById.get(binding.frameId);
    const semanticResult = evidenceFrame?.semanticObservationResult;
    if (
      semanticResult?.status !== "PASS" ||
      semanticResult.id !== binding.semanticObservationId ||
      semanticResult.semantic !== binding.semantic ||
      !exactUniqueIds(
        observationResult.landmarkResultIds,
        semanticResult.landmarkResultIds ?? [],
      ) ||
      !exactUniqueIds(
        observationResult.regionResultIds,
        semanticResult.regionResultIds ?? [],
      )
    ) {
      errors.push(
        `${coverage.id}/${binding.id} does not bind the frame semantic PASS result`,
      );
    }
    const executedLandmarkIds = new Set(
      (evidenceFrame?.landmarkResults ?? [])
        .filter((item) => item?.status === "PASS")
        .map((item) => item.contractId),
    );
    const executedRegionIds = new Set(
      (evidenceFrame?.regionResults ?? [])
        .filter((item) => item?.status === "PASS")
        .map((item) => item.contractId),
    );
    if (
      (observationResult.landmarkResultIds ?? []).some(
        (id) => !executedLandmarkIds.has(id),
      ) ||
      (observationResult.regionResultIds ?? []).some((id) => !executedRegionIds.has(id))
    ) {
      errors.push(
        `${coverage.id}/${binding.id} does not bind executed PASS result IDs`,
      );
    }
  }
}

export function validateCaptureRunEvidence(value, errors) {
  const {
    build,
    captureRun,
    config,
    configSha256,
    evidenceFrameById,
    runManifest,
    server,
    source,
  } = value;
  let currentRun;
  let manifestPath;
  try {
    currentRun = createCaptureRunIdentity({
      configSha256,
      source,
      build,
      server,
      captureEnvironment: config.captureEnvironment,
    });
    manifestPath = resolveCaptureRunPaths(
      config.captureArtifacts,
      currentRun,
      config.frames?.[0]?.actualFile,
    ).manifest;
  } catch (error) {
    errors.push(error.message);
    return null;
  }
  if (captureRun?.id !== currentRun.id) {
    errors.push("aggregate does not bind the current capture run ID");
  }
  if (
    captureRun?.manifest?.path !== manifestPath ||
    !SHA256.test(captureRun?.manifest?.sha256 ?? "")
  ) {
    errors.push("aggregate capture run manifest pointer is invalid");
  }
  if (
    runManifest?.schemaVersion !== 1 ||
    runManifest?.kind !== "fidelity-capture-run-manifest" ||
    runManifest?.status !== "COMPLETE" ||
    !Array.isArray(runManifest?.failures) ||
    runManifest.failures.length !== 0
  ) {
    errors.push("capture run manifest is not COMPLETE without failures");
  }
  if (
    runManifest?.run?.id !== currentRun.id ||
    !isDeepStrictEqual(runManifest?.run?.identity, currentRun.identity)
  ) {
    errors.push("capture run manifest identity is stale or changed");
  }
  if (
    runManifest?.config?.path !== "fidelity.config.json" ||
    runManifest?.config?.sha256 !== configSha256
  ) {
    errors.push("capture run manifest does not bind the current config");
  }
  if (!isDeepStrictEqual(runManifest?.source, source)) {
    errors.push("capture run manifest does not bind the current source");
  }
  if (!isDeepStrictEqual(runManifest?.build, build)) {
    errors.push("capture run manifest does not bind the current build");
  }
  if (!isDeepStrictEqual(runManifest?.server, server)) {
    errors.push("capture run manifest does not bind the current server");
  }
  if (!isDeepStrictEqual(runManifest?.captureEnvironment, config.captureEnvironment)) {
    errors.push("capture run manifest does not bind the capture environment");
  }

  const frames = Array.isArray(config.frames) ? config.frames : [];
  const manifestFrames = Array.isArray(runManifest?.frames) ? runManifest.frames : [];
  const manifestFrameById = new Map(manifestFrames.map((frame) => [frame?.id, frame]));
  if (
    manifestFrames.length !== frames.length ||
    manifestFrameById.size !== manifestFrames.length ||
    !arraysEqual(
      sorted(manifestFrameById.keys()),
      sorted(frames.map((frame) => frame.id)),
    )
  ) {
    errors.push("capture run manifest frame IDs do not exactly match config");
  }
  for (const frame of frames) {
    let paths;
    try {
      paths = resolveCaptureRunPaths(
        config.captureArtifacts,
        currentRun,
        frame.actualFile,
      );
    } catch (error) {
      errors.push(`${frame.id} ${error.message}`);
      continue;
    }
    const manifestFrame = manifestFrameById.get(frame.id);
    const evidenceFrame = evidenceFrameById.get(frame.id);
    if (
      manifestFrame?.label !== frame.label ||
      manifestFrame?.actual?.path !== paths.actual ||
      !SHA256.test(manifestFrame?.actual?.sha256 ?? "") ||
      manifestFrame?.provenance?.path !== paths.provenance ||
      !SHA256.test(manifestFrame?.provenance?.sha256 ?? "")
    ) {
      errors.push(`${frame.id} capture run manifest frame contract is invalid`);
      continue;
    }
    if (
      evidenceFrame?.actual?.path !== manifestFrame.actual.path ||
      evidenceFrame?.actual?.sha256 !== manifestFrame.actual.sha256 ||
      evidenceFrame?.captureProvenance?.path !== manifestFrame.provenance.path ||
      evidenceFrame?.captureProvenance?.sha256 !== manifestFrame.provenance.sha256
    ) {
      errors.push(`${frame.id} evidence does not bind immutable capture run bytes`);
    }
  }
  return { currentRun, manifestPath };
}

function validateCoverageObservations(item, frameById, errors) {
  const observations = Array.isArray(item?.observations) ? item.observations : [];
  const frameIds = item?.frameIds ?? [];
  const observationIds = uniqueIds(observations);
  const observationFrameIds = new Set(observations.map((entry) => entry?.frameId));
  if (
    observations.length !== frameIds.length ||
    observationIds.size !== observations.length
  ) {
    errors.push(`${item?.id} coverage observations must bind each frame exactly once`);
  }
  if (!arraysEqual(sorted(observationFrameIds), sorted(new Set(frameIds)))) {
    errors.push(`${item?.id} coverage observation frame IDs do not exactly match`);
  }
  for (const binding of observations) {
    const frame = frameById.get(binding?.frameId);
    const observation = frame?.semanticObservation;
    if (!frame || !observation) {
      errors.push(`${item?.id}/${binding?.id} observation references an invalid frame`);
      continue;
    }
    if (!SAFE_LABEL.test(binding?.id ?? ""))
      errors.push(`${item.id} coverage observation id is invalid`);
    if (binding?.status !== "approved")
      errors.push(`${item.id}/${binding?.id} coverage observation is not approved`);
    if (
      binding.semanticObservationId !== observation.id ||
      binding.semantic !== observation.semantic
    ) {
      errors.push(`${item.id}/${binding.id} semantic binding does not match its frame`);
    }
    if (
      !exactUniqueIds(binding.landmarkResultIds, observation.landmarkIds ?? []) ||
      !exactUniqueIds(binding.regionResultIds, observation.regionIds ?? [])
    ) {
      errors.push(
        `${item.id}/${binding.id} result IDs must exactly match the frame observation`,
      );
    }
  }
  return observations.filter((binding) => frameIds.includes(binding?.frameId));
}

function validateCoverageConfig(config, frameById, errors) {
  const coverage = Array.isArray(config.requiredCoverage)
    ? config.requiredCoverage
    : [];
  const byId = new Map();
  const observationsByCoverageId = new Map();
  for (const item of coverage) {
    if (!item?.id || byId.has(item.id))
      errors.push(`invalid or duplicate coverage id: ${item?.id}`);
    byId.set(item?.id, item);
    if (item?.status !== "approved")
      errors.push(`${item?.id} coverage is not approved`);
    if (!Array.isArray(item?.frameIds) || item.frameIds.length === 0) {
      errors.push(`${item?.id} coverage needs concrete frameIds`);
      continue;
    }
    if (new Set(item.frameIds).size !== item.frameIds.length)
      errors.push(`${item.id} coverage has duplicate frameIds`);
    for (const frameId of item.frameIds) {
      if (!frameById.has(frameId))
        errors.push(`${item.id} coverage references unknown frame ${frameId}`);
    }
    observationsByCoverageId.set(
      item?.id,
      validateCoverageObservations(item, frameById, errors),
    );
  }
  if (!arraysEqual(sorted(byId.keys()), sorted(REQUIRED_COVERAGE))) {
    errors.push("requiredCoverage must contain the complete canonical state matrix");
  }

  const expectTop = (coverageId, viewport) => {
    const frames = (byId.get(coverageId)?.frameIds ?? [])
      .map((id) => frameById.get(id))
      .filter(Boolean);
    const observations = observationsByCoverageId.get(coverageId) ?? [];
    if (
      frames.length !== 1 ||
      observations.length !== 1 ||
      !frames.some(
        (frame) =>
          `${frame.viewport?.width}x${frame.viewport?.height}` === viewport &&
          frame.state?.id === "menu-closed" &&
          frame.semanticObservation?.semantic === "top",
      )
    ) {
      errors.push(`${coverageId} lacks its exact top/menu-closed frame`);
    }
  };
  expectTop("desktop-top-menu-closed", "1440x900");
  expectTop("tablet-top-menu-closed", "768x1024");
  expectTop("mobile-top-menu-closed", "390x844");

  const expectChapterCoverage = (coverageId, viewport, label) => {
    const chapterObservations = observationsByCoverageId.get(coverageId) ?? [];
    for (const semantic of CHAPTER_SEMANTICS) {
      if (
        !chapterObservations.some((binding) => {
          const frame = frameById.get(binding.frameId);
          return (
            binding.semantic === semantic &&
            frame?.semanticObservation?.semantic === semantic &&
            `${frame.viewport?.width}x${frame.viewport?.height}` === viewport &&
            frame.state?.id === "menu-closed"
          );
        })
      ) {
        errors.push(`${label} chapter coverage lacks concrete ${semantic} frame`);
      }
    }
    if (
      chapterObservations.length !== CHAPTER_SEMANTICS.length ||
      !arraysEqual(
        sorted(chapterObservations.map((binding) => binding.semantic)),
        sorted(CHAPTER_SEMANTICS),
      )
    ) {
      errors.push(`${label} chapter coverage must bind the exact five semantics`);
    }
  };
  expectChapterCoverage("desktop-root-dusk-dawn-alpine-footer", "1440x900", "desktop");
  expectChapterCoverage("tablet-root-dusk-dawn-alpine-footer", "768x1024", "tablet");
  expectChapterCoverage("mobile-root-dusk-dawn-alpine-footer", "390x844", "mobile");

  const openFrames = (byId.get("menu-open-all-viewports")?.frameIds ?? [])
    .map((id) => frameById.get(id))
    .filter(Boolean);
  const openViewports = new Set(
    openFrames
      .filter(
        (frame) =>
          frame.state?.id === "menu-open" &&
          frame.semanticObservation?.semantic === "menu-open",
      )
      .map((frame) => `${frame.viewport.width}x${frame.viewport.height}`),
  );
  if (!arraysEqual(sorted(openViewports), sorted(REQUIRED_VIEWPORTS))) {
    errors.push("menu-open coverage must execute at all exact viewports");
  }
  return byId;
}

function validateGeometryContracts(frame, errors) {
  const geometry = frame.geometryContract;
  if (!geometry || geometry.status !== "approved") {
    errors.push(`${frame.id} geometry contract is not approved`);
    return;
  }
  const landmarks = Array.isArray(geometry.landmarks) ? geometry.landmarks : [];
  const regions = Array.isArray(geometry.regions) ? geometry.regions : [];
  if (landmarks.length === 0 || regions.length === 0) {
    errors.push(`${frame.id} needs landmark and region contracts`);
  }
  if (uniqueIds(landmarks).size !== landmarks.length)
    errors.push(`${frame.id} has duplicate landmark contract IDs`);
  if (uniqueIds(regions).size !== regions.length)
    errors.push(`${frame.id} has duplicate region contract IDs`);
  for (const landmark of landmarks) {
    if (
      !landmark?.id ||
      !landmark.detector?.id ||
      !pathIsWithin(landmark.detector?.path ?? "", DETECTOR_ROOT) ||
      !SHA256.test(landmark.detector?.sha256 ?? "") ||
      !landmark.thresholds ||
      typeof landmark.thresholds !== "object" ||
      Object.keys(landmark.thresholds).length === 0
    ) {
      errors.push(
        `${frame.id}/${landmark?.id} landmark lacks executable detector identity/hash`,
      );
    }
  }
  for (const region of regions) {
    if (
      !region?.id ||
      ![REFERENCE_ROOT, MASK_ROOT].some((root) =>
        pathIsWithin(region.mask?.path ?? "", root),
      ) ||
      !SHA256.test(region.mask?.sha256 ?? "") ||
      region.mask?.width !== frame.viewport?.width ||
      region.mask?.height !== frame.viewport?.height ||
      !region.thresholds ||
      typeof region.thresholds !== "object" ||
      Object.keys(region.thresholds).length === 0
    ) {
      errors.push(`${frame.id}/${region?.id} region lacks an approved exact-size mask`);
    }
  }
}

export function validateConfig(config, errors) {
  if (config.schemaVersion !== 2)
    errors.push("fidelity.config.json must use schemaVersion=2");
  if (config.foundationOnly !== false) errors.push("foundationOnly must be false");
  try {
    validateCaptureArtifactContract(config.captureArtifacts);
  } catch (error) {
    errors.push(error.message);
  }
  const frames = Array.isArray(config.frames) ? config.frames : [];
  const frameById = new Map();
  const labels = new Set();
  const actualFiles = new Set();
  const referencePaths = new Set();
  const seenViewports = new Set();
  const semanticObservationIds = new Set();
  for (const frame of frames) {
    if (!frame?.id || frameById.has(frame.id))
      errors.push(`invalid or duplicate frame id: ${frame?.id}`);
    frameById.set(frame?.id, frame);
    if (
      !SAFE_LABEL.test(frame?.label ?? "") ||
      typeof frame?.label !== "string" ||
      frame.label !== posix.basename(frame.label)
    ) {
      errors.push(`${frame?.id} label must be a safe basename`);
    }
    if (labels.has(frame?.label)) errors.push(`duplicate frame label: ${frame?.label}`);
    labels.add(frame?.label);
    const viewport = `${frame.viewport?.width}x${frame.viewport?.height}`;
    if (!REQUIRED_VIEWPORTS.has(viewport))
      errors.push(`${frame?.id} uses unsupported viewport ${viewport}`);
    else seenViewports.add(viewport);
    try {
      const reference = normalizeRelativePath(frame.reference, `${frame.id} reference`);
      if (!pathIsWithin(reference, REFERENCE_ROOT))
        errors.push(`${frame.id} reference is outside referenceRoot`);
      if (referencePaths.has(reference))
        errors.push(`duplicate reference path: ${reference}`);
      referencePaths.add(reference);
    } catch (error) {
      errors.push(error.message);
    }
    const expectedActualFile = `${frame.label}.png`;
    if (
      frame.actualFile !== expectedActualFile ||
      !SAFE_ACTUAL_FILE.test(frame.actualFile ?? "")
    ) {
      errors.push(`${frame.id} actualFile must equal its label plus .png`);
    }
    if (actualFiles.has(frame.actualFile))
      errors.push(`duplicate actualFile: ${frame.actualFile}`);
    actualFiles.add(frame.actualFile);
    if (Object.hasOwn(frame, "actual"))
      errors.push(`${frame.id} legacy actual path is forbidden`);
    if (
      frame.approvalStatus !== "approved" ||
      frame.referenceContract?.status !== "approved"
    ) {
      errors.push(`${frame?.id} reference is not approved`);
    }
    if (
      !SHA256.test(frame.referenceContract?.sha256 ?? "") ||
      frame.referenceContract?.width !== frame.viewport?.width ||
      frame.referenceContract?.height !== frame.viewport?.height
    ) {
      errors.push(`${frame?.id} immutable reference contract is invalid`);
    }
    validateGeometryContracts(frame, errors);
    validateSemanticObservation(frame, errors);
    if (semanticObservationIds.has(frame.semanticObservation?.id)) {
      errors.push(`duplicate semanticObservation id: ${frame.semanticObservation?.id}`);
    }
    semanticObservationIds.add(frame.semanticObservation?.id);
    validateThresholds(frame, errors);
  }
  for (const viewport of REQUIRED_VIEWPORTS) {
    if (!seenViewports.has(viewport))
      errors.push(`required viewport is missing: ${viewport}`);
  }
  const coverageById = validateCoverageConfig(config, frameById, errors);
  return { coverageById, frameById };
}
