import { chromium } from 'playwright';
import { expect, it } from 'vitest';
import { renderPresentation } from '../../dist/index.js';

type Box = { x: number; y: number; width: number; height: number };

it('closes the hub line corners and nests honeycomb hexagons in alternating columns', async () => {
  const items = Array.from({ length: 6 }, (_, index) => ({ title: `Item ${index + 1}` }));
  const html = renderPresentation({
    metadata: { title: 'Geometry' },
    slides: [
      { layout: 'hub', title: 'Hub', center: 'Core', items },
      { layout: 'cards/honeycomb', title: 'Honeycomb', cards: items },
    ],
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.setContent(html);
    const hub = await page.locator('.sf-hub-line').evaluateAll(lines => lines.map(line => ({
      stub: line.querySelector('.sf-hub-stub')!.getBoundingClientRect().toJSON() as Box,
      spine: line.querySelector('.sf-hub-spine')!.getBoundingClientRect().toJSON() as Box,
    })));
    // Every stub lies within its spine's vertical extent, so no corner is left open.
    for (const { stub, spine } of hub) {
      expect(spine.y).toBeLessThanOrEqual(stub.y + 0.5);
      expect(spine.y + spine.height).toBeGreaterThanOrEqual(stub.y + stub.height - 0.5);
    }
    const cells = await page.locator('.sf-variant-honeycomb .sf-card').evaluateAll(cards => cards.map(card => card.getBoundingClientRect().toJSON() as Box));
    expect(cells).toHaveLength(6);
    const content = await page.locator('.sf-variant-honeycomb .sf-content').evaluate(element => element.getBoundingClientRect().toJSON() as Box);
    for (const [index, cell] of cells.entries()) {
      expect(cell.height / cell.width).toBeCloseTo(0.866, 2);
      expect(cell.x).toBeGreaterThanOrEqual(content.x - 0.5);
      expect(cell.x + cell.width).toBeLessThanOrEqual(content.x + content.width + 0.5);
      expect(cell.y).toBeGreaterThanOrEqual(content.y - 0.5);
      expect(cell.y + cell.height).toBeLessThanOrEqual(content.y + content.height + 0.5);
      if (index === 0) continue;
      const previous = cells[index - 1]!;
      // Columns step by three quarters of a hexagon plus the gap, and alternate up and down by half a hexagon plus half the gap.
      expect(cell.x - previous.x).toBeCloseTo(cell.width * 0.75 + 16, 0);
      expect(Math.abs(cell.y - previous.y)).toBeCloseTo(cell.height / 2 + 8, 0);
    }
  } finally {
    await browser.close();
  }
}, 30_000);

it('keeps every cycle/ring title and label inside the content area, clear of each other', async () => {
  const steps = Array.from({ length: 8 }, (_, index) => ({ title: `Step ${index + 1}`, text: `Description of step ${index + 1}` }));
  const html = renderPresentation({
    metadata: { title: 'Ring' },
    slides: [3, 5, 7, 8].map(count => ({ layout: 'cycle/ring', title: `Ring ${count}`, center: 'Cycle', steps: steps.slice(0, count) })),
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.setContent(html);
    const outside = await page.locator('.sf-slide').evaluateAll(slides => slides.flatMap(slide => {
      const content = slide.querySelector('.sf-content')!.getBoundingClientRect();
      return [...slide.querySelectorAll('.sf-cycle-ring-title, .sf-cycle-ring-label')].map(element => element.getBoundingClientRect())
        .filter(box => box.left < content.left - 0.5 || box.right > content.right + 0.5 || box.top < content.top - 0.5 || box.bottom > content.bottom + 0.5)
        .map(box => JSON.stringify(box));
    }));
    expect(outside).toEqual([]);
    const overlaps = await page.locator('.sf-slide').evaluateAll(slides => slides.flatMap(slide => {
      const boxes = [...slide.querySelectorAll('.sf-cycle-ring-title, .sf-cycle-ring-label')].map(element => element.getBoundingClientRect());
      return boxes.flatMap((a, i) => boxes.slice(i + 1).filter(b => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom).map(b => `${JSON.stringify(a)} x ${JSON.stringify(b)}`));
    }));
    expect(overlaps).toEqual([]);
  } finally {
    await browser.close();
  }
}, 30_000);
