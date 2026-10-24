# Validation and visual review

SlideForge separates content validation, browser layout diagnostics, PPTX package
checks, and visual comparison. Passing one does not imply passing the others.

## Content

`parsePresentation(input)` applies the strict [schema](schema.md) before
structured rendering. It catches wrong fields/types and data bounds, not visual
fit.

## Browser layout

```js
import { chromium } from 'playwright';
import { validateLayout } from './dist/index.js';

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  await page.goto('http://127.0.0.1:5173/');
  console.log(await validateLayout(page));
} finally {
  await browser.close();
}
```

`validateLayout(page, options?)` returns `Promise<ValidationIssue[]>`. It waits for
fonts; the export pipeline additionally prepares local file images as data URLs,
preflights image decoding under anonymous CORS, and waits for image decode
attempts. Export image-preparation failures throw before layout validation;
calling `validateLayout` alone still reports broken images as layout errors.

| Option | Default | Meaning |
| --- | --- | --- |
| `selector` | Discover `[data-pptx="slide"]`, falling back to `.slide` | CSS slide selector |
| `width`, `height` | `1920`, `1080` | Expected dimensions in CSS pixels |
| `tolerance` | `1` | Nonnegative finite geometry/clipping tolerance, pixels |
| `rules` | All enabled | Partial map of rule names to booleans |

| Rule key | Severity | Checks |
| --- | --- | --- |
| `dimensions` | Error | Slide box differs from expected canvas |
| `boundaries` | Error | Visible descendants extend beyond the slide |
| `overflow` | Error | Clipped/scrolling content or text escaping clipping bounds |
| `images` | Error | Missing or undecodable images |
| `fonts` | Warning | Unavailable first named text font, using browser/measurement heuristics |
| `overlap` | Warning | Intersecting visible leaf/text/media boxes |

Invalid dimensions/tolerance, invalid selectors, and missing slides also produce
errors. `rule` strings are prefixed `layout.`. Issues have:

```ts
interface ValidationIssue {
  rule: string;
  message: string;
  slide?: number; // One-based when associated with a slide.
  severity: 'error' | 'warning';
}
```

Overlap detection excludes layout wrappers, ancestor/descendant pairs, and
elements inside `[data-pptx-allow-overlap="true"]`. It is heuristic: intentional
designs can generate warnings. Font checks do not prove glyph coverage or font
embedding. Layout errors block export unless programmatic `validate: false` is
explicitly set; warnings are returned/printed and do not block.

## PPTX structure

```js
import { readFile } from 'node:fs/promises';
import { validatePptx } from './dist/index.js';
const report = validatePptx(await readFile('presentation.pptx'));
console.log(report);
```

The synchronous function accepts `Uint8Array` (including Node Buffer), performs
offline ZIP/XML checks, and returns:

```ts
interface PptxValidationReport {
  valid: boolean;
  slideCount: number;
  editableTextCount: number;
  shapeCount: number;
  issues: ValidationIssue[];
}
```

- `slideCount`: slide references in presentation order.
- `editableTextCount`: editable text shapes containing non-whitespace text,
  not the number of words or all text-bearing XML nodes.
- `shapeCount`: drawable shapes, pictures, connectors, and graphic frames,
  excluding group containers.
- `issues`: package diagnostics with `pptx.` rule prefixes.

Checks cover required package parts, readable/malformed XML, unsafe XML
declarations, internal relationship targets/references, content types, slide
roots/references, and positive widescreen dimensions. External relationships are
not fetched. Archive limits are 64 MiB compressed input, 32 MiB per uncompressed
part, 128 MiB total uncompressed, and 2,000 entries. Unsafe/duplicate archive
paths are rejected.
Encrypted archives, unsupported ZIP structures, and CRC mismatches are also
rejected. Validation failures return an invalid report rather than throwing.

The exporter requires this report to be valid before writing output, even when
layout blocking is disabled. The CLI prints the report as JSON and exits 1 when
invalid. This is **not full OOXML schema validation**, an Office acceptance test,
or a proof of editability/fidelity.

## Optional visual comparison

The visual helpers use Playwright Chromium; PNGs rendered from the PPTX must come
from an **independent renderer**, not another screenshot of the original HTML.
No automated native Microsoft PowerPoint renderer is included.

