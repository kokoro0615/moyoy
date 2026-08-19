#!/usr/bin/env node

import { constants, createReadStream } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { lstat, link, mkdir, open, readFile, realpath, unlink } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const SAFE_ARTIFACT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256 = /^[a-f0-9]{64}$/;
const MAX_ARTIFACT_ID_LENGTH = 96;

const args = parseArguments(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}

for (const key of ["reference", "actual"]) {
  if (!args[key]) failUsage(`--${key} is required`);
}

const projectRoot = await realpath(resolve(args.root ?? process.cwd()));
const sharp = loadSharp(projectRoot);
const referenceFile = await resolveProjectFile(
  projectRoot,
  args.reference,
  "reference",
);
const actualFile = await resolveProjectFile(projectRoot, args.actual, "actual");
if (referenceFile.absolute === actualFile.absolute) {
  fail("reference and actual must be distinct files");
}
const outputDirectory = await prepareOutputDirectory(
  projectRoot,
  args.out ?? "artifacts/fidelity",
);
const label = normalizeArtifactId(
  args.label ?? basename(actualFile.logical).replace(/\.[^.]+$/, ""),
  "label",
);
const frameId = args.frameId ? normalizeArtifactId(args.frameId, "frame-id") : null;
if (args.configSha256 && !SHA256.test(args.configSha256)) {
  failUsage("--config-sha256 must be a lowercase SHA-256");
}
const referencePath = referenceFile.absolute;
const actualPath = actualFile.absolute;
const outputRoot = outputDirectory.absolute;
const referenceLogicalPath = referenceFile.logical;
const actualLogicalPath = actualFile.logical;
const outputLogicalRoot = outputDirectory.logical;
const artifactLeaves = [
  `${label}-overlay.png`,
  `${label}-difference.png`,
  `${label}-side-by-side.png`,
  `${label}-evidence.json`,
];
await assertDestinationsAvailable(outputRoot, artifactLeaves);
const [referenceSha256, actualSha256] = await Promise.all([
  sha256File(referencePath),
  sha256File(actualPath),
]);

const referenceSource = sharp(referencePath)
  .flatten({ background: "#ffffff" })
  .removeAlpha();
const actualSource = sharp(actualPath).flatten({ background: "#ffffff" }).removeAlpha();
const [referenceMetadata, actualMetadata] = await Promise.all([
  referenceSource.metadata(),
  actualSource.metadata(),
]);

assertRaster(referenceMetadata, "reference");
assertRaster(actualMetadata, "actual");

const referenceAspect = referenceMetadata.width / referenceMetadata.height;
const actualAspect = actualMetadata.width / actualMetadata.height;
const aspectDelta = Math.abs(referenceAspect / actualAspect - 1);
if (aspectDelta > args.maxAspectDelta) {
  fail(
    `Aspect ratios differ by ${(aspectDelta * 100).toFixed(3)}%; ` +
      `reference=${referenceMetadata.width}x${referenceMetadata.height}, ` +
      `actual=${actualMetadata.width}x${actualMetadata.height}. ` +
      "Fix capture framing or pass a deliberate --max-aspect-delta.",
  );
}

const width = actualMetadata.width;
const height = actualMetadata.height;
const reference = await sharp(referencePath)
  .flatten({ background: "#ffffff" })
  .removeAlpha()
  .resize(width, height, { fit: "fill", kernel: "lanczos3" })
  .toColorspace("srgb")
  .raw()
  .toBuffer();
const actual = await sharp(actualPath)
  .flatten({ background: "#ffffff" })
  .removeAlpha()
  .resize(width, height, { fit: "fill", kernel: "lanczos3" })
  .toColorspace("srgb")
  .raw()
  .toBuffer();

const metrics = compare(reference, actual, width, height, args.pixelThreshold);
const geometry = args.config
  ? await executeGeometryContract({
      actual,
      args,
      height,
      projectRoot,
      reference,
      sharp,
      width,
    })
  : {
      landmarkResults: [],
      regionResults: [],
      status: "UNAVAILABLE",
      failures: [
        "No executed, hash-bound landmark detector or region-mask result was supplied.",
      ],
    };
