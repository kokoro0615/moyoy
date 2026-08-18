#!/usr/bin/env node

import { constants, createReadStream } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { lstat, link, mkdir, open, realpath, unlink } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, isAbsolute, join, posix, relative, resolve, sep } from "node:path";

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
  landmarkResults: [],
  regionResults: [],
  status: "UNAVAILABLE",
  failures: [
    "No executed, hash-bound landmark detector or region-mask result was supplied.",
  ],
  evidenceStatus: "UNAVAILABLE",
  evidenceFailures: [
    "No executed, hash-bound landmark detector or region-mask result was supplied.",
  ],
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
process.exitCode = failures.length === 0 ? 0 : 1;

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
