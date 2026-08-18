#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const GHSA = /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/;

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function equalArrays(left, right) {
  return (
    left.length === right.length && left.every((value, index) => value === right[index])
  );
}

export function evaluateDevAuditPolicy(
  policy,
  audit,
  now = new Date(),
  productionAudit = { advisories: {} },
) {
  const errors = [];
  if (policy?.schemaVersion !== 1)
    errors.push("dev audit policy must use schemaVersion=1");
  if (!DATE.test(policy?.reviewBy ?? "")) {
    errors.push("dev audit policy reviewBy must be YYYY-MM-DD");
  } else {
    const reviewDeadline = new Date(`${policy.reviewBy}T23:59:59.999Z`);
    if (now > reviewDeadline)
      errors.push(`dev audit exceptions expired on ${policy.reviewBy}`);
  }
  if (!policy?.owner?.trim()) errors.push("dev audit policy owner is required");

  const exceptions = Array.isArray(policy?.exceptions) ? policy.exceptions : [];
  const exceptionById = new Map();
  for (const exception of exceptions) {
    if (!Number.isInteger(exception.advisoryId)) {
      errors.push("every dev audit exception needs a numeric advisoryId");
      continue;
    }
    if (exceptionById.has(String(exception.advisoryId))) {
      errors.push(`duplicate dev advisory exception: ${exception.advisoryId}`);
    }
    if (!GHSA.test(exception.githubAdvisoryId ?? "")) {
      errors.push(`invalid GitHub advisory ID for ${exception.advisoryId}`);
    }
    if (!exception.rationale?.trim()) {
      errors.push(`missing rationale for dev advisory ${exception.advisoryId}`);
    }
    exceptionById.set(String(exception.advisoryId), exception);
  }

  const advisories = audit?.advisories ?? {};
  const productionAdvisories = productionAudit?.advisories ?? {};
  for (const [id, advisory] of Object.entries(advisories)) {
    const exception = exceptionById.get(id);
    if (!exception) {
      errors.push(
        `unlisted dependency advisory: ${id} (${advisory.github_advisory_id ?? "unknown"})`,
      );
      continue;
    }
    if (advisory.github_advisory_id !== exception.githubAdvisoryId) {
      errors.push(`GitHub advisory ID changed for ${id}`);
    }
    if (advisory.module_name !== exception.module) {
      errors.push(`module changed for advisory ${id}`);
    }
    if (advisory.severity !== exception.severity) {
      errors.push(`severity changed for advisory ${id}`);
    }

    const findings = advisory.findings ?? [];
    if (
      findings.some((finding) => finding.dev === false) ||
      id in productionAdvisories
    ) {
      errors.push(`advisory ${id} is not development-only`);
    }
    const actualPaths = sortedUnique(
      findings.flatMap((finding) => finding.paths ?? []),
    );
    const approvedPaths = sortedUnique(exception.paths ?? []);
    if (!equalArrays(actualPaths, approvedPaths)) {
      errors.push(`dependency paths changed for advisory ${id}`);
    }
  }

  for (const id of exceptionById.keys()) {
    if (!(id in advisories)) errors.push(`stale dev advisory exception: ${id}`);
  }
  return errors;
}

export function runPnpmAudit(root = process.cwd(), productionOnly = false) {
  const args = productionOnly ? ["audit", "--prod", "--json"] : ["audit", "--json"];
  const result = spawnSync("pnpm", args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || ![0, 1].includes(result.status)) {
    throw new Error("pnpm audit did not return a usable dependency report");
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error("pnpm audit did not emit valid JSON");
  }
}

async function main() {
  const root = process.cwd();
  const policy = JSON.parse(
    await readFile(resolve(root, "config/dev-audit-exceptions.json"), "utf8"),
  );
  let audit;
  try {
    audit = runPnpmAudit(root);
  } catch (error) {
    process.stderr.write(`DEVELOPMENT AUDIT POLICY BLOCKED:\n- ${error.message}\n`);
    process.exitCode = 1;
    return;
  }
  let productionAudit;
  try {
    productionAudit = runPnpmAudit(root, true);
  } catch (error) {
    process.stderr.write(`DEVELOPMENT AUDIT POLICY BLOCKED:\n- ${error.message}\n`);
    process.exitCode = 1;
    return;
  }
  const errors = evaluateDevAuditPolicy(policy, audit, new Date(), productionAudit);
  if (errors.length > 0) {
    process.stderr.write("DEVELOPMENT AUDIT POLICY BLOCKED:\n");
    for (const error of errors) process.stderr.write(`- ${error}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `Development audit matched ${policy.exceptions.length} reviewed LHCI exception(s); review by ${policy.reviewBy}.\n`,
  );
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) await main();
