import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { layoutFamilies, layouts, quotedList } from "../../src/layouts/registry.js";
import { layoutStylesheet } from "../../src/layouts/index.js";
import { presentationSchema } from "../../src/schemas/presentation.js";

describe("layout registry", () => {
  it("lists the six families in documentation order", () => {
    expect(layoutFamilies).toEqual(["cover", "content", "two-columns", "cards", "table", "chart"]);
  });

  it("gives every family a default variant, a schema keyed by its name, a renderer, and a stylesheet", () => {
    for (const layout of layouts) {
      expect(layout.variants[0]).toBe("default");
      expect(layout.slide.shape.layout.value).toBe(layout.family);
      for (const file of ["render.tsx", `${layout.family}.css`]) {
        expect(existsSync(new URL(`../../src/layouts/${layout.family}/${file}`, import.meta.url))).toBe(true);
      }
    }
    expect(layoutStylesheet).toContain(".sf-layout-cover .sf-header");
    expect(layoutStylesheet).toContain(".sf-chart-row");
  });

  it("accepts a background key for every family and no other", () => {
    for (const family of layoutFamilies) {
      const deck = { metadata: { title: "Deck" }, backgrounds: { [family]: "a.png" }, slides: [{ layout: "cover", title: "x" }] };
      expect(presentationSchema.safeParse(deck).success).toBe(true);
    }
  });

  it("quotes lists the way error messages name valid values", () => {
    expect(quotedList(["a"])).toBe('"a"');
    expect(quotedList(["a", "b"])).toBe('"a" or "b"');
    expect(quotedList(["a", "b", "c"])).toBe('"a", "b", or "c"');
  });
});
