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
| `theme` | No | `"light"` or `"dark"`; default `"light"` |
| `fontFamily` | No | Trimmed nonempty string, max 200 characters; local font names with Unicode letters/numbers, spaces, commas, quotes, hyphens only |
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
| `layout` | One of the six discriminator values below |
| `title` | Trimmed nonempty string, max 300 |
| `subtitle` | Optional string, max 10,000 |
| `footer` | Optional string, max 10,000 |
| `notes` | Optional string, max 10,000; emitted as hidden presenter-note markup |

Optional strings may be empty and are not trimmed. Required text fields are
trimmed and must remain nonempty. Schema maxima are data limits, **not promises
that content will fit a slide**; check rendered layout separately.

## Layout-specific fields

| `layout` | Additional fields |
| --- | --- |
| `"cover"` | Optional `author` string, max 10,000; independent of metadata author |
| `"content"` | Required `blocks`: 1–12 content blocks |
| `"two-columns"` | Required `left` and `right`: each 1–12 content blocks |
| `"cards"` | Required `cards`: 1–6 objects, each with trimmed nonempty `title` (max 200) and `blocks` (1–12) |
| `"table"` | Required `columns` (1–8 trimmed nonempty strings, max 200 each) and `rows` (1–14 arrays of 1–8 string cells, max 2,000 each) |
| `"chart"` | Required `data` (1–10 `{ "label", "value" }` objects); optional `unit` string, max 40; optional `blocks` (0–4 content blocks, default `[]`) |

Every table row must contain exactly one cell per column. Empty table cell
strings are allowed. Chart labels are trimmed, nonempty, max 100 characters;
values must be finite, nonnegative numbers. Zero is valid. Chart units are
appended directly to values; include a leading space for a separated suffix.
Charts are single-series HTML/CSS bars, not native Office charts.
When chart `blocks` are present, they form a right-hand explanation column
beside the bars (2:1 chart/explanation proportions); an empty array keeps a
full-width chart.

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

For all six layouts and multilingual content, use
[`examples/basic/presentation.json`](../examples/basic/presentation.json) or the
CLI `init` command.
