import { readFileSync } from "node:fs";
import type { CSSProperties } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parsePresentation } from "../schemas/presentation.js";
import { SlideLayout } from "../layouts/index.js";
import { defaultFontFamily, designCssVariables, SLIDE_SIZE, themeTokens } from "../themes/tokens.js";

const stylesheet = readFileSync(new URL("../themes/slides.css", import.meta.url), "utf8");

export interface RenderOptions {
  /** Optional caller-controlled base URL for resolving relative image assets. */
  baseUrl?: string;
}

export function renderPresentation(input: unknown, options: RenderOptions = {}): string {
  if (options.baseUrl !== undefined && !["http:", "https:", "file:"].includes(new URL(options.baseUrl).protocol)) {
    throw new Error("The asset base URL must use HTTP, HTTPS, or file");
  }
  const presentation = parsePresentation(input);
  const { metadata } = presentation;
  const palette = themeTokens[presentation.theme];
  const style = {
    ...designCssVariables,
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
    fontFamily: presentation.fontFamily ?? defaultFontFamily,
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
          {presentation.slides.map((slide, index) => <SlideLayout key={index} slide={slide} number={index + 1} total={presentation.slides.length} />)}
        </main>
      </body>
    </html>,
  );
}