const mapping = {
  referenceRaster: {
    width: referenceMetadata.width,
    height: referenceMetadata.height,
  },
  implementationRaster: { width, height },
  referencePixelsPerCssPixel: {
    x: referenceMetadata.width / width,
    y: referenceMetadata.height / height,
  },
  aspectDelta,
};

const referencePng = await sharp(reference, {
  raw: { width, height, channels: 3 },
})
  .png()
  .toBuffer();
const actualPng = await sharp(actual, {
  raw: { width, height, channels: 3 },
})
  .png()
  .toBuffer();
const halfOpacityActualPng = await sharp(actualPng).ensureAlpha(0.5).png().toBuffer();

const [overlayPng, differencePng, sideBySidePng] = await Promise.all([
  sharp(referencePng)
    .composite([{ input: halfOpacityActualPng, blend: "over" }])
    .removeAlpha()
    .png()
    .toBuffer(),
  sharp(metrics.difference, {
    raw: { width, height, channels: 3 },
  })
    .png()
    .toBuffer(),
  sharp({
    create: {
      width: width * 2 + 24,
      height,
      channels: 3,
      background: "#0a0a0a",
    },
  })
    .composite([
      { input: referencePng, left: 0, top: 0 },
      { input: actualPng, left: width + 24, top: 0 },
    ])
    .png()
    .toBuffer(),
]);

const thresholds = {
  maxMae: args.maxMae,
  maxDiffRatio: args.maxDiffRatio,
  maxEdgeMae: args.maxEdgeMae,
  pixelThreshold: args.pixelThreshold,
};
const hasAcceptanceGate = [args.maxMae, args.maxDiffRatio, args.maxEdgeMae].some(
  (value) => value !== undefined,
);
const failures = [];
if (args.maxMae !== undefined && metrics.mae > args.maxMae) {
  failures.push(`MAE ${metrics.mae.toFixed(6)} > ${args.maxMae}`);
}
if (args.maxDiffRatio !== undefined && metrics.diffRatio > args.maxDiffRatio) {
  failures.push(`diff ratio ${metrics.diffRatio.toFixed(6)} > ${args.maxDiffRatio}`);
}
if (args.maxEdgeMae !== undefined && metrics.edgeMae > args.maxEdgeMae) {
  failures.push(`edge MAE ${metrics.edgeMae.toFixed(6)} > ${args.maxEdgeMae}`);
}

const globalStatus = hasAcceptanceGate
  ? failures.length === 0
    ? "PASS"
    : "FAIL"
  : "MEASURED";
const evidenceFailures = [
  ...(globalStatus === "FAIL" ? failures : []),
  ...geometry.failures,
];
const artifactBuffers = {
  difference: differencePng,
  overlay: overlayPng,
  sideBySide: sideBySidePng,
};
const artifacts = Object.fromEntries(
  Object.entries(artifactBuffers).map(([name, buffer]) => {
    const suffix = name === "sideBySide" ? "side-by-side" : name;
    return [
      name,
      {
        path: joinLogical(outputLogicalRoot, `${label}-${suffix}.png`),
        sha256: sha256Buffer(buffer),
      },
    ];
  }),
);
const report = {
  schemaVersion: 1,
  kind: "fidelity-frame-evidence",
  frameId,
  configSha256: args.configSha256 ?? null,
  label,
  reference: {
    path: referenceLogicalPath,
    sha256: referenceSha256,
    width: referenceMetadata.width,
    height: referenceMetadata.height,
  },
  actual: {
    path: actualLogicalPath,
    sha256: actualSha256,
    width: actualMetadata.width,
    height: actualMetadata.height,
  },
  mapping,
  globalResult: {
    metrics: {
      mae: metrics.mae,
      rmse: metrics.rmse,
      diffRatio: metrics.diffRatio,
      edgeMae: metrics.edgeMae,
    },
    thresholds,
    status: globalStatus,
    failures,
  },
  thresholds,
  landmarkResults: geometry.landmarkResults,
  regionResults: geometry.regionResults,
  status:
    globalStatus === "PASS" && geometry.status === "PASS" ? "PASS" : "UNAVAILABLE",
  failures: evidenceFailures,
  evidenceStatus:
    globalStatus === "PASS" && geometry.status === "PASS" ? "PASS" : "UNAVAILABLE",
  evidenceFailures,
  artifacts,
};
const reportBuffer = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
await publishArtifactsAtomically(outputRoot, [
  { leaf: `${label}-overlay.png`, value: overlayPng },
  { leaf: `${label}-difference.png`, value: differencePng },
  { leaf: `${label}-side-by-side.png`, value: sideBySidePng },
  { leaf: `${label}-evidence.json`, value: reportBuffer },
]);

