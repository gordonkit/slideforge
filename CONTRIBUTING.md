# Contributing

SlideForge is a Phase 1 framework. Keep changes small, typed, reproducible, and
honest about browser/PowerPoint differences.

## Development

Use Node.js 24+ and the checked-in lockfile:

```sh
PUPPETEER_SKIP_DOWNLOAD=true npm ci
npx playwright install --with-deps chromium
npm run check
npm run test:unit
npm run build
npm run test:integration
```

Chromium and its system libraries are needed for browser integration tests and
export. The Puppeteer download skip avoids an unnecessary second browser
download from the converter's dependency tree; SlideForge launches Playwright's
Chromium. `npm test` runs the existing full Vitest suite. Use the smallest
relevant existing test selection while developing.

## Changes and pull requests

1. Read [architecture](docs/architecture.md), [schema](docs/schema.md), and
   [limitations](docs/limitations.md).
2. Update the strict schema and types together when changing content. Preserve
   existing defaults and reject unknown fields intentionally.
3. Reuse theme tokens, components, and layouts; avoid one-off styling.
4. Add or update relevant tests and examples. For export changes, inspect layout
   issues and the structural PPTX report; neither proves visual fidelity.
5. Document user-visible behavior, CLI/API changes, and known limitations.
6. Describe exactly which checks ran, including failures and environment
   limitations. Do not claim PowerPoint manual review without doing it.

Do not commit generated decks, screenshots, browser profiles, credentials, or
unnecessary build output. Only export trusted HTML/URLs during development;
page scripts run with the capabilities of the export environment. Reproduction
cases should use local, nonsensitive content.

## Dependencies and licensing

Do not add dependencies for features the existing stack already supports.
Explain any dependency changes and update the lockfile. Retain license notices,
especially for packages bundled into `dist/exporters/engine.js`. Refresh the
installed production inventory and full texts in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
when dependency versions change. Resolve missing upstream notice information
before redistributing affected material. Project contributions are provided
under the [MIT license](LICENSE); third-party material retains its own terms.
