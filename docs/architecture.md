# Architecture and APIs

## Pipeline

```text
JSON (+ template it names) → strict Zod schemas → typed presentation and template
     → React static markup + shared CSS/tokens (template overrides) → HTML
     → Playwright Chromium → layout validation
     → capture background layers as PNG, remove them
     → bundled dom-to-pptx → PPTX bytes
     → set slide backgrounds, patch core metadata → structural validation → output file

JSON directory → Vite loopback preview → same rendered HTML
Trusted HTML/HTTP(S) URL ──────────────→ Chromium/export pipeline
```

The toolchain is Node.js 24+ ESM, strict TypeScript (`NodeNext`), React 19, Vite 8,
Playwright **1.64.1**, and `dom-to-pptx` **2.1.2**. The converter runs inside the
browser, not as a Node DOM simulation.

## Source map

| Path | Responsibility |
| --- | --- |
| `src/schemas/presentation.ts` | Strict content validation and inferred types, built from the layout registry |
| `src/schemas/fields.ts` | Text, image, background, content block, and common slide field schemas |
| `src/schemas/background.ts` | Studio share link detection and `/render` URLs |
| `src/templates/schema.ts` | Template schema, token bounds and geometry checks, token merging |
| `src/templates/load.ts` | Template lookup (built-in or path), `loadPresentation`, file render options |
| `templates/` | Built-in templates, one folder each with `template.json` and its assets |
| `src/themes/` | Fixed slide dimensions, palettes, shared CSS |
| `src/components/` | Content, tables, bars, title/footer/frame |
| `src/layouts/registry.ts` | Layout families, their variants and slide schemas |
| `src/layouts/<family>/` | One family's `schema.ts`, `render.tsx`, and `<family>.css` |
| `src/layouts/index.tsx` | Renderer table, layout stylesheet, and the `SlideLayout` dispatcher |
| `src/renderers/html.tsx` | Complete static HTML document |
| `src/renderers/preview.ts` | Loopback Vite server rooted at JSON directory |
| `src/exporters/browser.ts` | Published `exportToPptx` browser API adapter |
| `src/exporters/pptx.ts` | Chromium orchestration, assets, validation, output |
| `src/exporters/metadata.ts` | Core-properties XML patch |
| `src/exporters/backgrounds.ts` | Slide background (`<p:bg>`) image patch |
| `src/validators/` | Layout, PPTX package, optional visual checks |
| `src/cli/index.ts` | CLI argument parsing and commands |
| `examples/basic/` | Complete six-layout multilingual sample and assets |

`npm run build` emits Node modules/types with TypeScript, copies the stylesheets
(`src/**/*.css`) beside them, and uses Vite's library build to generate
`dist/exporters/engine.js` as the `SlideForgeEngine` IIFE. It bundles the
converter and browser dependencies for injection into the export page; export
does not rely on loading a CDN script. This is separate from Vite preview.

## Public core APIs

Import from `./dist/index.js` when developing in this repository.

### `parsePresentation(input: unknown): Presentation`

Validates strict objects, applies theme/language/list defaults, and returns typed
data. Throws on invalid content. The runtime Zod schemas and `Presentation`,
`PresentationSlide`, and `ContentBlock` types are also exported from the root.
The schema module names its slide type `Slide`; the root aliases it to
`PresentationSlide` to distinguish it from the React `Slide` component.

### Layout names

`layoutFamilies` lists the families and `layoutNames` every valid `layout` value
(each family, then `family/variant`). `layoutFamily(name)` and `layoutVariant(name)`
split a valid name; `layoutVariant` returns `undefined` for a bare family.
`slideVariant(slide)` is the variant a slide is drawn with, `default` for a bare
family. The `LayoutFamily` and `LayoutName` types match them.

### `renderPresentation(input: unknown, options?: RenderOptions): string`

Validates content and returns a complete HTML string, including CSS and metadata.
`RenderOptions` is `{ baseUrl?: string; template?: unknown }`. `baseUrl` is a
caller-controlled absolute HTTP(S)/file URL inserted as `<base>`. Without it,
browser URL resolution applies. `template` is validated with `parseTemplate` and
applied as described in [templates](templates.md); without it the output is
unchanged.
It does not copy assets or launch a browser. For a JSON file, supply its directory
as a trailing-slash file URL to match the CLI's local asset behavior.

### Templates

`loadPresentation(file)`, `fileRenderOptions(file, loaded)`, `loadTemplate(reference,
fromFolder)`, `builtInTemplates()`, `parseTemplate(input)`, and `templateSchema` are
described in [templates](templates.md). The CLI, `previewPresentation`, and
`exportPresentation` read JSON through `loadPresentation`, so a JSON input's
template applies everywhere.

### `previewPresentation(input: string, port = 5180)`

Accepts a JSON file path, starts the Vite loopback server, and returns its Vite
server object. Use `server.printUrls()` to report its address and
`await server.close()` to stop it:

```js
import { previewPresentation } from './dist/index.js';
const server = await previewPresentation('examples/basic/presentation.json', 5180);
server.printUrls();
// When the caller's own workflow is finished:
await server.close();
```

The function serves the JSON directory. Requests to `/` reread/render content.
Pages load Vite's client, and the server watches the JSON and its directory:
a save sends a full reload, debounced to one per burst of file events. Invalid
JSON renders an error page that keeps listening, so fixing the file restores the
preview. A preview-only script scales slides to the window width for people;
it is skipped when `navigator.webdriver` is set, so automated export and
validation of the preview URL measure the full canvas. The CLI also validates
content before starting the server.