process.stdout.write(`Visual fidelity: ${label}\n`);
process.stdout.write(
  `  reference ${referenceMetadata.width}x${referenceMetadata.height} -> ${width}x${height} ` +
    `(scale ${mapping.referencePixelsPerCssPixel.x.toFixed(6)}x / ${mapping.referencePixelsPerCssPixel.y.toFixed(6)}y)\n`,
);
process.stdout.write(`  MAE        ${metrics.mae.toFixed(6)}\n`);
process.stdout.write(`  RMSE       ${metrics.rmse.toFixed(6)}\n`);
process.stdout.write(
  `  diff ratio ${metrics.diffRatio.toFixed(6)} @ ${args.pixelThreshold}\n`,
);
process.stdout.write(`  edge MAE   ${metrics.edgeMae.toFixed(6)}\n`);
process.stdout.write(
  `  artifacts  ${outputLogicalRoot}/${label}-{overlay,difference,side-by-side}.png\n`,
);
process.stdout.write(`             ${outputLogicalRoot}/${label}-evidence.json\n`);
process.stdout.write(
  `  ${globalStatus}${failures.length ? `: ${failures.join("; ")}` : ""}` +
    `${hasAcceptanceGate ? "" : ": no acceptance thresholds supplied"}\n`,
);
process.exitCode =
  failures.length === 0 && (!args.config || geometry.status === "PASS") ? 0 : 1;

function compare(reference, actual, width, height, pixelThreshold) {
  const difference = Buffer.alloc(width * height * 3);
  let absolute = 0;
  let squared = 0;
  let differentPixels = 0;
  for (let index = 0; index < reference.length; index += 3) {
    const dr = Math.abs(reference[index] - actual[index]);
    const dg = Math.abs(reference[index + 1] - actual[index + 1]);
    const db = Math.abs(reference[index + 2] - actual[index + 2]);
    absolute += dr + dg + db;
    squared += dr * dr + dg * dg + db * db;
    const pixelDifference = (dr + dg + db) / (3 * 255);
    if (pixelDifference > pixelThreshold) differentPixels += 1;
    const heat = Math.min(255, Math.round(Math.max(dr, dg, db) * 3));
    difference[index] = heat;
    difference[index + 1] = Math.round(heat * 0.12);
    difference[index + 2] = 0;
  }

  const channelCount = width * height * 3;
  return {
    mae: absolute / (channelCount * 255),
    rmse: Math.sqrt(squared / channelCount) / 255,
    diffRatio: differentPixels / (width * height),
    edgeMae: compareEdges(reference, actual, width, height),
    difference,
  };
}

