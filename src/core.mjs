const MAX_CASES = 50;
const MAX_DEPTH = 32;
const MAX_NODES = 10000;
const SECRET_KEY = /(secret|token|password|authorization|api.?key|client.?secret|private.?key)/i;
const INJECTION = /ignore (?:all |any )?(?:previous|prior|above) instructions|system prompt|upload (?:the )?(?:secret|credential)|exfiltrat|send (?:the )?(?:secret|credential)/i;
const SUPPORTED = new Set(["type", "properties", "required", "additionalProperties", "items", "enum", "const", "anyOf", "allOf", "oneOf", "minimum", "maximum", "minLength", "maxLength", "minItems", "maxItems", "description", "title", "default", "$schema"]);

const typeOf = (value) => value === null ? "null" : Array.isArray(value) ? "array" : Number.isInteger(value) ? "integer" : typeof value;
const pathKey = (base, key) => /^[A-Za-z_$][\w$]*$/.test(key) ? `${base}.${key}` : `${base}[${JSON.stringify(key)}]`;

function assertComplexity(value, label) {
  const stack = [{ value, depth: 0 }];
  let nodes = 0;
  while (stack.length) {
    const current = stack.pop();
    nodes += 1;
    if (nodes > MAX_NODES || current.depth > MAX_DEPTH) throw new Error(`${label} exceeds safe complexity bounds`);
    if (current.value && typeof current.value === "object") {
      for (const child of Object.values(current.value)) stack.push({ value: child, depth: current.depth + 1 });
    }
  }
}

function schemaWarnings(schema, path = "$", output = []) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return output;
  for (const key of Object.keys(schema)) {
    if (key === "$ref") output.push(`${path}: $ref is not supported; inline the referenced schema`);
    else if (!SUPPORTED.has(key)) output.push(`${path}: keyword ${key} is not evaluated`);
  }
  if (schema.properties && typeof schema.properties === "object" && !Array.isArray(schema.properties)) for (const [key, child] of Object.entries(schema.properties)) schemaWarnings(child, pathKey(`${path}.properties`, key), output);
  if (schema.items) schemaWarnings(schema.items, `${path}.items`, output);
  for (const key of ["anyOf", "allOf", "oneOf"]) if (Array.isArray(schema[key])) schema[key].forEach((child, index) => schemaWarnings(child, `${path}.${key}[${index}]`, output));
  return output;
}

function schemaShapeErrors(schema, path = "$", output = []) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    output.push(`${path}: schema must be an object`);
    return output;
  }
  const validTypes = new Set(["null", "boolean", "object", "array", "number", "integer", "string"]);
  const types = Array.isArray(schema.type) ? schema.type : schema.type === undefined ? [] : [schema.type];
  if (types.some((item) => typeof item !== "string" || !validTypes.has(item)) || (Array.isArray(schema.type) && !schema.type.length)) output.push(`${path}.type: must contain supported JSON types`);
  if (schema.properties !== undefined && (!schema.properties || typeof schema.properties !== "object" || Array.isArray(schema.properties))) output.push(`${path}.properties: must be an object`);
  if (schema.required !== undefined && (!Array.isArray(schema.required) || schema.required.some((item) => typeof item !== "string"))) output.push(`${path}.required: must be an array of strings`);
  if (schema.enum !== undefined && !Array.isArray(schema.enum)) output.push(`${path}.enum: must be an array`);
  if (schema.items !== undefined && (!schema.items || typeof schema.items !== "object" || Array.isArray(schema.items))) output.push(`${path}.items: must be a schema object`);
  if (schema.additionalProperties !== undefined && typeof schema.additionalProperties !== "boolean" && (!schema.additionalProperties || typeof schema.additionalProperties !== "object" || Array.isArray(schema.additionalProperties))) output.push(`${path}.additionalProperties: must be a boolean or schema object`);
  for (const key of ["anyOf", "allOf", "oneOf"]) if (schema[key] !== undefined && (!Array.isArray(schema[key]) || !schema[key].length)) output.push(`${path}.${key}: must be a non-empty array`);
  for (const key of ["minimum", "maximum"]) if (schema[key] !== undefined && (typeof schema[key] !== "number" || !Number.isFinite(schema[key]))) output.push(`${path}.${key}: must be a finite number`);
  for (const key of ["minLength", "maxLength", "minItems", "maxItems"]) if (schema[key] !== undefined && (!Number.isInteger(schema[key]) || schema[key] < 0)) output.push(`${path}.${key}: must be a non-negative integer`);
  if (schema.properties && typeof schema.properties === "object" && !Array.isArray(schema.properties)) for (const [key, child] of Object.entries(schema.properties)) schemaShapeErrors(child, pathKey(`${path}.properties`, key), output);
  if (schema.items && typeof schema.items === "object" && !Array.isArray(schema.items)) schemaShapeErrors(schema.items, `${path}.items`, output);
  if (schema.additionalProperties && typeof schema.additionalProperties === "object" && !Array.isArray(schema.additionalProperties)) schemaShapeErrors(schema.additionalProperties, `${path}.additionalProperties`, output);
  for (const key of ["anyOf", "allOf", "oneOf"]) if (Array.isArray(schema[key])) schema[key].forEach((child, index) => schemaShapeErrors(child, `${path}.${key}[${index}]`, output));
  return output;
}

