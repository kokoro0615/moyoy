#!/usr/bin/env node

import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile } from "node:fs/promises";
import { posix, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import {
  createCaptureRunIdentity,
  resolveCaptureRunPaths,
} from "./fidelity-run-contract.mjs";
import {
  ACTUAL_ROOT,
  DETECTOR_ROOT,
  REFERENCE_ROOT,
  REQUIRED_COVERAGE,
  validateCaptureRunEvidence,
  validateConfig,
  validateCoverageEvidence,
  validateSemanticEvidence,
} from "./candidate-config-contract.mjs";

const SHA256 = /^[a-f0-9]{64}$/;
const SIGNER_POLICY_PATH = "config/trusted-approval-signers.json";
const EVIDENCE_MANIFEST_PATH =
  "artifacts/fidelity/comparisons/fidelity-evidence-manifest.json";
const COMPARISON_ROOT = "artifacts/fidelity/comparisons";
const EXPECTED_SERVER = {
  command: "corepack pnpm start:test",
  origin: "http://127.0.0.1:4173",
  ownedByPlaywright: true,
  reuseExistingServer: false,
};

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

function pathIsWithin(path, root) {
  return path.startsWith(`${root}/`);
}

function rootsOverlap(left, right) {
  return left === right || pathIsWithin(left, right) || pathIsWithin(right, left);
}

function sorted(values) {
  return [...values].sort();
}

function arraysEqual(left, right) {
  return (
    left.length === right.length && left.every((value, index) => value === right[index])
  );
}

export function canonicalizeJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new Error("signed payload contains a non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeJson).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(value[key])}`)
      .join(",")}}`;
  }
  throw new Error("signed payload contains an unsupported JSON value");
}

function sha256Buffer(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function readJson(path, errors, label) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    errors.push(`${label} is missing or invalid JSON`);
    return null;
  }
}

async function assertNoSymlink(root, relativePath, errors, label, requireFile = true) {
  const parts = relativePath.split("/");
  let current = root;
  for (const part of parts) {
    current = resolve(current, part);
    try {
      const fileStat = await lstat(current);
      if (fileStat.isSymbolicLink()) {
        errors.push(`${label} contains a symbolic-link component: ${relativePath}`);
        return false;
      }
    } catch {
      if (requireFile) errors.push(`${label} is missing: ${relativePath}`);
      return false;
    }
  }
  return true;
}

function validateServer(server, errors, label) {
  if (!server || typeof server !== "object") {
    errors.push(`${label} server provenance is missing`);
    return;
  }
  for (const [key, value] of Object.entries(EXPECTED_SERVER)) {
    if (server[key] !== value) errors.push(`${label} server ${key} is invalid`);
  }
  if (server.pid !== null && (!Number.isSafeInteger(server.pid) || server.pid <= 0)) {
    errors.push(`${label} server pid must be null or a positive integer`);
  }
  if (server.pid === null && !server.pidEvidence?.trim()) {
    errors.push(`${label} null server pid needs explicit pidEvidence`);
  }
}

function readGitState(root) {
  const revision = spawnSync("git", ["rev-parse", "--verify", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  if (revision.status !== 0) return { revision: null, state: "uncommitted" };
  const status = spawnSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    { cwd: root, encoding: "utf8" },
  );
  return {
    revision: revision.stdout.trim(),
    state: status.status === 0 && status.stdout.trim() === "" ? "clean" : "dirty",
  };
}

async function assertTrackedAtHead(root, relativePath, errors, label) {
  const result = spawnSync("git", ["show", `HEAD:${relativePath}`], {
    cwd: root,
    encoding: null,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0 || result.error) {
    errors.push(`${label} is not tracked in the current revision`);
    return;
  }
  try {
    const worktreeBytes = await readFile(resolve(root, relativePath));
    if (!result.stdout.equals(worktreeBytes)) {
      errors.push(`${label} differs from the current revision`);
    }
  } catch {
    errors.push(`${label} is missing from the worktree`);
  }
}

function validateSignerPolicy(policy, errors) {
  if (policy?.schemaVersion !== 1)
    errors.push("trusted signer policy must use schemaVersion=1");
  if (policy?.requiredRole !== "fidelity-reference-approver") {
    errors.push("trusted signer policy has the wrong requiredRole");
  }
  if (!Array.isArray(policy?.signers))
    errors.push("trusted signer policy signers must be an array");
  if (Array.isArray(policy?.signers) && policy.signers.length === 0) {
    errors.push("no trusted fidelity approval signer is enrolled");
  }
  const ids = new Set();
  for (const signer of policy?.signers ?? []) {
    if (!signer?.id || ids.has(signer.id))
      errors.push(`invalid or duplicate trusted signer: ${signer?.id}`);
    ids.add(signer?.id);
    if (signer.algorithm !== "ed25519" || signer.status !== "active") {
      errors.push(`trusted signer is not an active Ed25519 key: ${signer?.id}`);
    }
    if (!signer.roles?.includes(policy.requiredRole))
      errors.push(`trusted signer lacks required role: ${signer?.id}`);
    if (!signer.publicKeyPem?.includes("BEGIN PUBLIC KEY"))
      errors.push(`trusted signer public key is invalid: ${signer?.id}`);
    if (/PRIVATE KEY/.test(signer.publicKeyPem ?? ""))
      errors.push(`trusted signer policy contains private key material: ${signer?.id}`);
  }
}

export function verifySignedApproval(manifest, signerPolicy) {
  const errors = [];
  validateSignerPolicy(signerPolicy, errors);
  if (manifest?.schemaVersion !== 2 || !manifest.payload || !manifest.signature) {
    return [...errors, "approval manifest must use signed schemaVersion=2"];
  }
  const signature = manifest.signature;
  if (signature.algorithm !== "ed25519")
    errors.push("approval signature algorithm must be ed25519");
  const signer = signerPolicy?.signers?.find((item) => item.id === signature.signerId);
  if (!signer)
    return [...errors, "approval signer is not in the tracked trusted signer policy"];
  const payloadBytes = Buffer.from(canonicalizeJson(manifest.payload));
  const payloadHash = sha256Buffer(payloadBytes);
  if (
    !SHA256.test(signature.payloadSha256 ?? "") ||
    signature.payloadSha256 !== payloadHash
  ) {
    errors.push("approval signed payload SHA-256 is invalid or changed");
  }
  let signatureBytes;
  try {
    signatureBytes = Buffer.from(signature.value, "base64");
    if (
      signatureBytes.length === 0 ||
      signatureBytes.toString("base64") !== signature.value
    ) {
      throw new Error("non-canonical base64");
    }
  } catch {
    errors.push("approval signature value is not canonical base64");
    return errors;
  }
  try {
    const publicKey = createPublicKey(signer.publicKeyPem);
    if (publicKey.asymmetricKeyType !== "ed25519") {
      errors.push("approval trusted key is not Ed25519");
      return errors;
    }
    if (!verifySignature(null, payloadBytes, publicKey, signatureBytes)) {
      errors.push("approval signature verification failed");
    }
  } catch {
    errors.push("approval signature verification failed");
  }
  return errors;
}

export async function validateSignedPayload(root, config, manifest, errors) {
  const payload = manifest.payload;
  if (
    payload?.decision !== "approved" ||
    payload?.approvalScope !== "technical-fidelity-references"
  ) {
    errors.push(
      "signed approval payload does not approve technical fidelity references",
    );
  }
  if (!Number.isFinite(Date.parse(payload?.approvedAt ?? "")))
    errors.push("signed approval approvedAt is invalid");
  const configHash = await sha256File(resolve(root, "fidelity.config.json"));
  if (
    payload?.fidelityConfig?.path !== "fidelity.config.json" ||
    payload.fidelityConfig.sha256 !== configHash
  ) {
    errors.push("signed approval does not bind the current fidelity config");
  }
  if (
    payload?.referenceRoot !== REFERENCE_ROOT ||
    payload?.actualRoot !== ACTUAL_ROOT
  ) {
    errors.push("signed approval artifact roots are invalid");
  }
  if (rootsOverlap(payload?.referenceRoot ?? "", payload?.actualRoot ?? "")) {
    errors.push("signed approval artifact roots overlap");
  }
  const approvedFrames = new Map(
    (payload?.frames ?? []).map((frame) => [frame.id, frame]),
  );
  if (
    !arraysEqual(
      sorted(approvedFrames.keys()),
      sorted((config.frames ?? []).map((frame) => frame.id)),
    )
  ) {
    errors.push("signed approval frame IDs do not exactly match config");
  }
  for (const frame of config.frames ?? []) {
    const approved = approvedFrames.get(frame.id);
    if (
      approved?.reference !== frame.reference ||
      approved?.sha256 !== frame.referenceContract.sha256 ||
      approved?.width !== frame.viewport.width ||
      approved?.height !== frame.viewport.height
    ) {
      errors.push(`${frame.id} signed reference approval does not match config`);
    }
  }
  if (
    !arraysEqual(
      sorted(new Set(payload?.requiredCoverage ?? [])),
      sorted(REQUIRED_COVERAGE),
    )
  ) {
    errors.push("signed approval coverage IDs are incomplete");
  }
}

async function validateFileHash(
  root,
  contract,
  errors,
  label,
  expectedRoot,
  dimensions,
) {
  let path;
  try {
    path = normalizeRelativePath(contract?.path, `${label} path`);
    if (!pathIsWithin(path, expectedRoot))
      errors.push(`${label} path is outside ${expectedRoot}`);
  } catch (error) {
    errors.push(error.message);
    return;
  }
  if (!SHA256.test(contract?.sha256 ?? "")) errors.push(`${label} SHA-256 is invalid`);
  if (!(await assertNoSymlink(root, path, errors, label))) return;
  if ((await sha256File(resolve(root, path))) !== contract.sha256)
    errors.push(`${label} SHA-256 changed`);
  if (dimensions) {
    try {
      const metadata = await sharp(resolve(root, path)).metadata();
      if (
        contract.width !== dimensions.width ||
        contract.height !== dimensions.height ||
        metadata.width !== dimensions.width ||
        metadata.height !== dimensions.height
      ) {
        errors.push(`${label} dimensions do not match exact viewport`);
      }
    } catch {
      errors.push(`${label} is not a readable raster image`);
    }
  }
}

function validateExecutedResults(frame, evidenceFrame, errors) {
  const hasFiniteMetricPayload = (value) => {
    let numericValues = 0;
    const visit = (item) => {
      if (typeof item === "number") {
        if (!Number.isFinite(item)) return false;
        numericValues += 1;
        return true;
      }
      if (typeof item === "boolean" || item === null) return true;
      if (Array.isArray(item)) return item.every(visit);
      if (item && typeof item === "object") return Object.values(item).every(visit);
      return false;
    };
    return visit(value) && numericValues > 0;
  };
  const validateResults = (kind, contracts, results) => {
    const resultById = new Map(
      (results ?? []).map((result) => [result.contractId, result]),
    );
    if (
      !arraysEqual(sorted(resultById.keys()), sorted(contracts.map((item) => item.id)))
    ) {
      errors.push(`${frame.id} ${kind} result IDs do not exactly match contracts`);
    }
    for (const contract of contracts) {
      const result = resultById.get(contract.id);
      if (!result || result.status !== "PASS" || result.failures?.length !== 0) {
        errors.push(`${frame.id}/${contract.id} ${kind} result did not PASS`);
        continue;
      }
      const identity = kind === "landmark" ? result.detector : result.mask;
      const expected = kind === "landmark" ? contract.detector : contract.mask;
      if (!isDeepStrictEqual(identity, expected))
        errors.push(
          `${frame.id}/${contract.id} ${kind} executable identity/hash changed`,
        );
      if (
        !result.reference ||
        typeof result.reference !== "object" ||
        !result.actual ||
        typeof result.actual !== "object" ||
        !hasFiniteMetricPayload(result.reference) ||
        !hasFiniteMetricPayload(result.actual) ||
        !isDeepStrictEqual(result.thresholds, contract.thresholds)
      ) {
        errors.push(`${frame.id}/${contract.id} ${kind} result payload is incomplete`);
      }
    }
  };
  validateResults(
    "landmark",
    frame.geometryContract.landmarks,
    evidenceFrame.landmarkResults,
  );
  validateResults(
    "region",
    frame.geometryContract.regions,
    evidenceFrame.regionResults,
  );
}

export async function validateEvidenceFrame(
  root,
  configHash,
  source,
  buildId,
  frame,
  evidenceFrame,
  errors,
) {
  if (
    evidenceFrame?.status !== "PASS" ||
    !Array.isArray(evidenceFrame?.failures) ||
    evidenceFrame.failures.length !== 0
  ) {
    errors.push(`${frame.id} aggregate frame evidence did not PASS cleanly`);
  }
  const semantics = ["id", "label", "route", "state", "scroll", "viewport", "capture"];
  for (const field of semantics) {
    if (!isDeepStrictEqual(evidenceFrame?.[field], frame[field]))
      errors.push(`${frame.id} evidence ${field} does not match config`);
  }
  await validateFileHash(
    root,
    evidenceFrame?.reference,
    errors,
    `${frame.id} evidence reference`,
    REFERENCE_ROOT,
    frame.viewport,
  );
  await validateFileHash(
    root,
    evidenceFrame?.actual,
    errors,
    `${frame.id} evidence actual`,
    ACTUAL_ROOT,
    frame.viewport,
  );
  if (
    evidenceFrame?.reference?.path !== frame.reference ||
    evidenceFrame?.reference?.sha256 !== frame.referenceContract.sha256 ||
    posix.basename(evidenceFrame?.actual?.path ?? "") !== frame.actualFile
  ) {
    errors.push(`${frame.id} evidence file contracts do not match config`);
  }
  if (evidenceFrame?.reference?.sha256 === evidenceFrame?.actual?.sha256) {
    errors.push(`${frame.id} actual bytes cannot be a copy of the approved reference`);
  }

  const provenance = evidenceFrame?.captureProvenance;
  if (provenance?.path !== `${evidenceFrame?.actual?.path}.provenance.json`) {
    errors.push(`${frame.id} capture provenance path is not the owned sidecar`);
  }
  await validateFileHash(
    root,
    provenance,
    errors,
    `${frame.id} capture provenance`,
    ACTUAL_ROOT,
  );
  const sidecar = provenance?.path
    ? await readJson(
        resolve(root, provenance.path),
        errors,
        `${frame.id} capture provenance`,
      )
    : null;
  if (sidecar) {
    let expectedRun;
    let expectedRunPaths;
    try {
      expectedRun = createCaptureRunIdentity({
        configSha256: configHash.sha256,
        source,
        build: { id: buildId },
        server: sidecar.server,
        captureEnvironment: configHash.captureEnvironment,
      });
      expectedRunPaths = resolveCaptureRunPaths(
        configHash.captureArtifacts,
        expectedRun,
        frame.actualFile,
      );
    } catch (error) {
      errors.push(`${frame.id} ${error.message}`);
    }
    const semanticResult = evidenceFrame.semanticObservationResult;
    const expectedScroll =
      frame.semanticObservation?.scrollStrategy?.kind === "selector-anchor"
        ? semanticResult?.observed?.scroll
        : frame.scroll;
    const expectedCapture = {
      colorScheme: configHash.captureEnvironment?.colorScheme,
      deviceScaleFactor: configHash.captureEnvironment?.deviceScaleFactor,
      locale: configHash.captureEnvironment?.locale,
      reducedMotion: "reduce",
      route: frame.route,
      scroll: expectedScroll,
      scrollStrategy: frame.semanticObservation?.scrollStrategy,
      state: frame.state.id,
      timezoneId: configHash.captureEnvironment?.timezoneId,
      viewport: frame.viewport,
      fullPage: frame.capture?.fullPage,
    };
    if (
      sidecar.version !== 3 ||
      sidecar.kind !== "fidelity-capture-provenance" ||
      sidecar.frameId !== frame.id ||
      sidecar.frameLabel !== frame.label ||
      sidecar.actualFile !== frame.actualFile ||
      sidecar.actual !== evidenceFrame.actual.path ||
      sidecar.actualSha256 !== evidenceFrame.actual.sha256 ||
      sidecar.configSha256 !== configHash.sha256 ||
      sidecar.build?.id !== buildId ||
      sidecar.build?.sourceRevision !== source.revision ||
      sidecar.build?.sourceState !== "clean" ||
      sidecar.run?.id !== expectedRun?.id ||
      !isDeepStrictEqual(sidecar.run?.identity, expectedRun?.identity) ||
      evidenceFrame.actual.path !== expectedRunPaths?.actual ||
      provenance.path !== expectedRunPaths?.provenance ||
      !isDeepStrictEqual(sidecar.semanticObservationResult, semanticResult) ||
      !isDeepStrictEqual(sidecar.capture, expectedCapture)
    ) {
      errors.push(
        `${frame.id} capture provenance does not bind current build/config/frame`,
      );
    }
    validateServer(sidecar.server, errors, `${frame.id} capture provenance`);
    if (
      provenance.actualSha256 !== sidecar.actualSha256 ||
      provenance.configSha256 !== sidecar.configSha256 ||
      !isDeepStrictEqual(provenance.browser, sidecar.browser) ||
      !isDeepStrictEqual(provenance.build, { id: buildId }) ||
      !isDeepStrictEqual(provenance.source, source) ||
      !isDeepStrictEqual(provenance.server, sidecar.server) ||
      !isDeepStrictEqual(provenance.capture, sidecar.capture) ||
      !isDeepStrictEqual(
        provenance.semanticObservationResult,
        sidecar.semanticObservationResult,
      )
    ) {
      errors.push(`${frame.id} aggregate provenance does not match its hashed sidecar`);
    }
  }

  await validateFileHash(
    root,
    evidenceFrame?.comparisonArtifact,
    errors,
    `${frame.id} comparison artifact`,
    COMPARISON_ROOT,
  );
  const report = evidenceFrame?.comparisonArtifact?.path
    ? await readJson(
        resolve(root, evidenceFrame.comparisonArtifact.path),
        errors,
        `${frame.id} comparison artifact`,
      )
    : null;
  if (
    !report ||
    report.evidenceStatus !== "PASS" ||
    report.failures?.length !== 0 ||
    report.frameId !== frame.id ||
    report.configSha256 !== configHash.sha256 ||
    !isDeepStrictEqual(report.reference, evidenceFrame.reference) ||
    !isDeepStrictEqual(report.actual, evidenceFrame.actual) ||
    !isDeepStrictEqual(report.thresholds, frame.thresholds) ||
    !isDeepStrictEqual(report.globalResult, evidenceFrame.globalResult) ||
    !isDeepStrictEqual(
      report.semanticObservationResult,
      evidenceFrame.semanticObservationResult,
    ) ||
    !isDeepStrictEqual(report.landmarkResults, evidenceFrame.landmarkResults) ||
    !isDeepStrictEqual(report.regionResults, evidenceFrame.regionResults)
  ) {
    errors.push(`${frame.id} comparison artifact does not bind aggregate results`);
  }
  if (
    evidenceFrame?.globalResult?.status !== "PASS" ||
    evidenceFrame.globalResult?.failures?.length !== 0 ||
    !evidenceFrame.globalResult?.metrics ||
    Object.values(evidenceFrame.globalResult.metrics).some(
      (value) => !Number.isFinite(value),
    )
  ) {
    errors.push(`${frame.id} global comparison did not PASS with numeric metrics`);
  }
  if (!isDeepStrictEqual(evidenceFrame?.thresholds, frame.thresholds))
    errors.push(`${frame.id} evidence thresholds changed`);
  validateExecutedResults(frame, evidenceFrame, errors);
  validateSemanticEvidence(frame, evidenceFrame, errors);
}

async function validateEvidenceManifest(root, config, frameById, coverageById, errors) {
  if (
    !(await assertNoSymlink(
      root,
      EVIDENCE_MANIFEST_PATH,
      errors,
      "fidelity evidence manifest",
    ))
  ) {
    return;
  }
  const manifest = await readJson(
    resolve(root, EVIDENCE_MANIFEST_PATH),
    errors,
    "fidelity evidence manifest",
  );
  if (!manifest) return;
  const configHash = await sha256File(resolve(root, "fidelity.config.json"));
  const source = readGitState(root);
  const buildId = (
    await readFile(resolve(root, ".next/BUILD_ID"), "utf8").catch(() => "")
  ).trim();
  if (
    manifest.schemaVersion !== 1 ||
    manifest.status !== "PASS" ||
    manifest.failures?.length !== 0
  ) {
    errors.push("fidelity evidence manifest did not PASS cleanly");
  }
  if (
    manifest.config?.path !== "fidelity.config.json" ||
    manifest.config?.sha256 !== configHash
  ) {
    errors.push("fidelity evidence manifest does not bind current config");
  }
  if (
    !source.revision ||
    source.state !== "clean" ||
    !isDeepStrictEqual(manifest.source, source)
  ) {
    errors.push("fidelity evidence must bind the current clean committed revision");
  }
  if (!buildId || manifest.build?.id !== buildId)
    errors.push("fidelity evidence does not bind the current build ID");
  validateServer(manifest.server, errors, "aggregate evidence");
  if (!isDeepStrictEqual(manifest.captureEnvironment, config.captureEnvironment)) {
    errors.push("fidelity evidence captureEnvironment does not match config");
  }
  const evidenceFrameById = new Map(
    (manifest.frames ?? []).map((frame) => [frame.id, frame]),
  );
  if (!arraysEqual(sorted(evidenceFrameById.keys()), sorted(frameById.keys()))) {
    errors.push("fidelity evidence frame IDs do not exactly match config");
  }
  let captureRunManifest;
  try {
    const captureRunManifestPath = normalizeRelativePath(
      manifest.captureRun?.manifest?.path,
      "capture run manifest path",
    );
    if (!pathIsWithin(captureRunManifestPath, ACTUAL_ROOT)) {
      errors.push("capture run manifest is outside the immutable runs root");
    } else {
      await validateFileHash(
        root,
        manifest.captureRun.manifest,
        errors,
        "capture run manifest",
        ACTUAL_ROOT,
      );
      captureRunManifest = await readJson(
        resolve(root, captureRunManifestPath),
        errors,
        "capture run manifest",
      );
    }
  } catch (error) {
    errors.push(error.message);
  }
  if (captureRunManifest) {
    validateCaptureRunEvidence(
      {
        captureRun: manifest.captureRun,
        config,
        configSha256: configHash,
        source,
        build: { id: buildId },
        server: manifest.server,
        runManifest: captureRunManifest,
        evidenceFrameById,
      },
      errors,
    );
  }
  const configContract = {
    captureArtifacts: config.captureArtifacts,
    captureEnvironment: config.captureEnvironment,
    sha256: configHash,
  };
  const comparisonPaths = new Set();
  const provenancePaths = new Set();
  for (const [frameId, frame] of frameById) {
    const evidenceFrame = evidenceFrameById.get(frameId);
    if (!evidenceFrame) continue;
    const comparisonPath = evidenceFrame.comparisonArtifact?.path;
    const provenancePath = evidenceFrame.captureProvenance?.path;
    if (comparisonPath === EVIDENCE_MANIFEST_PATH) {
      errors.push(
        `${frameId} comparison artifact cannot self-reference the aggregate manifest`,
      );
    }
    if (comparisonPaths.has(comparisonPath))
      errors.push(`duplicate comparison artifact path: ${comparisonPath}`);
    if (provenancePaths.has(provenancePath))
      errors.push(`duplicate capture provenance path: ${provenancePath}`);
    comparisonPaths.add(comparisonPath);
    provenancePaths.add(provenancePath);
    await validateEvidenceFrame(
      root,
      configContract,
      source,
      buildId,
      frame,
      evidenceFrame,
      errors,
    );
  }

  const evidenceCoverageById = new Map(
    (manifest.requiredCoverage ?? []).map((item) => [item.id, item]),
  );
  if (!arraysEqual(sorted(evidenceCoverageById.keys()), sorted(coverageById.keys()))) {
    errors.push("fidelity evidence coverage IDs do not exactly match config");
  }
  for (const [id, coverage] of coverageById) {
    const result = evidenceCoverageById.get(id);
    validateCoverageEvidence(coverage, result, evidenceFrameById, errors);
  }
}

export async function validateCandidatePreflight(root = process.cwd()) {
  const errors = [];
  const config = await readJson(
    resolve(root, "fidelity.config.json"),
    errors,
    "fidelity.config.json",
  );
  if (!config) return errors;
  await assertTrackedAtHead(root, "fidelity.config.json", errors, "fidelity config");
  const { coverageById, frameById } = validateConfig(config, errors);

  let approvalPath;
  try {
    approvalPath = normalizeRelativePath(config.approvalManifest, "approvalManifest");
    if (!pathIsWithin(approvalPath, ".private/approvals"))
      errors.push("approvalManifest must remain private");
  } catch (error) {
    errors.push(error.message);
  }
  const approval = approvalPath
    ? await readJson(resolve(root, approvalPath), errors, "approval manifest")
    : null;
  const signerPolicy = await readJson(
    resolve(root, SIGNER_POLICY_PATH),
    errors,
    "trusted signer policy",
  );
  if (signerPolicy) {
    await assertTrackedAtHead(
      root,
      SIGNER_POLICY_PATH,
      errors,
      "trusted signer policy",
    );
  }
  if (signerPolicy && !approval) validateSignerPolicy(signerPolicy, errors);
  if (approval && signerPolicy) {
    errors.push(...verifySignedApproval(approval, signerPolicy));
    await validateSignedPayload(root, config, approval, errors);
  }

  for (const frame of config.frames ?? []) {
    await validateFileHash(
      root,
      {
        path: frame.reference,
        sha256: frame.referenceContract?.sha256,
        width: frame.referenceContract?.width,
        height: frame.referenceContract?.height,
      },
      errors,
      `${frame.id} approved reference`,
      REFERENCE_ROOT,
      frame.viewport,
    );
    for (const landmark of frame.geometryContract?.landmarks ?? []) {
      await assertTrackedAtHead(
        root,
        landmark.detector?.path,
        errors,
        `${frame.id}/${landmark.id} detector`,
      );
      await validateFileHash(
        root,
        landmark.detector,
        errors,
        `${frame.id}/${landmark.id} detector`,
        DETECTOR_ROOT,
      );
    }
    for (const region of frame.geometryContract?.regions ?? []) {
      await validateFileHash(
        root,
        region.mask,
        errors,
        `${frame.id}/${region.id} mask`,
        REFERENCE_ROOT,
        frame.viewport,
      );
    }
  }

  await validateEvidenceManifest(root, config, frameById, coverageById, errors);
  return errors;
}

async function main() {
  const errors = await validateCandidatePreflight();
  if (errors.length > 0) {
    process.stderr.write("TECHNICAL CANDIDATE BLOCKED:\n");
    for (const error of errors) process.stderr.write(`- ${error}\n`);
    process.stderr.write(
      "This gate cannot authorize deployment or production release.\n",
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    "Technical candidate is bound to a trusted signed approval and current machine evidence.\n",
  );
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) await main();
