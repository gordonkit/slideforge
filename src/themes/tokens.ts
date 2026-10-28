// A 1080p canvas; the PowerPoint slide stays 13.333 × 7.5 in, so 1 CSS px exports as 0.5 pt.
export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;
export const SLIDE_WIDTH_INCHES = 13.333333;
export const SLIDE_HEIGHT_INCHES = 7.5;

export const SLIDE_SIZE = Object.freeze({
  widthPx: SLIDE_WIDTH,
  heightPx: SLIDE_HEIGHT,
  widthInches: SLIDE_WIDTH_INCHES,
  heightInches: SLIDE_HEIGHT_INCHES,
});

export const themeTokens = Object.freeze({
  light: { background: "#ffffff", foreground: "#172033", muted: "#526078", accent: "#2563eb", onAccent: "#ffffff", surface: "#f1f5f9", border: "#cbd5e1", canvas: "#d8dee8", outline: "#ffffff" },
  dark: { background: "#101827", foreground: "#f8fafc", muted: "#b5c2d6", accent: "#60a5fa", onAccent: "#101827", surface: "#1e293b", border: "#475569", canvas: "#d8dee8", outline: "#101827" },
});

// Microsoft JhengHei matches the PowerPoint East Asian font; Noto covers systems without it.
export const defaultFontFamily = '"Arial", "Microsoft JhengHei", "Noto Sans CJK TC", "Noto Sans TC", sans-serif';

// Vertical regions add up to the slide height: padding-top + header + content + padding-bottom.
export const layoutTokens = Object.freeze({
  "padding-x": 96, "padding-top": 72, "padding-bottom": 84,
  header: 186, content: 738, "footer-bottom": 33, footer: 36,
  "cover-header": 525, "cover-top": 198, "cover-content": 375, "cover-panel": 640,
  "image-max-height": 630,
});

export const spacingTokens = Object.freeze({
  page: 36, block: 27, column: 60, card: 30, "card-padding": 36,
  subtitle: 18, "cover-subtitle": 36, "card-title": 24, list: 48, item: 15, caption: 12,
  "table-x": 24, "table-y": 15, chart: 30, "chart-explanation": 24,
});

export const typographyTokens = Object.freeze({
  title: 60, subtitle: 33, body: 36, caption: 25.5, "card-title": 39,
  "card-body": 30, table: 31.5, chart: 31.5, footer: 24, "cover-title": 90,
  "cover-subtitle": 45, author: 39, quote: 54,
  "title-leading": "1.2", "subtitle-leading": "1.35", "body-leading": "1.45",
  bold: "700",
});

// Borders round to whole device pixels, so 2 px keeps them crisp (1 pt in PowerPoint).
// `title-outline` strokes titles in the `outline` color; 0 draws none.
export const borderTokens = Object.freeze({ width: 2, radius: 18, accent: 6, "title-outline": 0 });
export const chartTokens = Object.freeze({
  height: 39, label: 285, value: 210, "explanation-label": 210, "explanation-value": 150,
});

export const designTokens = Object.freeze({
  layout: layoutTokens, spacing: spacingTokens, type: typographyTokens,
  border: borderTokens, chart: chartTokens,
});

export type DesignTokens = { readonly [G in keyof typeof designTokens]: { readonly [K in keyof (typeof designTokens)[G]]: (typeof designTokens)[G][K] extends number ? number : string } };

/** Flattens token groups into `--sf-<group>-<name>`, adding `px` to numbers. */
export function cssVariables(tokens: DesignTokens): Readonly<Record<string, string>> {
  return Object.freeze(Object.fromEntries(
    Object.entries(tokens).flatMap(([group, values]) => Object.entries(values).map(
      ([name, value]) => [`--sf-${group}-${name}`, typeof value === "number" ? `${value}px` : value],
    )),
  ));
}

export const designCssVariables = cssVariables(designTokens);
