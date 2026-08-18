import { constants } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { lstat, link, mkdir, open, readFile, realpath, unlink } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";

// @ts-expect-error The runtime-validated MJS contract intentionally has no public declaration file.
import { resolveCaptureRunPaths } from "../../scripts/fidelity-run-contract.mjs";

const CAPTURE_ROOT = "artifacts/fidelity/captures";
const SAFE_ARTIFACT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_ARTIFACT_ID_LENGTH = 96;

interface CaptureArtifactContract {
  readonly runManifestFile: "capture-run-manifest.json";
  readonly runsRoot: "artifacts/fidelity/captures/runs";
  readonly schemaVersion: 1;
}

interface CaptureRunIdentity {
  readonly id: string;
  readonly identity: {
    readonly build: { readonly id: string };
    readonly captureEnvironment: Readonly<Record<string, unknown>>;
    readonly configSha256: string;
    readonly server: Readonly<Record<string, unknown>>;
    readonly source: Readonly<Record<string, unknown>>;
  };
  readonly schemaVersion: 1;
}

export interface CaptureFrameDestinationInput {
  readonly actual: string;
  readonly id: string;
  readonly label: string;
}

export interface PreparedArtifactDestination {
  readonly absolute: string;
  readonly directoryLogical: string;
  readonly logical: string;
  readonly outputRoot: string;
  readonly parentCanonical: string;
  readonly projectRoot: string;
}

export interface CaptureRunFrameDestinationInput {
  readonly actualFile: string;
  readonly id: string;
  readonly label: string;
}

export interface PreparedCaptureRun {
  readonly frames: readonly PreparedCaptureDestination[];
  readonly id: string;
  readonly identity: CaptureRunIdentity;
  readonly logicalRoot: string;
  readonly manifest: PreparedArtifactDestination;
}

export interface PreparedCaptureDestination {
  readonly actual: PreparedArtifactDestination;
  readonly frameId: string;
  readonly provenance: PreparedArtifactDestination;
}

export interface PublishResult {
  readonly sha256: string;
  readonly status: "created" | "reused";
}

export async function prepareCaptureRun(
  projectRootValue: string,
  contract: CaptureArtifactContract,
  frames: readonly CaptureRunFrameDestinationInput[],
  identity: CaptureRunIdentity,
): Promise<PreparedCaptureRun> {
  if (!Array.isArray(frames) || frames.length === 0) {
    throw new Error("capture config must contain at least one frame");
  }
  const destinations = new Set<string>();
  const validated = frames.map((frame) => {
    const frameId = normalizeArtifactId(frame.id, "frame id");
    const label = normalizeArtifactId(frame.label, `${frameId} label`);
    const paths = resolveCaptureRunPaths(contract, identity, frame.actualFile);
    if (frame.actualFile !== `${label}.png`) {
      throw new Error(`${frameId} actualFile must equal ${label}.png`);
    }
    for (const logical of [paths.actual, paths.provenance]) {
      if (destinations.has(logical)) {
        throw new Error(`duplicate capture destination: ${logical}`);
      }
      destinations.add(logical);
    }
    return { frameId, paths };
  });
  const projectRoot = await realpath(resolve(projectRootValue));
  const logicalRoot = validated[0].paths.root;
  const outputRoot = await prepareDirectory(projectRoot, logicalRoot);
  const parentCanonical = await realpath(outputRoot);
  assertContained(projectRoot, parentCanonical, "capture run root");
  const preparedFrames = await Promise.all(
    validated.map(async ({ frameId, paths }) => ({
      actual: await prepareLeaf(
        projectRoot,
        outputRoot,
        parentCanonical,
        logicalRoot,
        paths.actual,
      ),
      frameId,
      provenance: await prepareLeaf(
        projectRoot,
        outputRoot,
        parentCanonical,
        logicalRoot,
        paths.provenance,
      ),
    })),
  );
  const manifestLogical = `${logicalRoot}/${contract.runManifestFile}`;
  return {
    frames: preparedFrames,
    id: identity.id,
    identity,
    logicalRoot,
    manifest: await prepareLeaf(
      projectRoot,
      outputRoot,
      parentCanonical,
      logicalRoot,
      manifestLogical,
    ),
  };
}

