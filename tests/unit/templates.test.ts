import { describe, expect, it } from "vitest";
import { renderPresentation } from "../../src/renderers/html.js";
import { describePresentationError } from "../../src/schemas/input.js";
import { parsePresentation, slideBackground } from "../../src/schemas/presentation.js";
import { mergeTokens, parseTemplate, templateSchema } from "../../src/templates/schema.js";
import { defaultFontFamily, designTokens, themeTokens } from "../../src/themes/tokens.js";

const deck = (extra: object = {}, slides: object[] = [{ layout: "cover", title: "Hello" }]) => ({
  metadata: { title: "Deck" }, ...extra, slides,
});
const render = (input: object, template?: object) => renderPresentation(input, template ? { template } : {});

describe("template schema", () => {
  it("accepts a name alone and every optional field", () => {
    expect(parseTemplate({ name: "plain" })).toEqual({ name: "plain" });
    expect(templateSchema.safeParse({
      name: "corporate",
      description: "Navy and amber",
      palette: { light: { accent: "#F5A524" }, dark: { background: "#0b1f3a", onAccent: "#0b1f3a" } },
      fontFamily: "Noto Sans TC, Arial, sans-serif",
      tokens: { type: { title: 64 }, border: { radius: 0 }, layout: { header: 196, content: 728 } },
      backgrounds: { default: "plain.svg", "cover/band": "band.png" },
      variants: { cover: "band", table: "default" },
    }).success).toBe(true);
  });

  it.each([
    [{}, "name"],
    [{ name: "Corporate" }, "name"],
    [{ name: "x", theme: "dark" }, ""],
    [{ name: "x", palette: { light: { accent: "blue" } } }, "palette.light.accent"],
    [{ name: "x", palette: { sepia: {} } }, "palette"],
    [{ name: "x", tokens: { type: { "title-leading": 1.4 } } }, "tokens.type"],
    [{ name: "x", tokens: { type: { title: 4 } } }, "tokens.type.title"],
    [{ name: "x", tokens: { colors: {} } }, "tokens"],
    [{ name: "x", variants: { cover: "fancy" } }, "variants.cover"],
    [{ name: "x", variants: { timeline: "default" } }, "variants"],
    [{ name: "x", backgrounds: { quote: "a.png" } }, "backgrounds"],
    [{ name: "x", fontFamily: "Arial; color: red" }, "fontFamily"],
  ])("rejects %j at %s", (input, path) => {
    const result = templateSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error!.issues.map((issue) => issue.path.join("."))).toContain(path);
  });

  it("keeps the slide's vertical regions on the canvas", () => {
    const message = (layout: object) => describePresentationError(templateSchema.safeParse({ name: "x", tokens: { layout } }).error);
    expect(message({ header: 200 })).toContain("tokens.layout: padding-top + header + content + padding-bottom must equal 1080 (got 1094)");
    expect(message({ "cover-content": 420 })).toContain("must not exceed 1080 (got 1101)");
    expect(message({ "cover-top": 600 })).toContain("cover-top must not exceed cover-header");
    expect(message({ footer: 60 })).toContain("footer-bottom + footer must not exceed padding-bottom");
    expect(message({ "cover-panel": 1800 })).toContain("2 × padding-x + cover-panel must be less than 1920 (got 1992)");
    expect(templateSchema.safeParse({ name: "x", tokens: { layout: { header: 200, content: 724 } } }).success).toBe(true);
  });

  it("merges token overrides over the built-in tokens", () => {
    const tokens = mergeTokens({ type: { title: 64 } });
    expect(tokens.type.title).toBe(64);
    expect(tokens.type.body).toBe(designTokens.type.body);
    expect(tokens.layout).toEqual(designTokens.layout);
    expect(mergeTokens()).toEqual(designTokens);
  });
});

