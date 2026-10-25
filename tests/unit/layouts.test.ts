import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { layoutFamilies, layoutFamily, layoutNames, layouts, layoutVariant, quotedList, slideVariant } from "../../src/layouts/registry.js";
import { layoutStylesheet } from "../../src/layouts/index.js";
import { renderPresentation } from "../../src/renderers/html.js";
import { parsePresentation, presentationSchema, slideBackground } from "../../src/schemas/presentation.js";

describe("layout registry", () => {
  it("lists the six families in documentation order", () => {
    expect(layoutFamilies).toEqual(["cover", "content", "two-columns", "cards", "table", "chart"]);
  });

  it("gives every family a default variant, a schema keyed by its name, a renderer, and a stylesheet", () => {
    for (const layout of layouts) {
      expect(layout.variants[0]).toBe("default");
      expect(layout.slide.shape.layout.options).toEqual([layout.family, ...layout.variants.map((variant) => `${layout.family}/${variant}`)]);
      for (const file of ["render.tsx", `${layout.family}.css`]) {
        expect(existsSync(new URL(`../../src/layouts/${layout.family}/${file}`, import.meta.url))).toBe(true);
      }
    }
    expect(layoutStylesheet).toContain(".sf-layout-cover .sf-header");
    expect(layoutStylesheet).toContain(".sf-chart-row");
  });

  it("accepts a background key for every layout name", () => {
    expect(layoutNames).toContain("cover/default");
    for (const name of layoutNames) {
      const deck = { metadata: { title: "Deck" }, backgrounds: { [name]: "a.png" }, slides: [{ layout: "cover", title: "x" }] };
      expect(presentationSchema.safeParse(deck).success).toBe(true);
    }
    const unknown = { metadata: { title: "Deck" }, backgrounds: { "cover/fancy": "a.png" }, slides: [{ layout: "cover", title: "x" }] };
    expect(presentationSchema.safeParse(unknown).success).toBe(false);
  });

  it("quotes lists the way error messages name valid values", () => {
    expect(quotedList(["a"])).toBe('"a"');
    expect(quotedList(["a", "b"])).toBe('"a" or "b"');
    expect(quotedList(["a", "b", "c"])).toBe('"a", "b", or "c"');
  });
});

describe("family/variant layout names", () => {
  const deck = (slide: object, backgrounds?: object) => ({
    metadata: { title: "Deck" }, ...(backgrounds ? { backgrounds } : {}), slides: [{ title: "x", ...slide }],
  });

  it("splits a name into its family and stated variant", () => {
    expect(layoutFamily("cover")).toBe("cover");
    expect(layoutFamily("two-columns/default")).toBe("two-columns");
    expect(layoutVariant("cover")).toBeUndefined();
    expect(layoutVariant("cover/default")).toBe("default");
    expect(slideVariant({ layout: "cover" })).toBe("default");
  });

  it("keeps the name as written and draws a bare family as its default variant", () => {
    const parsed = parsePresentation(deck({ layout: "cover/default" }));
    expect(parsed.slides[0]!.layout).toBe("cover/default");
    expect(parsePresentation(parsed)).toEqual(parsed);
    const html = (layout: string) => renderPresentation(deck({ layout }));
    expect(html("cover/default")).toBe(html("cover"));
    expect(html("cover")).toContain('class="sf-slide sf-layout-cover sf-variant-default" data-pptx="slide" data-layout="cover" data-variant="default"');
  });

  it("names a family's variants for an unknown variant, and the families otherwise", () => {
    const issues = (slide: object) => presentationSchema.safeParse(deck(slide)).error?.issues.map((issue) => issue.message);
    const cover = 'Unknown cover variant. Use "cover", "cover/default", "cover/centered", "cover/split", or "cover/band"';
    expect(issues({ layout: "cover/fancy" })).toEqual([cover]);
    expect(issues({ layout: "cover/" })).toEqual([cover]);
    expect(issues({ layout: "table/fancy", columns: ["A"], rows: [["1"]] })).toEqual(['Unknown table variant. Use "table" or "table/default"']);
    expect(issues({ layout: "timeline" })).toEqual(['Unknown layout. Use "cover", "content", "two-columns", "cards", "table", or "chart"']);
    expect(issues({})).toEqual(['Unknown layout. Use "cover", "content", "two-columns", "cards", "table", or "chart"']);
  });

  it("draws cover variants with the same content and only split's decorative panel", () => {
    for (const variant of ["default", "centered", "split", "band"]) {
      const html = renderPresentation(deck({ layout: `cover/${variant}`, author: "Author" }));
      expect(html).toContain(`class="sf-slide sf-layout-cover sf-variant-${variant}"`);
      expect(html).toContain('<p class="sf-author">Author</p>');
      expect(html.includes('<div class="sf-cover-panel" aria-hidden="true"></div>')).toBe(variant === "split");
    }
  });

  it("resolves backgrounds from the slide, then family/variant, then family, then default", () => {
    const background = (slide: object, backgrounds: object) => {
      const presentation = parsePresentation(deck(slide, backgrounds));
      return slideBackground(presentation, presentation.slides[0]!);
    };
    const all = { default: "d.png", cover: "c.png", "cover/default": "cd.png" };
    expect(background({ layout: "cover", background: "own.png" }, all)).toBe("own.png");
    expect(background({ layout: "cover" }, all)).toBe("cd.png");
    expect(background({ layout: "cover/default" }, all)).toBe("cd.png");
    expect(background({ layout: "cover" }, { default: "d.png", cover: "c.png" })).toBe("c.png");
    expect(background({ layout: "cover/default" }, { default: "d.png" })).toBe("d.png");
    expect(background({ layout: "cover", background: "none" }, all)).toBeUndefined();
  });
});
