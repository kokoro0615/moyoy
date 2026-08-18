import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  evaluatePublicRepoPolicy,
  listPolicyPaths,
} from "../../scripts/check-public-repo-policy.mjs";

const scriptPath = resolve("scripts/check-public-repo-policy.mjs");
const emptyAllowlist = {
  schemaVersion: 1,
  policy: "public-code-and-sanitized-docs-only",
  approvedFiles: [],
};

function evidence(path, bytes) {
  return { bytes: Buffer.from(bytes), path, size: bytes.length, source: "test" };
}

function git(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

async function createPolicyRepo() {
  const root = await mkdtemp(join(tmpdir(), "moyoy-public-policy-"));
  git(root, ["init", "-q"]);
  await mkdir(join(root, "config"), { recursive: true });
  await writeFile(
    join(root, "config/public-binary-allowlist.json"),
    `${JSON.stringify(emptyAllowlist, null, 2)}\n`,
  );
  return root;
}

test("staged policy reads the private index blob after a benign worktree swap", async () => {
  const root = await createPolicyRepo();
  await mkdir(join(root, "docs"));
  const privateEps = [
    "%!",
    "PS-Adobe-3.0 EPSF-3.0",
    "\n%%",
    "BoundingBox: 0 0 10 10\nprivate payload\n",
  ].join("");
  await writeFile(join(root, "docs/note.md"), privateEps);
  git(root, ["add", "config/public-binary-allowlist.json", "docs/note.md"]);
  await writeFile(join(root, "docs/note.md"), "benign public text\n");

  const result = spawnSync(process.execPath, [scriptPath, "--mode=staged"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ASCII PostScript\/EPS content is forbidden/);
  assert.match(result.stderr, /staged index blob differs from the worktree/);
});

test("candidate enumeration excludes ignored raw and private trees", async () => {
  const root = await createPolicyRepo();
  await writeFile(join(root, ".gitignore"), "/.private/\n/20260818_web/\n");
  for (const path of [".private/master.ai", "20260818_web/master.pdf"]) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), "private\n");
  }
  await mkdir(join(root, "docs"));
  await writeFile(join(root, "docs/safe.md"), "public\n");

  const paths = listPolicyPaths(root, "candidates");
  assert.ok(paths.includes("docs/safe.md"));
  assert.ok(!paths.some((path) => path.startsWith(".private/")));
  assert.ok(!paths.some((path) => path.startsWith("20260818_web/")));

  const result = spawnSync(process.execPath, [scriptPath, "--mode=candidates"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
});

test("content policy rejects renamed DOS EPS", () => {
  const bytes = Buffer.concat([
    Buffer.from("renamed-prefix"),
    Buffer.from([0xc5, 0xd0, 0xd3, 0xc6]),
    Buffer.from("private source"),
  ]);
  const errors = evaluatePublicRepoPolicy({
    entries: [evidence("docs/note.md", bytes)],
    allowlist: emptyAllowlist,
  });
  assert.ok(errors.some((error) => error.includes("DOS EPS content is forbidden")));
});

test("content policy rejects renamed PDF Illustrator and font/archive magic", () => {
  const samples = [
    Buffer.concat([
      Buffer.from("renamed-prefix"),
      Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]),
      Buffer.from("1.7"),
    ]),
    Buffer.concat([
      Buffer.from("renamed-prefix"),
      Buffer.from([0x4f, 0x54, 0x54, 0x4f]),
      Buffer.alloc(8),
    ]),
    Buffer.concat([
      Buffer.from("renamed-prefix"),
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.alloc(8),
    ]),
  ];
  for (const [index, bytes] of samples.entries()) {
    const errors = evaluatePublicRepoPolicy({
      entries: [evidence(`docs/renamed-${index}.md`, bytes)],
      allowlist: emptyAllowlist,
    });
    assert.ok(errors.some((error) => error.includes("content is forbidden")));
  }
});

test("content policy rejects SVG embedded and external images", () => {
  const embedded = [
    "<",
    "svg><",
    'image href="',
    "data",
    ':image/png;base64,AAAA"/></',
    "svg>",
  ].join("");
  const external = [
    "<",
    "svg><",
    'image href="https://example.invalid/a.png"/></',
    "svg>",
  ].join("");
  const relativeCss = [
    "<",
    "svg><style>.hero{background:url(hero.png)}</style></",
    "svg>",
  ].join("");
  for (const [index, value] of [embedded, external, relativeCss].entries()) {
    const errors = evaluatePublicRepoPolicy({
      entries: [evidence(`docs/vector-${index}.md`, value)],
      allowlist: emptyAllowlist,
    });
    assert.ok(errors.some((error) => error.includes("SVG ")));
  }
});

test("text policy rejects absolute workstation paths and raw camera IDs", () => {
  const absolutePath = ["/", "home", "/designer/private/source\n"].join("");
  const rawId = ["8U9A", "0971"].join("");
  const errors = evaluatePublicRepoPolicy({
    entries: [evidence("docs/private.md", `${absolutePath}${rawId}\n`)],
    allowlist: emptyAllowlist,
  });
  assert.ok(errors.some((error) => error.includes("POSIX workstation path")));
  assert.ok(errors.some((error) => error.includes("camera raw identifier")));
});

test("binary policy rejects an unapproved binary", () => {
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const errors = evaluatePublicRepoPolicy({
    entries: [
      evidence(
        "tests/visual/__screenshots__/unapproved-visual-chromium-linux.png",
        pngHeader,
      ),
    ],
    allowlist: emptyAllowlist,
  });
  assert.ok(errors.some((error) => error.includes("no approved immutable allowlist")));
});

test("strict root and type policy rejects a public binary outside test baselines", () => {
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const errors = evaluatePublicRepoPolicy({
    entries: [evidence("docs/image.png", pngHeader)],
    allowlist: emptyAllowlist,
  });
  assert.ok(errors.some((error) => error.includes("outside the strict public policy")));

  const prefixCollisionErrors = evaluatePublicRepoPolicy({
    entries: [
      evidence("tests/visual/__screenshots__-lookalike/approved.png", pngHeader),
    ],
    allowlist: emptyAllowlist,
  });
  assert.ok(
    prefixCollisionErrors.some((error) =>
      error.includes("outside the strict public policy"),
    ),
  );
});
