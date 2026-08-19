import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("asset provenance rows preserve the machine-readable schema", async () => {
  const rows = (await readFile("docs/asset-provenance.csv", "utf8"))
    .trimEnd()
    .split("\n")
    .map((line) => line.split(","));
  const [header, ...records] = rows;

  assert.equal(header.length, 14);
  for (const required of ["public_path", "bytes", "sha256"]) {
    assert.ok(header.includes(required), `missing ${required} column`);
  }
  assert.ok(records.length > 0);
  for (const [index, record] of records.entries()) {
    assert.equal(record.length, header.length, `row ${index + 2} has a shifted schema`);
    assert.ok(record.every((value) => value.trim().length > 0));
  }
});
