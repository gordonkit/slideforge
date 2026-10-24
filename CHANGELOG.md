# Changelog

All notable changes to this project will be documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and Semantic Versioning.

## [Unreleased]

### Changed

- The slide canvas is 1920 × 1080 CSS pixels instead of 1280 × 720, and every layout,
  spacing, type, and chart token is scaled by 1.5 to match. Exported PowerPoint slides keep
  the same size, positions, and font sizes; card and table borders are 2px (1 pt). Custom
  HTML slides and `validateLayout` callers that relied on the 1280 × 720 default must update.
- `preview` reloads the browser when the JSON or a file beside it is saved, shows invalid
  JSON as an error page that recovers once fixed, and scales slides to fit the window.

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
