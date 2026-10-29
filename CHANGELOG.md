# Changelog

All notable changes to this project will be documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and Semantic Versioning.

## [Unreleased]

### Added

- Title outlines: the template token `border["title-outline"]` (0–4 px) strokes slide and
  cover titles in the new `outline` palette color. Export writes any CSS
  `-webkit-text-stroke` as a native PowerPoint text outline (`<a:ln>`) on the editable run,
  which the converter otherwise drops. LibreOffice does not draw these outlines.
- Docker Hub image: release tags also publish `gordonkit/slideforge` (`<version>`,
  `<major>.<minor>`, and `latest`, `linux/amd64`) with an SBOM attestation and build
  provenance. Before npm publishing, the release workflow checks the Docker Hub settings
  and exports and validates the bundled example in the container.

## [0.1.1] - 2026-10-26

The first release published through npm trusted publishing; the package's contents are
unchanged from 0.1.0.

### Changed

- The release workflow publishes only through trusted publishing (GitHub OIDC). The
  one-time `NPM_TOKEN` used for 0.1.0 is removed from the workflow and the repository.

## [0.1.0] - 2026-10-26

The first release, published to npm as `slideforge`.

### Added

- Phase 1 framework: strict JSON schema, 16:9 layouts with light and dark themes, React
  components, HTML rendering, loopback Vite preview, editable PPTX export through
  `dom-to-pptx`, layout and PPTX structure validation, optional LibreOffice visual comparison,
  and the `init`, `build`, `preview`, `export`, and `validate` CLI commands.
- The npm package `slideforge`: `npm install slideforge` provides the `slideforge` command
  and the library API, with the built-in templates and examples. A tag-triggered release
  workflow checks the version, runs the tests, installs the packed tarball in a clean project
  (`npm run test:package`), and publishes it with npm provenance.
- Documentation site at <https://slideforge.gordonkit.com/> in English, Traditional Chinese,
  Simplified Chinese, and Japanese, deployed to Cloudflare Pages from `main`.
- Open-source project files: code of conduct, security policy, support guide, changelog,
  Dependabot configuration, and translated READMEs.
- Layout names can state a variant: `"layout": "cover/default"`. The family before the
  slash decides the slide's fields and the variant only how it is drawn; a bare family name
  is drawn as `default`. Slides carry
  `sf-variant-<variant>` and `data-variant`, `backgrounds` accepts `family/variant` keys,
  which take precedence over the family's key, and an unknown variant names the family's
  valid ones. `layoutFamilies`, `layoutNames`, `layoutFamily`, `layoutVariant`, and
  `slideVariant` are exported. Layout families are defined in `src/layouts/<family>/` and
  listed in `src/layouts/registry.ts`.
- Cover variants `cover/centered`, `cover/split` (an accent panel on the right third), and
  `cover/band` (a full-bleed accent block behind the title), shown in `examples/variants`.
  `layoutTokens` gains `cover-panel: 640`.
- A `quote` layout family: a required `quote` (up to 1,000 characters) and an optional
  `attribution`, with `default` (beside an accent bar) and `centered` variants.
  `examples/basic` ends with a quote slide, so `init` now creates seven slides.
  `typographyTokens` gains `quote: 54` and `borderTokens` gains `accent: 6`.
- Templates: data that sets a presentation's look apart from its content. A template can
  override each theme's palette, the font family, numeric design tokens within bounds that
  keep the canvas geometry, backgrounds, and the variant each family's bare-name slides are
  drawn with. A presentation names one with `"template"`: a built-in name (`default`,
  `corporate`) or a `./`/`../` path to a template file or folder, whose relative images
  resolve from the template's folder. `build`, `preview`, and `export` load it, preview
  serves its images and reloads when it changes, `init --template` starts a deck with one,
  and the container image includes the built-in templates. See `docs/templates.md`;
  `examples/templates` is a deck with its own local template and assets.
  `loadPresentation`, `fileRenderOptions`, `loadTemplate`, `builtInTemplates`,
  `templateSchema`, `parseTemplate`, `mergeTokens`, and `cssVariables` are exported;
  `renderPresentation` takes `template` and `templateBaseUrl` options and throws for a
  presentation that names a template it was not given; `slideBackground` takes an
  optional template.
- `docker/Dockerfile` and a `cli` Compose profile run the CLI with Node.js, the pinned
  Chromium, and Noto CJK/Liberation fonts bundled, as a non-root user with a read-only root
  filesystem and one `/work` mount. `preview` is not supported in the container, and the
  image is a packaged CLI, not an export service.
- Slide backgrounds. `backgrounds` sets a default and one per layout, and a slide's own
  `background` overrides them or turns them off with `"none"`. A source is an image or a
  Math Background Studio share link (`https://bg.gordonkit.com/studio#d=…`), drawn by the
  studio's `/render` page. Export captures each background as a 1920 × 1080 PNG and writes it
  into the slide's PowerPoint background (`<p:bg>`), storing identical images once. Custom
  HTML can use the same `[data-pptx-background]` layer. Background layers are excluded from
  overlap warnings.

### Changed

- SlideForge is licensed under the Apache License 2.0 instead of MIT, with a `NOTICE` file.
  Copies obtained under MIT before this change keep their MIT terms.
- `dom-to-pptx` is a development dependency: the build bundles it into
  `dist/exporters/engine.js` and Node never loads it, so installing SlideForge no longer
  installs it, Puppeteer, or the Chrome that Puppeteer downloads.
- `init` creates missing parent folders of the new JSON instead of failing with `ENOENT`,
  and an existing JSON fails with "… already exists; init never overwrites a file" instead
  of `EEXIST`.
- The slide canvas is 1920 × 1080 CSS pixels instead of 1280 × 720, and every layout,
  spacing, type, and chart token is scaled by 1.5 to match. Exported PowerPoint slides keep
  the same size, positions, and font sizes; card and table borders are 2px (1 pt). Custom
  HTML slides and `validateLayout` callers that relied on the 1280 × 720 default must update.
- `preview` listens on port 5180 by default instead of 5173, Vite's own default, which
  other local Vite projects often hold. The default is exported as `DEFAULT_PREVIEW_PORT`;
  `--port` still overrides it.
- `preview` reloads the browser when the JSON or a file beside it is saved, shows invalid
  JSON as an error page that recovers once fixed, and scales slides to fit the window.
- Error messages are written for people. Schema problems list each path with its one-based
  slide number instead of printing raw Zod JSON, unknown layouts and block types name the
  valid values, malformed JSON names the file, and a missing local image names the resolved
  path instead of an `ENOENT` error. `describePresentationError` and `readPresentationFile`
  are exported for programmatic use.

### Fixed

- Exported text boxes are widened to tolerate PowerPoint font metrics, so page numbers,
  footers, and CJK punctuation no longer wrap onto an extra line. Tune or disable this with
  the `textSlack` export option.
- CJK text in exported PPTX uses Microsoft JhengHei as its East Asian font instead of Arial,
  matching the browser on Windows. Override it with the `eastAsianFont` export option.
- CLI integration tests no longer time out on Windows.
- Layout validation no longer reports clipped text for fonts taller than their line height,
  such as a Segoe UI title at 1.2 leading, which blocked export of decks with nothing clipped.
