# Component and layout reference

Components are React 19 functions exported from the package root. They emit
markup only; `renderPresentation` supplies the document, stylesheet, palette,
font, and fixed canvas. Direct component use must provide the corresponding
CSS/theme context. Components themselves do not perform schema validation.

## Public components

| Component | Props | Output |
| --- | --- | --- |
| `Slide` | `{ slide: PresentationSlide; variant?: string; number: number; total: number; background?: string; children: ReactNode }` | Full slide frame, background layer, title/content/footer/notes |
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

`number` is one-based. `Slide` / `SlideFrame` emits
`.sf-slide.sf-layout-<family>.sf-variant-<variant>`, `data-pptx="slide"`,
`data-layout="<family>"`, `data-variant="<variant>"`, and an accessible slide label.
`variant` defaults to the one the slide's `layout` names, or `default` for a bare
family name. Notes are
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
package root. It looks up the slide's family in a renderer table and composes
the result with `Slide`. Each family lives in `src/layouts/<family>/` with its
schema, renderer, and stylesheet, and is listed in `src/layouts/registry.ts`:

| Layout | Composition |
| --- | --- |
| `cover` | Enlarged title/subtitle and optional author; `split` adds an `aria-hidden` `.sf-cover-panel` |
| `agenda` | `ol.sf-agenda` of numbered rows: a number circle, a title, optional text, and an arrow; a row with a target slide is an `a[data-sf-link]`; `outline` puts a `ul.sf-agenda-subs` of subsections under each chapter |
| `section` | A chapter divider: `.sf-section-number` (`01`, `02`, … by slide order) beside the title and subtitle; `default` adds an `aria-hidden` `.sf-section-rail` |
| `content` | One `ContentBlocks` stack |
| `two-columns` | Two equal-width `ContentBlocks` stacks |
| `cards` | `.sf-cards[data-count]` grid of 1–6 titled cards, arranged by their count |
| `panels` | `.sf-panels[data-count]` of 2–7 `.sf-panel` sections (number, title, blocks) with an `aria-hidden` `.sf-panel-line` between them; a panel with a color is `.sf-panel-filled` |
| `media` | `figure.sf-media-figure` with an `img` and an optional caption, beside (or above) the text blocks |
| `stats` | `ul.sf-stats[data-count]` of `li.sf-stat`: a value, a label, and optional text |
| `matrix` | `.sf-matrix` with optional axis names around a 2 × 2 `.sf-matrix-grid` of four `.sf-matrix-cell` sections; `lines` adds two `.sf-matrix-line` rules |
| `compare` | `.sf-compare[data-count]` of `.sf-option` sections: a header, an optional label, and a list; `.sf-option-highlight` marks one |
| `team` | `ul.sf-team[data-count]` of `li.sf-member`: an `.sf-avatar` (an `img`, or a circle with the first letter), a name, a role, and text |
| `process` | `ol.sf-process[data-count]` of `li.sf-step` (a number, a title, text) with an `aria-hidden` `li.sf-process-arrow` between them |
| `hub` | `.sf-hub` of two `ul.sf-hub-side` lists around the `.sf-hub-center` circle; each `li.sf-hub-row` has an item and an `aria-hidden` `.sf-hub-line` |
| `code` | `figure.sf-code` with an optional `figcaption` language label and `pre.sf-code-body > code` |
| `closing` | Enlarged title and subtitle like `section`, `ul.sf-contacts` of label and value lines, and an `aria-hidden` `.sf-closing-rail` for `default` |
| `timeline` | `ol.sf-timeline` with one column per event: date, an `aria-hidden` marker on a rail, title, and optional text |
| `gantt` | `.sf-gantt` rows on one grid: a period header, then per task a label (and progress) and a `role="img"` track holding its bar |
| `table` | `SlideTable` |
| `chart` | `SlideChart`, optionally beside explanatory `ContentBlocks` |
| `quote` | `figure.sf-quote` with the quote in a `blockquote` and the attribution in a `figcaption` |
| `blank` | Nothing: `Slide` leaves out the title, content region, and footer, so only the background is drawn |

See [schema](schema.md) for exact field names and bounds and
[design tokens](design-tokens.md) for sizes.

The timeline's rail and markers sit inside a `data-pptx-allow-overlap="true"` track,
since the marker is drawn over the rail on purpose, and each gantt bar sits in a
track marked the same way. All of them export as editable shapes.

## Layout gallery

The screenshots and the fields of every layout moved to the [layout gallery](layouts.md), split into
[opening and structure](layouts-structure.md), [text and media](layouts-content.md),
[cards and panels](layouts-cards.md), [flows and diagrams](layouts-flow.md), and [tables, charts, and quotes](layouts-data.md).

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
