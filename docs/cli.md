# CLI reference

Build the repository first with `npm run build`. Commands below use the emitted
entry point; the package also declares the `slideforge` executable when installed.

```text
node dist/cli/index.js init [presentation.json] [--template <name|./path>]
node dist/cli/index.js build presentation.json [--output presentation.html]
node dist/cli/index.js preview presentation.json [--port 5180]
node dist/cli/index.js export <presentation.json|slides.html|https://url> --output presentation.pptx [--selector css]
node dist/cli/index.js validate presentation.pptx
node dist/cli/index.js --help
```

`-o` aliases `--output`; `-h` aliases `--help`. No arguments displays help.
Paths are relative to the current working directory unless absolute.

To run the CLI without installing Node.js, Chromium, or fonts, use the `cli`
Compose profile in [`docker/`](../docker/README.md). It supports every command
except `preview`.

## `init`

Copies `examples/basic/presentation.json` to the requested location; default:
`presentation.json`. It also copies the diagram into
`<JSON-basename>-assets/diagram.svg` beside the new JSON, rewriting its image
source to that relative URL. Existing JSON and diagram files are not overwritten;
an existing JSON fails with a message saying so. Missing parent directories of the
JSON are created, as is the asset directory. The example has one slide per layout
family. For a working starter:

```sh
node dist/cli/index.js init my-deck.json
```

This creates `my-deck.json` and `my-deck-assets/diagram.svg`. Keep them together
when relocating the source deck. Generated HTML still uses a local file base
and is not a standalone portable artifact.

`--template` adds a `"template"` field naming a built-in template or a `./`/`../`
path relative to the new JSON's folder; see [templates](templates.md). The
template is loaded and validated first, so an unknown or invalid one fails before
any file is written. `--template` is accepted only by `init`; other commands read
the field from the JSON.

```sh
node dist/cli/index.js init my-deck.json --template corporate
```

## `build`

Parses and validates JSON and writes an HTML document with inline presentation
CSS. The default output is `<input-basename>.html` in the current directory.
Existing output is overwritten. A `file://` `<base>` points to the JSON's
directory, not the output HTML directory, so relative images keep working
locally. This does not copy images, package fonts, or make HTML portable. When
the JSON names a template, its background images are referenced by absolute
`file:` URL in the template's folder.

## `preview`

Starts a Vite server on `127.0.0.1`, port `5180` by default. Ports must be integers
from 1 to 65535. Port binding is strict: an occupied port is an error rather than
an automatic port change. The JSON directory is the server root, including
assets accessible from it; do not use a directory containing sensitive files.

The CLI validates JSON and its template before starting. Saving the JSON, or
any file in its directory such as an image, reloads the open browser page
automatically; each request to `/` rereads and renders the JSON. A template's
file and folder are watched too, and its images are served under
`/@slideforge/template/` even when the folder is outside the JSON's directory. If a save leaves the JSON invalid,
the page shows the error and reloads again once it is fixed. Slides scale down
to fit the window, so the 1920 × 1080 canvas is visible on smaller screens;
automated browsers such as `export` of the preview URL see the full canvas.
This is a preview, not a slide editor. Stop with Ctrl+C.

## `export`

Accepts a JSON path, local HTML path, or HTTP(S) URL. Requires `--output`; the
output parent directory must already exist and existing files are overwritten.
JSON is rendered with an asset base pointing to its directory and with the
template it names, whose images resolve from the template's folder. Local HTML uses
normal browser-relative URL resolution; remote pages use their own URL/base.

The default slide selector is `[data-pptx="slide"], .slide`. Customize it for
trusted HTML:

```sh
node dist/cli/index.js export slides.html --output slides.pptx --selector '.deck-page'
node dist/cli/index.js export http://127.0.0.1:5180/ --output preview.pptx
```

Chromium waits for page load, fonts, and image decoding, then layout validation
and conversion run. Layout errors block export; warnings are printed. Generated
PPTX bytes must pass structural checks before they are written.

Before conversion, local `file://` `<img>` resources are read and inlined into
data URLs to avoid the converter's anonymous-CORS reload dropping them.
Supported local extensions are `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`,
and `.avif`; other extensions fail explicitly. Other images are preflighted with
anonymous-CORS decoding. Unavailable, undecodable, or CORS-blocked images fail
export clearly instead of being silently omitted. This applies to page images,
not only images inside selected slides, and does not make built HTML portable.

**Trust boundary:** page scripts execute, network requests are allowed, and
local files may be accessible to the browser. Do not export attacker-controlled
HTML or URLs in a shared service. See [limitations](limitations.md).

## `validate`

Reads a PPTX ZIP package and prints a JSON report containing `valid`,
`slideCount`, `editableTextCount`, `shapeCount`, and `issues`. This is offline
structural validation, not a native Office rendering test. See
[validation](validation.md) for checks and limits.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success, including help |
| `1` | Operation failed or PPTX validation failed |
| `2` | Invalid CLI usage, such as missing export output or invalid port |

Invalid JSON/schema content is an operation failure. Warnings alone do not make
export fail.

Errors are printed for people rather than as raw data. Malformed JSON names the
file and position. Schema problems are listed one per line with their path and
the one-based slide number, for example:

```text
slideforge: The presentation does not match the schema (1 problem):
  - slides[0].rows[1] (slide 1): Every row must have one cell per column
```

A missing local image names the resolved file path. Relative paths are resolved
from the presentation's folder.