async function executeGeometryContract({
  actual,
  args,
  height,
  projectRoot,
  reference,
  sharp,
  width,
}) {
  if (!args.frameId) failUsage("--frame-id is required with --config");
  const configFile = await resolveProjectFile(projectRoot, args.config, "config");
  const configBytes = await readFile(configFile.absolute);
  const configHash = sha256Buffer(configBytes);
  if (args.configSha256 && args.configSha256 !== configHash) {
    fail("config file does not match --config-sha256");
  }
  let config;
  try {
    config = JSON.parse(configBytes.toString("utf8"));
  } catch {
    fail("config is invalid JSON");
  }
  const frame = config.frames?.find((candidate) => candidate.id === args.frameId);
  if (!frame) fail(`frame is missing from config: ${args.frameId}`);
  const contract = frame.geometryContract;
  if (contract?.status !== "approved" || contract?.executionStatus !== "available") {
    fail(`geometry contract is unavailable for ${args.frameId}`);
  }

  const landmarkResults = [];
  for (const landmark of contract.landmarks ?? []) {
    const detectorFile = await resolveProjectFile(
      projectRoot,
      landmark.detector?.path,
      `${landmark.id} detector`,
    );
    const detectorHash = await sha256File(detectorFile.absolute);
    if (detectorHash !== landmark.detector?.sha256) {
      fail(`${landmark.id} detector hash mismatch`);
    }
    const detector = await import(
      `${pathToFileURL(detectorFile.absolute).href}?sha256=${detectorHash}`
    );
    if (typeof detector.detectLandmark !== "function") {
      fail(`${landmark.id} detector does not export detectLandmark`);
    }
    const referenceResult = detector.detectLandmark({
      channels: 3,
      data: reference,
      height,
      parameters: landmark.parameters,
      width,
    });
    const actualResult = detector.detectLandmark({
      channels: 3,
      data: actual,
      height,
      parameters: landmark.parameters,
      width,
    });
    const deltaPx = Math.abs(referenceResult.position - actualResult.position);
    const landmarkFailures = [];
    if (deltaPx > landmark.thresholds.maxDeltaPx) {
      landmarkFailures.push(
        `position delta ${deltaPx}px > ${landmark.thresholds.maxDeltaPx}px`,
      );
    }
    if (referenceResult.confidence < landmark.thresholds.minConfidence) {
      landmarkFailures.push("reference detector confidence is below threshold");
    }
    if (actualResult.confidence < landmark.thresholds.minConfidence) {
      landmarkFailures.push("actual detector confidence is below threshold");
    }
    landmarkResults.push({
      contractId: landmark.id,
      detector: landmark.detector,
      parameters: landmark.parameters,
      reference: referenceResult,
      actual: actualResult,
      metrics: { deltaPx },
      thresholds: landmark.thresholds,
      status: landmarkFailures.length === 0 ? "PASS" : "FAIL",
      failures: landmarkFailures,
    });
  }

  const regionResults = [];
  for (const region of contract.regions ?? []) {
    const maskFile = await resolveProjectFile(
      projectRoot,
      region.mask?.path,
      `${region.id} mask`,
    );
    const maskHash = await sha256File(maskFile.absolute);
    if (maskHash !== region.mask?.sha256) fail(`${region.id} mask hash mismatch`);
    const mask = await loadRegionMask({
      file: maskFile,
      height,
      label: region.id,
      sharp,
      width,
    });
    const regionMetrics = compareMasked(
      reference,
      actual,
      mask,
      width,
      height,
      region.thresholds.pixelThreshold,
    );
    const regionFailures = [];
    if (regionMetrics.mae > region.thresholds.maxMae) {
      regionFailures.push(
        `MAE ${regionMetrics.mae.toFixed(6)} > ${region.thresholds.maxMae}`,
      );
    }
    if (regionMetrics.diffRatio > region.thresholds.maxDiffRatio) {
      regionFailures.push(
        `diff ratio ${regionMetrics.diffRatio.toFixed(6)} > ${region.thresholds.maxDiffRatio}`,
      );
    }
    if (regionMetrics.edgeMae > region.thresholds.maxEdgeMae) {
      regionFailures.push(
        `edge MAE ${regionMetrics.edgeMae.toFixed(6)} > ${region.thresholds.maxEdgeMae}`,
      );
    }
    regionResults.push({
      contractId: region.id,
      mask: region.mask,
      metrics: regionMetrics,
      thresholds: region.thresholds,
      status: regionFailures.length === 0 ? "PASS" : "FAIL",
      failures: regionFailures,
    });
  }

  const geometryFailures = [...landmarkResults, ...regionResults].flatMap((result) =>
    result.failures.map((failure) => `${result.contractId}: ${failure}`),
  );
  return {
    landmarkResults,
    regionResults,
    status: geometryFailures.length === 0 ? "PASS" : "FAIL",
    failures: geometryFailures,
  };
}

