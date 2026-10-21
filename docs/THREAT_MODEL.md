# Threat model

## Assets

- Confidentiality of captured tool results and any mistakenly included credentials or personal data.
- Integrity of the declared schema, result fixtures, deterministic findings, and downloaded evidence.
- Availability of the browser tab, CLI, and CI worker under hostile input.

## Attacker capabilities

An attacker can control every JSON key and value, schema keyword, case name, text block, nesting level, and file content in the selected fixture. They cannot control the operator account, browser, repository, output destination, or host permissions under this model.

## Trust boundaries and controls

- File/text input to parser: 1 MiB browser/CLI byte limit, 50-case limit, 32-level and 10,000-node bounds.
- Parsed schema to validator: documented keyword subset; unsupported keywords become coverage warnings and `$ref` cannot be validated.
- Captured results to evidence: reports contain fixed messages and safe paths, not captured values; secret-like keys are identified by name.
- Text to UI/terminal: DOM text nodes in the browser and control-character escaping in terminal/Markdown output.
- Static host to browser: same-origin assets only; fixture content is never sent to the host after load.

## Residual risk

The app cannot prove runtime behavior, server identity, authorization, protocol completeness, or absence of secrets/prompt injection. Browser extensions and compromised hosting can read page memory. Large inputs within bounds still consume resources. Review in a least-privileged browser profile using sanitized fixtures.
