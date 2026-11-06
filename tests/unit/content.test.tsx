import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { imageSourceSchema, parsePresentation, presentationSchema } from "../../src/schemas/presentation.js";
import { renderPresentation } from "../../src/renderers/html.js";
import { layoutFamilies, layoutFamily, layoutNames } from "../../src/layouts/registry.js";
import { SLIDE_SIZE, defaultFontFamily, designTokens, themeTokens } from "../../src/themes/tokens.js";
import { Slide, SlideSubtitle, SlideContent, SlideCard, SlideColumns, SlideImage, SlideTable, SlideChart } from "../../src/components/index.js";
import { displayText } from "../../src/schemas/fields.js";
import { DisplayTextContent, TextTokens } from "../../src/components/text.js";

const basic: unknown = JSON.parse(readFileSync(new URL("../../examples/basic/presentation.json", import.meta.url), "utf8"));
const minimal = { metadata: { title: "Demo" }, slides: [{ layout: "cover", title: "Hello" }] };

describe("shared display text", () => {
  const fields = new Set(["title", "subtitle", "footer", "author", "text", "label", "labelDetail", "name", "role", "date", "center", "xAxis", "yAxis", "quote", "attribution", "caption", "code", "language", "unit", "value", "items", "periods", "columns", "rows"]);
  function rich(value: unknown, field = ""): unknown {
    if (typeof value === "string") return fields.has(field) ? { text: value, fontSize: { delta: 0 } } : value;
    if (Array.isArray(value)) return value.map(item => rich(item, field));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rich(item, key)]));
    return value;
  }

  it.each(layoutNames)("renders every authored text field as an object in %s", layout => {
    const input = parsePresentation(basic);
    const index = input.slides.findIndex(slide => layoutFamily(slide.layout) === layoutFamily(layout));
    const slides = input.slides.map((slide, position) => position === index ? { ...slide, layout } : slide);
    const styled = renderPresentation({ ...input, slides: rich(slides) });
    expect(styled).not.toContain("[object Object]");
    expect(styled).toContain('aria-label="1. Ideas into slides"');
    expect(styled.replace(/<span style="font-size:[^"]+">([^<]*)<\/span>/g, "$1")).toBe(renderPresentation({ ...input, slides }));
  });

  it("keeps metadata, notes, image sources and alt text as plain strings", () => {
    const object = { text: "x", fontSize: 20 };
    for (const input of [
      { ...minimal, metadata: { title: object } },
      { ...minimal, slides: [{ layout: "cover", title: "x", notes: object }] },
      { ...minimal, slides: [{ layout: "media", title: "x", image: object, alt: "x" }] },
      { ...minimal, slides: [{ layout: "media", title: "x", image: "image.png", alt: object }] },
      { ...minimal, slides: [{ layout: "cover", title: { text: "\u0000", fontSize: 20 } }] },
    ]) expect(presentationSchema.safeParse(input).success).toBe(false);
  });

  it("uses the role after layout scaling, without accumulating parent adjustments", () => {
    const adjusted = { text: "Child", fontSize: { delta: -4 } };
    const cards = { layout: "cards/hexagon", title: { text: "Parent", fontSize: { delta: 10 } }, cards: [{ title: adjusted, blocks: [{ type: "paragraph", text: adjusted }] }] };
    const draw = (type: object) => renderPresentation({ ...minimal, slides: [cards] }, { template: { name: "custom", tokens: { type } } });
    expect(draw({})).toContain('<span style="font-size:20px">Child</span>');
    expect(draw({ "card-body": 40 })).toContain('<span style="font-size:28px">Child</span>');
    expect(draw({})).toContain('<span style="font-size:35px">Child</span>');
    expect(draw({})).toContain('<span style="font-size:70px">Parent</span>');
    const steps = Array.from({ length: 5 }, () => ({ title: adjusted, text: adjusted }));
    expect(renderPresentation({ ...minimal, slides: [{ layout: "process", title: "x", steps }] })).toContain('font-size:29.15px');
    const panels = Array.from({ length: 5 }, () => ({ title: "x", blocks: [{ type: "paragraph", text: adjusted }] }));
    expect(renderPresentation({ ...minimal, slides: [{ layout: "panels/rows", title: "x", panels }] })).toContain('font-size:17px');
  });

  it("accepts strings, fixed sizes and signed deltas, without allowing arbitrary CSS", () => {
    for (const value of ["Text", { text: "Text" }, { text: "Text", fontSize: 28 }, { text: "Text", fontSize: { delta: -4 } }, { text: "Text", fontSize: { delta: 4 } }]) {
      expect(displayText().safeParse(value).success).toBe(true);
    }
    for (const value of [{ text: " " }, { text: "x", fontSize: 7 }, { text: "x", fontSize: 241 }, { text: "x", fontSize: "+4" }, { text: "x", fontSize: { delta: Infinity } }, { text: "x", style: "color:red" }]) {
      expect(displayText().safeParse(value).success).toBe(false);
    }
  });

  it("resolves deltas from the supplied role token and rejects out-of-bounds results", () => {
    const value = { text: "Detail", fontSize: { delta: -4 } };
    expect(renderToStaticMarkup(<DisplayTextContent value={value} size="card-body" />)).toBe('<span style="font-size:26px">Detail</span>');
    const tokens = { ...designTokens, type: { ...designTokens.type, "card-body": 36 } };
    expect(renderToStaticMarkup(<TextTokens value={tokens}><DisplayTextContent value={value} size="card-body" /></TextTokens>)).toBe('<span style="font-size:32px">Detail</span>');
    expect(renderToStaticMarkup(<DisplayTextContent value={{ text: "Fixed", fontSize: 28 }} />)).toBe('<span style="font-size:28px">Fixed</span>');
    expect(renderToStaticMarkup(<DisplayTextContent value="Unchanged" />)).toBe("Unchanged");
    expect(() => renderToStaticMarkup(<DisplayTextContent value={{ text: "Too small", fontSize: { delta: -40 } }} />)).toThrow("between 8 and 240px");
  });
});

