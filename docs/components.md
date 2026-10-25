# Component and layout reference

Components are React 19 functions exported from the package root. They emit
markup only; `renderPresentation` supplies the document, stylesheet, palette,
font, and fixed canvas. Direct component use must provide the corresponding
CSS/theme context. Components themselves do not perform schema validation.

## Public components

| Component | Props | Output |
| --- | --- | --- |
| `Slide` | `{ slide: PresentationSlide; number: number; total: number; background?: string; children: ReactNode }` | Full slide frame, background layer, title/content/footer/notes |
| `SlideBackground` | `{ source: string }` | `.sf-background[data-pptx-background]` layer: an `<img>`, or a studio `/render` `<iframe>` for a share link |
| `SlideTitle` | `{ title: string; subtitle?: string }` | `.sf-header`, `h1`, optional `.sf-subtitle` |
| `SlideSubtitle` | `{ children: ReactNode }` | `.sf-subtitle` paragraph |
| `SlideContent` | `{ children: ReactNode }` | `.sf-content` content region |
| `SlideCard` | `{ title: string; children: ReactNode }` | `.sf-card` article with `h2` |
| `SlideColumns` | `{ children: ReactNode }` | Equal two-column `.sf-columns` grid |
| `SlideFooter` | `{ text?: string; number: number; total: number }` | `.sf-footer`, optional text and `number / total` |
| `SlideFrame` | Same as `Slide` | Alias of `Slide` |
| `ContentBlocks` | `{ blocks: ContentBlock[] }` | `.sf-blocks`, paragraphs, ordered/unordered lists, image figures/captions |
| `SlideImage` | `{ src: string; alt: string; caption?: string }` | Image figure and optional caption |
| `SlideTable` / `DataTable` | `{ columns: string[]; rows: string[][] }` | Semantic HTML table with column headers; `DataTable` is an alias |
| `SlideChart` / `BarChart` | `{ data: { label: string; value: number }[]; unit?: string }` | HTML/CSS horizontal bars, text labels/values, accessible chart summary; `BarChart` is an alias |

`number` is one-based. `Slide` / `SlideFrame` emits `.sf-slide.sf-layout-<layout>`,
`data-pptx="slide"`, `data-layout`, and an accessible slide label. Notes are
emitted in a hidden `<aside data-pptx-notes="">`; the converter extracts them as
speaker notes. A slide's `author` and presentation metadata `author` are separate.
`background` is the resolved source (see `slideBackground` in [schema](schema.md#backgrounds));
when present, `SlideBackground` is the slide's first child, behind the content.

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
package root. It composes all layouts with `Slide`:

| Layout | Composition |
| --- | --- |
| `cover` | Enlarged title/subtitle and optional author |
| `content` | One `ContentBlocks` stack |
| `two-columns` | Two equal-width `ContentBlocks` stacks |
| `cards` | Three-column grid containing 1–6 titled cards |
| `table` | `SlideTable` |
| `chart` | `SlideChart`, optionally beside explanatory `ContentBlocks` |

See [schema](schema.md) for exact field names and bounds and
[design tokens](design-tokens.md) for sizes.

## Custom trusted HTML

For custom export input, give each slide a fixed 1920 × 1080 box and mark it with
`data-pptx="slide"` or `.slide`; alternatively pass `--selector`. Keep text and
simple fills/borders as DOM/CSS when editability matters. Upstream may rasterize
some effects or media. SlideForge does not provide automatic screenshot fallback
for arbitrary unsupported content.

Intentional decorative overlap may be marked
`data-pptx-allow-overlap="true"` on a containing element to exclude its descendants
from the overlap heuristic. This does not suppress overflow, bounds, or missing
asset checks. Prefer changing layout over suppressing diagnostics.

A full-slide background in custom HTML is a direct child of the slide marked
`data-pptx-background`, sized to the whole slide and painted behind the content,
for example `<div data-pptx-background style="position:absolute; inset:0; z-index:-1">`
containing an `<img>` or a studio `/render` `<iframe>` (the slide needs
`isolation: isolate` or its own stacking context). Export captures that layer as
the slide's PowerPoint background, as described in
[architecture](architecture.md#slide-backgrounds). A CSS `background-image` on the
slide itself is not converted; the converter drops it.