`captureSourceSlides(input, outputDirectory): Promise<string[]>` accepts a local
HTML path or trusted HTTP(S) URL, not a presentation JSON path. Build JSON to HTML
first. It captures `[data-pptx="slide"], .slide` elements at their actual CSS size,
using a 1920 × 1080 viewport and device scale 1, and writes `slide-1.png`, etc.
The output directory is created recursively. Animation disabling during capture
is not a guarantee that every scripted/remote page is deterministic.

`compareSlideImages(sourcePng, pptxRenderedPng, outputReportJson, channelTolerance = 16)`
returns a promise of:

```ts
{
  width: number;
  height: number;
  changedPixels: number;
  totalPixels: number;
  differenceRatio: number;
  diffImage: string;
  classification: 'rendering-difference';
}
```

The PNG dimensions must match and be no larger than 20 million pixels. A pixel
is changed if any RGBA channel differs by more than the integer tolerance
(0–255); `differenceRatio = changedPixels / totalPixels`, in the range 0–1.
It writes JSON plus `<outputReportJson>.diff.png`, with changed pixels in red.
Create the report's parent directory before calling it. No universal pass/fail
threshold is imposed.

```js
import { mkdir } from 'node:fs/promises';
import {
  captureSourceSlides,
  compareSlideImages,
} from './dist/index.js';

const source = await captureSourceSlides('presentation.html', 'review/source');
await mkdir('review/reports', { recursive: true });
// Supply review/pptx/slide-1.png from an independent PPTX renderer.
const report = await compareSlideImages(
  source[0],
  'review/pptx/slide-1.png',
  'review/reports/slide-1.json',
);
console.log(report.differenceRatio);
```

The helpers are exported from the package root; package subpath resolution is
restricted by its `exports` map.

### External rendering

LibreOffice Impress and Poppler's `pdftoppm` can supply a review image, if installed
separately. They are optional system tools, not npm dependencies:

```sh
# Debian/Ubuntu, if the optional renderers are not already installed:
sudo apt install --no-install-recommends libreoffice-impress poppler-utils

mkdir -p review/pdf review/pptx
libreoffice --headless --convert-to pdf --outdir review/pdf presentation.pptx
pdftoppm -png -scale-to-x 1920 -scale-to-y 1080 \
  review/pdf/presentation.pdf review/pptx/slide
```

`pdftoppm` can zero-pad filenames; use the actual generated PNG path when pairing
images. Keep slide order, dimensions, and fonts consistent. LibreOffice rendering
is not Microsoft PowerPoint rendering and may itself introduce differences.

For environments with these tools on `PATH`, `renderPptxSlides(input, outputDirectory)`
wraps PPTX → PDF → PNG and returns numerically ordered PNG paths.
`comparePresentation(sourceHtml, pptx, outputDirectory)` captures source slides,
uses that external renderer, checks slide counts, and writes per-slide reports.
Both live in the visual validator module; missing/incompatible tools cause an
error, not a silent skipped comparison. They do not automate native Microsoft
PowerPoint rendering.

To run the complete optional comparison after building HTML and exporting PPTX:

```js
import { comparePresentation } from './dist/index.js';
const reports = await comparePresentation(
  'presentation.html',
  'presentation.pptx',
  'review/comparison',
);
console.log(reports.map(report => report.differenceRatio));
```

The existing CI workflow tests pixel comparison utilities and structural export
behavior; it does not install or require LibreOffice for its acceptance checks.

Treat image differences as **rendering differences**, not automatically as
structural bugs. Font substitution, antialiasing, shadows, and renderer behavior
can affect the score. Human review remains necessary for important deliveries.

### Initial sample review

During implementation, the six-slide example was exported and structurally
validated with zero reported issues; the exported package contained editable
English and Chinese text, and all six slides were independently rendered with
LibreOffice/Poppler. Image comparison metrics must be regenerated after changes
to assets, fonts, or conversion behavior; no golden thresholds are shipped.
These observations are **not cross-platform promises or evidence of
pixel-perfect equivalence**. They do not replace manual Microsoft PowerPoint
review, which was unavailable.
