# Layouts: opening, structure, and ending

Slides that open a presentation, divide it, link its parts, and close it. See the [layout gallery](layouts.md) for every layout.

### `cover`

| `cover` (`default`) | `cover/centered` |
| --- | --- |
| ![Cover slide with a left-aligned title](../site/public/screenshots/layout-cover.png) | ![Cover slide with a centered title](../site/public/screenshots/layout-cover-centered.png) |
| **`cover/split`** | **`cover/band`** |
| ![Cover slide with an accent panel on the right third](../site/public/screenshots/layout-cover-split.png) | ![Cover slide with a full-bleed accent band behind the title](../site/public/screenshots/layout-cover-band.png) |

### `agenda`

An agenda lists two to eight topics as numbered rows: a number circle, a title, and optional text. Give an
item `slide` (the 1-based number of another slide) to make the row a link. A linked row ends with an
arrow and jumps to that slide.

![Agenda slide with four numbered rows, three of them linked](../site/public/screenshots/layout-agenda.png)

```json
{
  "layout": "agenda",
  "title": "Agenda",
  "subtitle": "Four topics, each a click away",
  "items": [
    { "title": "Results", "text": "Revenue and growth", "slide": 2 },
    { "title": "Questions" }
  ]
}
```

- **In HTML:** the row is an anchor to the slide (`#slide-2`). In `present` mode (and a build made with
  `--present`) a click jumps to it; a plain built file has no scripts, so it relies on the browser's
  anchor, which an asset base URL would resolve against that base.
- **In PowerPoint:** each linked row (its box, number, text, and arrow) is a "go to slide" button
  (`ppaction://hlinksldjump`), so clicking it in slide show, or Ctrl+click in editing, jumps to the
  target. The text keeps its design: it is not recolored or underlined like a text hyperlink.
- **Checks:** a `slide` that is less than 1 or larger than the number of slides is rejected. The
  link follows the slide's position, so renumber `slide` when you insert or reorder slides.
- **Layout:** up to four items are rows; five to eight are two columns. Keep titles short, and use
  `text` for a few words.

An agenda for a long deck has three variants, and the same `items` work in each of them:

| `agenda/chapters` | `agenda/outline` |
| --- | --- |
| ![Agenda with large chapter numbers and the current chapter marked](../site/public/screenshots/layout-agenda-chapters.png) | ![Agenda with each chapter as a card and its subsections listed under it](../site/public/screenshots/layout-agenda-outline.png) |

- **`chapters`** lists only the top level, in a large-number index. Use it for the table of contents
  at the start, or when there are many chapters.
- **`outline`** draws each chapter as a card with its subsections under it, and every subsection can
  link to a slide. Give each item `items` (1–6 subsections with `title` and an optional `slide`).
  The other variants leave the subsections out, so you can switch between them without changing the content.
- **`current`** (1-based) marks one item as the chapter being opened: the others are muted. Repeat the
  agenda at the start of each chapter with a different `current` to show the reader's progress.
- **Without `items`** the agenda lists the deck's [`section`](layouts-structure.md#section) slides, in order, each linking to its
  slide with the section's `subtitle` as the text. The links then follow the sections when you reorder
  slides. It needs two to eight sections, and has no subsections: write `items` yourself for `outline`.

### `section`

A section slide opens a chapter of a long presentation. It has only the common fields: `title` is the
chapter's name and `subtitle` is its one-line summary. The number (`01`, `02`, …) is counted over the deck's
section slides, so it does not need to be written.

| `section` (`default`) | `section/centered` | `section/band` |
| --- | --- | --- |
| ![Section slide with a large number beside an accent rail](../site/public/screenshots/layout-section.png) | ![Section slide with a centered number and title](../site/public/screenshots/layout-section-centered.png) | ![Section slide in the accent color](../site/public/screenshots/layout-section-band.png) |

```json
{ "layout": "section", "title": "Results", "subtitle": "Revenue and growth" }
```

### `closing`

The last slide: the `title` and `subtitle` as the farewell, and up to four `contacts`, each a `label` and a `value`.

| `closing` (`default`) | `closing/centered` | `closing/band` |
| --- | --- | --- |
| ![A thank-you slide beside an accent rail with two contacts](../site/public/screenshots/layout-closing.png) | ![A centered thank-you slide with one contact](../site/public/screenshots/layout-closing-centered.png) | ![A thank-you slide in the accent color](../site/public/screenshots/layout-closing-band.png) |

The variants match [section](layouts-structure.md#section): `default` has an accent rail, `centered` centers the text, and `band` fills the slide
with the accent color.

### `blank`

A blank slide shows only its background, here a
[Math Background Studio](backgrounds.md) design. Without a background it is an empty
slide in the theme's color.

![Blank slide showing only a wave background](../site/public/screenshots/layout-blank.png)
