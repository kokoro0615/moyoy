#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const EXACT_VERSION = /^\d+\.\d+\.\d+$/;
const PACKAGE_MANAGER = /^pnpm@(\d+\.\d+\.\d+)$/;

export function validateRuntimeContract({
  packageJson,
  expectedNode,
  actualNode,
  actualPnpm,
}) {
  const errors = [];
  const packageManagerMatch = PACKAGE_MANAGER.exec(packageJson.packageManager ?? "");

  if (!EXACT_VERSION.test(expectedNode)) {
    errors.push(".nvmrc must pin an exact Node x.y.z version");
  }
  if (!packageManagerMatch) {
    errors.push("packageManager must pin an exact pnpm@x.y.z version");
  }

  const expectedPnpm = packageManagerMatch?.[1];
  if (expectedPnpm && packageJson.engines?.pnpm !== expectedPnpm) {
    errors.push("engines.pnpm must exactly match packageManager");
  }
  if (actualNode !== expectedNode) {
    errors.push(`expected Node ${expectedNode}, received ${actualNode}`);
  }
  if (expectedPnpm && actualPnpm !== expectedPnpm) {
    errors.push(`expected pnpm ${expectedPnpm}, received ${actualPnpm || "unknown"}`);
  }

  return errors;
}

export async function checkRuntime(root = process.cwd()) {
  const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  const expectedNode = (await readFile(resolve(root, ".nvmrc"), "utf8")).trim();
  const pnpmResult = spawnSync("pnpm", ["--version"], {
    cwd: root,
    encoding: "utf8",
  });

  if (pnpmResult.error || pnpmResult.status !== 0) {
    return ["unable to execute pnpm --version from the active PATH"];
  }

  return validateRuntimeContract({
    packageJson,
    expectedNode,
    actualNode: process.versions.node,
    actualPnpm: pnpmResult.stdout.trim(),
  });
}

async function main() {
  const errors = await checkRuntime();
  if (errors.length > 0) {
    process.stderr.write("RUNTIME CONTRACT BLOCKED:\n");
    for (const error of errors) process.stderr.write(`- ${error}\n`);
    process.exitCode = 1;
    return;
  }

  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  process.stdout.write(
    `Runtime verified: Node ${process.versions.node}, ${packageJson.packageManager}.\n`,
  );
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) await main();