describe("presentation content", () => {
  it("accepts optional stat label details and highlights and rejects invalid values", () => {
    const stat = { value: "96–128", label: "Scope", labelDetail: "Files", highlight: true };
    const input = (extra: object) => ({ ...minimal, slides: [{ layout: "stats", title: "Stats", stats: [{ ...stat, ...extra }, { value: "717", label: "Existing" }] }] });
    expect(presentationSchema.safeParse(input({})).success).toBe(true);
    expect(presentationSchema.safeParse(input({ highlight: false })).success).toBe(true);
    for (const extra of [{ highlight: "yes" }, { highlight: 1 }, { labelDetail: " " }, { labelDetail: "x".repeat(101) }, { labelDetail: "\u0000" }]) {
      expect(presentationSchema.safeParse(input(extra)).success).toBe(false);
    }
  });

  it.each([[35, 10, 55], [33.33, 33.33, 33.34], [0.1, 0.2, 99.7]])("accepts percentage column widths %j", (...columnWidths) => {
    const input = { ...minimal, slides: [{ layout: "table", title: "Widths", columns: ["A", "B", "C"], rows: [["1", "2", "3"]], columnWidths }] };
    const slide = parsePresentation(input).slides[0]!;
    expect(slide.layout === "table" && slide.columnWidths).toEqual(columnWidths);
  });

  it.each([
    [], [50, 50], [35, 10, 54], [35, 10, 56], [0, 50, 50], [-10, 50, 60],
    [101, 1, 1], [NaN, 10, 90], [Infinity, 10, 90], ["35%", 10, 55],
  ])("rejects invalid percentage column widths %j", (...columnWidths) => {
    const input = { ...minimal, slides: [{ layout: "table", title: "Widths", columns: ["A", "B", "C"], rows: [["1", "2", "3"]], columnWidths }] };
    expect(presentationSchema.safeParse(input).success).toBe(false);
  });

  it("reports table width errors at columnWidths", () => {
    const input = { ...minimal, slides: [{ layout: "table", title: "Widths", columns: ["A", "B"], rows: [["1", "2"]], columnWidths: [100] }] };
    expect(presentationSchema.safeParse(input).error?.issues.map(issue => issue.path)).toContainEqual(["slides", 0, "columnWidths"]);
  });

  it("validates one slide per layout family and supplies defaults", () => {
    const presentation = parsePresentation(basic);
    expect(presentation.slides.map((slide) => slide.layout)).toEqual(layoutFamilies);
    expect(parsePresentation(minimal).theme).toBe("light");
    expect(parsePresentation(minimal).metadata.lang).toBe("en");
  });

  it.each([
    {},
    { ...minimal, slides: [] },
    { ...minimal, theme: "neon" },
    { ...minimal, slides: [{ layout: "unknown", title: "No" }] },
    { ...minimal, slides: [{ layout: "content", title: "No", blocks: [] }] },
    { ...minimal, slides: [{ layout: "content", title: "No", blocks: [{ type: "html", html: "<b>No</b>" }] }] },
    { ...minimal, slides: [{ layout: "table", title: "No", columns: ["a", "b"], rows: [["a"]] }] },
    { ...minimal, slides: [{ layout: "chart", title: "No", data: [{ label: "a", value: -1 }] }] },
    { ...minimal, fontFamily: "Arial; background:url(https://evil.example)" },
    { ...minimal, fontFamily: "Arial}</style><script>alert(1)</script>" },
    { ...minimal, metadata: { title: "No", lang: 'en" onload="alert(1)' } },
  ])("rejects invalid structured content %#", (value) => {
    expect(presentationSchema.safeParse(value).success).toBe(false);
  });

  it.each(["assets/image.svg", "../image.png", "/image.png", "https://example.com/image.png", "http://example.com/image.png", "data:image/png;base64,aGVsbG8="])("allows safe image source %s", (source) => {
    expect(imageSourceSchema.safeParse(source).success).toBe(true);
  });

  it.each(["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html;base64,AAAA", "file:///etc/passwd", "//evil.example/a.png", "\\\\evil.example\\a.png", "java\nscript:alert(1)", "https://", "https://user@example.com/a"])("rejects unsafe image source %s", (source) => {
    expect(imageSourceSchema.safeParse(source).success).toBe(false);
  });

  it.each(["\u0000", "\u0008", "\u000b", "\u000c", "\u001f", "\ufffe", "\uffff", "\ud800", "\udfff"])("rejects XML-invalid characters throughout text fields %#", (invalid) => {
    const bad = `Text${invalid}`;
    const cases = [
      { ...minimal, metadata: { title: bad } },
      { ...minimal, metadata: { title: "Title", author: bad } },
      { ...minimal, metadata: { title: "Title", subject: bad } },
      { ...minimal, fontFamily: bad },
      { ...minimal, slides: [{ layout: "cover", title: bad }] },
      { ...minimal, slides: [{ layout: "cover", title: "Title", notes: bad, author: bad, subtitle: bad, footer: bad }] },
      { ...minimal, slides: [{ layout: "content", title: "Title", blocks: [{ type: "paragraph", text: bad }] }] },
      { ...minimal, slides: [{ layout: "content", title: "Title", blocks: [{ type: "bullets", items: [bad] }] }] },
      { ...minimal, slides: [{ layout: "content", title: "Title", blocks: [{ type: "image", src: "image.png", alt: bad, caption: bad }] }] },
      { ...minimal, slides: [{ layout: "table", title: "Title", columns: ["A"], rows: [[bad]] }] },
      { ...minimal, slides: [{ layout: "chart", title: "Title", data: [{ label: "A", value: 1 }], unit: bad }] },
    ];
    for (const value of cases) expect(presentationSchema.safeParse(value).success).toBe(false);
  });

  it("allows XML-safe whitespace, Traditional Chinese, and emoji", () => {
    expect(presentationSchema.safeParse({
      ...minimal,
      metadata: { title: "繁體中文 😀" },
      slides: [{ layout: "cover", title: "Title", notes: "Tab\tLine\nReturn\r" }],
    }).success).toBe(true);
  });
});

