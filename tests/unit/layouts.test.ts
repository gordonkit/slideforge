import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { layoutFamilies, layoutFamily, layoutNames, layouts, layoutVariant, quotedList, slideVariant } from "../../src/layouts/registry.js";
import { layoutStylesheet } from "../../src/layouts/index.js";
import { renderPresentation } from "../../src/renderers/html.js";
import { parsePresentation, presentationSchema, slideBackground } from "../../src/schemas/presentation.js";

describe("layout registry", () => {
  it("lists the families in documentation order", () => {
    expect(layoutFamilies).toEqual(["cover", "agenda", "section", "content", "two-columns", "cards", "timeline", "gantt", "table", "chart", "quote", "blank"]);
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
    const families = 'Unknown layout. Use "cover", "agenda", "section", "content", "two-columns", "cards", "timeline", "gantt", "table", "chart", "quote", or "blank"';
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

  it("numbers the cards of the badge, circle, hexagon, and pentagon variants and draws the polygon", () => {
    const cards = [1, 2, 3].map((index) => ({ title: `Card ${index}`, blocks: [{ type: "paragraph", text: "x" }] }));
    const html = (layout: string) => renderPresentation(deck({ layout, cards }));
    expect(html("cards")).not.toContain('class="sf-card-badge"');
    expect(html("cards/rounded")).not.toContain('class="sf-card-badge"');
    expect(html("cards/badge").match(/class="sf-card-badge"/g)).toHaveLength(3);
    expect(html("cards/badge")).not.toContain('class="sf-card-inner"');
    expect(html("cards/circle").match(/class="sf-card-badge"/g)).toHaveLength(3);
    expect(html("cards/circle").match(/class="sf-card-inner"/g)).toHaveLength(3);
    expect(html("cards/circle")).not.toContain('class="sf-card-shape"');
    expect(html("cards/hexagon").match(/class="sf-card-shape"/g)).toHaveLength(3);
    expect(html("cards/hexagon").match(/class="sf-card-badge"/g)).toHaveLength(3);
    expect(html("cards/pentagon").match(/class="sf-card-shape"/g)).toHaveLength(3);
    expect(html("cards/pentagon")).toContain('points="50,95.1 100,58.8 80.9,0 19.1,0 0,58.8"');
  });

  it("arranges cards by their count", () => {
    for (const count of [1, 2, 3, 4, 5, 6]) {
      const cards = Array.from({ length: count }, (_, index) => ({ title: `Card ${index + 1}`, blocks: [{ type: "paragraph", text: "x" }] }));
      expect(renderPresentation(deck({ layout: "cards", cards }))).toContain(`<div class="sf-cards" data-count="${count}">`);
    }
    expect(layoutStylesheet).toContain('.sf-cards[data-count="5"] .sf-card:nth-child(4) { grid-column: 2 / span 2; }');
    expect(layoutStylesheet).toContain('.sf-cards[data-count="5"] .sf-card:nth-child(5) { grid-column: 4 / span 2; }');
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

  it("validates and draws agenda slides, linking items to slides that exist", () => {
    const items = [{ title: "Results", text: "Numbers", slide: 2 }, { title: "Questions" }];
    const html = renderPresentation({ metadata: { title: "Deck" }, slides: [{ title: "Agenda", layout: "agenda", items }, { title: "Results", layout: "content", blocks: [{ type: "paragraph", text: "x" }] }] });
    expect(html).toContain('class="sf-slide sf-layout-agenda sf-variant-default"');
    expect(html).toContain('<li><a class="sf-agenda-item" href="#slide-2" data-sf-link="2"><span class="sf-agenda-number" aria-hidden="true">01</span>');
    expect(html).toContain('<span class="sf-agenda-title">Results</span><span class="sf-agenda-text">Numbers</span>');
    expect(html).toContain('<li><div class="sf-agenda-item"><span class="sf-agenda-number" aria-hidden="true">02</span>');
    expect(html).toContain('<section id="slide-2" class="sf-slide sf-layout-content');
    const issues = (input: object) => presentationSchema.safeParse(deck(input)).error?.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    expect(issues({ layout: "agenda", items: items.slice(1) })).toEqual(["slides.0.items: Too small: expected array to have >=2 items"]);
    expect(issues({ layout: "agenda", items: [items[1], { title: "x", slide: 0 }] })).toEqual(["slides.0.items.1.slide: Too small: expected number to be >=1"]);
    expect(issues({ layout: "agenda", items: [{ title: "x", slide: 2 }, items[1]] })).toEqual(["slides.0.items.0.slide: Slide 2 does not exist; the presentation has 1"]);
    expect(issues({ layout: "agenda", items: [{ title: "y", url: "x" }, items[1]] })).toEqual(["slides.0.items.0: Unrecognized key: \"url\""]);
  });

  it("numbers section slides and builds an agenda from them when it has no items", () => {
    const page = { title: "Page", layout: "content", blocks: [{ type: "paragraph", text: "x" }] };
    const slides = [
      { title: "Agenda", layout: "agenda/chapters", current: 2 },
      { title: "One", subtitle: "First", layout: "section" }, page,
      { title: "Two", layout: "section/band" }, page,
    ];
    const html = renderPresentation({ metadata: { title: "Deck" }, slides });
    expect(html).toContain('<p class="sf-section-number">01</p>');
    expect(html).toContain('<p class="sf-section-number">02</p>');
    expect(html).toContain('<div class="sf-section-rail" aria-hidden="true"></div>');
    expect(html).toContain('<ol class="sf-agenda" data-count="2" data-current="2">');
    expect(html).toContain('<li><a class="sf-agenda-item" href="#slide-2" data-sf-link="2">');
    expect(html).toContain('<span class="sf-agenda-title">One</span><span class="sf-agenda-text">First</span>');
    expect(html).toContain('<li><a class="sf-agenda-item sf-agenda-current" href="#slide-4" data-sf-link="4">');
    const issues = (list: object[]) => presentationSchema.safeParse({ metadata: { title: "Deck" }, slides: list }).error?.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    expect(issues([{ title: "Agenda", layout: "agenda" }, slides[1]!])).toEqual(["slides.0.items: An agenda without items lists the section slides; this presentation has 1 and needs 2–8"]);
    expect(issues([{ ...slides[0]!, current: 3 }, ...slides.slice(1)])).toEqual(["slides.0.current: Item 3 does not exist; the agenda has 2"]);
    expect(issues([slides[1]!, slides[3]!])).toBeUndefined();
  });

  it("draws agenda outlines with linked subsections, and only chapters in the other variants", () => {
    const items = [{ title: "A", slide: 2, items: [{ title: "A1", slide: 2 }, { title: "A2" }] }, { title: "B" }];
    const page = { title: "Page", layout: "content", blocks: [{ type: "paragraph", text: "x" }] };
    const outline = renderPresentation({ metadata: { title: "Deck" }, slides: [{ title: "Agenda", layout: "agenda/outline", items, current: 1 }, page] });
    expect(outline).toContain('<li class="sf-agenda-chapter sf-agenda-current"><a class="sf-agenda-head" href="#slide-2" data-sf-link="2">');
    expect(outline).toContain('<ul class="sf-agenda-subs"><li><a class="sf-agenda-sub" href="#slide-2" data-sf-link="2"><span class="sf-agenda-sub-title">A1</span>');
    expect(outline).toContain('<li><div class="sf-agenda-sub"><span class="sf-agenda-sub-title">A2</span></div></li>');
    const chapters = renderPresentation({ metadata: { title: "Deck" }, slides: [{ title: "Agenda", layout: "agenda/chapters", items }, page] });
    expect(chapters).not.toContain("<ul class=\"sf-agenda-subs\"");
    const bad = presentationSchema.safeParse({ metadata: { title: "Deck" }, slides: [{ title: "Agenda", layout: "agenda/outline", items: [{ title: "A", items: [{ title: "A1", slide: 3 }] }, items[1]] }, page] });
    expect(bad.error?.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)).toEqual(["slides.0.items.0.items.0.slide: Slide 3 does not exist; the presentation has 2"]);
  });

  it("draws the subtitle with an accent bar", () => {
    const html = renderPresentation(deck({ layout: "content", title: "T", subtitle: "The point", blocks: [{ type: "paragraph", text: "x" }] }));
    expect(html).toContain('<p class="sf-subtitle"><span class="sf-subtitle-mark" aria-hidden="true"></span><span class="sf-subtitle-text">The point</span></p>');
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
    expect(html).toContain('<section id="slide-1" class="sf-slide sf-layout-blank sf-variant-default" data-pptx="slide" data-layout="blank" data-variant="default" aria-label="1. x"><div class="sf-background" data-pptx-background="" aria-hidden="true"><img src="bg.png" alt=""/></div><aside data-pptx-notes="" hidden="">Pause here</aside></section>');
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
