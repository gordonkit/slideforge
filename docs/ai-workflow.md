# AI authoring workflow

AI assistants should work from the executable schema and shared design system,
not invent fields or promise unsupported export features.

## 1. Establish the brief

Determine audience, language, message, slide count, and source facts. Use short
titles and one main idea per slide. Do not fabricate metrics or sources. Label
illustrative data clearly.

## 2. Start from real content

```sh
node dist/cli/index.js init draft.json
```

Build the project first if `dist` is absent. Initialization also creates
`draft-assets/diagram.svg` and rewrites the image source. Keep that companion
directory with the JSON; replace/add assets as your content requires.

Keep only schema-supported fields. Select cover for an opening, content for
explanation, two-columns for comparisons, cards for small parallel ideas, table
for compact grids, and chart for simple nonnegative values. Use plain strings,
not Markdown/HTML. See [schema](schema.md).

## 3. Apply consistent design

Choose one light/dark palette and a locally available font family. Reuse shared
layouts and [tokens](design-tokens.md); do not solve dense content by shrinking
everything or adding arbitrary style keys. Split crowded slides instead.

For multilingual content, preserve Unicode and install fonts with the required
glyphs. Do not assume CJK glyph coverage or automatic system-font embedding.

## 4. Preview and inspect

```sh
node dist/cli/index.js build draft.json --output draft.html
node dist/cli/index.js preview draft.json --port 5173
```

Review at the fixed 1920 × 1080 canvas; the preview reloads after each save. Check clipping,
alignment, contrasts, missing images, footer space, labels, and table density.
Built HTML retains a local asset base, so it is not a standalone delivery file.

## 5. Export and validate

```sh
node dist/cli/index.js export draft.json --output draft.pptx
node dist/cli/index.js validate draft.pptx
```

Fix layout errors; investigate font/overlap warnings instead of hiding them.
Review editable text counts and slide counts in the structural report. These
checks do not prove that PowerPoint rendered the deck correctly.

For visual comparison, capture source slides and obtain PPTX slide PNGs through
an external renderer before comparing. The optional `comparePresentation`
workflow automates LibreOffice/Poppler rendering and per-slide JSON/diff images.
Read [validation](validation.md); native Microsoft PowerPoint rendering is not
automated.

## 6. Report evidence honestly

State which schema/layout/package checks actually ran and what remains
unverified. If a human opens PowerPoint, record that review separately. Describe
charts as editable bars/shapes, not native charts. Never claim pixel perfection,
guaranteed embedded fonts, or automatic raster fallback.

Export only trusted documents; remote HTML executes scripts and can access the
network. Do not use this workflow as an untrusted multi-tenant service.

## Framework changes

Follow root [AGENTS.md](../AGENTS.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).
Change schemas, renderer/components, tests, and directly affected documentation
together. Preserve third-party notices when bundling converter dependencies.
