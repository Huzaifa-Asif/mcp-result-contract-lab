import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./", import.meta.url));
const port = Number(process.env.PORT ?? 4175);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };
createServer(async (request, response) => {
  try {
    const raw = new URL(request.url, "http://localhost").pathname;
    const requested = raw === "/" ? "index.html" : raw.slice(1);
    const relative = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
    let path = join(root, relative);
    if (!(await stat(path)).isFile()) throw new Error("not found");
    response.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream", "cache-control": "no-store", "x-content-type-options": "nosniff" });
    response.end(await readFile(path));
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found\n");
  }
}).listen(port, "127.0.0.1", () => process.stdout.write(`MCP Result Contract Lab: http://127.0.0.1:${port}\n`));
