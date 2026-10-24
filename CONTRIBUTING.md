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

In VS Code, the Run and Debug view offers launch configurations for all, unit,
and current-file Vitest runs, CLI preview and export of the example deck, and
the documentation site dev server. Configurations that need `dist/` build it
first through the `slideforge: build` task.

## Documentation site

The site at <https://slideforge.gordonkit.com/> lives in `site/` with its own lockfile.
Page content for all four languages is in `site/src/content.ts`; update every locale when
you change a page, and keep it consistent with the Markdown references in `docs/`.

```sh
npm --prefix site ci
npm --prefix site run dev
npm --prefix site run check
npm --prefix site run build
```

The build writes `site/dist/`, including a static page per locale, `sitemap.xml`, and
`robots.txt`. Do not commit it. CI deploys it to Cloudflare Pages on pushes to `main`.

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

By participating, you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Report
security issues as described in [SECURITY.md](SECURITY.md).
