import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

test("repeats the same unavailable evidence and diagnostics without stale-manifest drift", async ({}, testInfo) => {
  const projectRoot = process.cwd();
  const fixtureRoot = testInfo.outputPath("repeatable-blocked-run");
  const manifestPath = `${fixtureRoot}/artifacts/fidelity/comparisons/fidelity-evidence-manifest.json`;
  await mkdir(fixtureRoot, { recursive: true });
  const configBytes = Buffer.from(
    `${JSON.stringify(
      {
        schemaVersion: 2,
        foundationOnly: true,
        evidenceContract: {
          status: "unavailable",
          manifest: "artifacts/fidelity/comparisons/fidelity-evidence-manifest.json",
        },
        captureEnvironment: {
          colorScheme: "light",
          deviceScaleFactor: 1,
          locale: "ja-JP",
          timezoneId: "Asia/Tokyo",
        },
        captureArtifacts: {
          schemaVersion: 1,
          runsRoot: "artifacts/fidelity/captures/runs",
          runManifestFile: "capture-run-manifest.json",
        },
        frames: [],
        requiredCoverage: [],
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(`${fixtureRoot}/fidelity.config.json`, configBytes);

  const first = runFidelity(projectRoot, fixtureRoot);
  expect(first.status).toBe(1);
  expect(first.stderr).toContain("foundationOnly=true");
  expect(first.stderr).toContain("machine evidence contract is unavailable");
  expect(first.stderr).toContain("fidelity frame contract is missing");
  expect(first.stderr).toContain("required coverage contract is missing");
  const firstManifest = await readFile(manifestPath);

  const second = runFidelity(projectRoot, fixtureRoot);
  expect(second.status).toBe(1);
  expect(second.stderr).toBe(first.stderr);
  expect(second.stdout).toBe(first.stdout);
  const secondManifest = await readFile(manifestPath);

  expect(sha256(secondManifest)).toBe(sha256(firstManifest));
  const parsed = JSON.parse(secondManifest.toString("utf8"));
  expect(parsed).toMatchObject({
    config: {
      path: "fidelity.config.json",
      sha256: sha256(configBytes),
    },
    status: "UNAVAILABLE",
  });
  expect(await readdir(`${fixtureRoot}/artifacts/fidelity/comparisons`)).toEqual([
    "fidelity-evidence-manifest.json",
  ]);
});

test("preserves unavailable semantic and coverage bindings in machine evidence", async ({}, testInfo) => {
  const projectRoot = process.cwd();
  const fixtureRoot = testInfo.outputPath("semantic-unavailable-evidence");
  const manifestPath = `${fixtureRoot}/artifacts/fidelity/comparisons/fidelity-evidence-manifest.json`;
  await mkdir(fixtureRoot, { recursive: true });
  const semanticObservation = {
    id: "desktop-top",
    semantic: "top",
    status: "blocked",
    selector: "main[data-foundation-only='true']",
    scrollStrategy: { kind: "absolute", x: 0, y: 0 },
    expected: {
      visible: true,
      stateId: "menu-closed",
      attributes: { "data-foundation-only": "true" },
    },
    landmarkIds: [],
    regionIds: [],
  };
  const config = {
    schemaVersion: 2,
    foundationOnly: true,
    evidenceContract: {
      status: "unavailable",
      manifest: "artifacts/fidelity/comparisons/fidelity-evidence-manifest.json",
    },
    captureEnvironment: {
      colorScheme: "light",
      deviceScaleFactor: 1,
      locale: "ja-JP",
      timezoneId: "Asia/Tokyo",
    },
    captureArtifacts: {
      schemaVersion: 1,
      runsRoot: "artifacts/fidelity/captures/runs",
      runManifestFile: "capture-run-manifest.json",
    },
    frames: [
      {
        id: "lp-1440x900-menu-closed-top",
        label: "lp-1440x900",
        viewport: { width: 1440, height: 900 },
        route: "/",
        state: { id: "menu-closed", setup: "none" },
        scroll: { x: 0, y: 0 },
        semanticObservation,
        capture: { fullPage: false },
        reference: ".private/references/approved/lp-1440x900.png",
        actualFile: "lp-1440x900.png",
        approvalStatus: "blocked",
        referenceContract: { status: "blocked" },
        geometryContract: {
          status: "blocked",
          executionStatus: "unavailable",
          landmarks: [],
          regions: [],
        },
        thresholds: null,
      },
    ],
    requiredCoverage: [
      {
        id: "desktop-top-menu-closed",
        status: "blocked",
        frameIds: ["lp-1440x900-menu-closed-top"],
        observations: [
          {
            id: "desktop-top",
            status: "unavailable",
            frameId: "lp-1440x900-menu-closed-top",
            semanticObservationId: "desktop-top",
            semantic: "top",
            landmarkResultIds: [],
            regionResultIds: [],
          },
        ],
      },
    ],
  };
  await writeFile(
    `${fixtureRoot}/fidelity.config.json`,
    `${JSON.stringify(config, null, 2)}\n`,
  );

  const result = runFidelity(projectRoot, fixtureRoot);
  expect(result.status).toBe(1);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  expect(manifest.frames[0].semanticObservationResult).toEqual({
    id: "desktop-top",
    semantic: "top",
    status: "UNAVAILABLE",
    selector: semanticObservation.selector,
    scrollStrategy: semanticObservation.scrollStrategy,
    expected: semanticObservation.expected,
    observed: null,
    landmarkResultIds: [],
    regionResultIds: [],
    failures: manifest.failures,
  });
  expect(manifest.requiredCoverage[0].observationResults[0]).toMatchObject({
    id: "desktop-top",
    frameId: "lp-1440x900-menu-closed-top",
    semanticObservationId: "desktop-top",
    semantic: "top",
    landmarkResultIds: [],
    regionResultIds: [],
    status: "UNAVAILABLE",
  });
});

function runFidelity(projectRoot: string, fixtureRoot: string) {
  return spawnSync(
    process.execPath,
    [resolve(projectRoot, "scripts/run-fidelity.mjs"), "--root", fixtureRoot],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    },
  );
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
