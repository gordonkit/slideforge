# SlideForge AI contributor instructions

Read `README.md`, `docs/architecture.md`, `docs/schema.md`,
`docs/design-tokens.md`, and `docs/limitations.md` before authoring slides or
changing the framework.

- Use Node.js 24+, ESM imports, and strict TypeScript. Relative TypeScript module
  imports use `.js` extensions for emitted NodeNext code.
- Keep presentation content in the strict schema. Use the six existing layouts
  and shared tokens/components; do not invent schema fields or inline CSS.
- Start decks with `init`, retain relative asset directories, and keep content
  short enough for the fixed 1280 × 720 canvas.
- Build before invoking `node dist/cli/index.js`. Use existing check/unit/
  integration scripts appropriate to the change; report actual results.
- Fix layout errors before export. Review warnings, editable-text counts, and
  structure reports. A valid archive is not proof of visual fidelity.
- Export trusted HTML/URLs only. Do not process arbitrary user pages as a
  multi-tenant service or assume the browser is a security sandbox.
- Preserve Unicode. Install matching local fonts for CJK and target machines;
  never promise that system fonts are embedded.
- Do not claim native Office charts, automatic raster fallback, pixel-perfect
  conversion, or manual PowerPoint verification without implementing/testing it.
- Prefer precise changes, no unnecessary dependencies, and no generated decks
  or screenshots committed by default. Preserve bundled third-party licenses.
- Update directly relevant documentation when behavior changes. Distinguish
  implemented Phase 1 behavior from future ideas.

See `docs/ai-workflow.md` for the authoring/review loop and `CONTRIBUTING.md` for
development commands.
