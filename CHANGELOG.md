# Changelog

All notable changes to this project will be documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and Semantic Versioning.

## [Unreleased]

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
