import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, symlink } from "node:fs/promises";
import { relative } from "node:path";

import { expect, test } from "@playwright/test";
import sharp from "sharp";

test("creates a true midpoint overlay without exposing the project path", async ({}, testInfo) => {
  const root = process.cwd();
  const fixtureRoot = testInfo.outputPath("comparator-fixture");
  const referencePath = `${fixtureRoot}/reference.png`;
  const actualPath = `${fixtureRoot}/actual.png`;
  const outputPath = `${fixtureRoot}/output`;
  await mkdir(fixtureRoot, { recursive: true });

  await Promise.all([
    sharp({
      create: { background: { b: 0, g: 0, r: 255 }, channels: 3, height: 1, width: 1 },
    })
      .png()
      .toFile(referencePath),
    sharp({
      create: { background: { b: 255, g: 0, r: 0 }, channels: 3, height: 1, width: 1 },
    })
      .png()
      .toFile(actualPath),
  ]);

  const result = spawnSync(
    process.execPath,
    [
      "scripts/visual-fidelity.mjs",
      "--root",
      root,
      "--reference",
      relative(root, referencePath),
      "--actual",
      relative(root, actualPath),
      "--out",
      relative(root, outputPath),
      "--label",
      "midpoint",
    ],
    { cwd: root, encoding: "utf8" },
  );
  expect(result.status).toBe(0);
  const stdout = result.stdout;

  const { data, info } = await sharp(`${outputPath}/midpoint-overlay.png`)
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect(info.channels).toBe(3);
  expect([...data]).toEqual([127, 0, 127]);

  const report = await readFile(`${outputPath}/midpoint-evidence.json`, "utf8");
  expect(stdout).not.toContain(root);
  expect(report).not.toContain(root);
  expect(JSON.parse(report)).toMatchObject({
    actual: { path: expect.not.stringMatching(/^\//), sha256: expect.any(String) },
    evidenceStatus: "UNAVAILABLE",
    reference: { path: expect.not.stringMatching(/^\//), sha256: expect.any(String) },
  });
});

test("rejects traversal labels before creating any artifact", async ({}, testInfo) => {
  const fixture = await createRasterPair(testInfo.outputPath("label-traversal"));
  const result = runComparator(fixture, "../escaped");

  expect(result.status).toBe(2);
  expect(result.stderr).toContain("label");
  expect(await pathExists(`${fixture.root}/escaped-overlay.png`)).toBe(false);
  expect(await pathExists(`${fixture.output}/escaped-overlay.png`)).toBe(false);
});

test("rejects a symbolic-link output parent", async ({}, testInfo) => {
  const fixture = await createRasterPair(testInfo.outputPath("symlink-output"));
  const outside = `${fixture.root}/outside`;
  const linkedOutput = `${fixture.root}/linked-output`;
  await mkdir(outside, { recursive: true });
  await symlink(outside, linkedOutput, "dir");

  const result = runComparator({ ...fixture, output: linkedOutput }, "safe-label");

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("symbolic-link");
  expect(await readdir(outside)).toEqual([]);
});

test("never overwrites evidence for a duplicate destination", async ({}, testInfo) => {
  const fixture = await createRasterPair(testInfo.outputPath("duplicate-output"));
  const first = runComparator(fixture, "duplicate-label");
  expect(first.status).toBe(0);
  const metricsPath = `${fixture.output}/duplicate-label-evidence.json`;
  const firstHash = sha256(await readFile(metricsPath));

  const second = runComparator(fixture, "duplicate-label");

  expect(second.status).not.toBe(0);
  expect(second.stderr).toContain("already exists");
  expect(sha256(await readFile(metricsPath))).toBe(firstHash);
  expect((await readdir(fixture.output)).some((name) => name.includes(".tmp-"))).toBe(
    false,
  );
});

interface RasterFixture {
  readonly actual: string;
  readonly output: string;
  readonly reference: string;
  readonly root: string;
}

async function createRasterPair(root: string): Promise<RasterFixture> {
  const reference = `${root}/reference.png`;
  const actual = `${root}/actual.png`;
  const output = `${root}/output`;
  await mkdir(root, { recursive: true });
  await Promise.all([
    sharp({
      create: { background: "#ffffff", channels: 3, height: 2, width: 2 },
    })
      .png()
      .toFile(reference),
    sharp({
      create: { background: "#fefefe", channels: 3, height: 2, width: 2 },
    })
      .png()
      .toFile(actual),
  ]);
  return { actual, output, reference, root };
}

function runComparator(fixture: RasterFixture, label: string) {
  const projectRoot = process.cwd();
  return spawnSync(
    process.execPath,
    [
      "scripts/visual-fidelity.mjs",
      "--root",
      projectRoot,
      "--reference",
      relative(projectRoot, fixture.reference),
      "--actual",
      relative(projectRoot, fixture.actual),
      "--out",
      relative(projectRoot, fixture.output),
      "--label",
      label,
    ],
    { cwd: projectRoot, encoding: "utf8" },
  );
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
