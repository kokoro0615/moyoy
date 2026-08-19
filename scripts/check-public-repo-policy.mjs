#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile } from "node:fs/promises";
import { extname, posix, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { TextDecoder } from "node:util";
import { pathToFileURL } from "node:url";

const MAX_PUBLIC_FILE_BYTES = 10 * 1024 * 1024;
const PRIVATE_SEGMENTS = new Set([".private", "20260818_web"]);
const SHA256 = /^[a-f0-9]{64}$/;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const DOS_EPS_MAGIC = Buffer.from([0xc5, 0xd0, 0xd3, 0xc6]);
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
const WOFF2_MAGIC = Buffer.from([0x77, 0x4f, 0x46, 0x32]);
const STRICT_BINARY_ROOT = "tests/visual/__screenshots__";
const POLICY_PATH = "config/public-binary-allowlist.json";
const COPY_POLICY_PATH = "config/public-copy-allowlist.json";
const PRODUCTION_ASSET_ROOT = "public/assets/moyoy-candidate";

const MASTER_EXTENSIONS = new Set([
  ".3fr",
  ".7z",
  ".ai",
  ".ait",
  ".arw",
  ".bz2",
  ".cr2",
  ".cr3",
  ".dfont",
  ".dmg",
  ".dng",
  ".eps",
  ".fig",
  ".gz",
  ".idml",
  ".iiq",
  ".indd",
  ".iso",
  ".nef",
  ".orf",
  ".otf",
  ".pdf",
  ".pef",
  ".psb",
  ".psd",
  ".raf",
  ".rar",
  ".rw2",
  ".rwl",
  ".sit",
  ".sitx",
  ".sketch",
  ".srw",
  ".tar",
  ".tgz",
  ".ttc",
  ".ttf",
  ".xcf",
  ".xz",
  ".zip",
  ".zst",
]);

const ROOT_TEXT_FILES = new Set([
  ".gitattributes",
  ".gitignore",
  ".vercelignore",
  "src/app/icon.svg",
  ".npmrc",
  ".nvmrc",
  ".prettierignore",
  "AGENTS.md",
  "eslint.config.mjs",
  "fidelity.config.json",
  "lighthouserc.cjs",
  "next-env.d.ts",
  "next.config.ts",
  "package.json",
  "playwright.config.ts",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "postcss.config.mjs",
  "prettier.config.mjs",
  "tsconfig.json",
  "vercel.json",
  "vitest.config.ts",
]);

const TEXT_ROOTS = [
  [".Codex/docs/", new Set([".md"])],
  [".claude/docs/", new Set([".md"])],
  [".github/workflows/", new Set([".yaml", ".yml"])],
  ["config/", new Set([".json"])],
  ["docs/", new Set([".csv", ".md"])],
  ["scripts/", new Set([".cjs", ".mjs"])],
  ["src/", new Set([".css", ".ts", ".tsx"])],
  ["tests/", new Set([".mjs", ".ts", ".tsx"])],
];

const TEXT_SIGNATURES = [
  ["private key material", /-----BEGIN (?:DSA|EC|OPENSSH|PGP|RSA) PRIVATE KEY-----/i],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ["Stripe secret", /\bsk_(?:live|test)_[A-Za-z0-9]{20,}\b/],
  ["Google API key", /\bAIza[A-Za-z0-9_-]{30,}\b/],
  [
    "JWT-like token",
    /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/,
  ],
  ["POSIX workstation path", /(?:^|[\s"'`(])\/(?:home|Users)\/[A-Za-z0-9._-]+\//m],
  ["mounted workstation path", /(?:^|[\s"'`(])\/Volumes\/[A-Za-z0-9._ -]+\//m],
  ["Windows workstation path", /\b[A-Za-z]:\\Users\\[^\\\r\n]+\\/],
  ["camera raw identifier", /\b(?:8U9A\d{4}|_DSC\d{4})\b/],
  ["private browser-slice identifier", /\bbrowser_1200_[A-Za-z0-9_-]*\b/i],
  ["private NEWS source identifier", /\bnews_0[1-9]\b/i],
  ["Japanese postal address marker", /〒\s*\d{3}-\d{4}/],
  ["Japanese telephone number", /\b0\d{1,4}-\d{1,4}-\d{3,4}\b/],
  [
    "device serial value",
    /\b(?:camera|device|lens)\s+serial(?:\s+number)?\s*[:=]\s*\S+/i,
  ],
];

const ASCII_POSTSCRIPT = new RegExp(["^\\s*%!", "PS-Adobe-"].join(""), "m");
const POSTSCRIPT_BOUNDING_BOX = new RegExp(["%%", "BoundingBox\\s*:"].join(""));
const ILLUSTRATOR_PRIVATE = new RegExp(["AI", "PrivateData"].join(""), "i");
const ILLUSTRATOR_CREATOR = new RegExp(
  ["%%", "Creator\\s*:[^\\r\\n]*Adobe\\s+Illustrator"].join(""),
  "i",
);
const SVG_ROOT = new RegExp(["<", "svg\\b"].join(""), "i");
const SVG_IMAGE = new RegExp(["<", "image(?:\\s|>)"].join(""), "i");
const SVG_FOREIGN_OBJECT = new RegExp(["<", "foreignObject\\b"].join(""), "i");
const SVG_SCRIPT = new RegExp(["<", "script\\b"].join(""), "i");
const IMAGE_DATA_URI = new RegExp(["data", ":image\\s*[/;]"].join(""), "i");
const SVG_EXTERNAL_URI = /(?:href|xlink:href|src)\s*=\s*["']\s*(?:https?:|\/\/|file:)/i;
const SVG_EXTERNAL_CSS = /(?:@import|url\s*\(\s*["']?\s*(?:https?:|\/\/|file:))/i;
const SVG_HREF = /(?:href|xlink:href|src)\s*=\s*(["'])(.*?)\1/gi;
const SVG_CSS_URL = /url\s*\(\s*(["']?)([^)'"]+)\1\s*\)/gi;
const LONG_BASE64 = /(?:[A-Za-z0-9+/]{2048,}={0,2})/;

function normalizeRepoPath(path) {
  if (
    typeof path !== "string" ||
    path.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(path)
  ) {
    throw new Error(`unsafe repository path: ${String(path)}`);
  }
  const normalized = posix.normalize(path);
  if (
    normalized !== path ||
    normalized === "." ||
    normalized.startsWith("../") ||
    normalized.startsWith("/")
  ) {
    throw new Error(`unsafe repository path: ${path}`);
  }
  return normalized;
}

function isWithin(path, root) {
  return path.startsWith(root.endsWith("/") ? root : `${root}/`);
}

function containsPrivateSegment(path) {
  return normalizeRepoPath(path)
    .split("/")
    .some((part) => PRIVATE_SEGMENTS.has(part));
}

function sha256Buffer(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function runGit(root, args, encoding = "utf8") {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`git ${args[0]} could not provide policy evidence`);
  }
  return result.stdout;
}

function listGitPaths(root, args) {
  return runGit(root, [...args, "-z"])
    .split("\0")
    .filter(Boolean);
}

function indexHasPath(root, path) {
  const result = spawnSync("git", ["ls-files", "--error-unmatch", "--", path], {
    cwd: root,
    encoding: "utf8",
    stdio: "ignore",
  });
  return result.status === 0;
}

function readIndexEvidence(root, path) {
  const size = Number(runGit(root, ["cat-file", "-s", `:${path}`]).trim());
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new Error(`invalid index blob size: ${path}`);
  }
  if (size > MAX_PUBLIC_FILE_BYTES) {
    return { bytes: null, oversized: true, path, size, source: "index" };
  }
  const bytes = runGit(root, ["cat-file", "blob", `:${path}`], null);
  return { bytes, oversized: false, path, size, source: "index" };
}

async function readWorktreeEvidence(root, path, source = "worktree") {
  const absolutePath = resolve(root, path);
  const fileStat = await lstat(absolutePath);
  if (fileStat.isSymbolicLink()) {
    return { bytes: null, path, size: fileStat.size, source, symlink: true };
  }
  if (!fileStat.isFile()) {
    return { bytes: Buffer.alloc(0), path, size: 0, source, unsupported: true };
  }
  if (fileStat.size > MAX_PUBLIC_FILE_BYTES) {
    return { bytes: null, oversized: true, path, size: fileStat.size, source };
  }
  return {
    bytes: await readFile(absolutePath),
    oversized: false,
    path,
    size: fileStat.size,
    source,
  };
}

async function compareIndexToWorktree(root, evidence) {
  const absolutePath = resolve(root, evidence.path);
  try {
    const fileStat = await lstat(absolutePath);
    if (!fileStat.isFile() || fileStat.isSymbolicLink()) return false;
    if (evidence.oversized || fileStat.size > MAX_PUBLIC_FILE_BYTES) return false;
    return sha256Buffer(evidence.bytes) === (await sha256File(absolutePath));
  } catch {
    return false;
  }
}

export async function loadPolicyEvidence(root, mode) {
  const entries = [];
  const errors = [];
  if (mode === "staged") {
    const stagedPaths = listGitPaths(root, [
      "diff",
      "--cached",
      "--name-only",
      "--diff-filter=ACMR",
    ]);
    for (const path of stagedPaths) {
      const evidence = readIndexEvidence(root, path);
      entries.push(evidence);
      if (!(await compareIndexToWorktree(root, evidence))) {
        errors.push(`staged index blob differs from the worktree: ${path}`);
      }
    }
    return { entries, errors };
  }

  const trackedPaths = listGitPaths(root, ["ls-files", "--cached"]);
  const deletedPaths = new Set(listGitPaths(root, ["ls-files", "--deleted"]));
  const untrackedPaths = listGitPaths(root, [
    "ls-files",
    "--others",
    "--exclude-standard",
  ]);
  const modifiedPaths = listGitPaths(root, [
    "diff",
    "--name-only",
    "--diff-filter=ACMR",
  ]);
  for (const path of trackedPaths) {
    if (!deletedPaths.has(path)) entries.push(readIndexEvidence(root, path));
  }
  for (const path of untrackedPaths) {
    entries.push(await readWorktreeEvidence(root, path, "untracked-worktree"));
  }
  for (const path of modifiedPaths) {
    entries.push(await readWorktreeEvidence(root, path, "modified-worktree"));
  }
  return { entries, errors };
}

async function readPolicyConfig(root, mode) {
  if (mode === "staged" && indexHasPath(root, POLICY_PATH)) {
    const evidence = readIndexEvidence(root, POLICY_PATH);
    if (!evidence.bytes) throw new Error("public binary allowlist is too large");
    return JSON.parse(evidence.bytes.toString("utf8"));
  }
  if (mode === "staged") {
    throw new Error("public binary allowlist must exist in the Git index");
  }
  return JSON.parse(await readFile(resolve(root, POLICY_PATH), "utf8"));
}

async function readCopyPolicyConfig(root, mode) {
  if (mode === "staged" && indexHasPath(root, COPY_POLICY_PATH)) {
    const evidence = readIndexEvidence(root, COPY_POLICY_PATH);
    if (!evidence.bytes) throw new Error("public copy allowlist is too large");
    return JSON.parse(evidence.bytes.toString("utf8"));
  }
  if (mode === "staged") {
    throw new Error("public copy allowlist must exist in the Git index");
  }
  return JSON.parse(await readFile(resolve(root, COPY_POLICY_PATH), "utf8"));
}

function allowedType(path) {
  if (ROOT_TEXT_FILES.has(path)) return "text";
  if (isWithin(path, STRICT_BINARY_ROOT) && extname(path).toLowerCase() === ".png") {
    return "binary-png";
  }
  if (isWithin(path, PRODUCTION_ASSET_ROOT)) {
    const extension = extname(path).toLowerCase();
    if ([".svg", ".webp", ".woff2"].includes(extension)) return "production-asset";
  }
  for (const [root, extensions] of TEXT_ROOTS) {
    if (isWithin(path, root) && extensions.has(extname(path).toLowerCase())) {
      return "text";
    }
  }
  return null;
}

function startsWith(buffer, signature) {
  return (
    buffer.length >= signature.length &&
    buffer.subarray(0, signature.length).equals(signature)
  );
}

function containsSignature(buffer, signature) {
  return buffer.subarray(0, Math.min(buffer.length, 1024)).indexOf(signature) >= 0;
}

function detectForbiddenFormat(bytes, decodedText, allowApprovedWoff2 = false) {
  // Approved PNGs are hash-bound below; their compressed chunks can contain
  // arbitrary short byte sequences that resemble unrelated format headers.
  if (startsWith(bytes, PNG_MAGIC)) return null;
  // WOFF2 contains an internal compressed sfnt stream, so scanning its first
  // kilobyte would otherwise misclassify it as a raw TrueType font. The exact
  // path/hash/media-type allowlist remains mandatory below.
  if (allowApprovedWoff2 && startsWith(bytes, WOFF2_MAGIC)) return null;
  if (containsSignature(bytes, DOS_EPS_MAGIC)) return "DOS EPS";
  if (containsSignature(bytes, PDF_MAGIC)) return "PDF/Illustrator";
  if (containsSignature(bytes, Buffer.from([0x38, 0x42, 0x50, 0x53])))
    return "Adobe Photoshop";
  if (containsSignature(bytes, Buffer.from([0x00, 0x01, 0x00, 0x00])))
    return "TrueType font";
  if (containsSignature(bytes, Buffer.from([0x4f, 0x54, 0x54, 0x4f])))
    return "OpenType font";
  if (containsSignature(bytes, Buffer.from([0x74, 0x74, 0x63, 0x66])))
    return "font collection";
  if (containsSignature(bytes, Buffer.from([0x77, 0x4f, 0x46, 0x46])))
    return "WOFF font";
  if (
    !allowApprovedWoff2 &&
    containsSignature(bytes, Buffer.from([0x77, 0x4f, 0x46, 0x32]))
  )
    return "WOFF2 font";
  if (containsSignature(bytes, Buffer.from([0x50, 0x4b, 0x03, 0x04])))
    return "ZIP/source archive";
  if (containsSignature(bytes, Buffer.from([0x1f, 0x8b]))) return "gzip/source archive";
  if (containsSignature(bytes, Buffer.from([0x42, 0x5a, 0x68])))
    return "bzip2/source archive";
  if (containsSignature(bytes, Buffer.from([0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00])))
    return "xz/source archive";
  if (containsSignature(bytes, Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])))
    return "7z/source archive";
  if (containsSignature(bytes, Buffer.from([0x52, 0x61, 0x72, 0x21])))
    return "RAR/source archive";
  if (bytes.length > 262 && bytes.subarray(257, 262).toString("ascii") === "ustar")
    return "tar/source archive";
  if (decodedText && ASCII_POSTSCRIPT.test(decodedText)) return "ASCII PostScript/EPS";
  if (decodedText && POSTSCRIPT_BOUNDING_BOX.test(decodedText)) return "ASCII EPS";
  if (
    decodedText &&
    (ILLUSTRATOR_PRIVATE.test(decodedText) || ILLUSTRATOR_CREATOR.test(decodedText))
  ) {
    return "Adobe Illustrator source";
  }
  return null;
}

function decodeUtf8(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function copyEntryCoversMatch(path, text, matchIndex, matchLength, copyByPath) {
  return (copyByPath.get(path) ?? []).some((entry) => {
    const valueStart = text.indexOf(entry.value);
    return (
      valueStart >= 0 &&
      matchIndex >= valueStart &&
      matchIndex + matchLength <= valueStart + entry.value.length
    );
  });
}

export function validateCopyAllowlist(copyAllowlist) {
  const errors = [];
  const copyByPath = new Map();
  if (copyAllowlist?.schemaVersion !== 1) {
    errors.push("public copy allowlist must use schemaVersion=1");
  }
  if (!Array.isArray(copyAllowlist?.approvedValues)) {
    return { errors: [...errors, "approvedValues must be an array"], copyByPath };
  }
  for (const entry of copyAllowlist.approvedValues) {
    let path;
    try {
      path = normalizeRepoPath(entry.path);
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    if (typeof entry.value !== "string" || entry.value.length === 0) {
      errors.push(`copy allowlist value is required: ${path}`);
      continue;
    }
    if (!SHA256.test(entry.sha256 ?? "")) {
      errors.push(`invalid copy allowlist SHA-256: ${path}`);
    } else if (sha256Buffer(Buffer.from(entry.value, "utf8")) !== entry.sha256) {
      errors.push(`copy allowlist SHA-256 does not match value: ${path}`);
    }
    if (entry.classification !== "approved-production-copy") {
      errors.push(`copy classification is not permitted: ${path}`);
    }
    if (entry.approvalStatus !== "approved-public") {
      errors.push(`copy is not approved-public: ${path}`);
    }
    const values = copyByPath.get(path) ?? [];
    if (values.some((value) => value.sha256 === entry.sha256)) {
      errors.push(`duplicate copy allowlist value: ${path}`);
    }
    values.push({ ...entry, path });
    copyByPath.set(path, values);
  }
  return { errors, copyByPath };
}

function scanText(path, text, copyByPath) {
  const errors = [];
  for (const [label, pattern] of TEXT_SIGNATURES) {
    const globalPattern = new RegExp(
      pattern.source,
      `${pattern.flags.replaceAll("g", "")}g`,
    );
    for (const match of text.matchAll(globalPattern)) {
      if (
        !["Japanese postal address marker", "Japanese telephone number"].includes(
          label,
        ) ||
        !copyEntryCoversMatch(path, text, match.index ?? 0, match[0].length, copyByPath)
      ) {
        errors.push(`${label} detected in public text: ${path}`);
        break;
      }
    }
  }
  if (LONG_BASE64.test(text))
    errors.push(`large base64 payload detected in public text: ${path}`);
  if (SVG_ROOT.test(text) || extname(path).toLowerCase() === ".svg") {
    if (SVG_IMAGE.test(text))
      errors.push(`SVG image payload/reference is forbidden: ${path}`);
    if (IMAGE_DATA_URI.test(text))
      errors.push(`SVG embedded raster payload is forbidden: ${path}`);
    if (SVG_EXTERNAL_URI.test(text) || SVG_EXTERNAL_CSS.test(text)) {
      errors.push(`SVG external resource is forbidden: ${path}`);
    }
    for (const match of text.matchAll(SVG_HREF)) {
      if (!match[2].trim().startsWith("#")) {
        errors.push(`SVG relative/external resource is forbidden: ${path}`);
        break;
      }
    }
    for (const match of text.matchAll(SVG_CSS_URL)) {
      if (!match[2].trim().startsWith("#")) {
        errors.push(`SVG relative/external CSS resource is forbidden: ${path}`);
        break;
      }
    }
    if (SVG_SCRIPT.test(text) || SVG_FOREIGN_OBJECT.test(text)) {
      errors.push(`active SVG content is forbidden: ${path}`);
    }
  }
  return errors;
}

export function validateBinaryAllowlist(allowlist) {
  const errors = [];
  const byPath = new Map();
  if (allowlist?.schemaVersion !== 1)
    errors.push("public binary allowlist must use schemaVersion=1");
  if (!Array.isArray(allowlist?.approvedFiles)) {
    return { errors: [...errors, "approvedFiles must be an array"], byPath };
  }
  for (const entry of allowlist.approvedFiles) {
    let path;
    try {
      path = normalizeRepoPath(entry.path);
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    if (byPath.has(path)) errors.push(`duplicate binary allowlist path: ${path}`);
    const isBaseline =
      isWithin(path, STRICT_BINARY_ROOT) && extname(path).toLowerCase() === ".png";
    const isProductionAsset = isWithin(path, PRODUCTION_ASSET_ROOT);
    if (!isBaseline && !isProductionAsset) {
      errors.push(
        `binary allowlist path is outside the approved production roots: ${path}`,
      );
    }
    if (!SHA256.test(entry.sha256 ?? ""))
      errors.push(`invalid binary allowlist SHA-256: ${path}`);
    if (isBaseline) {
      if (entry.mediaType !== "image/png")
        errors.push(`binary mediaType must be image/png: ${path}`);
      if (entry.classification !== "approved-production-baseline")
        errors.push(`binary classification is not permitted: ${path}`);
      if (entry.rightsStatus !== "approved-public-production-candidate")
        errors.push(`binary rightsStatus is not permitted: ${path}`);
    }
    if (isProductionAsset) {
      const extension = extname(path).toLowerCase();
      const expectedMediaType = {
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
        ".woff2": "font/woff2",
      }[extension];
      if (entry.mediaType !== expectedMediaType)
        errors.push(`production asset mediaType is invalid: ${path}`);
      if (entry.classification !== "approved-production-asset")
        errors.push(`production asset classification is not permitted: ${path}`);
      if (
        ![
          "client-confirmed-production-derivative",
          "licensed-upstream-derivative",
        ].includes(entry.rightsStatus)
      ) {
        errors.push(`production asset rightsStatus is not permitted: ${path}`);
      }
    }
    if (entry.approvalStatus !== "approved-public")
      errors.push(`binary is not approved-public: ${path}`);
    if (!entry.purpose?.trim()) errors.push(`binary purpose is required: ${path}`);
    byPath.set(path, entry);
  }
  return { errors, byPath };
}

export function evaluatePublicRepoPolicy({
  entries,
  allowlist,
  copyAllowlist = { schemaVersion: 1, approvedValues: [] },
  requireCompleteAllowlist = false,
}) {
  const { errors, byPath } = validateBinaryAllowlist(allowlist);
  const copyValidation = validateCopyAllowlist(copyAllowlist);
  errors.push(...copyValidation.errors);
  const checkedPaths = new Set();
  for (const evidence of entries) {
    let path;
    try {
      path = normalizeRepoPath(evidence.path);
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    checkedPaths.add(path);
    if (containsPrivateSegment(path)) {
      errors.push(`private path is present in the public candidate set: ${path}`);
      continue;
    }
    if (MASTER_EXTENSIONS.has(extname(path).toLowerCase())) {
      errors.push(`source master/archive is forbidden anywhere in public Git: ${path}`);
    }
    if (evidence.symlink) {
      errors.push(`symbolic links are not accepted as public candidates: ${path}`);
      continue;
    }
    if (evidence.unsupported) {
      errors.push(`non-file candidate is forbidden: ${path}`);
      continue;
    }
    if (evidence.oversized || !evidence.bytes) {
      errors.push(`public candidate exceeds ${MAX_PUBLIC_FILE_BYTES} bytes: ${path}`);
      continue;
    }

    const text = decodeUtf8(evidence.bytes);
    const expectedType = allowedType(path);
    const forbiddenFormat = detectForbiddenFormat(
      evidence.bytes,
      text,
      expectedType === "production-asset" && extname(path).toLowerCase() === ".woff2",
    );
    if (forbiddenFormat)
      errors.push(`${forbiddenFormat} content is forbidden: ${path}`);
    if (text !== null && path !== COPY_POLICY_PATH) {
      errors.push(...scanText(path, text, copyValidation.copyByPath));
    }

    if (!expectedType) {
      errors.push(`path/type is outside the strict public policy: ${path}`);
      continue;
    }
    const isPng = startsWith(evidence.bytes, PNG_MAGIC);
    const isBinary = text === null || evidence.bytes.includes(0);
    if (expectedType === "text" && isBinary) {
      errors.push(`binary content is forbidden for public text path: ${path}`);
      continue;
    }
    if (expectedType === "binary-png" && !isPng) {
      errors.push(`binary path does not contain a PNG: ${path}`);
      continue;
    }
    if (
      !isBinary &&
      expectedType !== "binary-png" &&
      expectedType !== "production-asset"
    ) {
      continue;
    }

    const entry = byPath.get(path);
    if (!entry) {
      errors.push(`binary has no approved immutable allowlist entry: ${path}`);
      continue;
    }
    if (sha256Buffer(evidence.bytes) !== entry.sha256) {
      errors.push(`binary SHA-256 does not match allowlist: ${path}`);
    }
  }
  if (requireCompleteAllowlist) {
    for (const path of byPath.keys()) {
      if (!checkedPaths.has(path))
        errors.push(`binary allowlist entry is stale or ignored: ${path}`);
    }
  }
  return errors;
}

export function listPolicyPaths(root, mode) {
  if (mode === "staged") {
    return listGitPaths(root, [
      "diff",
      "--cached",
      "--name-only",
      "--diff-filter=ACMR",
    ]);
  }
  return [
    ...listGitPaths(root, ["ls-files", "--cached"]),
    ...listGitPaths(root, ["ls-files", "--others", "--exclude-standard"]),
  ];
}

async function main() {
  const modeArgument = process.argv.find((argument) => argument.startsWith("--mode="));
  const mode = modeArgument?.slice("--mode=".length);
  if (mode !== "candidates" && mode !== "staged") {
    process.stderr.write(
      "Usage: check-public-repo-policy.mjs --mode=candidates|staged\n",
    );
    process.exitCode = 2;
    return;
  }
  const root = process.cwd();
  const { entries, errors: evidenceErrors } = await loadPolicyEvidence(root, mode);
  let allowlist;
  let copyAllowlist;
  try {
    allowlist = await readPolicyConfig(root, mode);
    copyAllowlist = await readCopyPolicyConfig(root, mode);
  } catch (error) {
    process.stderr.write(`PUBLIC REPOSITORY POLICY BLOCKED:\n- ${error.message}\n`);
    process.exitCode = 1;
    return;
  }
  const errors = [
    ...evidenceErrors,
    ...evaluatePublicRepoPolicy({
      entries,
      allowlist,
      copyAllowlist,
      requireCompleteAllowlist: mode === "candidates",
    }),
  ];
  if (errors.length > 0) {
    process.stderr.write("PUBLIC REPOSITORY POLICY BLOCKED:\n");
    for (const error of errors) process.stderr.write(`- ${error}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `Public repository policy verified for ${entries.length} ${mode} evidence blob(s).\n`,
  );
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) await main();
