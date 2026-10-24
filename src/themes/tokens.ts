export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;
export const SLIDE_WIDTH_INCHES = 13.333333;
export const SLIDE_HEIGHT_INCHES = 7.5;

export const SLIDE_SIZE = Object.freeze({
  widthPx: SLIDE_WIDTH,
  heightPx: SLIDE_HEIGHT,
  widthInches: SLIDE_WIDTH_INCHES,
  heightInches: SLIDE_HEIGHT_INCHES,
});

export const themeTokens = Object.freeze({
  light: { background: "#ffffff", foreground: "#172033", muted: "#526078", accent: "#2563eb", onAccent: "#ffffff", surface: "#f1f5f9", border: "#cbd5e1", canvas: "#d8dee8" },
  dark: { background: "#101827", foreground: "#f8fafc", muted: "#b5c2d6", accent: "#60a5fa", onAccent: "#101827", surface: "#1e293b", border: "#475569", canvas: "#d8dee8" },
});

// Microsoft JhengHei matches the PowerPoint East Asian font; Noto covers systems without it.
export const defaultFontFamily = '"Arial", "Microsoft JhengHei", "Noto Sans CJK TC", "Noto Sans TC", sans-serif';

export const layoutTokens = Object.freeze({
  "padding-x": 64, "padding-top": 48, "padding-bottom": 56,
  header: 124, content: 492, "footer-bottom": 22, footer: 24,
  "cover-header": 350, "cover-top": 132, "cover-content": 250,
  "image-max-height": 420,
});

export const spacingTokens = Object.freeze({
  page: 24, block: 18, column: 40, card: 20, "card-padding": 24,
  subtitle: 12, "cover-subtitle": 24, "card-title": 16, list: 32, item: 10, caption: 8,
  "table-x": 16, "table-y": 10, chart: 20, "chart-explanation": 16,
});

export const typographyTokens = Object.freeze({
  title: 40, subtitle: 22, body: 24, caption: 17, "card-title": 26,
  "card-body": 20, table: 21, chart: 21, footer: 16, "cover-title": 60,
  "cover-subtitle": 30, author: 26,
  "title-leading": "1.2", "subtitle-leading": "1.35", "body-leading": "1.45",
  bold: "700",
});

export const borderTokens = Object.freeze({ width: 1, radius: 12 });
export const chartTokens = Object.freeze({
  height: 26, label: 190, value: 140, "explanation-label": 140, "explanation-value": 100,
});

export const designTokens = Object.freeze({
  layout: layoutTokens, spacing: spacingTokens, type: typographyTokens,
  border: borderTokens, chart: chartTokens,
});

export const designCssVariables = Object.freeze(Object.fromEntries(
  Object.entries(designTokens).flatMap(([group, tokens]) => Object.entries(tokens).map(
    ([name, value]) => [`--sf-${group}-${name}`, typeof value === "number" ? `${value}px` : value],
  )),
));
