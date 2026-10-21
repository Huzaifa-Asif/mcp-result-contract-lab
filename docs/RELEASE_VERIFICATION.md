# 0.1.0 release verification

Date: 2026-10-21 MYT

## Verified checks

- `npm run check`: lint, syntax typecheck, 21 unit/adversarial/CLI tests, production build, and dependency audit with zero vulnerabilities.
- Deterministic SHA-256 manifest: 24 distribution files independently verified.
- Valid and unsafe browser audit journeys in Chrome; the download automation was stopped before it produced reliable evidence, so download is not claimed as browser-verified.
- Valid and unsafe CLI journeys, malformed-JSON redaction, oversized-input rejection, and policy exit codes.
- Plugin manifest JSON, skill wrapper, linked documentation, contribution guidance, and packaged server/CLI assets.
- Static accessibility review of labels, status announcements, skip link, focus, severity text, keyboard-native controls, responsive CSS, and reduced-motion behavior.
- Independent release review: initial no-go findings were fixed; final verdict GO for packaging/testing.
- Archive integrity and byte-for-byte parity are verified when the release archive is created.

## Publication gates

Repository ownership, remote exact commit, CI conclusion, Pages deployment, live endpoint, release/tag, and OpenAI submission/review/publication are separate states and must be verified separately. This static utility does not expose a remote MCP server and no directory submission is implied.
