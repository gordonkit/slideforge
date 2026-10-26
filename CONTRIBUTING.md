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

## Adding a layout family

A family is the shape of a slide's content: its fields. Each one lives in its own
folder under `src/layouts/`:

1. `src/layouts/<family>/schema.ts` exports `{ family, variants, slide }` with
   `variants` starting at `"default"` and `slide` built by `slideObject(family, { … })`
   from `src/schemas/fields.ts`. Put family-specific checks on `slide` with
   `.superRefine`.
2. `render.tsx` exports a component that takes `LayoutProps<"<family>">` and returns
   the slide's content region. The frame, title, footer, and background come from `Slide`.
3. `<family>.css` holds the family's rules, using only `--sf-*` tokens; add a token to
   `src/themes/tokens.ts` for a new size rather than a literal. Leave the file as a
   comment if the shared styles in `src/themes/slides.css` are enough. Scope variant
   rules as `.sf-variant-<variant>.sf-layout-<family>`.
4. List the definition in `layouts` in `src/layouts/registry.ts` and its renderer in
   `src/layouts/index.tsx`. TypeScript reports a family with no renderer.

The schema, the unknown-layout and unknown-variant errors, `backgrounds` keys, template
`variants` keys, and the stylesheet follow from the registry. Then:

- add one slide of the family to `examples/basic`, which has one slide per family in
  registry order (tests compare it with `layoutFamilies`);
- add unit tests for the fields, rendered markup, and each variant, and export the
  slides to check layout issues, the PPTX report, and a rendering;
- document it in `docs/schema.md` (fields and variants), `docs/components.md`,
  `docs/design-tokens.md` for new tokens, `CHANGELOG.md`, and both layout tables in all
  four locales of `site/src/content.ts`.

Describe the set of families without a count ("each layout family") so that a new
family does not mean editing every place that states how many there are.

Adding a variant to an existing family is the same without the new folder: list it in
the family's `variants`, give it CSS (and markup in `render.tsx` if needed), and add it
to the variants table in `docs/schema.md`.

## Dependencies and licensing

Do not add dependencies for features the existing stack already supports.
Explain any dependency changes and update the lockfile. Retain license notices,
especially for packages bundled into `dist/exporters/engine.js`. Refresh the
installed production inventory and full texts in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
when dependency versions change. Resolve missing upstream notice information
before redistributing affected material. `dom-to-pptx` is a development
dependency because it is only used through the bundle; keep packages that Node
never loads out of `dependencies`, so `npm install slideforge` stays small.
Project contributions are provided under the [Apache License 2.0](LICENSE)
(see also [NOTICE](NOTICE)); third-party material retains its own terms.

## Releasing

Releases are published to npm as `slideforge` by
[`.github/workflows/release.yml`](.github/workflows/release.yml) when a
`v<major>.<minor>.<patch>` tag is pushed. The workflow checks that the tag matches
`package.json`, `package-lock.json`, and a dated `CHANGELOG.md` section
(`npm run check:release -- --tag v0.1.0`); runs the checks and tests; installs the
packed tarball in a clean project (`npm run test:package`); creates a draft GitHub
release with the tarball; publishes to npm with provenance; and then publishes the
GitHub release.

To release:

1. On a branch, set the version with `npm version <version> --no-git-tag-version`,
   and move the `[Unreleased]` entries in `CHANGELOG.md` under
   `## [<version>] - <YYYY-MM-DD>`, using the date the tag will be pushed.
2. Run `npm run check:release -- --tag v<version>` and `npm run test:package`,
   then merge the pull request.
3. Tag the merge commit on `main` and push the tag:
   `git tag v<version> && git push origin v<version>`.

npm authentication uses trusted publishing: npm accepts the workflow's GitHub
OIDC token, so no npm secret is stored. The package's trusted publisher on
npmjs.com is GitHub Actions with organization `gordonkit`, repository
`slideforge`, workflow `release.yml`, environment `npm`, and `npm publish`
allowed; the package's publishing access disallows tokens. The `npm`
environment accepts only `v*` tags. When a trusted publisher is created or
recreated, npm shows it as pending validation until a release is published
through it, before the deadline npm displays. Check npm's current trusted
publishing documentation when changing this setup, since its steps can change.

By participating, you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Report
security issues as described in [SECURITY.md](SECURITY.md).
