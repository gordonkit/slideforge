# Security Policy

## Supported versions

Until the first stable release, security fixes are made only on the latest development
version.

## Scope

SlideForge is a local developer CLI. Export launches Chromium, runs page scripts, and
allows network access, so it must only process trusted HTML and URLs; see the
[trust model](docs/limitations.md#browser-execution-is-privileged). Reports that rely on
exporting attacker-controlled pages are expected behavior unless they escape that model,
for example by bypassing schema validation of structured JSON input.

## Reporting a vulnerability

Do not open a public issue. Report vulnerabilities privately through GitHub's
[private security advisory](https://github.com/gordonkit/slideforge/security/advisories/new)
feature. Include the affected version, reproducible steps, impact, and any suggested
mitigation. Do not include confidential presentations, credentials, or personal data.

Maintainers will acknowledge a report, investigate it, and coordinate disclosure. No
response-time guarantee is made before a formal security response process is published.