export async function prepareCaptureDestinations(
  projectRootValue: string,
  frames: readonly CaptureFrameDestinationInput[],
): Promise<readonly PreparedCaptureDestination[]> {
  if (!Array.isArray(frames) || frames.length === 0) {
    throw new Error("capture config must contain at least one frame");
  }

  const logicalDestinations = new Set<string>();
  const validated = frames.map((frame) => {
    const frameId = normalizeArtifactId(frame.id, "frame id");
    const label = normalizeArtifactId(frame.label, `${frameId} label`);
    const actual = normalizeCapturePath(frame.actual, `${frameId} capture output`);
    const expected = `${CAPTURE_ROOT}/${label}.png`;
    if (actual !== expected) {
      throw new Error(
        `${frameId} capture output must equal the deterministic label path ${expected}`,
      );
    }
    const provenance = `${actual}.provenance.json`;
    for (const logical of [actual, provenance]) {
      if (logicalDestinations.has(logical)) {
        throw new Error(`duplicate capture destination: ${logical}`);
      }
      logicalDestinations.add(logical);
    }
    return { actual, frameId, provenance };
  });

  const projectRoot = await realpath(resolve(projectRootValue));
  const outputRoot = await prepareCaptureRoot(projectRoot);
  const parentCanonical = await realpath(outputRoot);
  assertContained(projectRoot, parentCanonical, "capture output root");

  return Promise.all(
    validated.map(async ({ actual, frameId, provenance }) => ({
      actual: await prepareLeaf(
        projectRoot,
        outputRoot,
        parentCanonical,
        CAPTURE_ROOT,
        actual,
      ),
      frameId,
      provenance: await prepareLeaf(
        projectRoot,
        outputRoot,
        parentCanonical,
        CAPTURE_ROOT,
        provenance,
      ),
    })),
  );
}

export async function publishIdenticalOrCreate(
  destination: PreparedArtifactDestination,
  value: Buffer,
): Promise<PublishResult> {
  if (!Buffer.isBuffer(value)) {
    throw new Error("artifact publication requires an in-memory Buffer");
  }
  await assertPreparedDestination(destination);
  const existing = await readExisting(destination);
  if (existing) {
    if (!existing.equals(value)) {
      throw new Error(
        `artifact destination already exists with different bytes: ${destination.logical}`,
      );
    }
    return { sha256: sha256(value), status: "reused" };
  }

  const temporary = resolve(
    destination.parentCanonical,
    `.${basename(destination.absolute)}.tmp-${randomBytes(12).toString("hex")}`,
  );
  assertContained(destination.outputRoot, temporary, "temporary capture artifact");
  const flags =
    constants.O_CREAT |
    constants.O_EXCL |
    constants.O_WRONLY |
    (constants.O_NOFOLLOW ?? 0);
  const handle = await open(temporary, flags, 0o600);
  try {
    await handle.writeFile(value);
    await handle.sync();
  } finally {
    await handle.close();
  }

  try {
    await assertPreparedDestination(destination);
    await link(temporary, destination.absolute);
    await syncDirectory(destination.parentCanonical);
    return { sha256: sha256(value), status: "created" };
  } catch (error) {
    if (isNodeError(error) && error.code === "EEXIST") {
      await assertPreparedDestination(destination);
      const raced = await readExisting(destination);
      if (raced?.equals(value)) {
        return { sha256: sha256(value), status: "reused" };
      }
      throw new Error(
        `artifact destination already exists with different bytes: ${destination.logical}`,
      );
    }
    throw error;
  } finally {
    await unlink(temporary).catch((error: unknown) => {
      if (!isNodeError(error) || error.code !== "ENOENT") throw error;
    });
  }
}

export async function readPreparedArtifact(
  destination: PreparedArtifactDestination,
): Promise<Buffer> {
  await assertPreparedDestination(destination);
  const value = await readExisting(destination);
  if (!value) {
    throw new Error(`capture artifact is missing: ${destination.logical}`);
  }
  return value;
}

function normalizeArtifactId(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    value.normalize("NFKC") !== value ||
    value.length > MAX_ARTIFACT_ID_LENGTH ||
    !SAFE_ARTIFACT_ID.test(value)
  ) {
    throw new Error(
      `${label} must be a safe artifact id using lowercase ASCII letters, digits, and single hyphen separators`,
    );
  }
  return value;
}

function normalizeCapturePath(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.includes("\\") ||
    value.normalize("NFKC") !== value ||
    isAbsolute(value)
  ) {
    throw new Error(`${label} must be a normalized POSIX relative capture path`);
  }
  const parts = value.split("/");
  if (
    parts.some((part) => part === "" || part === "." || part === "..") ||
    !value.startsWith(`${CAPTURE_ROOT}/`)
  ) {
    throw new Error(`${label} must remain inside ${CAPTURE_ROOT}`);
  }
  const leaf = parts.at(-1);
  if (!leaf || !/^[a-z0-9]+(?:-[a-z0-9]+)*\.png$/.test(leaf)) {
    throw new Error(`${label} must use a safe deterministic PNG filename`);
  }
  return value;
}

