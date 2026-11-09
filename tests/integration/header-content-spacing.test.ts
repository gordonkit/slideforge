import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { chromium } from 'playwright';
import { expect, it } from 'vitest';
import { exportPresentation, renderPresentation } from '../../dist/index.js';

const deck = {
  metadata: { title: 'Header spacing' },
  slides: [
    { layout: 'content', title: 'Heading', subtitle: 'Summary', blocks: [{ type: 'paragraph', text: 'Body marker' }] },
    { layout: 'table', title: 'Table', columns: ['Column'], rows: [['Value']] },
    { layout: 'cover', title: 'Cover', author: 'Author' },
    { layout: 'section', title: 'Section', subtitle: 'Section summary' },
    { layout: 'closing', title: 'Closing', contacts: [{ label: 'Contact', value: 'Example' }] },
  ],
};

it('applies the configured gap to regular layouts without moving their bottom edge or special layouts', async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    const measure = async (gap?: number) => {
      const options = gap === undefined ? {} : { template: { name: 'spacing', tokens: { spacing: { 'header-content': gap } } } };
      await page.setContent(renderPresentation(deck, options));
      return page.locator('.sf-slide').evaluateAll(slides => slides.map(slide => {
        const header = slide.querySelector('.sf-header')!.getBoundingClientRect();
        const content = slide.querySelector('.sf-content')!.getBoundingClientRect();
        const frame = slide.getBoundingClientRect();
        return { gap: content.top - header.bottom, top: content.top - frame.top, bottom: content.bottom - frame.top, height: content.height };
      }));
    };
    const legacy = await measure(0);
    const defaults = await measure();
    const roomy = await measure(48);
    for (const index of [0, 1]) {
      expect(legacy[index]!.gap).toBeCloseTo(0);
      expect(defaults[index]!.gap).toBeCloseTo(24);
      expect(roomy[index]!.gap).toBeCloseTo(48);
      expect(defaults[index]!.top - legacy[index]!.top).toBeCloseTo(24);
      expect(roomy[index]!.height - legacy[index]!.height).toBeCloseTo(-48);
      expect(roomy[index]!.bottom).toBeCloseTo(legacy[index]!.bottom);
    }
    for (const index of [2, 3, 4]) {
      expect(defaults[index]).toEqual(legacy[index]);
      expect(roomy[index]).toEqual(legacy[index]);
    }
  } finally {
    await browser.close();
  }
});

it('retains the configured spacing in the exported PowerPoint', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'slideforge-header-gap-'));
  try {
    const positions: number[] = [];
    for (const gap of [0, 48]) {
      const source = join(directory, `deck-${gap}.json`);
      const template = join(directory, `template-${gap}.json`);
      const output = join(directory, `deck-${gap}.pptx`);
      await writeFile(template, JSON.stringify({ name: 'spacing', tokens: { spacing: { 'header-content': gap } } }));
      await writeFile(source, JSON.stringify({ ...deck, template: `./template-${gap}.json`, slides: [deck.slides[0]] }));
      await exportPresentation(source, { output });
      const slide = strFromU8(unzipSync(await readFile(output))['ppt/slides/slide1.xml']!);
      const shape = slide.match(/<p:sp>[\s\S]*?<\/p:sp>/g)?.find(value => value.includes('<a:t>Body marker</a:t>'));
      const y = shape?.match(/<a:off x="[^"]+" y="(\d+)"/)?.[1];
      expect(y).toBeDefined();
      positions.push(Number(y));
    }
    expect(positions[1]! - positions[0]!).toBeCloseTo(48 * 6350, -2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