async function loadRegionMask({ file, height, label, sharp, width }) {
  if (file.logical.endsWith(".json")) {
    let contract;
    try {
      contract = JSON.parse(await readFile(file.absolute, "utf8"));
    } catch {
      fail(`${label} region-mask JSON is invalid`);
    }
    if (
      contract.schemaVersion !== 1 ||
      contract.width !== width ||
      contract.height !== height ||
      !Array.isArray(contract.rectangles) ||
      contract.rectangles.length === 0
    ) {
      fail(`${label} region-mask contract does not match the capture frame`);
    }
    const mask = Buffer.alloc(width * height);
    for (const rectangle of contract.rectangles) {
      if (!validMaskRectangle(rectangle, width, height)) {
        fail(`${label} region-mask rectangle is invalid`);
      }
      for (let y = rectangle.y; y < rectangle.y + rectangle.height; y += 1) {
        mask.fill(
          255,
          y * width + rectangle.x,
          y * width + rectangle.x + rectangle.width,
        );
      }
    }
    return mask;
  }
  const maskImage = sharp(file.absolute).greyscale();
  const metadata = await maskImage.metadata();
  if (metadata.width !== width || metadata.height !== height) {
    fail(`${label} mask dimensions do not match the capture frame`);
  }
  return maskImage.raw().toBuffer();
}

function validMaskRectangle(value, width, height) {
  return (
    value != null &&
    [value.x, value.y, value.width, value.height].every(Number.isInteger) &&
    value.x >= 0 &&
    value.y >= 0 &&
    value.width > 0 &&
    value.height > 0 &&
    value.x + value.width <= width &&
    value.y + value.height <= height
  );
}

function compareMasked(reference, actual, mask, width, height, pixelThreshold) {
  let absolute = 0;
  let differentPixels = 0;
  let selectedPixels = 0;
  let edgeAbsolute = 0;
  let edgeCount = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      if (mask[pixel] === 0) continue;
      const index = pixel * 3;
      const dr = Math.abs(reference[index] - actual[index]);
      const dg = Math.abs(reference[index + 1] - actual[index + 1]);
      const db = Math.abs(reference[index + 2] - actual[index + 2]);
      absolute += dr + dg + db;
      selectedPixels += 1;
      if ((dr + dg + db) / (3 * 255) > pixelThreshold) differentPixels += 1;
      if (x > 0 && y > 0 && mask[pixel - 1] > 0 && mask[pixel - width] > 0) {
        const referenceEdge =
          Math.abs(luminance(reference, index) - luminance(reference, index - 3)) +
          Math.abs(
            luminance(reference, index) - luminance(reference, index - width * 3),
          );
        const actualEdge =
          Math.abs(luminance(actual, index) - luminance(actual, index - 3)) +
          Math.abs(luminance(actual, index) - luminance(actual, index - width * 3));
        edgeAbsolute += Math.abs(referenceEdge - actualEdge);
        edgeCount += 1;
      }
    }
  }
  if (selectedPixels === 0) fail("region mask selects no pixels");
  return {
    selectedPixels,
    mae: absolute / (selectedPixels * 3 * 255),
    diffRatio: differentPixels / selectedPixels,
    edgeMae: edgeCount === 0 ? 0 : edgeAbsolute / (edgeCount * 510),
  };
}

function compareEdges(reference, actual, width, height) {
  let total = 0;
  let count = 0;
  for (let y = 1; y < height; y += 1) {
    for (let x = 1; x < width; x += 1) {
      const index = (y * width + x) * 3;
      const left = index - 3;
      const above = index - width * 3;
      const referenceEdge =
        Math.abs(luminance(reference, index) - luminance(reference, left)) +
        Math.abs(luminance(reference, index) - luminance(reference, above));
      const actualEdge =
        Math.abs(luminance(actual, index) - luminance(actual, left)) +
        Math.abs(luminance(actual, index) - luminance(actual, above));
      total += Math.abs(referenceEdge - actualEdge);
      count += 1;
    }
  }
  return count === 0 ? 0 : total / (count * 510);
}

function luminance(buffer, index) {
  return (
    buffer[index] * 0.2126 + buffer[index + 1] * 0.7152 + buffer[index + 2] * 0.0722
  );
}

function loadSharp(root) {
  try {
    const require = createRequire(join(root, "package.json"));
    return require("sharp");
  } catch (error) {
    fail(
      `The target project must provide \"sharp\" (directly or transitively) to run visual-fidelity.mjs. ` +
        `Resolution failed from the project root: ${redactProjectRoot(error.message, root)}`,
    );
  }
}

