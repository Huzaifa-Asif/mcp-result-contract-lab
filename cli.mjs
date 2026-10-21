#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import { analyzeBundle, formatMarkdown } from "./src/core.mjs";

const [file, ...args] = process.argv.slice(2);
if (!file || args.includes("--help")) {
  process.stdout.write("Usage: node cli.mjs <fixture.json> [--format json|markdown] [--fail-on critical|high|medium|never]\n");
  process.exit(file ? 0 : 2);
}
const value = (flag, fallback) => { const index = args.indexOf(flag); return index < 0 ? fallback : args[index + 1]; };
try {
  const metadata = await stat(file);
  if (!metadata.isFile()) throw new Error("fixture must be a regular file");
  if (metadata.size > 1024 * 1024) throw new Error("fixture exceeds 1 MiB");
  const bytes = await readFile(file);
  if (bytes.length > 1024 * 1024) throw new Error("fixture exceeds 1 MiB");
  let fixture;
  try { fixture = JSON.parse(bytes.toString("utf8")); }
  catch { throw new Error("fixture contains malformed JSON"); }
  const report = analyzeBundle(fixture);
  const format = value("--format", "markdown");
  if (!new Set(["json", "markdown"]).has(format)) throw new Error("--format must be json or markdown");
  process.stdout.write(format === "json" ? `${JSON.stringify(report, null, 2)}\n` : formatMarkdown(report));
  const threshold = value("--fail-on", "never");
  const rank = { critical: 4, high: 3, medium: 2, low: 1, never: 99 };
  if (!(threshold in rank)) throw new Error("--fail-on must be critical, high, medium, or never");
  if (report.findings.some((item) => rank[item.severity] >= rank[threshold])) process.exitCode = 3;
} catch (error) {
  process.stderr.write(`mcp-result-contract-lab: ${String(error instanceof Error ? error.message : error).replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "?")}\n`);
  process.exitCode = 2;
}
