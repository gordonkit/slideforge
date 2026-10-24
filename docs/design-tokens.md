# Design token reference

Sources: [`src/themes/tokens.ts`](../src/themes/tokens.ts) and
[`src/themes/slides.css`](../src/themes/slides.css). Phase 1 exposes fixed sizing,
two palettes, and a presentation-level local font family—not a general theme
configuration schema.

## Canvas

| Export | Value |
| --- | --- |
| `SLIDE_WIDTH` / `SLIDE_HEIGHT` | `1280` / `720` CSS pixels |
| `SLIDE_WIDTH_INCHES` / `SLIDE_HEIGHT_INCHES` | `13.333333` / `7.5` inches |
| `SLIDE_SIZE` | `{ widthPx, heightPx, widthInches, heightInches }` using the above values |
| Aspect ratio | 16:9 |
| Browser device scale | 1 |

`renderPresentation` sets `--slide-width: 1280px` and `--slide-height: 720px`.
Do not resize only the HTML and expect the exporter/validators to follow.

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

`defaultFontFamily` is `"Arial", "Noto Sans CJK TC", "Noto Sans TC", sans-serif`. A JSON
`fontFamily` overrides it. Install fonts locally; a fallback list is not a font
installer, and system fonts are not guaranteed embedded into PPTX.

| Element | CSS value |
| --- | --- |
| Slide padding | Top 48px, horizontal 64px, bottom 56px |
| Header / content heights | 124px / 492px |
| Title | 40px, 700 weight, 1.2 line height |
| Subtitle | 22px, 1.35 line height, 12px top margin |
| Content | 24px, 1.45 line height |
| Content block gap | 18px |
| Bullet indent / item gap | 32px / 10px |
| Two-column gap | 40px, equal-width columns |
| Cards | Three columns; 20px gap; 24px padding; 12px corner radius |
| Card title / body | 26px / 20px |
| Table | 21px; cells 10px vertical, 16px horizontal padding |
| Chart row | 190px label, flexible track, 140px value; 20px gaps |
| Chart with explanation | 2:1 columns, 40px gap; chart labels/values 140px/100px, 16px row gaps |
| Chart bars | 26px high |
| Image | Contained; maximum height 420px |
| Image caption | 17px |
| Footer | 16px, 24px line height; 22px from bottom, 64px from sides |
| Cover title / subtitle / author | 60px / 30px / 26px |

Cards fill row-wise in a three-column grid; one or two cards do not expand to
full-width columns. Cover header height is 350px with 132px top padding; its
content region is 250px high. Long content is clipped by several fixed-height
containers, so reduce or split content instead of relying on schema maxima.

## Exported token groups and CSS names

`designTokens` groups the following frozen maps. `designCssVariables` flattens
them into `--sf-<group>-<name>`, adding `px` to numeric values and retaining
strings unchanged. For example, `spacingTokens.column` becomes
`--sf-spacing-column: 40px`; `typographyTokens["body-leading"]` becomes
`--sf-type-body-leading: 1.45`.

| Export / group | Keys and values |
| --- | --- |
| `layoutTokens` / `layout` | `padding-x: 64`, `padding-top: 48`, `padding-bottom: 56`, `header: 124`, `content: 492`, `footer-bottom: 22`, `footer: 24`, `cover-header: 350`, `cover-top: 132`, `cover-content: 250`, `image-max-height: 420` |
| `spacingTokens` / `spacing` | `page: 24`, `block: 18`, `column: 40`, `card: 20`, `card-padding: 24`, `subtitle: 12`, `cover-subtitle: 24`, `card-title: 16`, `list: 32`, `item: 10`, `caption: 8`, `table-x: 16`, `table-y: 10`, `chart: 20`, `chart-explanation: 16` |
| `typographyTokens` / `type` | `title: 40`, `subtitle: 22`, `body: 24`, `caption: 17`, `card-title: 26`, `card-body: 20`, `table: 21`, `chart: 21`, `footer: 16`, `cover-title: 60`, `cover-subtitle: 30`, `author: 26`, `title-leading: "1.2"`, `subtitle-leading: "1.35"`, `body-leading: "1.45"`, `bold: "700"` |
| `borderTokens` / `border` | `width: 1`, `radius: 12` |
| `chartTokens` / `chart` | `height: 26`, `label: 190`, `value: 140`, `explanation-label: 140`, `explanation-value: 100` |

For custom HTML you may reuse these maps and CSS conventions, but arbitrary
overrides can affect export fidelity and invalidate geometry checks. JSON has
no token-override field.