describe("rendering with a template", () => {
  it("renders the same document as before without a template", () => {
    const input = deck({ theme: "dark", fontFamily: "Arial" });
    expect(renderPresentation(input, {})).toBe(renderPresentation(input));
    expect(render(input, { name: "plain" })).toBe(renderPresentation(input));
  });

  it("applies the palette for the presentation's theme over the built-in one", () => {
    const template = { name: "x", palette: { light: { accent: "#f5a524" }, dark: { accent: "#123456" } } };
    const light = render(deck(), template);
    expect(light).toContain("--sf-accent:#f5a524");
    expect(light).toContain(`--sf-background:${themeTokens.light.background}`);
    expect(render(deck({ theme: "dark" }), template)).toContain("--sf-accent:#123456");
    expect(render(deck({ theme: "dark" }), { name: "x", palette: { light: { accent: "#f5a524" } } }))
      .toContain(`--sf-accent:${themeTokens.dark.accent}`);
  });

  it("uses the presentation's font, else the template's, else the default", () => {
    const template = { name: "x", fontFamily: "Noto Sans TC, Arial" };
    expect(render(deck(), template)).toContain("font-family:Noto Sans TC, Arial");
    expect(render(deck({ fontFamily: "Arial" }), template)).toContain("font-family:Arial");
    expect(render(deck())).toContain(`font-family:${defaultFontFamily.replaceAll('"', "&quot;")}`);
  });

  it("writes token overrides as CSS variables", () => {
    const html = render(deck(), { name: "x", tokens: { type: { title: 64 }, layout: { header: 200, content: 724 } } });
    expect(html).toContain("--sf-type-title:64px");
    expect(html).toContain("--sf-layout-header:200px");
    expect(html).toContain(`--sf-type-body:${designTokens.type.body}px`);
  });

  it("draws a bare family with the template's variant and a named variant as written", () => {
    const template = { name: "x", variants: { cover: "band" } };
    const html = render(deck({}, [{ layout: "cover", title: "A" }, { layout: "cover/split", title: "B" }, { layout: "content", title: "C", blocks: [{ type: "paragraph", text: "x" }] }]), template);
    expect(html).toContain('class="sf-slide sf-layout-cover sf-variant-band"');
    expect(html).toContain('class="sf-slide sf-layout-cover sf-variant-split"');
    expect(html).toContain('<div class="sf-cover-panel" aria-hidden="true"></div>');
    expect(html).toContain('class="sf-slide sf-layout-content sf-variant-default"');
  });

  it("looks up backgrounds with presentation entries replacing the template's same key", () => {
    const template = { name: "x", backgrounds: { default: "t-default.png", cover: "t-cover.png", "cover/band": "t-band.png" }, variants: { cover: "band" as const } };
    const background = (extra: object, slide: object) => {
      const presentation = parsePresentation(deck(extra, [slide]));
      return slideBackground(presentation, presentation.slides[0]!, parseTemplate(template));
    };
    expect(background({}, { layout: "cover", title: "A" })).toBe("t-band.png");
    expect(background({}, { layout: "cover/default", title: "A" })).toBe("t-cover.png");
    expect(background({}, { layout: "table", title: "A", columns: ["a"], rows: [["1"]] })).toBe("t-default.png");
    expect(background({ backgrounds: { "cover/band": "p-band.png" } }, { layout: "cover", title: "A" })).toBe("p-band.png");
    expect(background({ backgrounds: { default: "p-default.png" } }, { layout: "cover", title: "A" })).toBe("t-band.png");
    expect(background({ backgrounds: { default: "p-default.png" } }, { layout: "table", title: "A", columns: ["a"], rows: [["1"]] })).toBe("p-default.png");
    expect(background({}, { layout: "cover", title: "A", background: "none" })).toBeUndefined();
    expect(render(deck(), template)).toContain('<img src="t-band.png" alt=""/>');
  });

  it("rejects an invalid template with the schema's error", () => {
    expect(() => render(deck(), { name: "x", variants: { cover: "fancy" } })).toThrow();
  });
});