describe("HTML renderer", () => {
  it("renders secondary stat labels and highlights only selected items in both variants", () => {
    for (const layout of ["stats", "stats/cards"]) {
      const html = renderPresentation({ ...minimal, slides: [{ layout, title: "Scope", stats: [
        { value: "717", label: "Existing" },
        { value: "602", label: "Batch", highlight: false },
        { value: "96–128", label: "Scope", labelDetail: "Files <planned>", highlight: true, text: "Details" },
      ] }] });
      expect(html.match(/<li class="sf-stat" data-highlight="true">/g)).toHaveLength(1);
      expect(html).toContain('<li class="sf-stat" data-highlight="true"><span class="sf-stat-value">96–128</span>');
      expect(html).toContain('<span class="sf-stat-label-detail">Files &lt;planned&gt;</span>');
      expect(html).toContain('<li class="sf-stat"><span class="sf-stat-value">717</span>');
      expect(html).toContain('<li class="sf-stat"><span class="sf-stat-value">602</span>');
    }
  });

  it("renders percentage colgroups for tables and leaves unspecified widths unchanged", () => {
    const slide = { layout: "table", title: "Widths", columns: ["Work", "Days", "Output"], rows: [["Design", "100", "Architecture"]] };
    const input = { ...minimal, slides: [slide] };
    expect(renderPresentation(input)).not.toContain("<colgroup>");
    const expected = '<colgroup><col style="width:35%"/><col style="width:10%"/><col style="width:55%"/></colgroup>';
    for (const layout of ["table", "table/default"]) {
      expect(renderPresentation({ ...input, slides: [{ ...slide, layout, columnWidths: [35, 10, 55] }] })).toContain(expected);
    }
    expect(renderToStaticMarkup(<SlideTable columns={slide.columns} rows={slide.rows} columnWidths={[35, 10, 55]} />)).toContain(expected);
  });

  it("renders a fixed-size slide per family, metadata, local images, notes, and editable chart bars", () => {
    const html = renderPresentation(basic);
    expect(html.match(/data-pptx="slide"/g)).toHaveLength(layoutFamilies.length);
    for (const layout of layoutFamilies) {
      expect(html).toContain(`class="sf-slide sf-layout-${layout} sf-variant-default" data-pptx="slide" data-layout="${layout}" data-variant="default"`);
      expect(html).not.toContain(`class="sf-slide sf-${layout}"`);
    }
    expect(html).toContain('<html lang="zh-Hant">');
    expect(html).toContain('name="author" content="SlideForge"');
    expect(html).toContain('name="subject"');
    expect(html).toContain('name="title"');
    expect(html).toContain('src="assets/diagram.svg"');
    expect(html).toContain('data-pptx-notes="" hidden=""');
    expect(html).toContain("Welcome! 歡迎使用 SlideForge。");
    expect(html).toContain('class="sf-chart-bar" style="width:80%"');
    expect(html).toContain("--slide-width:1920px");
    expect(html).toContain("--slide-height:1080px");
    expect(defaultFontFamily).toBe('"Arial", "Microsoft JhengHei", "Noto Sans CJK TC", "Noto Sans TC", sans-serif');
  });

  it("shares dimensions and theme tokens, and supports safe local font names", () => {
    expect(SLIDE_SIZE).toEqual({ widthPx: 1920, heightPx: 1080, widthInches: 13.333333, heightInches: 7.5 });
    const { layout } = designTokens;
    expect(layout["padding-top"] + layout.header + layout.content + layout["padding-bottom"]).toBe(SLIDE_SIZE.heightPx);
    const html = renderPresentation({ ...minimal, theme: "dark", fontFamily: '"Noto Sans TC", Arial' });
    expect(html).toContain('data-theme="dark"');
    expect(html).toContain(`--sf-background:${themeTokens.dark.background}`);
    expect(html).toContain("font-family:&quot;Noto Sans TC&quot;, Arial");
    expect(html).toContain("width: var(--slide-width)");
    expect(html).toContain(`--sf-layout-content:${designTokens.layout.content}px`);
    expect(html).toContain(`--sf-spacing-column:${designTokens.spacing.column}px`);
    expect(html).toContain(`--sf-type-title:${designTokens.type.title}px`);
    expect(html).toContain(`--sf-border-radius:${designTokens.border.radius}px`);
    expect(html).toContain("height: var(--sf-layout-content)");
    expect(html).toContain("gap: var(--sf-spacing-column)");
  });

  it("exports reusable named slide components", () => {
    const model = parsePresentation(minimal).slides[0]!;
    const html = renderToStaticMarkup(
      <Slide slide={model} number={1} total={1}>
        <SlideSubtitle>Reusable subtitle</SlideSubtitle>
        <SlideContent><SlideColumns>
          <SlideCard title="Reusable card"><SlideImage src="image.png" alt="Example" caption="Caption" /></SlideCard>
          <SlideTable columns={["A"]} rows={[["One"]]} />
        </SlideColumns></SlideContent>
        <SlideChart data={[{ label: "Value", value: 1 }]} />
      </Slide>,
    );
    expect(html).toContain('data-pptx="slide"');
    for (const name of ["subtitle", "content", "columns", "card", "table", "chart"]) expect(html).toContain(`class="sf-${name}"`);
    expect(html).toContain('<img src="image.png" alt="Example"');
  });

  it("escapes all user-controlled text, attributes, and notes", () => {
    const attack = '</title><script>alert("x")</script>';
    const html = renderPresentation({
      metadata: { title: attack, author: attack, subject: attack },
      slides: [{ layout: "content", title: attack, subtitle: attack, footer: attack, notes: attack, blocks: [
        { type: "paragraph", text: attack },
        { type: "image", src: "assets/image.png", alt: attack, caption: attack },
      ] }],
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;/title&gt;&lt;script&gt;");
    expect(html).toContain('alt="&lt;/title&gt;&lt;script&gt;');
  });

  it("handles zero-valued charts without non-finite CSS", () => {
    const input = { ...minimal, slides: [{ layout: "chart", title: "Zero", data: [{ label: "Nothing", value: 0 }] }] };
    const chart = parsePresentation(input).slides[0];
    expect(chart?.layout === "chart" && chart.blocks).toEqual([]);
    const html = renderPresentation(input);
    expect(html).toContain('style="width:0%"');
    expect(html).not.toMatch(/NaN|Infinity/);
    expect(html).not.toContain('class="sf-chart-layout"');
  });

  it("renders optional explanatory content alongside the editable chart", () => {
    const html = renderPresentation({
      ...minimal,
      slides: [{
        layout: "chart", title: "Results", data: [{ label: "A", value: 5 }],
        blocks: [{ type: "paragraph", text: "Explanatory context / 圖表說明" }],
      }],
    });
    expect(html).toContain('class="sf-chart-layout"');
    expect(html).toContain("Explanatory context / 圖表說明");
    expect(html).toContain('class="sf-chart-bar"');
  });

  it("supports an explicit safe asset base URL without rewriting relative images", () => {
    const html = renderPresentation(basic, { baseUrl: "file:///presentations/basic/" });
    expect(html).toContain('<base href="file:///presentations/basic/"');
    expect(html).toContain('src="assets/diagram.svg"');
    expect(() => renderPresentation(basic, { baseUrl: "javascript:alert(1)" })).toThrow();
  });
});
