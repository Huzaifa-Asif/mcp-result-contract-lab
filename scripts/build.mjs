import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
const out = "dist/mcp-result-contract-lab";
await rm("dist", { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const entry of ["index.html", "styles.css", "src", "cli.mjs", "server.mjs", "package.json", "package-lock.json", "examples", "plugin.json", "skills", "docs", "README.md", "LICENSE", "PRIVACY.md", "SECURITY.md", "SUPPORT.md", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "CHANGELOG.md"]) await cp(entry, join(out, entry), { recursive: true });
const files = [];
async function walk(dir) { for (const item of await readdir(dir, { withFileTypes: true })) { const path = join(dir, item.name); if (item.isDirectory()) await walk(path); else files.push(path); } }
await walk(out);
const hashes = {};
for (const file of files.sort()) hashes[file.slice(out.length + 1)] = createHash("sha256").update(await readFile(file)).digest("hex");
await writeFile("dist/SHA256SUMS.json", `${JSON.stringify(hashes, null, 2)}\n`);
