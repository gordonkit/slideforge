# JSON schema reference

The executable schema is [`src/schemas/presentation.ts`](../src/schemas/presentation.ts),
implemented with Zod. `parsePresentation(input: unknown)` validates and returns
the normalized `Presentation`, or throws a Zod validation error.
`describePresentationError(error)` turns that error into one line per problem with
its path and one-based slide number, and `readPresentationFile(path)` reads JSON
with a file-named syntax error; the CLI and preview use both. All objects,
including nested content/card/chart/metadata objects, are **strict**: unknown
keys are errors. There is no separate generated JSON Schema file.
All content strings must contain valid XML characters: tab/newline/carriage
return and valid Unicode XML ranges are accepted; forbidden control characters
and unpaired surrogates are rejected before PPTX generation.

## Presentation

| Field | Required | Type and constraints |
| --- | --- | --- |
| `metadata` | Yes | Object described below |
| `template` | No | Built-in template name, or a `./`/`../` path to a template; see [templates](templates.md#using-a-template) |
| `theme` | No | `"light"` or `"dark"`; default `"light"` |
| `fontFamily` | No | Trimmed nonempty string, max 200 characters; local font names with Unicode letters/numbers, spaces, commas, quotes, hyphens only |
| `backgrounds` | No | Object described under [Backgrounds](#backgrounds) |
| `slides` | Yes | Array of 1–200 slides |

`fontFamily` is a family/fallback list, not a CSS declaration or font URL.
Example: `"Noto Sans TC, Arial, sans-serif"`. It does not install or embed fonts.

### Metadata

| Field | Required | Type and constraints |
| --- | --- | --- |
| `title` | Yes | Trimmed nonempty string, max 300 |
| `author` | No | String, max 10,000 |
| `subject` | No | String, max 10,000 |
| `lang` | No | Language-tag-shaped string; default `"en"` |

`lang` matches `/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/i`, for example `en`, `en-US`,
or `zh-Hant`. This is a syntactic check, not a language registry lookup.

## Common slide fields

Every slide requires `layout` and `title`.

| Field | Type and constraints |
| --- | --- |
| `layout` | A layout family below, or `family/variant`; see [Layout names](#layout-names) |
| `title` | Trimmed nonempty string, max 300 |
| `subtitle` | Optional string, max 10,000 |
| `footer` | Optional string, max 10,000 |
| `notes` | Optional string, max 10,000; emitted as hidden presenter-note markup |
| `background` | Optional background source, or `"none"`; see [Backgrounds](#backgrounds) |

Optional strings may be empty and are not trimmed. Required text fields are
trimmed and must remain nonempty. Schema maxima are data limits, **not promises
that content will fit a slide**; check rendered layout separately.

## Layout names

A `layout` value names a **family**, which decides the slide's fields, and
optionally a **variant** of it, which decides only how the slide is drawn:
`"cover"` or `"cover/default"`. A variant never adds or removes fields, so changing
it does not change the content. A bare family name is drawn as its `default`
variant, so `"<family>"` and `"<family>/default"` render the same.

| Family | Variants |
| --- | --- |
| `cover` | `default` (left-aligned), `centered` (centered title, subtitle, and author), `split` (accent panel on the right third; text and footer stay left of it), `band` (full-bleed accent block behind the title and subtitle, which use the on-accent color) |
| `quote` | `default` (left-aligned beside an accent bar), `centered` (centered, without the bar) |
| `content`, `two-columns`, `cards`, `timeline`, `gantt`, `table`, `chart`, `blank` | `default` |

[`examples/variants/presentation.json`](../examples/variants/presentation.json)
shows each cover variant. The `split` panel and `band` block are decorative
shapes in the accent color; with a slide background they are drawn over it.

The value is kept as written after parsing. An unknown variant of a known family
is reported with that family's valid names, such as
`Unknown quote variant. Use "quote", "quote/default", or "quote/centered"`.

## Layout-specific fields

| Family | Additional fields |
| --- | --- |
| `"cover"` | Optional `author` string, max 10,000; independent of metadata author |
| `"content"` | Required `blocks`: 1–12 content blocks |
| `"two-columns"` | Required `left` and `right`: each 1–12 content blocks |
| `"cards"` | Required `cards`: 1–6 objects, each with trimmed nonempty `title` (max 200) and `blocks` (1–12) |
| `"timeline"` | Required `events`: 2–6 objects, each with trimmed nonempty `date` (max 100) and `title` (max 200), and optional `text` string, max 10,000 |
| `"gantt"` | Required `periods` (2–12 trimmed nonempty strings, max 40 each) and `tasks` (1–8 objects, each with trimmed nonempty `label` (max 100), integer `start` and `end`, and optional `progress` from 0 to 100) |
| `"table"` | Required `columns` (1–8 trimmed nonempty strings, max 200 each) and `rows` (1–14 arrays of 1–8 string cells, max 2,000 each) |
| `"chart"` | Required `data` (1–10 `{ "label", "value" }` objects); optional `unit` string, max 40; optional `blocks` (0–4 content blocks, default `[]`) |
| `"quote"` | Required `quote`: trimmed nonempty string, max 1,000; optional `attribution` string, max 10,000 |
| `"blank"` | None; `subtitle` and `footer` are rejected |

Every table row must contain exactly one cell per column. Empty table cell
strings are allowed. Chart labels are trimmed, nonempty, max 100 characters;
values must be finite, nonnegative numbers. Zero is valid. Chart units are
appended directly to values; include a leading space for a separated suffix.
Charts are single-series HTML/CSS bars, not native Office charts.
When chart `blocks` are present, they form a right-hand explanation column
beside the bars (2:1 chart/explanation proportions); an empty array keeps a
full-width chart. A quote is plain text drawn larger than body text, vertically
centered in the content region; keep it to a few lines, since longer quotes clip.

Cards are arranged by their count: one spans the width, two sit side by side, three
and six use three columns, four form a 2 × 2 grid, and five are three over two.
Timeline events are drawn left to right in equal columns on one rail, in array order;
`date` is any short marker such as `2026`, `Q3`, or `Step 1`. Keep `text` to a line or
two, especially with five or six events.

A gantt slide is a project schedule: `periods` label equal columns (months, weeks,
sprints), and each task's bar spans the periods from `start` to `end`, both
one-based and inclusive, so `end` must not exceed the number of periods and `start`
must not be after `end`. With `progress`, the bar's first part (that percentage of
its length) is drawn in the accent color, the rest in the border color, and the
percentage is shown beside the label; without it the bar is solid accent.

A blank slide draws only its background: no title, content, footer, or slide number.
Its required `title` names the slide (its accessible label) but is not drawn, and
`notes` still become speaker notes. Without a background it is an
empty slide in the theme's color. See [Backgrounds](#backgrounds) and the
[Math Background Studio guide](backgrounds.md).

## Content blocks

The `type` discriminator selects one of:

```json
{ "type": "paragraph", "text": "One clear idea." }
```

`text` is a trimmed nonempty string. There is no explicit maximum for paragraph
text; visual layout still limits usable length.

```json
{ "type": "bullets", "items": ["First", "Second"], "ordered": false }
```

`items` contains 1–12 trimmed nonempty strings; there is no explicit per-item
maximum. `ordered` defaults to `false`.

```json
{
  "type": "image",
  "src": "assets/diagram.svg",
  "alt": "Diagram explaining the workflow",
  "caption": "Optional caption"
}
```

`src` is trimmed, nonempty, max 2,000,000 characters; `alt` is required, max
1,000 (empty allowed); `caption` is optional, max 10,000. Allowed image sources:

- HTTP(S) URLs with a hostname and no username/password.
- Base64 `data:image/png`, `jpeg`, `gif`, `webp`, or `avif` URLs.
- Relative/path URLs with no explicit URI scheme and not beginning `//`.
  Local SVG files work via a path; SVG data URLs are not accepted.

Whitespace/control characters and backslashes are rejected in `src`; use URL
encoding where appropriate. `file:`, `javascript:`, and other explicit schemes
are rejected. Path-style values beginning `/` can pass the schema but resolve
from the origin/filesystem root, so prefer portable relative paths.

These restrictions are not a network sandbox or path confinement policy.
Use trusted sources and check browser access/CORS and image decoding errors.

## Backgrounds

A background fills the whole slide behind its content. Each slide uses the first
that is set:

1. the slide's own `background`;
2. `backgrounds["<family>/<variant>"]` for the variant it is drawn with;
3. `backgrounds.<family>` for its family;
4. `backgrounds.default`.

A bare family name is drawn as `default`, so `backgrounds["cover/default"]` also
applies to `"layout": "cover"` slides. A slide with `"background": "none"` has no
background even when the presentation sets one, and shows the theme's slide color.
`backgrounds` is a strict object whose optional keys are `default`, every family
name, and every `family/variant` name. Each value, and a slide's `background`, is a background source:

- An image source with the same rules as the `image` block's `src`. It is drawn
  with `object-fit: cover`, so an image that is not 16:9 is cropped, not stretched.
- A [Math Background Studio](https://bg.gordonkit.com/studio) share link, copied
  from the studio's Share button (see the [step-by-step guide](backgrounds.md)): `https://bg.gordonkit.com/studio#d=…`. The
  design is drawn by the studio's `/render` page for the slide's 1920 × 1080
  size. Links from `http://localhost`, `127.0.0.1`, or `[::1]` on any port are
  also accepted for a local studio development server. A `/studio` or `/render`
  link with `#d=` from any other host, or from plain `http://bg.gordonkit.com`,
  is rejected.

```json
{
  "metadata": { "title": "Backgrounds" },
  "backgrounds": {
    "default": "assets/plain.svg",
    "cover": "https://bg.gordonkit.com/studio#d=1PYo…",
    "chart": "assets/grid.png"
  },
  "slides": [
    { "layout": "cover", "title": "Cover uses backgrounds.cover" },
    {
      "layout": "content",
      "title": "Its own",
      "background": "assets/photo.jpg",
      "blocks": [{ "type": "paragraph", "text": "…" }]
    },
    {
      "layout": "table",
      "title": "None",
      "background": "none",
      "columns": ["A"],
      "rows": [["1"]]
    }
  ]
}
```

`slideBackground(presentation, slide, template?)` returns the resolved source, or
`undefined`. A [template](templates.md#precedence) adds its own `backgrounds` and
`variants` to this lookup. Backgrounds are exported as raster PowerPoint slide backgrounds;
see [architecture](architecture.md#slide-backgrounds) and
[limitations](limitations.md#backgrounds).

## Minimal complete input

```json
{
  "metadata": { "title": "Team update", "lang": "en" },
  "theme": "light",
  "slides": [
    {
      "layout": "content",
      "title": "This week",
      "blocks": [
        { "type": "paragraph", "text": "The first milestone is complete." },
        { "type": "bullets", "items": ["Review", "Refine", "Export"] }
      ],
      "notes": "Discuss the next milestone."
    }
  ]
}
```

For one slide of every layout family and multilingual content, use
[`examples/basic/presentation.json`](../examples/basic/presentation.json) or the
CLI `init` command.
