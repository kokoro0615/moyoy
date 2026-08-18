import assert from "node:assert/strict";
import test from "node:test";

import { validateRuntimeContract } from "../../scripts/check-runtime.mjs";

const validInput = {
  packageJson: {
    packageManager: "pnpm@10.34.5",
    engines: { node: "24.x", pnpm: "10.34.5" },
  },
  expectedNode: "24.19.0",
  actualNode: "24.19.0",
  actualPnpm: "10.34.5",
};

test("runtime contract accepts exact matching versions", () => {
  assert.deepEqual(validateRuntimeContract(validInput), []);
});

test("runtime contract rejects a pnpm range", () => {
  const errors = validateRuntimeContract({
    ...validInput,
    packageJson: {
      ...validInput.packageJson,
      engines: { node: "24.x", pnpm: "10.x" },
    },
  });
  assert.ok(errors.includes("engines.pnpm must exactly match packageManager"));
});

test("runtime contract rejects an active pnpm mismatch", () => {
  const errors = validateRuntimeContract({ ...validInput, actualPnpm: "11.22.0" });
  assert.ok(errors.some((error) => error.includes("expected pnpm 10.34.5")));
});

test("runtime contract rejects an active Node mismatch", () => {
  const errors = validateRuntimeContract({ ...validInput, actualNode: "24.13.1" });
  assert.ok(errors.some((error) => error.includes("expected Node 24.19.0")));
});
