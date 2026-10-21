import { analyzeBundle } from "./core.mjs";
const fixture = document.querySelector("#fixture");
const status = document.querySelector("#status");
const findings = document.querySelector("#findings");
const summary = document.querySelector("#summary");
const limitations = document.querySelector("#limitations");
const download = document.querySelector("#download");
let report = null;
const sample = {
  tool: { name: "lookup_order", outputSchema: { type: "object", required: ["orderId", "status"], properties: { orderId: { type: "string" }, status: { enum: ["open", "shipped"] } }, additionalProperties: false } },
  cases: [
    { name: "successful lookup", expect: "success", result: { content: [{ type: "text", text: "Order A-17 is shipped." }], structuredContent: { orderId: "A-17", status: "shipped" }, isError: false } },
    { name: "missing order", expect: "error", result: { content: [{ type: "text", text: "Order was not found." }], isError: true } }
  ]
};
function text(tag, value, className) { const node = document.createElement(tag); node.textContent = value; if (className) node.className = className; return node; }
function render(value) {
  report = value;
  findings.replaceChildren(...value.findings.map((item) => { const li = document.createElement("li"); li.dataset.severity = item.severity; li.append(text("strong", item.severity.toUpperCase()), text("span", `${item.case} · ${item.code}`), text("p", item.message), item.path ? text("code", item.path) : document.createTextNode("")); return li; }));
  summary.replaceChildren(...Object.entries(value.summary).map(([level, count]) => text("p", `${count} ${level}`, level)));
  const notes = [...value.schemaWarnings, ...value.limitations];
  limitations.replaceChildren(text("ul", ""));
  for (const note of notes) limitations.firstChild.append(text("li", note));
  download.disabled = false;
  status.textContent = value.findings.length ? `Audit complete: ${value.findings.length} finding${value.findings.length === 1 ? "" : "s"}.` : "Audit complete: no evaluated contract issue found.";
}
document.querySelector("#sample").addEventListener("click", () => { fixture.value = JSON.stringify(sample, null, 2); status.textContent = "Sample loaded."; fixture.focus(); });
document.querySelector("#clear").addEventListener("click", () => { fixture.value = ""; findings.replaceChildren(); summary.replaceChildren(text("p", "Run an audit to see deterministic findings.")); limitations.replaceChildren(); download.disabled = true; report = null; status.textContent = "Cleared."; fixture.focus(); });
document.querySelector("#audit").addEventListener("click", () => {
  try {
    if (new TextEncoder().encode(fixture.value).length > 1024 * 1024) throw new Error("Fixture exceeds 1 MiB.");
    let parsed;
    try { parsed = JSON.parse(fixture.value); }
    catch { throw new Error("Fixture contains malformed JSON."); }
    render(analyzeBundle(parsed));
  } catch (error) { report = null; download.disabled = true; status.textContent = `Cannot audit: ${error.message}`; }
});
download.addEventListener("click", () => {
  if (!report) return;
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(report, null, 2)}\n`], { type: "application/json" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = "mcp-result-contract-report.json"; anchor.click(); URL.revokeObjectURL(url);
});
