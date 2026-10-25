# Design token reference

Sources: [`src/themes/tokens.ts`](../src/themes/tokens.ts),
[`src/themes/slides.css`](../src/themes/slides.css) for shared styles, and each
layout family's `src/layouts/<family>/<family>.css`. Phase 1 exposes fixed sizing,
two palettes, and a presentation-level local font family—not a general theme
configuration schema.

## Canvas

| Export | Value |
| --- | --- |
| `SLIDE_WIDTH` / `SLIDE_HEIGHT` | `1920` / `1080` CSS pixels |
| `SLIDE_WIDTH_INCHES` / `SLIDE_HEIGHT_INCHES` | `13.333333` / `7.5` inches |
| `SLIDE_SIZE` | `{ widthPx, heightPx, widthInches, heightInches }` using the above values |
| Aspect ratio | 16:9 |
| Browser device scale | 1 |
| PowerPoint scale | 1 CSS pixel = 0.5 pt (144 px per inch) |

`renderPresentation` sets `--slide-width: 1920px` and `--slide-height: 1080px`.
Do not resize only the HTML and expect the exporter/validators to follow.
The PowerPoint slide stays 13.333 × 7.5 inches, so a 36px body size exports as
18 pt. The vertical layout regions (top padding, header, content, bottom
padding) add up to the 1080px height.

## Color

`themeTokens.light` and `themeTokens.dark` supply these CSS custom properties:

| Token key | CSS variable | Light | Dark |
| --- | --- | --- | --- |
| `background` | `--sf-background` | `#ffffff` | `#101827` |
| `foreground` | `--sf-foreground` | `#172033` | `#f8fafc` |
| `muted` | `--sf-muted` | `#526078` | `#b5c2d6` |
| `accent` | `--sf-accent` | `#2563eb` | `#60a5fa` |
| `onAccent` | `--sf-on-accent` | `#ffffff` | `#101827` |
| `surface` | `--sf-surface` | `#f1f5f9` | `#1e293b` |
| `border` | `--sf-border` | `#cbd5e1` | `#475569` |
| `canvas` | `--sf-canvas` | `#d8dee8` | `#d8dee8` |

The HTML body has `data-theme="light"` or `"dark"`. The preview page surround is
`#d8dee8`, outside the slide. Table header text is white in light mode and
`#101827` in dark mode.

## Typography and geometry

`defaultFontFamily` is `"Arial", "Microsoft JhengHei", "Noto Sans CJK TC", "Noto Sans TC", sans-serif`. A JSON
`fontFamily` overrides it. Install fonts locally; a fallback list is not a font
installer, and system fonts are not guaranteed embedded into PPTX.

| Element | CSS value |
| --- | --- |
| Slide padding | Top 72px, horizontal 96px, bottom 84px |
| Header / content heights | 186px / 738px |
| Title | 60px, 700 weight, 1.2 line height |
| Subtitle | 33px, 1.35 line height, 18px top margin |
| Content | 36px, 1.45 line height |
| Content block gap | 27px |
| Bullet indent / item gap | 48px / 15px |
| Two-column gap | 60px, equal-width columns |
| Cards | Three columns; 30px gap; 36px padding; 18px corner radius; 2px border |
| Card title / body | 39px / 30px |
| Table | 31.5px; cells 15px vertical, 24px horizontal padding |
| Chart row | 285px label, flexible track, 210px value; 30px gaps |
| Chart with explanation | 2:1 columns, 60px gap; chart labels/values 210px/150px, 24px row gaps |
| Chart bars | 39px high |
| Image | Contained; maximum height 630px |
| Image caption | 25.5px |
| Footer | 24px, 36px line height; 33px from bottom, 96px from sides |
| Cover title / subtitle / author | 90px / 45px / 39px |

Cards fill row-wise in a three-column grid; one or two cards do not expand to
full-width columns. Cover header height is 525px with 198px top padding; its
content region is 375px high. `cover/split` adds a 640px accent panel
(`cover-panel`) at the right edge and moves the slide's right padding and the
footer's right edge to 736px (panel plus horizontal padding), leaving 1088px for
text. `cover/band` extends the header 72px up and 96px to each side so its accent
background reaches the slide edges, keeping the title at the default position and
the content region at the same height. Long content is clipped by several fixed-height
containers, so reduce or split content instead of relying on schema maxima.

## Exported token groups and CSS names

`designTokens` groups the following frozen maps. `designCssVariables` flattens
them into `--sf-<group>-<name>`, adding `px` to numeric values and retaining
strings unchanged. For example, `spacingTokens.column` becomes
`--sf-spacing-column: 60px`; `typographyTokens["body-leading"]` becomes
`--sf-type-body-leading: 1.45`.

| Export / group | Keys and values |
| --- | --- |
| `layoutTokens` / `layout` | `padding-x: 96`, `padding-top: 72`, `padding-bottom: 84`, `header: 186`, `content: 738`, `footer-bottom: 33`, `footer: 36`, `cover-header: 525`, `cover-top: 198`, `cover-content: 375`, `cover-panel: 640`, `image-max-height: 630` |
| `spacingTokens` / `spacing` | `page: 36`, `block: 27`, `column: 60`, `card: 30`, `card-padding: 36`, `subtitle: 18`, `cover-subtitle: 36`, `card-title: 24`, `list: 48`, `item: 15`, `caption: 12`, `table-x: 24`, `table-y: 15`, `chart: 30`, `chart-explanation: 24` |
| `typographyTokens` / `type` | `title: 60`, `subtitle: 33`, `body: 36`, `caption: 25.5`, `card-title: 39`, `card-body: 30`, `table: 31.5`, `chart: 31.5`, `footer: 24`, `cover-title: 90`, `cover-subtitle: 45`, `author: 39`, `title-leading: "1.2"`, `subtitle-leading: "1.35"`, `body-leading: "1.45"`, `bold: "700"` |
| `borderTokens` / `border` | `width: 2`, `radius: 18` |
| `chartTokens` / `chart` | `height: 39`, `label: 285`, `value: 210`, `explanation-label: 210`, `explanation-value: 150` |

For custom HTML you may reuse these maps and CSS conventions, but arbitrary
overrides can affect export fidelity and invalidate geometry checks. JSON has
no token-override field.