async function prepareCaptureRoot(projectRoot: string): Promise<string> {
  return prepareDirectory(projectRoot, CAPTURE_ROOT);
}

async function prepareDirectory(
  projectRoot: string,
  logicalDirectory: string,
): Promise<string> {
  let current = projectRoot;
  for (const part of logicalDirectory.split("/")) {
    current = resolve(current, part);
    assertContained(projectRoot, current, "capture output root");
    let metadata = await lstat(current).catch((error: unknown) => {
      if (isNodeError(error) && error.code === "ENOENT") return null;
      throw error;
    });
    if (!metadata) {
      await mkdir(current, { mode: 0o700 }).catch((error: unknown) => {
        if (!isNodeError(error) || error.code !== "EEXIST") throw error;
      });
      metadata = await lstat(current);
    }
    if (metadata.isSymbolicLink()) {
      throw new Error("capture output root contains a symbolic-link component");
    }
    if (!metadata.isDirectory()) {
      throw new Error("capture output root contains a non-directory component");
    }
    const canonical = await realpath(current);
    assertContained(projectRoot, canonical, "capture output root");
    if (canonical !== current) {
      throw new Error("capture output root does not resolve component-wise");
    }
  }
  return current;
}

async function prepareLeaf(
  projectRoot: string,
  outputRoot: string,
  parentCanonical: string,
  directoryLogical: string,
  logical: string,
): Promise<PreparedArtifactDestination> {
  const absolute = resolve(projectRoot, ...logical.split("/"));
  assertContained(outputRoot, absolute, "capture artifact");
  await assertSafeLeaf(absolute, logical);
  return {
    absolute,
    directoryLogical,
    logical,
    outputRoot,
    parentCanonical,
    projectRoot,
  };
}

async function assertPreparedDestination(
  destination: PreparedArtifactDestination,
): Promise<void> {
  const expected = resolve(destination.projectRoot, ...destination.logical.split("/"));
  if (
    expected !== destination.absolute ||
    dirname(expected) !== destination.outputRoot
  ) {
    throw new Error("prepared capture destination binding is invalid");
  }
  await assertPathComponents(destination.projectRoot, destination.directoryLogical);
  const parentCanonical = await realpath(dirname(expected));
  if (parentCanonical !== destination.parentCanonical) {
    throw new Error("capture output parent changed after validation");
  }
  assertContained(destination.projectRoot, parentCanonical, "capture output parent");
  await assertSafeLeaf(expected, destination.logical);
}

async function assertPathComponents(root: string, logical: string): Promise<void> {
  let current = root;
  for (const part of logical.split("/")) {
    current = resolve(current, part);
    const metadata = await lstat(current);
    if (metadata.isSymbolicLink()) {
      throw new Error("capture output contains a symbolic-link component");
    }
    if (!metadata.isDirectory()) {
      throw new Error("capture output contains a non-directory component");
    }
  }
}

async function assertSafeLeaf(absolute: string, logical: string): Promise<void> {
  const metadata = await lstat(absolute).catch((error: unknown) => {
    if (isNodeError(error) && error.code === "ENOENT") return null;
    throw error;
  });
  if (!metadata) return;
  if (metadata.isSymbolicLink()) {
    throw new Error(`capture artifact is a symbolic-link: ${logical}`);
  }
  if (!metadata.isFile()) {
    throw new Error(`capture artifact is not a regular file: ${logical}`);
  }
}

async function readExisting(
  destination: PreparedArtifactDestination,
): Promise<Buffer | null> {
  const metadata = await lstat(destination.absolute).catch((error: unknown) => {
    if (isNodeError(error) && error.code === "ENOENT") return null;
    throw error;
  });
  if (!metadata) return null;
  if (metadata.isSymbolicLink() || !metadata.isFile()) {
    throw new Error(
      `capture artifact is not a safe regular file: ${destination.logical}`,
    );
  }
  return readFile(destination.absolute);
}

function assertContained(root: string, target: string, label: string): void {
  const logical = relative(root, target);
  if (
    logical === "" ||
    isAbsolute(logical) ||
    logical === ".." ||
    logical.startsWith(`..${sep}`)
  ) {
    throw new Error(`${label} must remain inside its configured root`);
  }
}

async function syncDirectory(path: string): Promise<void> {
  const flags = constants.O_RDONLY | (constants.O_DIRECTORY ?? 0);
  const handle = await open(path, flags);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && "code" in value;
}