function matchesType(value, expected) {
  if (expected === "number") return typeof value === "number" && Number.isFinite(value);
  if (expected === "integer") return Number.isInteger(value);
  if (expected === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (expected === "array") return Array.isArray(value);
  if (expected === "null") return value === null;
  return typeof value === expected;
}

export function validateValue(value, schema, path = "$", budget = { remaining: 20000 }) {
  const errors = [];
  budget.remaining -= 1;
  if (budget.remaining < 0) return [`${path}: validation exceeds safe operation bounds`];
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return [`${path}: schema must be an object`];
  if (schema.$ref) return [`${path}: cannot validate an unsupported $ref`];
  const expected = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (expected.length && !expected.some((kind) => matchesType(value, kind))) {
    return [`${path}: expected ${expected.join(" or ")}, received ${typeOf(value)}`];
  }
  if ("const" in schema && JSON.stringify(value) !== JSON.stringify(schema.const)) errors.push(`${path}: does not match const`);
  if (Array.isArray(schema.enum) && !schema.enum.some((item) => JSON.stringify(item) === JSON.stringify(value))) errors.push(`${path}: is not an allowed enum value`);
  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum) errors.push(`${path}: is below minimum`);
    if (typeof schema.maximum === "number" && value > schema.maximum) errors.push(`${path}: exceeds maximum`);
  }
  if (typeof value === "string") {
    if (Number.isInteger(schema.minLength) && [...value].length < schema.minLength) errors.push(`${path}: is shorter than minLength`);
    if (Number.isInteger(schema.maxLength) && [...value].length > schema.maxLength) errors.push(`${path}: exceeds maxLength`);
  }
  if (Array.isArray(value)) {
    if (Number.isInteger(schema.minItems) && value.length < schema.minItems) errors.push(`${path}: has fewer than minItems`);
    if (Number.isInteger(schema.maxItems) && value.length > schema.maxItems) errors.push(`${path}: exceeds maxItems`);
    if (schema.items) value.forEach((item, index) => errors.push(...validateValue(item, schema.items, `${path}[${index}]`, budget)));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of Array.isArray(schema.required) ? schema.required : []) if (!Object.hasOwn(value, key)) errors.push(`${pathKey(path, key)}: required property is missing`);
    for (const [key, item] of Object.entries(value)) {
      if (schema.properties && Object.hasOwn(schema.properties, key)) errors.push(...validateValue(item, schema.properties[key], pathKey(path, key), budget));
      else if (schema.additionalProperties === false) errors.push(`${pathKey(path, key)}: additional property is not allowed`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === "object") errors.push(...validateValue(item, schema.additionalProperties, pathKey(path, key), budget));
    }
  }
  if (Array.isArray(schema.allOf)) schema.allOf.forEach((branch) => errors.push(...validateValue(value, branch, path, budget)));
  if (Array.isArray(schema.anyOf) && !schema.anyOf.some((branch) => validateValue(value, branch, path, budget).length === 0)) errors.push(`${path}: does not match anyOf`);
  if (Array.isArray(schema.oneOf) && schema.oneOf.filter((branch) => validateValue(value, branch, path, budget).length === 0).length !== 1) errors.push(`${path}: must match exactly one oneOf branch`);
  return errors;
}