function normalizeRelativePath(value, label) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.includes("\\") ||
    value.normalize("NFKC") !== value
  ) {
    failUsage(`${label} must be a normalized POSIX relative path`);
  }
  const logicalPath = posix.normalize(value);
  if (
    logicalPath !== value ||
    logicalPath === ".." ||
    logicalPath === "." ||
    logicalPath.startsWith("../") ||
    logicalPath.startsWith("/")
  ) {
    failUsage(`${label} must remain inside the project root`);
  }
  return logicalPath;
}

function normalizeArtifactId(value, label) {
  if (
    typeof value !== "string" ||
    value.normalize("NFKC") !== value ||
    value.length > MAX_ARTIFACT_ID_LENGTH ||
    !SAFE_ARTIFACT_ID.test(value)
  ) {
    failUsage(
      `${label} must be 1-${MAX_ARTIFACT_ID_LENGTH} lowercase ASCII letters, digits, or single hyphen separators`,
    );
  }
  return value;
}

async function resolveProjectFile(root, value, label) {
  const logical = normalizeRelativePath(value, label);
  const absolute = resolve(root, ...logical.split("/"));
  assertContained(root, absolute);
  await assertNoSymlinkComponents(root, logical, false, label);
  const metadata = await lstat(absolute).catch(() => null);
  if (!metadata?.isFile()) fail(`${label} must be an existing regular file`);
  const canonical = await realpath(absolute);
  assertContained(root, canonical);
  return { absolute: canonical, logical };
}

async function prepareOutputDirectory(root, value) {
  const logical = normalizeRelativePath(value, "out");
  const absolute = resolve(root, ...logical.split("/"));
  assertContained(root, absolute);
  await assertNoSymlinkComponents(root, logical, true, "output directory");
  await mkdir(absolute, { recursive: true });
  await assertNoSymlinkComponents(root, logical, false, "output directory");
  const canonical = await realpath(absolute);
  assertContained(root, canonical);
  return { absolute: canonical, logical };
}

function assertContained(root, target) {
  const logical = relative(root, target);
  if (
    logical === "" ||
    isAbsolute(logical) ||
    logical === ".." ||
    logical.startsWith(`..${sep}`)
  ) {
    fail("comparison inputs and outputs must remain inside the project root");
  }
}

async function assertNoSymlinkComponents(root, logical, allowMissing, label) {
  let current = root;
  for (const part of logical.split("/")) {
    current = resolve(current, part);
    let metadata;
    try {
      metadata = await lstat(current);
    } catch {
      if (allowMissing) return;
      fail(`${label} is missing`);
    }
    if (metadata.isSymbolicLink()) {
      fail(`${label} contains a symbolic-link component`);
    }
  }
}

