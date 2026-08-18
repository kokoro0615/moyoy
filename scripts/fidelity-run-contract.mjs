import { createHash } from "node:crypto";
import { posix } from "node:path";

export const CAPTURE_RUNS_ROOT = "artifacts/fidelity/captures/runs";
export const CAPTURE_RUN_MANIFEST_FILE = "capture-run-manifest.json";

const SHA256 = /^[a-f0-9]{64}$/;
const SAFE_FILE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.png$/;
const SOURCE_STATES = new Set(["clean", "dirty", "uncommitted"]);

export function createCaptureRunIdentity(value) {
  const identity = normalizeIdentity(value);
  const id = createHash("sha256")
    .update(canonicalize({ schemaVersion: 1, ...identity }))
    .digest("hex");
  return { schemaVersion: 1, id, identity };
}

export function resolveCaptureRunPaths(captureArtifacts, run, actualFile) {
  validateCaptureArtifactContract(captureArtifacts);
  if (run?.schemaVersion !== 1 || !SHA256.test(run?.id ?? "") || !run?.identity) {
    throw new Error("capture run identity is invalid");
  }
  if (
    typeof actualFile !== "string" ||
    actualFile.normalize("NFKC") !== actualFile ||
    !SAFE_FILE.test(actualFile)
  ) {
    throw new Error("capture actualFile must be a safe deterministic PNG filename");
  }
  const root = `${captureArtifacts.runsRoot}/${run.id}`;
  return {
    root,
    actual: `${root}/${actualFile}`,
    provenance: `${root}/${actualFile}.provenance.json`,
    manifest: `${root}/${captureArtifacts.runManifestFile}`,
  };
}

export function validateCaptureArtifactContract(value) {
  if (
    value?.schemaVersion !== 1 ||
    value?.runsRoot !== CAPTURE_RUNS_ROOT ||
    value?.runManifestFile !== CAPTURE_RUN_MANIFEST_FILE
  ) {
    throw new Error("captureArtifacts must use the immutable run contract");
  }
  const normalizedRoot = posix.normalize(value.runsRoot);
  if (
    normalizedRoot !== value.runsRoot ||
    normalizedRoot.startsWith("../") ||
    normalizedRoot.startsWith("/")
  ) {
    throw new Error("captureArtifacts runsRoot is unsafe");
  }
}

export function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
    .join(",")}}`;
}

function normalizeIdentity(value) {
  if (!SHA256.test(value?.configSha256 ?? "")) {
    throw new Error("capture run configSha256 must be a lowercase SHA-256");
  }
  if (value?.build?.id !== null && !safeText(value?.build?.id)) {
    throw new Error("capture run build identity is missing or unsafe");
  }
  if (
    !validObject(value?.source) ||
    !SOURCE_STATES.has(value.source.state) ||
    (value.source.revision !== null && !safeText(value.source.revision))
  ) {
    throw new Error("capture run source identity is invalid");
  }
  if (!validCaptureEnvironment(value?.captureEnvironment)) {
    throw new Error("capture run environment is invalid");
  }
  if (!validServer(value?.server)) {
    throw new Error("capture run server identity is invalid");
  }
  return {
    configSha256: value.configSha256,
    source: {
      revision: value.source.revision,
      state: value.source.state,
    },
    build: { id: value.build.id },
    server: {
      command: value.server.command,
      origin: value.server.origin,
      ownedByPlaywright: value.server.ownedByPlaywright,
      pid: value.server.pid,
      pidEvidence: value.server.pidEvidence,
      reuseExistingServer: value.server.reuseExistingServer,
    },
    captureEnvironment: {
      colorScheme: value.captureEnvironment.colorScheme,
      deviceScaleFactor: value.captureEnvironment.deviceScaleFactor,
      locale: value.captureEnvironment.locale,
      timezoneId: value.captureEnvironment.timezoneId,
    },
  };
}

function validCaptureEnvironment(value) {
  return (
    validObject(value) &&
    value.colorScheme === "light" &&
    value.deviceScaleFactor === 1 &&
    value.locale === "ja-JP" &&
    value.timezoneId === "Asia/Tokyo"
  );
}

function validServer(value) {
  return (
    validObject(value) &&
    value.command === "corepack pnpm start:test" &&
    value.origin === "http://127.0.0.1:4173" &&
    value.ownedByPlaywright === true &&
    value.pid === null &&
    safeText(value.pidEvidence) &&
    value.reuseExistingServer === false
  );
}

function safeText(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 512 &&
    value.normalize("NFKC") === value &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function validObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
