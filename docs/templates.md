# Templates

A template is the look of a presentation, kept apart from its content: palettes,
a font family, design token overrides, backgrounds, and each layout family's
variant. The same presentation JSON can be drawn with different templates.

The executable schema is [`src/templates/schema.ts`](../src/templates/schema.ts).
`parseTemplate(input)` validates a template and throws a Zod error; like the
presentation schema, every object is strict. A template is data only: it cannot
add CSS, HTML, scripts, layout families, or variants.

## Fields

| Field | Required | Type and constraints |
| --- | --- | --- |
| `name` | Yes | Lowercase letters, digits, and hyphens, starting with a letter; max 64 |
| `description` | No | String, max 10,000 |
| `palette` | No | `{ light?, dark? }`; each a partial palette (below) |
| `fontFamily` | No | Same rules as the presentation's `fontFamily` |
| `tokens` | No | Numeric design token overrides by group (below) |
| `backgrounds` | No | Same keys and sources as the presentation's [`backgrounds`](schema.md#backgrounds) |
| `variants` | No | Family → variant to draw that family's bare-name slides with |

```json
{
  "name": "corporate",
  "palette": {
    "light": { "accent": "#f5a524", "onAccent": "#0b1f3a" },
    "dark": { "background": "#0b1f3a", "accent": "#f5a524", "onAccent": "#0b1f3a" }
  },
  "fontFamily": "Noto Sans TC, Arial, sans-serif",
  "tokens": { "type": { "title": 64 }, "border": { "radius": 0 } },
  "backgrounds": { "cover/band": "assets/band.png" },
  "variants": { "cover": "band" }
}
```

### Palette

`palette.light` and `palette.dark` override the built-in
[palette](design-tokens.md#color) of the same name with six-digit hex colors for
any of `background`, `foreground`, `muted`, `accent`, `onAccent`, `surface`,
`border`, and `canvas`. The presentation's `theme` still chooses which palette is
used; a template does not choose the theme.

### Tokens

`tokens` has optional `layout`, `spacing`, `type`, `border`, and `chart` groups.
Each group accepts only that group's numeric tokens from
[the token reference](design-tokens.md#exported-token-groups-and-css-names), in
CSS pixels at the 1920 × 1080 canvas. String tokens (line heights and the bold
weight) are fixed.

| Group | Allowed range |
| --- | --- |
| `layout`, `chart` | 0–1920 |
| `spacing` | 0–480 |
| `type` | 8–240 |
| `border` | 0–120 |

After merging, the layout tokens must keep the canvas geometry:

- `padding-top + header + content + padding-bottom` equals 1080, so changing
  `header` means changing `content` by the opposite amount;
- `padding-top + cover-header + cover-content + padding-bottom` is at most 1080;
- `cover-top` is at most `cover-header`;
- `footer-bottom + footer` is at most `padding-bottom`;
- `2 × padding-x + cover-panel` is less than 1920.

These checks keep the regions on the slide; they do not prove content fits. A
smaller content region or larger type clips sooner, so review layout issues
after export as usual.

### Variants

`variants` maps a family to one of its [variants](schema.md#layout-names). A slide
whose `layout` is a bare family name (`"cover"`) is drawn with the template's
variant; a slide that names one (`"cover/default"`) keeps it.

## Precedence

| Setting | Highest to lowest |
| --- | --- |
| Palette | template `palette[theme]` entries, then the built-in palette for `theme` |
| Font family | presentation `fontFamily`, template `fontFamily`, built-in default |
| Tokens | template `tokens`, built-in tokens |
| Variant | variant named in the slide's `layout`, template `variants[family]`, `default` |
| Background | slide `background`; then `family/variant`, family, and `default` keys, where each presentation `backgrounds` entry replaces the template's entry with the same key |

For example, a template with `backgrounds.cover` and a presentation with only
`backgrounds.default` still draws covers with the template's cover background.

## Using a template

Pass the template object to `renderPresentation`:

```js
import { readFile } from 'node:fs/promises';
import { renderPresentation } from './dist/index.js';
const content = JSON.parse(await readFile('presentation.json', 'utf8'));
const template = JSON.parse(await readFile('corporate.json', 'utf8'));
const html = renderPresentation(content, { template });
```

Template background sources resolve against the rendered document like the
presentation's own, so relative paths are relative to the document's base URL.
The JSON file, CLI, preview, and `exportPresentation` do not load templates yet.
