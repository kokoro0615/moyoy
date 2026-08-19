import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const roots = ["public/assets/moyoy-candidate", "tests/visual/__screenshots__"];
const mediaTypes = {
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

async function filesIn(directory) {
  const result = [];
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await filesIn(path)));
    else if (mediaTypes[extname(entry.name).toLowerCase()]) result.push(path);
  }
  return result;
}

const approvedFiles = [];
for (const directory of roots) {
  for (const path of await filesIn(directory)) {
    const bytes = await readFile(join(root, path));
    const extension = extname(path).toLowerCase();
    const isBaseline = path.startsWith("tests/visual/__screenshots__/");
    const fileStat = await stat(join(root, path));
    if (fileStat.size > 10 * 1024 * 1024) {
      throw new Error(`Cannot allowlist an oversized public binary: ${path}`);
    }
    approvedFiles.push({
      path: relative(root, join(root, path)),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      mediaType: mediaTypes[extension],
      classification: isBaseline
        ? "approved-production-baseline"
        : "approved-production-asset",
      rightsStatus: isBaseline
        ? "approved-public-production-candidate"
        : extension === ".woff2"
          ? "licensed-upstream-derivative"
          : "client-confirmed-production-derivative",
      purpose: isBaseline
        ? "Approved production-candidate visual regression frame; contains the reviewed client composition and copy."
        : "Approved production derivative for the MOYOY candidate; source, dimensions, and loading role are recorded in docs/asset-provenance.csv.",
      approvalStatus: "approved-public",
    });
  }
}

approvedFiles.sort((left, right) => left.path.localeCompare(right.path));
await writeFile(
  join(root, "config/public-binary-allowlist.json"),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      policy: "public-code-sanitized-docs-and-approved-production-derivatives",
      approvedFiles,
    },
    null,
    2,
  )}\n`,
);
