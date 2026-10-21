# MCP Result Contract Lab

MCP Result Contract Lab is a dependency-free, local-first web app and CLI for auditing saved MCP `tools/call` fixtures against a tool's declared `outputSchema`. It checks structured-result presence and shape, success/error semantics, unredacted secret-like fields, instruction-like text, input bounds, and unsupported schema coverage without connecting to or executing the server.

## Quick start

Requires Node.js 20 or newer.

```sh
npm start
# open http://127.0.0.1:4175

node cli.mjs examples/valid.json
node cli.mjs examples/unsafe.json --format json --fail-on high
npm run check
```

The browser accepts at most 1 MiB and 50 cases. It makes no network requests after loading and stores nothing. Use sanitized fixtures and placeholders, never live credentials.

## Fixture format

```json
{
  "tool": { "name": "lookup", "outputSchema": { "type": "object" } },
  "cases": [
    {
      "name": "happy path",
      "expect": "success",
      "result": {
        "content": [{ "type": "text", "text": "Done" }],
        "structuredContent": {},
        "isError": false
      }
    }
  ]
}
```

`expect` is `success` or `error`. `result` is the captured MCP result object, not a JSON-RPC envelope.

## What the validator evaluates

The bounded JSON Schema subset includes `type`, `properties`, `required`, `additionalProperties`, `items`, `enum`, `const`, `anyOf`, `allOf`, `oneOf`, numeric bounds, string length, and array length. Regex `pattern`, `$ref`, and other unsupported keywords are listed rather than executed or silently treated as validated.

Results contain only case names, finding codes, safe paths, and fixed explanations. Secret-like field values are never copied into a report.

## Accessibility

The UI uses native labels, buttons, textarea, details, status announcements, keyboard focus indicators, a skip link, text severity labels, responsive layout, and reduced-motion-aware styling. It does not rely on color alone. JSON and Markdown output support nonvisual workflows.

## Privacy, security, and limitations

See [PRIVACY.md](PRIVACY.md), [SECURITY.md](SECURITY.md), [research](docs/RESEARCH.md), [threat model](docs/THREAT_MODEL.md), and [release verification](docs/RELEASE_VERIFICATION.md).

This is fixture triage, not a live MCP conformance suite, vulnerability scanner, or OpenAI approval. A clean report cannot prove runtime behavior, authorization, privacy, or deployed-server identity.

## Support and license

See [SUPPORT.md](SUPPORT.md) and [CONTRIBUTING.md](CONTRIBUTING.md). MIT licensed.
