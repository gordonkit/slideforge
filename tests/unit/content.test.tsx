import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { imageSourceSchema, parsePresentation, presentationSchema } from "../../src/schemas/presentation.js";
import { renderPresentation } from "../../src/renderers/html.js";
import { layoutFamilies } from "../../src/layouts/registry.js";
import { SLIDE_SIZE, defaultFontFamily, designTokens, themeTokens } from "../../src/themes/tokens.js";
import { Slide, SlideSubtitle, SlideContent, SlideCard, SlideColumns, SlideImage, SlideTable, SlideChart } from "../../src/components/index.js";

const basic: unknown = JSON.parse(readFileSync(new URL("../../examples/basic/presentation.json", import.meta.url), "utf8"));
const minimal = { metadata: { title: "Demo" }, slides: [{ layout: "cover", title: "Hello" }] };

describe("presentation content", () => {
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
