import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, symlink, writeFile } from "node:fs/promises";
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

test("executes hash-bound landmark and region contracts on both rasters", async ({}, testInfo) => {
  const projectRoot = process.cwd();
  const fixtureRoot = testInfo.outputPath("geometry-contract");
  const reference = `${fixtureRoot}/reference.png`;
  const actual = `${fixtureRoot}/actual.png`;
  const mask = `${fixtureRoot}/mask.json`;
  const output = `${fixtureRoot}/output`;
  const configPath = `${fixtureRoot}/fidelity.json`;
  await mkdir(fixtureRoot, { recursive: true });
  await Promise.all([boundaryPng(reference, 17), boundaryPng(actual, 17)]);
  await writeFile(
    mask,
    `${JSON.stringify({
      schemaVersion: 1,
      width: 40,
      height: 20,
      rectangles: [{ x: 0, y: 0, width: 40, height: 20 }],
    })}\n`,
  );
  const detectorPath = "scripts/fidelity/detectors/edge-landmark.mjs";
  const config = {
    frames: [
      {
        id: "fixture-frame",
        geometryContract: {
          status: "approved",
          executionStatus: "available",
          landmarks: [
            {
              id: "split-edge",
              detector: {
                id: "mean-luma-edge-v1",
                path: detectorPath,
                sha256: sha256(await readFile(detectorPath)),
              },
              parameters: { axis: "x", roi: [0.2, 0.1, 0.6, 0.8] },
              thresholds: { maxDeltaPx: 0, minConfidence: 0.5 },
            },
          ],
          regions: [
            {
              id: "whole-frame",
              mask: {
                path: relative(projectRoot, mask),
                sha256: sha256(await readFile(mask)),
              },
              thresholds: {
                pixelThreshold: 0,
                maxMae: 0,
                maxDiffRatio: 0,
                maxEdgeMae: 0,
              },
            },
          ],
        },
      },
    ],
  };
  const configBytes = Buffer.from(`${JSON.stringify(config, null, 2)}\n`);
  await writeFile(configPath, configBytes);

  const result = spawnSync(
    process.execPath,
    [
      "scripts/visual-fidelity.mjs",
      "--root",
      projectRoot,
      "--reference",
      relative(projectRoot, reference),
      "--actual",
      relative(projectRoot, actual),
      "--out",
      relative(projectRoot, output),
      "--label",
      "geometry",
      "--frame-id",
      "fixture-frame",
      "--config",
      relative(projectRoot, configPath),
      "--config-sha256",
      sha256(configBytes),
      "--max-mae",
      "0",
      "--max-diff-ratio",
      "0",
      "--max-edge-mae",
      "0",
    ],
    { cwd: projectRoot, encoding: "utf8" },
  );

  expect(result.status, result.stderr).toBe(0);
  const report = JSON.parse(await readFile(`${output}/geometry-evidence.json`, "utf8"));
  expect(report).toMatchObject({
    status: "PASS",
    evidenceStatus: "PASS",
    landmarkResults: [{ contractId: "split-edge", status: "PASS" }],
    regionResults: [{ contractId: "whole-frame", status: "PASS" }],
  });
});

test("returns a failing exit code when an executed geometry contract fails", async ({}, testInfo) => {
  const projectRoot = process.cwd();
  const fixtureRoot = testInfo.outputPath("failing-geometry-contract");
  const reference = `${fixtureRoot}/reference.png`;
  const actual = `${fixtureRoot}/actual.png`;
  const mask = `${fixtureRoot}/mask.json`;
  const output = `${fixtureRoot}/output`;
  const configPath = `${fixtureRoot}/fidelity.json`;
  await mkdir(fixtureRoot, { recursive: true });
  await Promise.all([boundaryPng(reference, 17), boundaryPng(actual, 19)]);
  await writeFile(
    mask,
    `${JSON.stringify({
      schemaVersion: 1,
      width: 40,
      height: 20,
      rectangles: [{ x: 0, y: 0, width: 40, height: 20 }],
    })}\n`,
  );
  const detectorPath = "scripts/fidelity/detectors/edge-landmark.mjs";
  const config = {
    frames: [
      {
        id: "fixture-frame",
        geometryContract: {
          status: "approved",
          executionStatus: "available",
          landmarks: [
            {
              id: "split-edge",
              detector: {
                id: "mean-luma-edge-v1",
                path: detectorPath,
                sha256: sha256(await readFile(detectorPath)),
              },
              parameters: { axis: "x", roi: [0.2, 0.1, 0.6, 0.8] },
              thresholds: { maxDeltaPx: 0, minConfidence: 0.5 },
            },
          ],
          regions: [
            {
              id: "whole-frame",
              mask: {
                path: relative(projectRoot, mask),
                sha256: sha256(await readFile(mask)),
              },
              thresholds: {
                pixelThreshold: 1,
                maxMae: 1,
                maxDiffRatio: 1,
                maxEdgeMae: 1,
              },
            },
          ],
        },
      },
    ],
  };
  const configBytes = Buffer.from(`${JSON.stringify(config, null, 2)}\n`);
  await writeFile(configPath, configBytes);

  const result = spawnSync(
    process.execPath,
    [
      "scripts/visual-fidelity.mjs",
      "--root",
      projectRoot,
      "--reference",
      relative(projectRoot, reference),
      "--actual",
      relative(projectRoot, actual),
      "--out",
      relative(projectRoot, output),
      "--label",
      "failing-geometry",
      "--frame-id",
      "fixture-frame",
      "--config",
      relative(projectRoot, configPath),
      "--config-sha256",
      sha256(configBytes),
      "--max-mae",
      "1",
      "--max-diff-ratio",
      "1",
      "--max-edge-mae",
      "1",
    ],
    { cwd: projectRoot, encoding: "utf8" },
  );

  expect(result.status).toBe(1);
  const report = JSON.parse(
    await readFile(`${output}/failing-geometry-evidence.json`, "utf8"),
  );
  expect(report).toMatchObject({
    status: "UNAVAILABLE",
    evidenceStatus: "UNAVAILABLE",
    landmarkResults: [{ contractId: "split-edge", status: "FAIL" }],
  });
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

async function boundaryPng(path: string, boundary: number): Promise<void> {
  const width = 40;
  const height = 20;
  const data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = x < boundary ? 24 : 224;
      const index = (y * width + x) * 3;
      data.fill(value, index, index + 3);
    }
  }
  await sharp(data, { raw: { width, height, channels: 3 } })
    .png()
    .toFile(path);
}
