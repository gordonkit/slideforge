# SlideForge

[![CI](https://github.com/gordonkit/slideforge/actions/workflows/ci.yml/badge.svg)](https://github.com/gordonkit/slideforge/actions/workflows/ci.yml)
[![Node.js 24+](https://img.shields.io/badge/node-24%2B-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/gordonkit/slideforge/blob/main/LICENSE)
[![Development Status: Pre-Alpha](https://img.shields.io/badge/status-pre--alpha-orange.svg)](https://github.com/gordonkit/slideforge/blob/main/CHANGELOG.md)

[繁體中文](https://github.com/gordonkit/slideforge/blob/main/README.zh-TW.md) ·
[简体中文](https://github.com/gordonkit/slideforge/blob/main/README.zh-CN.md) ·
[日本語](https://github.com/gordonkit/slideforge/blob/main/README.ja.md)

[Documentation](https://slideforge.gordonkit.com/)

An AI-ready, local-first framework for creating consistent presentations from
validated JSON, React components, and HTML/CSS, then exporting editable PowerPoint
text and shapes.

**Phase 1:** a minimal Node.js 24+, ESM, strict TypeScript framework using React 19,
Vite 8, Playwright Chromium, and `dom-to-pptx` **2.1.2**. It is not a hosted editor
or a guarantee of pixel-identical Office rendering.

## Quickstart

Run these commands from this repository with Node.js 24 or newer:

```sh
PUPPETEER_SKIP_DOWNLOAD=true npm ci
npx playwright install --with-deps chromium
npm run build

# Create the complete six-layout example and its companion image directory.
node dist/cli/index.js init presentation.json
node dist/cli/index.js build presentation.json --output presentation.html
node dist/cli/index.js preview presentation.json --port 5180
```

Open <http://127.0.0.1:5180/>. The page reloads automatically when you save the
JSON, and slides scale to fit the window; stop preview with Ctrl+C. In another
terminal:

```sh
node dist/cli/index.js export presentation.json --output presentation.pptx
node dist/cli/index.js validate presentation.pptx
```

`init [file]` defaults to `presentation.json`, refuses to overwrite an existing
file. It copies the example diagram into
`<JSON-basename>-assets/diagram.svg` beside the JSON and rewrites its image source;
the default creates `presentation-assets/diagram.svg`. Keep that directory with
the JSON. The example includes cover, content, two-column, cards, table,
and chart slides, English/Traditional Chinese text, images, footers, and notes.
See the complete [example JSON](examples/basic/presentation.json).

Built HTML uses a `file://` `<base>` pointing to the JSON directory for relative
assets. It is **not a portable, self-contained artifact**: moving it to another
machine or publishing it over HTTP requires changing asset URLs/base handling.
Preview instead serves the JSON directory on loopback.
During PPTX export, supported local image files are inlined into data URLs in
the browser, and other images must pass anonymous-CORS decoding. Missing,
unsupported, or CORS-blocked images fail clearly rather than being silently
omitted. This does not rewrite built HTML or make it portable.

## Programmatic use

After building, save this as `example.mjs` in the repository root:

```js
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  parsePresentation,
  renderPresentation,
  exportPresentation,
  validatePptx,
} from './dist/index.js';

const file = resolve('examples/basic/presentation.json');
const presentation = parsePresentation(JSON.parse(await readFile(file, 'utf8')));
const html = renderPresentation(presentation, {
  baseUrl: pathToFileURL(dirname(file) + '/').href,
});
await writeFile('presentation.html', html);
const issues = await exportPresentation(file, { output: 'presentation.pptx' });
console.log(issues);
const report = validatePptx(await readFile('presentation.pptx'));
console.log(report);
if (!report.valid) process.exitCode = 1;
```

Then run `node example.mjs`. Public APIs also include `previewPresentation` and
`validateLayout`; see [API and architecture](docs/architecture.md).

## Documentation

The [documentation site](https://slideforge.gordonkit.com/) covers the same material in
English, Traditional Chinese, Simplified Chinese, and Japanese. The detailed references
in this repository are:

- [CLI usage](docs/cli.md)
- [JSON schema reference](docs/schema.md)
- [Design tokens](docs/design-tokens.md)
- [Components and layouts](docs/components.md)
- [Architecture, APIs, and upstream references](docs/architecture.md)
- [Validation and optional visual comparison](docs/validation.md)
- [Limitations and trust model](docs/limitations.md)
- [AI authoring workflow](docs/ai-workflow.md)
- [Contributing](CONTRIBUTING.md), [code of conduct](CODE_OF_CONDUCT.md),
  [security policy](SECURITY.md), [support](SUPPORT.md), and [changelog](CHANGELOG.md)
- [MIT license](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md)

## Scope and expectations

Phase 1 provides structured authoring, six fixed 16:9 layout families (the cover
has four variants), light/dark themes,
HTML rendering/preview, browser-driven PPTX export, layout checks, and offline
PPTX structure checks. Optional visual comparison independently renders PPTX via
external LibreOffice Impress and Poppler and writes per-slide JSON/diff images.
Charts are HTML/CSS bars exported as text/shapes, **not
native Office chart objects**. Metadata unsupported by the converter's public
API is patched into core-properties XML after export.

Unicode is retained, but locally installed fonts are **not guaranteed embedded**.
Install suitable CJK fonts for multilingual decks and use the same fonts on the
target machine. Some upstream effects may rasterize; SlideForge does not
implement an automatic unsupported-content screenshot fallback.

Future phases may explore richer authoring, native charts, additional layouts,
font packaging, native Microsoft PowerPoint rendering, and broader visual
regression automation.
These are directions, not implemented features or delivery commitments. No
manual PowerPoint compatibility test or pixel-perfection claim is made.

**Export only trusted HTML and URLs.** Chromium executes page scripts and can
access the network and local resources available to the process. Loopback preview
is not an isolation boundary; this framework is not a multi-tenant service for
untrusted documents.