### `exportPresentation(input: string, options: ExportOptions): Promise<ValidationIssue[]>`

Input is a JSON path, HTML path, or trusted HTTP(S) URL.

| Option | Default | Meaning |
| --- | --- | --- |
| `output` | Required | Output PPTX path |
| `selector` | `[data-pptx="slide"], .slide` | Slide elements in document order |
| `metadata` | Document title, author/subject meta tags, HTML language | Optional `{ title?, author?, subject?, lang? }` overrides |
| `validate` | `true` | Layout errors block export; `false` still collects issues |
| `timeout` | `60000` | Playwright default timeout, milliseconds |
| `textSlack` | `{ ratio: 0.06, min: 91440, max: 457200 }` | Extra text box width in EMU; `false` keeps converter sizes |
| `eastAsianFont` | `Microsoft JhengHei` | PowerPoint East Asian font for CJK text |

The browser uses a 1920 × 1080 viewport at device scale 1. After page load,
`prepareImages` reads local `file://` image bytes and substitutes data URLs inside
the export page, avoiding upstream anonymous-CORS reloads silently dropping
local images. Local `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, and `.avif`
extensions are accepted; unsupported extensions fail explicitly. Other image
sources must pass an anonymous-CORS decode preflight. Missing, undecodable, or
CORS-blocked images throw a clear export error before conversion; disabling
layout blocking does not bypass this preparation.

Image preparation applies only to visible, nonzero-size `<img>` elements within
the selected slide roots. It freezes the selected resource by removing
`srcset`/picture source alternatives and changes only the
in-memory export page—not built HTML. The pipeline then waits for
`document.fonts.ready` and image decode attempts. This is not a general
wait-for-all-animations/network-idle API.
The exporter closes its browser and removes its temporary conversion files.

`validate: false` does **not** disable the final PPTX structural check. Returned
issues are layout diagnostics, not PPTX bytes; output bytes are written to the
requested file. Failures throw.

The browser adapter calls:

```js
await exportToPptx(slideElements, {
  width: 13.333333,
  height: 7.5,
  skipDownload: true,
  svgAsVector: true,
  autoEmbedFonts: true,
});
```

Width/height here are inches. The returned browser Blob is transferred as base64.
`autoEmbedFonts` is an upstream attempt to locate font resources, not a guarantee
that locally installed fonts are embedded.

The pinned converter's public API does not supply SlideForge's metadata setter.
SlideForge patches `docProps/core.xml` after conversion with title, creator,
subject, and language, retaining the converter's remaining package parts. It
does not reach into upstream private APIs or promise a general OOXML editor.

### Slide backgrounds

A slide whose root has a direct `[data-pptx-background]` child gets that layer as
its PowerPoint background. JSON backgrounds render this layer; custom HTML can
provide it (see [components](components.md#custom-trusted-html)). After layout
validation, export:

1. scrolls each such slide into view and, for every studio `<iframe>` in the
   layer, waits for the frame's `window.bgRender.ready` (contract version 1).
   A frame that never publishes `bgRender` within `timeout`, or whose `ready`
   rejects, fails the export with the slide number and the studio's reason;
2. hides the slide's other children and takes a 1920 × 1080 PNG screenshot of
   the slide, which includes the slide's own background color under any
   transparent parts of the layer. Layers with the same markup on the same
   slide color reuse the first screenshot;
3. removes the layers and makes those slides' own color transparent, so the
   converter emits neither a picture nor a full-slide color rectangle;
4. after conversion, writes each PNG into the slide's `<p:bg>` as a stretched
   picture fill through an image relationship, replacing any converter
   background. Identical PNGs are stored once in `ppt/media/`.

Slides without a layer keep the converter's output, including their color
rectangle. The studio's render page contract is documented in Math Background
Studio's `docs/render.md`.

### Validators

`validateLayout(page, options?)` and `validatePptx(data: Uint8Array)` are public;
see [validation](validation.md) for reports, options, bounds, and optional visual
helpers.

## Upstream references

The exact versions and license inventory come from `package-lock.json` and
installed package metadata, not the npm `latest` tag.

- [`dom-to-pptx` 2.1.2 on npm](https://www.npmjs.com/package/dom-to-pptx/v/2.1.2)
  and [exact registry metadata](https://registry.npmjs.org/dom-to-pptx/2.1.2);
  [official upstream API/README](https://github.com/atharva9167j/dom-to-pptx#readme).
  The installed 2.1.2 README and module confirm `exportToPptx`, element-array
  input, `skipDownload`, `svgAsVector`, and `autoEmbedFonts`. Upstream's broader
  feature claims are not SlideForge compatibility guarantees.
- [Playwright 1.64.1 on npm](https://www.npmjs.com/package/playwright/v/1.64.1);
  official [`chromium.launch`](https://playwright.dev/docs/api/class-browsertype#browser-type-launch)
  and [browser installation](https://playwright.dev/docs/browsers).
- [React 19.3.1 on npm](https://www.npmjs.com/package/react/v/19.3.1);
  official [`renderToStaticMarkup`](https://react.dev/reference/react-dom/server/renderToStaticMarkup).
- [Vite 8.3.5 on npm](https://www.npmjs.com/package/vite/v/8.3.5);
  official [JavaScript server API](https://vite.dev/guide/api-javascript)
  and [library build](https://vite.dev/guide/build#library-mode).

Official documentation sites can track newer releases; the installed pinned
package source and declarations are authoritative for this repository.
