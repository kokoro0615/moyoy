import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { evaluateDevAuditPolicy } from "../../scripts/check-dev-audit-policy.mjs";

const policy = JSON.parse(
  await readFile(
    new URL("../../config/dev-audit-exceptions.json", import.meta.url),
    "utf8",
  ),
);

function auditFromPolicy() {
  return {
    advisories: Object.fromEntries(
      policy.exceptions.map((exception) => [
        String(exception.advisoryId),
        {
          id: exception.advisoryId,
          github_advisory_id: exception.githubAdvisoryId,
          module_name: exception.module,
          severity: exception.severity,
          findings: [
            {
              dev: true,
              paths: [...exception.paths],
            },
          ],
        },
      ]),
    ),
  };
}

test("development audit accepts only the reviewed exact graph", () => {
  assert.deepEqual(
    evaluateDevAuditPolicy(policy, auditFromPolicy(), new Date("2026-08-18")),
    [],
  );
});

test("development audit rejects a new advisory", () => {
  const audit = auditFromPolicy();
  audit.advisories[9999999] = {
    github_advisory_id: "GHSA-aaaa-bbbb-cccc",
    module_name: "new-risk",
    severity: "high",
    findings: [{ dev: true, paths: [".>new-risk"] }],
  };
  const errors = evaluateDevAuditPolicy(policy, audit, new Date("2026-08-18"));
  assert.ok(errors.some((error) => error.includes("unlisted dependency advisory")));
});

test("development audit rejects a production finding", () => {
  const audit = auditFromPolicy();
  const productionAudit = {
    advisories: { 1109537: audit.advisories[1109537] },
  };
  const errors = evaluateDevAuditPolicy(
    policy,
    audit,
    new Date("2026-08-18"),
    productionAudit,
  );
  assert.ok(errors.some((error) => error.includes("not development-only")));
});

test("development audit rejects expired exceptions", () => {
  const errors = evaluateDevAuditPolicy(
    policy,
    auditFromPolicy(),
    new Date("2026-11-19"),
  );
  assert.ok(errors.some((error) => error.includes("expired")));
});
