# Research and selection record

Rechecked 2026-10-21 MYT.

## Selected gap

MCP tool definitions may declare an `outputSchema`, while successful calls return `structuredContent` plus model-readable `content`. OpenAI's current testing guidance asks developers to record request and response data and retest result shapes; the MCP specification requires structured results to match declared schemas. A saved-fixture audit gives teams a credential-free check before live inspection or CI server execution.

The app is intentionally narrower than a live inspector: it evaluates captured result contracts, error semantics, unredacted secret-like fields, and instruction-like text without connecting to a server or storing credentials.

## Alternatives and novelty limit

- MCP Inspector is the reference open-source web/CLI/TUI server debugger and supports live tool calls. It requires a server connection and may store connection secrets; this app does neither.
- MCPJam is an open-source testing/evaluation platform with live inspection, authentication, model evals, and CI. It is broader; this app is a single-purpose offline fixture auditor.
- Postman can connect to MCP servers and run tools in an existing API workspace. It is broader and connection-oriented.
- Specmatic MCP Auto-Test fetches tools, generates inputs, invokes tools, and validates output schemas. It is closer automation overlap, but it executes servers rather than auditing already-sanitized captures.
- Generic JSON Schema validators validate instances but do not apply MCP `content`, `structuredContent`, `isError`, secret-bearing output, or instruction-like-output checks.

No claim is made that JSON Schema validation, secret-key heuristics, or prompt-injection pattern matching is novel. The original scope is their bounded, local application to saved MCP result fixtures with evidence that never echoes captured values.

## Sources

- https://developers.openai.com/plugins/concepts/plugins
- https://developers.openai.com/plugins/build/mcp-server
- https://developers.openai.com/plugins/deploy/connect-chatgpt
- https://developers.openai.com/plugins/guides/security-privacy
- https://modelcontextprotocol.io/specification/2025-06-18/server/tools
- https://modelcontextprotocol.io/docs/2026-07-28/tools/inspector
- https://github.com/MCPJam/inspector
- https://learning.postman.com/flows/build-flows/ai/mcp-server-flows/mcp-server-flows
- https://specmatic.io/updates/testing-mcp-servers-how-specmatic-mcp-auto-test-catches-schema-drift-and-automates-regression/

## Hosting suitability

GitHub Pages serves static HTML/CSS/JavaScript from public repositories on GitHub Free. The current documented limits include a recommended 1 GB source repository, 1 GB published site, 100 GB/month soft bandwidth, and 10 builds/hour soft limit. This app has no server runtime and is suitable for Pages, but ownership and a successful deployed exact commit must be verified separately.

- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://docs.github.com/billing/managing-billing-for-github-actions/about-billing-for-github-actions
