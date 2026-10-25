# Changelog

All notable changes to this project will be documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and Semantic Versioning.

## [Unreleased]

### Added

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
  The other families have only `default`. `layoutTokens` gains `cover-panel: 640`.
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

### Added

- Phase 1 framework: strict JSON schema, six 16:9 layouts with light and dark themes, React
  components, HTML rendering, loopback Vite preview, editable PPTX export through
  `dom-to-pptx`, layout and PPTX structure validation, optional LibreOffice visual comparison,
  and the `init`, `build`, `preview`, `export`, and `validate` CLI commands.
- Documentation site at <https://slideforge.gordonkit.com/> in English, Traditional Chinese,
  Simplified Chinese, and Japanese, deployed to Cloudflare Pages from `main`.
- Open-source project files: code of conduct, security policy, support guide, changelog,
  Dependabot configuration, and translated READMEs.

### Fixed

- Exported text boxes are widened to tolerate PowerPoint font metrics, so page numbers,
  footers, and CJK punctuation no longer wrap onto an extra line. Tune or disable this with
  the `textSlack` export option.
- CJK text in exported PPTX uses Microsoft JhengHei as its East Asian font instead of Arial,
  matching the browser on Windows. Override it with the `eastAsianFont` export option.
- CLI integration tests no longer time out on Windows.
- Layout validation no longer reports clipped text for fonts taller than their line height,
  such as a Segoe UI title at 1.2 leading, which blocked export of decks with nothing clipped.