function contentText(content) {
  if (!Array.isArray(content)) return "";
  return content.filter((item) => item?.type === "text" && typeof item.text === "string").map((item) => item.text).join("\n");
}

function sensitivePaths(value, base = "$", output = []) {
  if (!value || typeof value !== "object") return output;
  for (const [key, child] of Object.entries(value)) {
    const path = pathKey(base, key);
    if (SECRET_KEY.test(key) && child !== null && child !== "" && child !== "[REDACTED]") output.push(path);
    if (child && typeof child === "object") sensitivePaths(child, path, output);
  }
  return output;
}

function finding(caseName, severity, code, message, path = null) {
  return { case: caseName, severity, code, message, path };
}

export function analyzeBundle(bundle) {
  assertComplexity(bundle, "fixture bundle");
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) throw new Error("fixture bundle must be an object");
  if (!bundle.tool || typeof bundle.tool !== "object") throw new Error("tool must be an object");
  if (typeof bundle.tool.name !== "string" || !bundle.tool.name.trim()) throw new Error("tool.name is required");
  if (!Array.isArray(bundle.cases) || !bundle.cases.length) throw new Error("cases must be a non-empty array");
  if (bundle.cases.length > MAX_CASES) throw new Error(`cases exceed the ${MAX_CASES}-case bound`);
  const hasOutputSchema = Object.hasOwn(bundle.tool, "outputSchema");
  const outputSchema = bundle.tool.outputSchema;
  if (hasOutputSchema) assertComplexity(outputSchema, "outputSchema");
  const warnings = hasOutputSchema ? schemaWarnings(outputSchema) : [];
  const findings = [];
  const schemaErrors = hasOutputSchema ? schemaShapeErrors(outputSchema) : [];
  for (const message of schemaErrors) findings.push(finding("(tool schema)", "critical", "invalid-output-schema", message, message.split(": ")[0]));
  const seen = new Set();
  for (const [index, testCase] of bundle.cases.entries()) {
    const name = typeof testCase?.name === "string" && testCase.name.trim() ? testCase.name.trim() : `case-${index + 1}`;
    if (seen.has(name)) findings.push(finding(name, "medium", "duplicate-case-name", "Case names must be unique."));
    seen.add(name);
    const result = testCase?.result;
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      findings.push(finding(name, "critical", "invalid-result", "result must be an object."));
      continue;
    }
    if (!new Set(["success", "error"]).has(testCase.expect ?? "success")) findings.push(finding(name, "high", "invalid-expect", "expect must be success or error.", "$.expect"));
    if (!Array.isArray(result.content)) findings.push(finding(name, "high", "missing-content", "MCP tool results must include a content array.", "$.content"));
    else result.content.forEach((item, itemIndex) => {
      const path = `$.content[${itemIndex}]`;
      if (!item || typeof item !== "object" || Array.isArray(item) || typeof item.type !== "string") findings.push(finding(name, "high", "invalid-content-item", "Each content item must be an object with a type.", path));
      else if (item.type === "text" && typeof item.text !== "string") findings.push(finding(name, "high", "invalid-content-item", "Text content items must include a string text field.", path));
      else if (["image", "audio"].includes(item.type) && (typeof item.data !== "string" || typeof item.mimeType !== "string")) findings.push(finding(name, "high", "invalid-content-item", `${item.type} content items must include string data and mimeType fields.`, path));
      else if (item.type === "resource" && (!item.resource || typeof item.resource !== "object" || Array.isArray(item.resource) || typeof item.resource.uri !== "string" || (typeof item.resource.text !== "string" && typeof item.resource.blob !== "string"))) findings.push(finding(name, "high", "invalid-content-item", "Resource content items must include a resource URI and string text or blob.", path));
      else if (item.type === "resource_link" && (typeof item.uri !== "string" || typeof item.name !== "string")) findings.push(finding(name, "high", "invalid-content-item", "Resource links must include string uri and name fields.", path));
      else if (!new Set(["text", "image", "audio", "resource", "resource_link"]).has(item.type)) findings.push(finding(name, "high", "invalid-content-item", "Content item type is not recognized by this fixture format.", `${path}.type`));
    });
    if ("isError" in result && typeof result.isError !== "boolean") findings.push(finding(name, "high", "invalid-is-error", "isError must be a boolean when present.", "$.isError"));
    const failed = result.isError === true;
    const expectedError = testCase.expect === "error";
    if (expectedError !== failed) findings.push(finding(name, "high", "error-semantic-mismatch", expectedError ? "Expected an error result with isError: true." : "Expected a successful result, but isError is true.", "$.isError"));
    if (failed && !contentText(result.content).trim()) findings.push(finding(name, "high", "opaque-error", "Error results need user-readable text content.", "$.content"));
    if (!failed && hasOutputSchema && !("structuredContent" in result)) findings.push(finding(name, "critical", "missing-structured-content", "A successful result for a tool with outputSchema must include structuredContent.", "$.structuredContent"));
    if ("structuredContent" in result && hasOutputSchema && !schemaErrors.length) {
      for (const message of validateValue(result.structuredContent, outputSchema, "$.structuredContent")) {
        const delimiter = message.indexOf(": ");
        findings.push(finding(name, "critical", "output-schema-mismatch", message, delimiter < 0 ? null : message.slice(0, delimiter)));
      }
    } else if ("structuredContent" in result && !hasOutputSchema) findings.push(finding(name, "medium", "undeclared-structured-content", "structuredContent is present but the tool has no outputSchema.", "$.structuredContent"));
    for (const path of sensitivePaths(result)) findings.push(finding(name, "critical", "secret-bearing-output", "A secret-like field contains an unredacted value.", path));
    const text = contentText(result.content);
    if (INJECTION.test(text)) findings.push(finding(name, "high", "instruction-like-output", "Text content contains instruction-like language; treat tool output as untrusted data.", "$.content"));
  }
  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  findings.sort((a, b) => rank[a.severity] - rank[b.severity] || a.case.localeCompare(b.case) || a.code.localeCompare(b.code));
  return {
    schemaVersion: 1,
    tool: bundle.tool.name,
    summary: Object.fromEntries(Object.keys(rank).map((level) => [level, findings.filter((item) => item.severity === level).length])),
    cases: bundle.cases.length,
    findings,
    schemaWarnings: [...new Set(warnings)].sort(),
    limitations: [
      "Offline fixture analysis does not connect to or execute an MCP server.",
      "The bounded validator evaluates a documented JSON Schema subset; unsupported keywords are listed as warnings.",
      "Instruction-like output detection is conservative triage, not proof of prompt injection.",
      "A clean report is not a security, protocol-conformance, or OpenAI approval."
    ]
  };
}

export function formatMarkdown(report) {
  const safe = (value) => String(value).replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "?").replaceAll("`", "\\`");
  const lines = ["# MCP result contract report", "", `Tool: \`${safe(report.tool)}\``, "", `Cases: ${report.cases}. Findings: ${report.summary.critical} critical, ${report.summary.high} high, ${report.summary.medium} medium, ${report.summary.low} low.`, ""];
  if (!report.findings.length) lines.push("No evaluated contract issue found.", "");
  for (const item of report.findings) lines.push(`- **${item.severity.toUpperCase()}** \`${safe(item.case)}\` / \`${safe(item.code)}\`: ${safe(item.message)}${item.path ? ` (\`${safe(item.path)}\`)` : ""}`);
  if (report.schemaWarnings.length) lines.push("", "## Schema coverage warnings", "", ...report.schemaWarnings.map((item) => `- ${safe(item)}`));
  lines.push("", "## Limitations", "", ...report.limitations.map((item) => `- ${safe(item)}`), "");
  return `${lines.join("\n")}\n`;
}
