import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, expect, it } from "vitest";
import { exportPresentation, renderPresentation, validateLayout } from "../../dist/index.js";

let browser: Browser;
beforeAll(async () => { browser = await chromium.launch(); });
afterAll(async () => { await browser?.close(); });

const layouts = ["cards", "cards/rounded", "cards/badge", "cards/circle", "cards/hexagon", "cards/pentagon", "cards/honeycomb", "process", "process/vertical", "cycle", "cycle/ring"];
const items = [{ title: "Alpha", text: "Summary" }, { title: "Beta", text: "Summary", color: "#f3f4f6" }, { title: "Gamma", text: "Summary" }];
const makeSlide = (layout: string, colored = true) => ({
  layout, title: "Colors", ...(colored ? { colorScheme: "calm" } : {}),
  [layout.startsWith("cards") ? "cards" : "steps"]: items.map(item => ({
    title: item.title, ...(colored && item.color ? { color: item.color } : {}),
    ...(layout.startsWith("cards") ? { blocks: [{ type: "paragraph", text: item.text }] } : { text: item.text }),
  })),
});

it("applies item colors across every variant without leaking into other items, arrows, or outside descriptions", async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    for (const theme of ["light", "dark"]) {
      await page.setContent(renderPresentation({
        metadata: { title: "Color schemes" }, theme,
        slides: [...layouts.map(layout => makeSlide(layout)), ...["cards/honeycomb", "process", "cycle/ring"].map(layout => makeSlide(layout, false))],
      }, { template: { name: "brand", colorSchemes: { calm: ["#2563eb", "#d6b77c"] }, palette: { [theme]: { accent: "#ef4444" } }, tokens: { gradient: { card: 30 } } } }));
      for (let index = 0; index < layouts.length; index++) {
        const slide = page.locator(`#slide-${index + 1}`);
        const text = await slide.locator(".sf-card h2, .sf-step-title, .sf-cycle-title, .sf-cycle-ring-title").evaluateAll(elements => elements.map(element => getComputedStyle(element).color));
        expect(text).toEqual(["rgb(255, 255, 255)", "rgb(17, 24, 39)", "rgb(255, 255, 255)"]);
        const fill = await slide.locator(".sf-card, .sf-step, .sf-cycle-step, .sf-cycle-ring-title").evaluateAll(elements => elements.map(element => getComputedStyle(element).getPropertyValue("--sf-accent").trim()));
        expect(fill).toEqual(["#2563eb", "#f3f4f6", "#2563eb"]);
        if (layouts[index] === "cycle/ring") {
          expect(await slide.locator(".sf-cycle-arrows path").evaluateAll(paths => paths.map(path => getComputedStyle(path).fill))).toEqual(["rgb(37, 99, 235)", "rgb(243, 244, 246)", "rgb(37, 99, 235)"]);
          expect(await slide.locator(".sf-cycle-ring-number").evaluateAll(elements => elements.map(element => getComputedStyle(element).opacity))).toEqual(["1", "1", "1"]);
          expect(await slide.locator(".sf-cycle-ring-label").first().evaluate(element => getComputedStyle(element).color)).not.toBe("rgb(255, 255, 255)");
        }
      }
      expect(await page.locator("#slide-8 .sf-process-arrow").first().evaluate(element => getComputedStyle(element).color)).toBe("rgb(239, 68, 68)");
      expect(await page.locator("#slide-12 polygon").first().evaluate(element => getComputedStyle(element).fill)).toBe("rgb(239, 68, 68)");
      expect(await page.locator("#slide-13 .sf-step-number").first().evaluate(element => getComputedStyle(element).backgroundColor)).toBe("rgb(239, 68, 68)");
      expect(await page.locator("#slide-14 .sf-cycle-arrows path").evaluateAll(paths => paths.map(path => getComputedStyle(path).fillOpacity))).toEqual(["1", "0.82", "1"]);
      expect(await page.locator("#slide-14 .sf-cycle-ring-number").first().evaluate(element => getComputedStyle(element).opacity)).toBe("0.85");
      expect((await validateLayout(page)).filter(issue => issue.severity === "error")).toEqual([]);
    }
  } finally {
    await page.close();
  }
}, 60_000);

it("preserves selected fills, alpha, and editable labels in exported cards, steps, and the ring", async () => {
  const directory = await mkdtemp(join(tmpdir(), "slideforge-color-schemes-"));
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    const template = { name: "brand", colorSchemes: { calm: ["#4cc3ff", "#63c9b8", "#d6b77c"] } };
    const deck = {
      metadata: { title: "Coordinated colors" }, theme: "dark",
      slides: ["cards/honeycomb", "process", "cycle/ring"].map(layout => ({
        ...makeSlide(layout),
        ...(layout === "cycle/ring" ? { center: "SDLC" } : { fillOpacity: 0.8 }),
      })),
    };
    await page.setContent(renderPresentation(deck, { template }));
    expect(await page.locator("#slide-1 polygon").first().evaluate(element => getComputedStyle(element).fill)).toBe("rgba(76, 195, 255, 0.8)");
    expect(await page.locator("#slide-2 .sf-step").first().evaluate(element => getComputedStyle(element).backgroundColor)).toBe("rgba(76, 195, 255, 0.8)");
    expect(await page.locator(".sf-card h2, .sf-step-title").evaluateAll(elements => elements.every(element => getComputedStyle(element).opacity === "1"))).toBe(true);

    const input = join(directory, "colors.json");
    const output = join(directory, "colors.pptx");
    await writeFile(join(directory, "template.json"), JSON.stringify(template));
    await writeFile(input, JSON.stringify({ ...deck, template: "./template.json" }));
    await exportPresentation(input, { output });
    const files = unzipSync(await readFile(output));
    for (const index of [1, 2, 3]) {
      const xml = strFromU8(files[`ppt/slides/slide${index}.xml`]!);
      for (const title of ["Alpha", "Beta", "Gamma"]) expect(xml).toContain(`<a:t>${title}</a:t>`);
      if (index !== 3) {
        for (const color of ["4CC3FF", "F3F4F6", "D6B77C"]) expect(xml).toContain(`<a:srgbClr val="${color}">`);
        expect(xml).toContain('<a:alpha val="80000"/>');
      } else {
        expect(xml).toContain("<a:t>SDLC</a:t>");
      }
    }
    let ringColorsPreserved = false;
    for (const [name, bytes] of Object.entries(files)) {
      if (!name.startsWith("ppt/media/") || !/\.(png|svg)$/.test(name)) continue;
      const counts = await page.evaluate(async ({ source, targets }) => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        return targets.map(target => {
          let count = 0;
          for (let offset = 0; offset < pixels.length; offset += 4) {
            if (pixels[offset] === target[0] && pixels[offset + 1] === target[1] && pixels[offset + 2] === target[2] && pixels[offset + 3] === 255) count++;
          }
          return count;
        });
      }, { source: `data:image/${name.endsWith(".svg") ? "svg+xml" : "png"};base64,${Buffer.from(bytes).toString("base64")}`, targets: [[76, 195, 255], [243, 244, 246], [214, 183, 124]] });
      if (counts.every(count => count > 50)) ringColorsPreserved = true;
    }
    expect(ringColorsPreserved).toBe(true);
  } finally {
    await page.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
