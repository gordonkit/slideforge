# Limitations and trust model

## Phase 1 boundaries

- Six fixed 16:9 layouts, light/dark palettes, plain text, lists, images, tables,
  and a single-series horizontal bar representation. No slide editor,
  template marketplace, arbitrary schema styling, or native Office chart API.
- Schema bounds do not ensure content fits. Fixed-height areas may clip long
  text, large tables, captions, or many cards. Split slides and review layout.
- Editability is a design goal for text and simple CSS shapes, not a guarantee
  that every browser feature becomes a native Office object. Charts are
  HTML/CSS bars, not Office chart objects. Images remain images; table conversion
  behavior depends on the converter.
- SlideForge has no automatic unsupported-content raster fallback. Upstream may
  rasterize pseudo-elements/effects or other content internally, which can reduce
  editability. Arbitrary scripts, canvas, video, animations, SVG features, and
  CSS effects need independent testing.
- No claim of manual PowerPoint testing, universal Office compatibility, or
  pixel-perfect conversion is made. Structural validity and editable text counts
  do not prove visual fidelity. Native PowerPoint rendering is not automated.

## Assets and fonts

CLI JSON build/export resolves relative images against the JSON's directory.
Built HTML contains a machine-specific `file://` base and is **not portable**.
Preview serves the JSON directory over loopback; copying only the HTML or
publishing file-based HTML over HTTP does not reproduce that asset context.
`init` copies JSON and its diagram into a companion
`<JSON-basename>-assets` directory; keep those source files together.

Remote assets need network access and compatible CORS behavior during export.
Browser caches, resource failures, and external changes can affect results.
Prefer stable, local assets for repeatable exports.

The exporter explicitly prepares all page `<img>` elements before conversion:
local file images with SVG/PNG/JPEG/GIF/WebP/AVIF extensions are read and inlined
into data URLs; unsupported local extensions fail. Other images must decode
under anonymous CORS, matching the converter's reload behavior. Unavailable,
unsupported, or CORS-blocked images fail export clearly rather than being
silently omitted. This is not a general CSS-background/media asset packager,
does not change saved HTML, and does not relax the trusted-content requirement.

The default local font stack is `"Arial", "Noto Sans CJK TC", "Noto Sans TC", sans-serif`.
SlideForge preserves multilingual Unicode text, but encoding does not supply
glyphs. Install suitable CJK fonts before preview/export and match fonts on the
target machine. Font fallback can change wrapping and geometry. Upstream
`autoEmbedFonts` is enabled, but local system fonts are **not guaranteed embedded**;
font resource discovery, licensing, and target application support still matter.
The font validator is heuristic and does not verify every glyph or successful
embedding.

The converter sizes text boxes to the text measured in Chromium, but PowerPoint
measures and substitutes fonts slightly differently, so tight boxes can wrap a
last word or punctuation mark. Export therefore widens unfilled text boxes by 6%
of their width, at least 0.1 in and at most 0.5 in, growing away from the
paragraph alignment and staying inside the slide. Filled or outlined shapes are
unchanged. The extra width can let multi-line paragraphs wrap slightly later than
in HTML. Pass `textSlack: false` to `exportPresentation` to keep converter sizes,
or `{ ratio, min, max }` (EMU) to tune it.

## Browser execution is privileged

**Use trusted HTML and URLs only.** Export launches Chromium and executes page
scripts, loads subresources, and allows network access. A page may request
internal-network endpoints or resources accessible to the process. Schema image
URL restrictions do not turn arbitrary HTML into trusted content or constrain
all browser requests.

This is a developer/local CLI, **not a multi-tenant untrusted-document export
server**. Do not expose it as such without a separate isolation architecture,
resource limits, filesystem/network access controls, and independent review.
Do not assume browser sandboxing alone is a sufficient boundary. Keep secrets
and sensitive files out of the export environment.

Preview binds to `127.0.0.1`, not all interfaces, but its root is the JSON
directory and it serves other files there. Loopback binding is not
authentication, filesystem isolation, or a safe place to serve sensitive data.
Vite's own protections do not replace this trust model.

## Validation is scoped

Layout checks are browser geometry/font/asset heuristics. Decorative overlaps can
be intentional, and font substitution/glyph coverage may escape detection.
PPTX validation checks bounded ZIP/XML/package relationships and content counts,
not Office's full schema or application behavior. Optional image comparison
requires an independently rendered PPTX. SlideForge can automate external
LibreOffice Impress → PDF → Poppler PNG rendering when those system tools are
installed, but does not automate native Microsoft PowerPoint rendering. See
[validation](validation.md).

Future phases may investigate native charts, richer authoring, additional
formats/layouts, explicit font packaging, and deeper visual regression support.
These are proposals, not implemented capabilities or commitments.