async function assertDestinationsAvailable(root, leaves) {
  if (new Set(leaves).size !== leaves.length) {
    fail("artifact destinations must be unique");
  }
  for (const leaf of leaves) {
    try {
      await lstat(join(root, leaf));
      fail(`artifact destination already exists: ${leaf}`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

async function publishArtifactsAtomically(root, artifacts) {
  const published = [];
  const temporary = [];
  try {
    await assertDestinationsAvailable(
      root,
      artifacts.map(({ leaf }) => leaf),
    );
    for (const artifact of artifacts) {
      const destination = join(root, artifact.leaf);
      const temporaryPath = join(
        root,
        `.${artifact.leaf}.tmp-${randomBytes(12).toString("hex")}`,
      );
      temporary.push(temporaryPath);
      const flags =
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_WRONLY |
        (constants.O_NOFOLLOW ?? 0);
      const handle = await open(temporaryPath, flags, 0o600);
      try {
        await handle.writeFile(artifact.value);
        await handle.sync();
      } finally {
        await handle.close();
      }
      await link(temporaryPath, destination);
      published.push(destination);
      await unlink(temporaryPath);
      temporary.pop();
    }
  } catch (error) {
    await Promise.allSettled([
      ...temporary.map((path) => unlink(path)),
      ...published.map((path) => unlink(path)),
    ]);
    const detail =
      error?.code === "EEXIST" ? "artifact destination already exists" : error.message;
    fail(redactProjectRoot(detail, root));
  }
}

async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function sha256Buffer(value) {
  return createHash("sha256").update(value).digest("hex");
}

function joinLogical(root, leaf) {
  return `${root.replace(/\/$/, "")}/${leaf}`;
}

function redactProjectRoot(message, root) {
  return String(message)
    .replaceAll(root, "<project-root>")
    .replaceAll(root.replaceAll("/", "\\"), "<project-root>");
}

function assertRaster(metadata, label) {
  if (!metadata.width || !metadata.height) {
    fail(`${label} does not have readable raster dimensions`);
  }
}

function parseArguments(argv) {
  const parsed = {
    root: undefined,
    reference: undefined,
    actual: undefined,
    out: undefined,
    label: undefined,
    frameId: undefined,
    config: undefined,
    configSha256: undefined,
    pixelThreshold: 0.1,
    maxAspectDelta: 0.01,
    maxMae: undefined,
    maxDiffRatio: undefined,
    maxEdgeMae: undefined,
    help: false,
  };
  const valueOptions = new Set([
    "root",
    "reference",
    "actual",
    "out",
    "label",
    "frame-id",
    "config",
    "config-sha256",
    "pixel-threshold",
    "max-aspect-delta",
    "max-mae",
    "max-diff-ratio",
    "max-edge-mae",
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      parsed.help = true;
      continue;
    }
    if (!argument.startsWith("--") || !valueOptions.has(argument.slice(2))) {
      failUsage(`unknown argument: ${argument}`);
    }
    const key = argument.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) failUsage(`${argument} requires a value`);
    index += 1;
    const property = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    parsed[property] = [
      "pixelThreshold",
      "maxAspectDelta",
      "maxMae",
      "maxDiffRatio",
      "maxEdgeMae",
    ].includes(property)
      ? parseNumber(value, argument)
      : value;
  }
  return parsed;
}

function parseNumber(value, option) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0)
    failUsage(`${option} must be a non-negative number`);
  return number;
}

function failUsage(message) {
  process.stderr.write(`visual-fidelity: ${message}\nUse --help for usage.\n`);
  process.exit(2);
}

function fail(message) {
  process.stderr.write(`visual-fidelity: ${message}\n`);
  process.exit(1);
}

function printHelp() {
  process.stdout.write(
    `Usage: visual-fidelity.mjs --reference FILE --actual FILE [options]\n\n`,
  );
  process.stdout.write(
    "Creates normalized overlay, difference, side-by-side, and frame-evidence artifacts.\n",
  );
  process.stdout.write(
    "It exits nonzero only for supplied acceptance thresholds or invalid framing.\n\n",
  );
  process.stdout.write("Options:\n");
  process.stdout.write(
    "  --root DIR              Dependency and relative-path root (default: cwd)\n",
  );
  process.stdout.write("  --reference FILE        Approved reference raster\n");
  process.stdout.write(
    "  --actual FILE           Deterministic implementation capture\n",
  );
  process.stdout.write(
    "  --out DIR               Artifact directory (default: artifacts/fidelity)\n",
  );
  process.stdout.write("  --label NAME            Artifact prefix\n");
  process.stdout.write(
    "  --frame-id ID           Config frame ID for evidence binding\n",
  );
  process.stdout.write(
    "  --config FILE           Execute that frame's geometry contract\n",
  );
  process.stdout.write("  --config-sha256 HASH    Config hash for evidence binding\n");
  process.stdout.write(
    "  --pixel-threshold N      Per-pixel RGB threshold, 0..1 (default: 0.1)\n",
  );
  process.stdout.write(
    "  --max-aspect-delta N     Allowed aspect-ratio delta (default: 0.01)\n",
  );
  process.stdout.write("  --max-mae N              Optional normalized MAE gate\n");
  process.stdout.write(
    "  --max-diff-ratio N       Optional changed-pixel-ratio gate\n",
  );
  process.stdout.write(
    "  --max-edge-mae N         Optional normalized edge MAE gate\n",
  );
}
