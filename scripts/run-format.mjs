#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const mode = process.argv[2];
if (mode !== "--check" && mode !== "--write") {
  process.stderr.write("Usage: run-format.mjs --check|--write\n");
  process.exit(2);
}

const ownedTargets = [
  ".github/workflows/**/*.{yml,yaml}",
  "*.{cjs,json,mjs,ts,yaml,yml}",
  "config/**/*.{json,yaml,yml}",
  "scripts/**/*.mjs",
  "src/**/*.{css,ts,tsx}",
  "tests/**/*.{mjs,ts,tsx}",
];
const result = spawnSync("prettier", [mode, ...ownedTargets], {
  encoding: "utf8",
  stdio: "inherit",
});

if (result.error) {
  process.stderr.write(`Unable to run Prettier: ${result.error.message}\n`);
  process.exit(1);
}

process.exit(result.status ?? 1);
