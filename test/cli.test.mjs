import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("CLI emits JSON and policy exit 3", async () => {
  const root = await mkdtemp(join(tmpdir(), "mcp-result-lab-"));
  const file = join(root, "fixture.json");
  await writeFile(file, JSON.stringify({ tool: { name: "x", outputSchema: { type: "object" } }, cases: [{ name: "x", result: { content: [] } }] }));
  const run = spawnSync(process.execPath, ["cli.mjs", file, "--format", "json", "--fail-on", "critical"], { encoding: "utf8" });
  assert.equal(run.status, 3);
  assert.match(run.stdout, /missing-structured-content/);
});

test("CLI rejects malformed JSON without printing its content", async () => {
  const root = await mkdtemp(join(tmpdir(), "mcp-result-lab-"));
  const file = join(root, "fixture.json");
  await writeFile(file, '{"secret":TOPSECRET}');
  const run = spawnSync(process.execPath, ["cli.mjs", file], { encoding: "utf8" });
  assert.equal(run.status, 2);
  assert.doesNotMatch(run.stderr, /TOPSECRET/);
});

test("CLI escapes terminal controls in errors", () => {
  const run = spawnSync(process.execPath, ["cli.mjs", "missing-\u001b-file"], { encoding: "utf8" });
  assert.equal(run.status, 2);
  assert.doesNotMatch(run.stderr, /\u001b/);
});

test("CLI rejects oversized fixtures before parsing", async () => {
  const root = await mkdtemp(join(tmpdir(), "mcp-result-lab-"));
  const file = join(root, "fixture.json");
  await writeFile(file, Buffer.alloc(1024 * 1024 + 1, 65));
  const run = spawnSync(process.execPath, ["cli.mjs", file], { encoding: "utf8" });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /exceeds 1 MiB/);
});
