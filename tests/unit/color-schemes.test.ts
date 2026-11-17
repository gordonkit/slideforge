import { describe, expect, it } from "vitest";
import { renderPresentation } from "../../src/renderers/html.js";
import { parsePresentation } from "../../src/schemas/presentation.js";
import { parseTemplate } from "../../src/templates/schema.js";
import { luminance } from "../../src/themes/color.js";
import { itemTextColor } from "../../src/themes/item-colors.js";

const items = [{ title: "Alpha" }, { title: "Beta", color: "#ffffff" }, { title: "Gamma" }];
const slide = (layout: string, colorScheme?: unknown) => ({
  layout, title: "Colors", ...(colorScheme === undefined ? {} : { colorScheme }),
  [layout.startsWith("cards") ? "cards" : "steps"]: items,
});
const deck = (slides: object[]) => ({ metadata: { title: "Colors" }, slides });

describe("coordinated item colors", () => {
  for (const layout of ["cards/honeycomb", "cycle/ring", "process"]) {
    it(`resolves template colors, repeats them, and gives individual colors precedence in ${layout}`, () => {
      const input = deck([slide(layout, "calm")]);
      const template = { name: "brand", colorSchemes: { calm: ["#2563eb", "#d6b77c"] } };
      const named = renderPresentation(input, { template });
      expect(named).toBe(renderPresentation(deck([slide(layout, template.colorSchemes.calm)]), { template }));
      const content = named.slice(named.indexOf('<main class="sf-presentation">'));
      expect(content.match(/--sf-accent:#2563eb;/g)).toHaveLength(2);
      expect(content.match(/--sf-accent:#ffffff;/g)).toHaveLength(1);
      expect(content).not.toContain("--sf-accent:#d6b77c;");
    });

    it(`accepts an individual color without a scheme and leaves other items unstyled in ${layout}`, () => {
      const html = renderPresentation(deck([slide(layout)]));
      const content = html.slice(html.indexOf('<main class="sf-presentation">'));
      expect(content.match(/--sf-accent:#ffffff;/g)).toHaveLength(1);
      expect(content).not.toContain("--sf-accent:#2563eb;");
    });

    it(`rejects invalid schemes and individual colors in ${layout}`, () => {
      for (const invalid of [[], ["red"], Array(13).fill("#123456"), "", "Bad Name", 12]) {
        expect(() => parsePresentation(deck([slide(layout, invalid)]))).toThrow();
      }
      const field = layout.startsWith("cards") ? "cards" : "steps";
      expect(() => parsePresentation(deck([{ ...slide(layout), [field]: [{ title: "A", color: "red" }, ...items] }]))).toThrow();
    });
  }

  it("reports missing named schemes instead of silently using the default or inherited object properties", () => {
    for (const name of ["missing", "constructor"]) {
      expect(() => renderPresentation(deck([slide("cards", name)]), { template: { name: "empty", colorSchemes: {} } }))
        .toThrow(`Unknown color scheme "${name}"`);
    }
    expect(() => renderPresentation(deck([slide("process", "missing")]))).toThrow('Unknown color scheme "missing"');
  });

  it("validates the reusable scheme names and colors in templates", () => {
    for (const colorSchemes of [{ "Bad Name": ["#123456"] }, { calm: [] }, { calm: ["red"] }]) {
      expect(() => parseTemplate({ name: "brand", colorSchemes })).toThrow();
    }
    expect(() => parsePresentation(deck([{ layout: "content", title: "No item colors", colorScheme: "calm", blocks: [{ type: "paragraph", text: "x" }] }]))).toThrow();
  });

  it("selects text with at least 4.5:1 contrast, including midtones where near-black and white both fall short", () => {
    for (const color of ["#000000", "#ffffff", "#2563eb", "#4cc3ff", "#63c9b8", "#d6b77c", "#a99ad7", "#7d7d7d", "#808080"]) {
      const background = luminance(color);
      const text = luminance(itemTextColor(color));
      expect((Math.max(background, text) + 0.05) / (Math.min(background, text) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
    expect(itemTextColor("#7d7d7d")).toBe("#000000");
  });
});
