# Component and layout reference

Components are React 19 functions exported from the package root. They emit
markup only; `renderPresentation` supplies the document, stylesheet, palette,
font, and fixed canvas. Direct component use must provide the corresponding
CSS/theme context. Components themselves do not perform schema validation.

## Public components

| Component | Props | Output |
| --- | --- | --- |
| `SlideTitle` | `{ title: string; subtitle?: string }` | `.sf-header`, `h1`, optional `.sf-subtitle` |
| `SlideFooter` | `{ text?: string; number: number; total: number }` | `.sf-footer`, optional text and `number / total` |
| `SlideFrame` | `{ slide: Slide; number: number; total: number; children: ReactNode }` | Section with header, `.sf-content`, footer, optional notes |
| `ContentBlocks` | `{ blocks: ContentBlock[] }` | `.sf-blocks`, paragraphs, ordered/unordered lists, image figures/captions |
| `DataTable` | `{ columns: string[]; rows: string[][] }` | Semantic HTML table with column headers |
| `BarChart` | `{ data: { label: string; value: number }[]; unit?: string }` | HTML/CSS horizontal bars, text labels/values, accessible chart summary |

`number` is one-based. `SlideFrame` emits `.sf-slide.sf-<layout>`,
`data-pptx="slide"`, `data-layout`, and an accessible slide label. Notes are
emitted in a hidden `<aside data-pptx-notes="">`; the converter extracts them as
speaker notes. A slide's `author` and presentation metadata `author` are separate.

`ContentBlocks` renders plain text through React escaping, not Markdown or raw
HTML. Images use `object-fit: contain` and require `alt` in structured input.
Ordered lists default to off. `DataTable` expects matching row/column lengths;
the JSON schema enforces this before the normal rendering path.

`BarChart` scales widths against `max(largest value, 1)`; all-zero data produces
zero-width bars. Values are displayed directly with the unit appended. These
are CSS rectangles and text, **not native PowerPoint chart objects**, with no
editable chart workbook/series API.

## Layout dispatcher

`SlideLayout` in `src/layouts/index.tsx` is internal, not exported from the
package root. It composes all layouts with `SlideFrame`:

| Layout | Composition |
| --- | --- |
| `cover` | Enlarged title/subtitle and optional author |
| `content` | One `ContentBlocks` stack |
| `two-columns` | Two equal-width `ContentBlocks` stacks |
| `cards` | Three-column grid containing 1–6 titled cards |
| `table` | `DataTable` |
| `chart` | `BarChart` |

See [schema](schema.md) for exact field names and bounds and
[design tokens](design-tokens.md) for sizes.

## Custom trusted HTML

For custom export input, give each slide a fixed 1280 × 720 box and mark it with
`data-pptx="slide"` or `.slide`; alternatively pass `--selector`. Keep text and
simple fills/borders as DOM/CSS when editability matters. Upstream may rasterize
some effects or media. SlideForge does not provide automatic screenshot fallback
for arbitrary unsupported content.

Intentional decorative overlap may be marked
`data-pptx-allow-overlap="true"` on a containing element to exclude its descendants
from the overlap heuristic. This does not suppress overflow, bounds, or missing
asset checks. Prefer changing layout over suppressing diagnostics.
