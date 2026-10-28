import { readFileSync } from "node:fs";
import type { CSSProperties } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parsePresentation, slideBackground } from "../schemas/presentation.js";
import { layoutStylesheet, SlideLayout } from "../layouts/index.js";
import { slideVariant } from "../layouts/registry.js";
import { mergeTokens, parseTemplate, type Template } from "../templates/schema.js";
import { cssVariables, defaultFontFamily, SLIDE_SIZE, themeTokens } from "../themes/tokens.js";

const stylesheet = readFileSync(new URL("../themes/slides.css", import.meta.url), "utf8") + layoutStylesheet;

export interface RenderOptions {
  /** Optional caller-controlled base URL for resolving relative image assets. */
  baseUrl?: string;
  /** Optional template object (see `templateSchema`); `loadPresentation` reads the one a file names. */
  template?: unknown;
  /**
   * Optional absolute HTTP(S)/file URL that the template's relative background sources resolve
   * against, normally its directory. Without it they resolve against the document.
   */
  templateBaseUrl?: string;
}

function checkBaseUrl(url: string | undefined, name: string): void {
  if (url !== undefined && !["http:", "https:", "file:"].includes(new URL(url).protocol)) {
    throw new Error(`The ${name} must use HTTP, HTTPS, or file`);
  }
}

/** Resolve a template's relative background sources against its own base URL. */
function rebaseBackgrounds(backgrounds: Template["backgrounds"], base: string | undefined): Template["backgrounds"] {
  if (backgrounds === undefined || base === undefined) return backgrounds;
  return Object.fromEntries(Object.entries(backgrounds).map(([key, source]) => [
    key, source === undefined || /^[a-z][a-z0-9+.-]*:/i.test(source) ? source : new URL(source, base).href,
  ]));
}

export function renderPresentation(input: unknown, options: RenderOptions = {}): string {
  checkBaseUrl(options.baseUrl, "asset base URL");
  checkBaseUrl(options.templateBaseUrl, "template base URL");
  const presentation = parsePresentation(input);
  if (presentation.template !== undefined && options.template === undefined) {
    throw new Error(`The presentation names template "${presentation.template}"; read it with loadPresentation(file) and pass its template and templateBaseUrl`);
  }
  const parsed = options.template === undefined ? undefined : parseTemplate(options.template);
  const template = parsed && { ...parsed, backgrounds: rebaseBackgrounds(parsed.backgrounds, options.templateBaseUrl) };
  const { metadata } = presentation;
  const palette = { ...themeTokens[presentation.theme], ...template?.palette?.[presentation.theme] };
  const style = {
    ...cssVariables(mergeTokens(template?.tokens)),
    "--slide-width": `${SLIDE_SIZE.widthPx}px`,
    "--slide-height": `${SLIDE_SIZE.heightPx}px`,
    "--sf-background": palette.background,
    "--sf-foreground": palette.foreground,
    "--sf-muted": palette.muted,
    "--sf-accent": palette.accent,
    "--sf-on-accent": palette.onAccent,
    "--sf-canvas": palette.canvas,
    "--sf-surface": palette.surface,
    "--sf-border": palette.border,
    "--sf-outline": palette.outline,
    fontFamily: presentation.fontFamily ?? template?.fontFamily ?? defaultFontFamily,
  } as CSSProperties;
  return "<!doctype html>" + renderToStaticMarkup(
    <html lang={metadata.lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {options.baseUrl !== undefined && <base href={options.baseUrl} />}
        <title>{metadata.title}</title>
        <meta name="title" content={metadata.title} />
        <meta name="author" content={metadata.author ?? ""} />
        <meta name="subject" content={metadata.subject ?? ""} />
        <style>{stylesheet}</style>
      </head>
      <body style={style} data-theme={presentation.theme}>
        <main className="sf-presentation">
          {presentation.slides.map((slide, index) => <SlideLayout key={index} slide={slide}
            variant={slideVariant(slide, template?.variants)} number={index + 1} total={presentation.slides.length}
            background={slideBackground(presentation, slide, template)} />)}
        </main>
      </body>
    </html>,
  );
}
