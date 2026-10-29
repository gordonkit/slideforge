import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { layoutFamilies, layoutFamily, layoutNames, layouts, layoutVariant, quotedList, slideVariant } from "../../src/layouts/registry.js";
import { layoutStylesheet } from "../../src/layouts/index.js";
import { renderPresentation } from "../../src/renderers/html.js";
import { parsePresentation, presentationSchema, slideBackground } from "../../src/schemas/presentation.js";

describe("layout registry", () => {
  it("lists the families in documentation order", () => {
    expect(layoutFamilies).toEqual(["cover", "content", "two-columns", "cards", "timeline", "gantt", "table", "chart", "quote", "blank"]);
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
    const families = 'Unknown layout. Use "cover", "content", "two-columns", "cards", "timeline", "gantt", "table", "chart", "quote", or "blank"';
    expect(issues({ layout: "gallery" })).toEqual([families]);
    expect(issues({})).toEqual([families]);
  });

  it("draws cover variants with the same content and only split's decorative panel", () => {
    for (const variant of ["default", "centered", "split", "band"]) {
      const html = renderPresentation(deck({ layout: `cover/${variant}`, author: "Author" }));
      expect(html).toContain(`class="sf-slide sf-layout-cover sf-variant-${variant}"`);
      expect(html).toContain('<p class="sf-author">Author</p>');
      expect(html.includes('<div class="sf-cover-panel" aria-hidden="true"></div>')).toBe(variant === "split");
    }
  });

  it("validates and draws quote slides", () => {
    const slide = { layout: "quote", quote: "Simple things should be simple.", attribution: "Alan Kay" };
    const html = renderPresentation(deck(slide));
    expect(html).toContain('class="sf-slide sf-layout-quote sf-variant-default"');
    expect(html).toContain('<figure class="sf-quote"><blockquote><p>Simple things should be simple.</p></blockquote><figcaption>Alan Kay</figcaption></figure>');
    expect(renderPresentation(deck({ ...slide, layout: "quote/centered" }))).toContain("sf-variant-centered");
    expect(renderPresentation(deck({ layout: "quote", quote: "No attribution" }))).not.toContain("<figcaption>");
    const issues = (input: object) => presentationSchema.safeParse(deck(input)).error?.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    expect(issues({ layout: "quote" })).toEqual(["slides.0.quote: Invalid input: expected string, received undefined"]);
    expect(issues({ layout: "quote", quote: "  " })?.[0]).toMatch(/^slides\.0\.quote: /);
    expect(issues({ layout: "quote", quote: "x".repeat(1001) })?.[0]).toMatch(/^slides\.0\.quote: /);
    expect(issues({ layout: "quote", quote: "x", blocks: [] })).toEqual(['slides.0: Unrecognized key: "blocks"']);
    expect(issues({ layout: "quote/split", quote: "x" })).toEqual(['slides.0.layout: Unknown quote variant. Use "quote", "quote/default", or "quote/centered"']);
  });

  it("arranges cards by their count", () => {
    for (const count of [1, 2, 3, 4, 5, 6]) {
      const cards = Array.from({ length: count }, (_, index) => ({ title: `Card ${index + 1}`, blocks: [{ type: "paragraph", text: "x" }] }));
      expect(renderPresentation(deck({ layout: "cards", cards }))).toContain(`<div class="sf-cards" data-count="${count}">`);
    }
    expect(layoutStylesheet).toContain('.sf-cards[data-count="5"] .sf-card:nth-child(n + 4) { grid-column: span 3; }');
  });

  it("validates and draws timeline slides", () => {
    const events = [{ date: "2025", title: "Start", text: "Kickoff" }, { date: "2026", title: "Launch" }];
    const html = renderPresentation(deck({ layout: "timeline", events }));
    expect(html).toContain('class="sf-slide sf-layout-timeline sf-variant-default"');
    expect(html).toContain('<li class="sf-timeline-event"><p class="sf-timeline-date">2025</p><div class="sf-timeline-track" aria-hidden="true" data-pptx-allow-overlap="true"><span class="sf-timeline-rail"></span><span class="sf-timeline-marker"></span></div><h2>Start</h2><p class="sf-timeline-text">Kickoff</p></li>');
    expect(html).toContain("<h2>Launch</h2></li>");
    const issues = (input: object) => presentationSchema.safeParse(deck(input)).error?.issues.map((issue) => issue.path.join("."));
    expect(issues({ layout: "timeline", events: events.slice(0, 1) })).toEqual(["slides.0.events"]);
    expect(issues({ layout: "timeline", events: Array.from({ length: 7 }, () => events[1]) })).toEqual(["slides.0.events"]);
    expect(issues({ layout: "timeline", events: [{ date: " ", title: "x" }, events[1]] })).toEqual(["slides.0.events.0.date"]);
    expect(issues({ layout: "timeline", events: [{ ...events[0], blocks: [] }, events[1]] })).toEqual(["slides.0.events.0"]);
  });

  it("validates and draws gantt slides", () => {
    const periods = ["Jan", "Feb", "Mar"];
    const tasks = [{ label: "Design", start: 1, end: 2, progress: 60 }, { label: "Launch", start: 3, end: 3 }];
    const html = renderPresentation(deck({ layout: "gantt", periods, tasks }));
    expect(html).toContain('<div class="sf-gantt" style="--sf-gantt-periods:3">');
    expect(html).toContain('<div class="sf-gantt-periods"><span>Jan</span><span>Feb</span><span>Mar</span></div>');
    expect(html).toContain('<p class="sf-gantt-label">Design<span class="sf-gantt-percent">60%</span></p><div class="sf-gantt-track" role="img" aria-label="Design: Jan–Feb, 60%" data-pptx-allow-overlap="true"><span class="sf-gantt-bar" style="grid-column:1 / 3"><span class="sf-gantt-progress" style="width:60%"></span></span></div>');
    expect(html).toContain('aria-label="Launch: Mar" data-pptx-allow-overlap="true"><span class="sf-gantt-bar" style="grid-column:3 / 4"></span>');
    const issues = (input: object) => presentationSchema.safeParse(deck({ layout: "gantt", periods, tasks, ...input })).error?.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    expect(issues({ tasks: [{ label: "x", start: 2, end: 4 }] })).toEqual(["slides.0.tasks.0.end: end must not exceed the number of periods (3)"]);
    expect(issues({ tasks: [{ label: "x", start: 3, end: 2 }] })).toEqual(["slides.0.tasks.0.start: start must not be after end"]);
    expect(issues({ tasks: [{ label: "x", start: 1.5, end: 2 }] })?.[0]).toMatch(/^slides\.0\.tasks\.0\.start: /);
    expect(issues({ tasks: [{ label: "x", start: 1, end: 2, progress: 101 }] })?.[0]).toMatch(/^slides\.0\.tasks\.0\.progress: /);
    expect(issues({ periods: ["Only"] })?.[0]).toMatch(/^slides\.0\.periods: /);
    expect(issues({ tasks: [] })?.[0]).toMatch(/^slides\.0\.tasks: /);
  });

  it("draws only the background of a blank slide and rejects the fields it does not draw", () => {
    const html = renderPresentation(deck({ layout: "blank", background: "bg.png", notes: "Pause here" }));
    expect(html).toContain('<section class="sf-slide sf-layout-blank sf-variant-default" data-pptx="slide" data-layout="blank" data-variant="default" aria-label="1. x"><div class="sf-background" data-pptx-background="" aria-hidden="true"><img src="bg.png" alt=""/></div><aside data-pptx-notes="" hidden="">Pause here</aside></section>');
    const issues = (input: object) => presentationSchema.safeParse(deck(input)).error?.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    expect(issues({ layout: "blank", subtitle: "s", footer: "f" })).toEqual([
      "slides.0.subtitle: A blank slide draws only its background; remove subtitle",
      "slides.0.footer: A blank slide draws only its background; remove footer",
    ]);
    expect(issues({ layout: "blank", blocks: [] })).toEqual(['slides.0: Unrecognized key: "blocks"']);
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
