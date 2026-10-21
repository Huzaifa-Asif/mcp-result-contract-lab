# Security policy

## Supported versions

Security fixes are provided for the latest release on `main`.

## Reporting

Use GitHub private vulnerability reporting when enabled. Otherwise contact the owner through the public GitHub profile without publishing exploit payloads or sensitive data.

## Threat model

Fixture bundles are hostile. The app bounds bytes, case count, object depth, and node count; never executes fixture content; uses DOM text nodes; emits fixed messages and safe paths instead of captured values; escapes terminal control and bidirectional characters in CLI errors and Markdown; and has no runtime network capability. Static hosting receives ordinary HTTP request metadata but not fixture content.

Residual risks include denial of service within documented bounds, incomplete detection of unusually named secrets or transformed prompt injection, unsupported JSON Schema semantics, browser-extension access, and false confidence from static fixtures. Use a least-privileged environment and sanitized data.
