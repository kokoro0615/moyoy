import { createHash } from "node:crypto";
import { mkdir, readFile, symlink, writeFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

// @ts-expect-error The runtime-validated MJS contract intentionally has no public declaration file.
import { createCaptureRunIdentity } from "../../scripts/fidelity-run-contract.mjs";
import {
  prepareCaptureRun,
  publishIdenticalOrCreate,
  type CaptureRunFrameDestinationInput,
} from "./fidelity-artifact-store";

const SAFE_FRAME = {
  actualFile: "safe-frame.png",
  id: "safe-frame-id",
  label: "safe-frame",
};
const CAPTURE_ARTIFACTS = {
  schemaVersion: 1,
  runsRoot: "artifacts/fidelity/captures/runs",
  runManifestFile: "capture-run-manifest.json",
} as const;
const RUN_IDENTITY_INPUT = {
  build: { id: "build-a" },
  captureEnvironment: {
    colorScheme: "light",
    deviceScaleFactor: 1,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  },
  configSha256: "a".repeat(64),
  server: {
    command: "corepack pnpm start:test",
    origin: "http://127.0.0.1:4173",
    ownedByPlaywright: true,
    pid: null,
    pidEvidence: "Playwright-owned server PID is unavailable.",
    reuseExistingServer: false,
  },
  source: { revision: "b".repeat(40), state: "dirty" },
} as const;
const RUN_IDENTITY = createCaptureRunIdentity(RUN_IDENTITY_INPUT);

test("rejects traversal, absolute, and NFKC-confusable capture paths and labels", async ({}, testInfo) => {
  const fixtureRoot = testInfo.outputPath("unsafe-logical-paths");
  await mkdir(fixtureRoot, { recursive: true });

  for (const frame of [
    { ...SAFE_FRAME, actualFile: "../escaped.png" },
    { ...SAFE_FRAME, actualFile: "/tmp/escaped.png" },
    { ...SAFE_FRAME, label: "ｓafe-frame" },
  ]) {
    await expect(prepareRun(fixtureRoot, [frame])).rejects.toThrow(
      /actualFile|safe artifact id|capture output/i,
    );
  }
});

test("rejects a symbolic-link capture parent before publication", async ({}, testInfo) => {
  const fixtureRoot = testInfo.outputPath("symlink-parent");
  const outside = testInfo.outputPath("symlink-parent-outside");
  await mkdir(`${fixtureRoot}/artifacts/fidelity/captures`, { recursive: true });
  await mkdir(outside, { recursive: true });
  await symlink(outside, `${fixtureRoot}/artifacts/fidelity/captures/runs`, "dir");

  await expect(prepareRun(fixtureRoot)).rejects.toThrow(/symbolic-link/i);
});

test("rejects a symbolic-link capture leaf", async ({}, testInfo) => {
  const fixtureRoot = testInfo.outputPath("symlink-leaf");
  const outside = testInfo.outputPath("symlink-leaf-outside.png");
  const runRoot = `${fixtureRoot}/${CAPTURE_ARTIFACTS.runsRoot}/${RUN_IDENTITY.id}`;
  await mkdir(runRoot, { recursive: true });
  await writeFile(outside, "outside");
  await symlink(outside, `${runRoot}/${SAFE_FRAME.actualFile}`, "file");

  await expect(prepareRun(fixtureRoot)).rejects.toThrow(/symbolic-link/i);
});

test("rejects duplicate capture destinations before browser work", async ({}, testInfo) => {
  const fixtureRoot = testInfo.outputPath("duplicate-destination");
  await mkdir(fixtureRoot, { recursive: true });

  await expect(
    prepareRun(fixtureRoot, [SAFE_FRAME, { ...SAFE_FRAME, id: "second-frame-id" }]),
  ).rejects.toThrow(/duplicate capture destination/i);
});

test("rejects a non-directory output parent", async ({}, testInfo) => {
  const fixtureRoot = testInfo.outputPath("non-directory-parent");
  await mkdir(`${fixtureRoot}/artifacts/fidelity/captures`, { recursive: true });
  await writeFile(`${fixtureRoot}/artifacts/fidelity/captures/runs`, "not a directory");

  await expect(prepareRun(fixtureRoot)).rejects.toThrow(/directory/i);
});

test("never replaces existing different capture bytes", async ({}, testInfo) => {
  const fixtureRoot = testInfo.outputPath("different-existing-bytes");
  await mkdir(fixtureRoot, { recursive: true });
  const run = await prepareRun(fixtureRoot);
  const [destination] = run.frames;
  await writeFile(destination.actual.absolute, "existing");

  await expect(
    publishIdenticalOrCreate(destination.actual, Buffer.from("replacement")),
  ).rejects.toThrow(/different bytes|already exists/i);
  expect(await readFile(destination.actual.absolute, "utf8")).toBe("existing");
});

test("reuses only byte-identical capture, sidecar, and run-manifest publications", async ({}, testInfo) => {
  const fixtureRoot = testInfo.outputPath("identical-rerun");
  await mkdir(fixtureRoot, { recursive: true });
  const run = await prepareRun(fixtureRoot);
  const [destination] = run.frames;
  const screenshot = Buffer.from("deterministic screenshot");
  const sidecar = Buffer.from('{"kind":"capture-provenance"}\n');
  const manifest = Buffer.from('{"kind":"fidelity-capture-run-manifest"}\n');

  const firstCapture = await publishIdenticalOrCreate(destination.actual, screenshot);
  const firstSidecar = await publishIdenticalOrCreate(destination.provenance, sidecar);
  const firstManifest = await publishIdenticalOrCreate(run.manifest, manifest);
  const secondCapture = await publishIdenticalOrCreate(destination.actual, screenshot);
  const secondSidecar = await publishIdenticalOrCreate(destination.provenance, sidecar);
  const secondManifest = await publishIdenticalOrCreate(run.manifest, manifest);

  expect(firstCapture).toMatchObject({ status: "created", sha256: sha256(screenshot) });
  expect(firstSidecar).toMatchObject({ status: "created", sha256: sha256(sidecar) });
  expect(firstManifest).toMatchObject({ status: "created", sha256: sha256(manifest) });
  expect(secondCapture.status).toBe("reused");
  expect(secondSidecar.status).toBe("reused");
  expect(secondManifest.status).toBe("reused");
  expect(await readFile(destination.actual.absolute)).toEqual(screenshot);
  expect(await readFile(destination.provenance.absolute)).toEqual(sidecar);
});

test("keeps changed-build capture runs immutable and reuses the identical third run", async ({}, testInfo) => {
  const fixtureRoot = testInfo.outputPath("build-scoped-runs");
  await mkdir(fixtureRoot, { recursive: true });
  const secondIdentity = createCaptureRunIdentity({
    ...RUN_IDENTITY_INPUT,
    build: { id: "build-b" },
  });

  const firstRun = await prepareRun(fixtureRoot, [SAFE_FRAME], RUN_IDENTITY);
  const [firstFrame] = firstRun.frames;
  await publishIdenticalOrCreate(firstFrame.actual, Buffer.from("same screenshot"));
  await publishIdenticalOrCreate(firstFrame.provenance, Buffer.from("build-a sidecar"));

  const secondRun = await prepareRun(fixtureRoot, [SAFE_FRAME], secondIdentity);
  const [secondFrame] = secondRun.frames;
  await publishIdenticalOrCreate(secondFrame.actual, Buffer.from("same screenshot"));
  await publishIdenticalOrCreate(
    secondFrame.provenance,
    Buffer.from("build-b sidecar"),
  );

  const thirdRun = await prepareRun(fixtureRoot, [SAFE_FRAME], secondIdentity);
  const [thirdFrame] = thirdRun.frames;
  const thirdActual = await publishIdenticalOrCreate(
    thirdFrame.actual,
    Buffer.from("same screenshot"),
  );
  const thirdSidecar = await publishIdenticalOrCreate(
    thirdFrame.provenance,
    Buffer.from("build-b sidecar"),
  );

  expect(firstRun.id).not.toBe(secondRun.id);
  expect(firstFrame.actual.logical).not.toBe(secondFrame.actual.logical);
  expect(await readFile(firstFrame.provenance.absolute, "utf8")).toBe(
    "build-a sidecar",
  );
  expect(await readFile(secondFrame.provenance.absolute, "utf8")).toBe(
    "build-b sidecar",
  );
  expect(thirdActual.status).toBe("reused");
  expect(thirdSidecar.status).toBe("reused");
});

function prepareRun(
  root: string,
  frames: readonly CaptureRunFrameDestinationInput[] = [SAFE_FRAME],
  identity = RUN_IDENTITY,
) {
  return prepareCaptureRun(root, CAPTURE_ARTIFACTS, frames, identity);
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
